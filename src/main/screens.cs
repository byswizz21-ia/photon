// Outil natif des écrans (src/main/screens.ts) : quels écrans sont occupés par une app en plein
// écran. Une commande par ligne, une réponse JSON par ligne :
//   busy <pid de Photon> → [{"x":…,"y":…,"width":…,"height":…,"window":"titre (classe)"}]
// Coordonnées en pixels physiques (processus « per-monitor DPI aware »).
// Plein écran = fenêtre visible, ni réduite ni agrandie, qui couvre tout son écran.
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

namespace Photon {
  public static class Screens {
    [StructLayout(LayoutKind.Sequential)] struct Rect { public int Left, Top, Right, Bottom; }

    [StructLayout(LayoutKind.Sequential)]
    struct MonitorInfo { public int Size; public Rect Monitor; public Rect Work; public int Flags; }

    delegate bool EnumProc(IntPtr hwnd, IntPtr param);

    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc proc, IntPtr param);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hwnd, out Rect rect);
    [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr hwnd, int index);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr hwnd, StringBuilder name, int max);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int max);
    [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr hwnd, int flags);
    [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
    [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr context);
    [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr hwnd, int attribute, out int value, int size);

    const int GWL_EXSTYLE = -20;
    const int WS_EX_TRANSPARENT = 0x20; // calques qui laissent passer les clics (overlay NVIDIA…)
    const int WS_EX_TOOLWINDOW = 0x80;
    const int DWMWA_CLOAKED = 14; // fenêtres d'apps Store cachées par Windows mais « visibles »
    const int MONITOR_DEFAULTTONEAREST = 2;
    // Bureau et barres des tâches couvrent l'écran sans être des apps en plein écran.
    static readonly string[] Shell = { "Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd" };

    // Pixels physiques pour fenêtres et écrans, quelle que soit la mise à l'échelle.
    static Screens() { SetProcessDpiAwarenessContext(new IntPtr(-4)); } // PER_MONITOR_AWARE_V2

    public static string Run(string line) {
      try {
        string[] parts = line.Trim().Split(' ');
        if (parts[0] != "busy" || parts.Length < 2) return "{\"error\":\"commande inconnue\"}";
        return Busy(uint.Parse(parts[1]));
      } catch (Exception e) {
        return "{\"error\":" + Quote(e.Message) + "}";
      }
    }

    static string Busy(uint photon) {
      var found = new Dictionary<IntPtr, string>(); // écran → fenêtre en plein écran
      EnumWindows((hwnd, _) => {
        if (!IsWindowVisible(hwnd) || IsIconic(hwnd) || IsZoomed(hwnd)) return true;
        uint pid;
        GetWindowThreadProcessId(hwnd, out pid);
        if (pid == photon) return true;
        if ((GetWindowLong(hwnd, GWL_EXSTYLE) & (WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW)) != 0) return true;
        int cloaked;
        if (DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, out cloaked, 4) == 0 && cloaked != 0) return true;
        var name = new StringBuilder(256);
        GetClassName(hwnd, name, 256);
        if (Array.IndexOf(Shell, name.ToString()) >= 0) return true;
        Rect r;
        if (!GetWindowRect(hwnd, out r)) return true;
        IntPtr monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        var info = new MonitorInfo { Size = Marshal.SizeOf(typeof(MonitorInfo)) };
        if (!GetMonitorInfo(monitor, ref info)) return true;
        Rect m = info.Monitor;
        bool covers = r.Left <= m.Left && r.Top <= m.Top && r.Right >= m.Right && r.Bottom >= m.Bottom;
        if (covers && !found.ContainsKey(monitor)) {
          var title = new StringBuilder(256);
          GetWindowText(hwnd, title, 256);
          found[monitor] = "{\"x\":" + m.Left + ",\"y\":" + m.Top + ",\"width\":" + (m.Right - m.Left) +
            ",\"height\":" + (m.Bottom - m.Top) + ",\"window\":" + Quote(title + " (" + name + ")") + "}";
        }
        return true;
      }, IntPtr.Zero);
      return "[" + string.Join(",", found.Values) + "]";
    }

    static string Quote(string text) {
      var sb = new StringBuilder("\"");
      foreach (char c in text) {
        if (c == '"' || c == '\\') sb.Append('\\').Append(c);
        else if (c < ' ') sb.AppendFormat("\\u{0:x4}", (int)c);
        else sb.Append(c);
      }
      return sb.Append('"').ToString();
    }
  }
}
