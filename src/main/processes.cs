// Outil natif des processus (src/main/processes.ts).
// « list »          → [[pid,"nom",tempsCpuMs,octetsRam],…] : un seul appel système pour tous les
//                     processus, protégés compris (NtQuerySystemInformation, comme le Gestionnaire
//                     des tâches) ; RAM = mémoire privée, la colonne « Mémoire » du Gestionnaire
// « info <pid> »    → {"path":"C:\\…\\chrome.exe","desc":"Google Chrome"} ("" si illisible)
// « close <pid>,… » → "closed" (fenêtres priées de se fermer, comme la croix), "killed" (aucune
//                     fenêtre : processus arrêtés) ou "denied" (rien n'a pu être fait)
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace Photon {
  public static class Processes {
    delegate bool EnumProc(IntPtr hwnd, IntPtr param);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc callback, IntPtr param);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr hwnd, uint cmd);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr hwnd, uint msg, IntPtr w, IntPtr l);
    [DllImport("ntdll.dll")] static extern uint NtQuerySystemInformation(int infoClass, IntPtr info, int size, out int needed);
    [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    static extern bool QueryFullProcessImageName(IntPtr process, uint flags, StringBuilder name, ref uint size);

    const uint WM_CLOSE = 0x0010;
    const uint GW_OWNER = 4;
    const uint QUERY_LIMITED = 0x1000; // marche aussi sur les processus lancés en admin

    static string Esc(string s) {
      var b = new StringBuilder();
      foreach (char c in s) {
        if (c == '"' || c == '\\') b.Append('\\').Append(c);
        else if (c < ' ') b.Append(' ');
        else b.Append(c);
      }
      return b.ToString();
    }

    static IntPtr buffer = IntPtr.Zero;
    static int bufferSize = 0;

    // SYSTEM_PROCESS_INFORMATION en 64 bits : décalages fixes documentés par Microsoft (winternl.h).
    static string List() {
      if (IntPtr.Size != 8) return "{\"error\":\"PowerShell 32 bits\"}";
      int needed;
      uint status;
      while ((status = NtQuerySystemInformation(5, buffer, bufferSize, out needed)) == 0xC0000004) {
        if (buffer != IntPtr.Zero) Marshal.FreeHGlobal(buffer);
        bufferSize = Math.Max(needed, bufferSize) + 64 * 1024;
        buffer = Marshal.AllocHGlobal(bufferSize);
      }
      if (status != 0) return "{\"error\":\"NtQuerySystemInformation " + status.ToString("X") + "\"}";
      var b = new StringBuilder("[");
      int offset = 0;
      while (true) {
        IntPtr entry = buffer + offset;
        long privateBytes = Marshal.ReadInt64(entry, 8);
        long cpu = (Marshal.ReadInt64(entry, 40) + Marshal.ReadInt64(entry, 48)) / 10000; // 100 ns → ms
        int nameLength = Marshal.ReadInt16(entry, 56);
        IntPtr nameBuffer = Marshal.ReadIntPtr(entry, 64);
        long pid = Marshal.ReadInt64(entry, 80);
        if (pid != 0 && nameBuffer != IntPtr.Zero) {
          string name = Marshal.PtrToStringUni(nameBuffer, nameLength / 2);
          if (name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) name = name.Substring(0, name.Length - 4);
          if (b.Length > 1) b.Append(',');
          b.Append('[').Append(pid).Append(",\"").Append(Esc(name)).Append("\",")
            .Append(cpu).Append(',').Append(privateBytes).Append(']');
        }
        int next = Marshal.ReadInt32(entry, 0);
        if (next == 0) break;
        offset += next;
      }
      return b.Append(']').ToString();
    }

    static string Info(uint pid) {
      string path = "", desc = "";
      IntPtr handle = OpenProcess(QUERY_LIMITED, false, pid);
      if (handle != IntPtr.Zero) {
        var name = new StringBuilder(1024);
        uint size = (uint)name.Capacity;
        if (QueryFullProcessImageName(handle, 0, name, ref size)) path = name.ToString();
        CloseHandle(handle);
      }
      try { if (path != "") desc = FileVersionInfo.GetVersionInfo(path).FileDescription ?? ""; } catch { }
      return "{\"path\":\"" + Esc(path) + "\",\"desc\":\"" + Esc(desc) + "\"}";
    }

    // Comme taskkill sans /F : WM_CLOSE à chaque fenêtre principale visible ; sans fenêtre, arrêt.
    static string Close(string arg) {
      var pids = new HashSet<uint>();
      foreach (string part in arg.Split(',')) {
        uint pid;
        if (uint.TryParse(part, out pid) && pid > 4) pids.Add(pid);
      }
      int posted = 0;
      EnumWindows((hwnd, param) => {
        uint pid;
        GetWindowThreadProcessId(hwnd, out pid);
        if (pids.Contains(pid) && IsWindowVisible(hwnd) && GetWindow(hwnd, GW_OWNER) == IntPtr.Zero &&
            PostMessage(hwnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero)) posted++;
        return true;
      }, IntPtr.Zero);
      if (posted > 0) return "closed";
      int killed = 0;
      foreach (uint pid in pids) {
        try { using (Process p = Process.GetProcessById((int)pid)) { p.Kill(); killed++; } } catch { }
      }
      return killed > 0 ? "killed" : "denied";
    }

    public static string Run(string line) {
      try {
        if (line == "list") return List();
        if (line.StartsWith("info ")) {
          uint pid;
          return uint.TryParse(line.Substring(5), out pid) ? Info(pid) : "null";
        }
        if (line.StartsWith("close ")) return Close(line.Substring(6));
        return "null";
      } catch (Exception error) {
        return "{\"error\":\"" + Esc(error.Message) + "\"}";
      }
    }
  }
}
