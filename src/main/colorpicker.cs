// Outil natif de la pipette (src/main/colorpicker.ts).
// « pick » → "#rrggbb" sous le curseur au clic gauche, "" si annulé (clic droit, Échap, 30 s).
// Le clic est avalé (l'app dessous ne le reçoit pas) ; curseur en croix le temps du choix.
using System;
using System.Runtime.InteropServices;
using System.Threading;

namespace Photon {
  public static class ColorPicker {
    delegate IntPtr HookProc(int code, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] static extern IntPtr SetWindowsHookEx(int id, HookProc proc, IntPtr module, uint thread);
    [DllImport("user32.dll")] static extern bool UnhookWindowsHookEx(IntPtr hook);
    [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] static extern int GetMessage(out MSG msg, IntPtr hwnd, uint min, uint max);
    [DllImport("user32.dll")] static extern bool PostThreadMessage(uint thread, uint msg, IntPtr w, IntPtr l);
    [DllImport("user32.dll")] static extern UIntPtr SetTimer(IntPtr hwnd, UIntPtr id, uint ms, IntPtr proc);
    [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
    [DllImport("user32.dll")] static extern bool GetCursorPos(out POINT point);
    [DllImport("user32.dll")] static extern IntPtr GetDC(IntPtr hwnd);
    [DllImport("user32.dll")] static extern int ReleaseDC(IntPtr hwnd, IntPtr dc);
    [DllImport("gdi32.dll")] static extern uint GetPixel(IntPtr dc, int x, int y);
    [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll")] static extern IntPtr LoadCursor(IntPtr instance, IntPtr name);
    [DllImport("user32.dll")] static extern IntPtr CopyIcon(IntPtr icon);
    [DllImport("user32.dll")] static extern bool SetSystemCursor(IntPtr cursor, uint id);
    [DllImport("user32.dll")] static extern bool SystemParametersInfo(uint action, uint param, IntPtr value, uint flags);
    [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
    [DllImport("kernel32.dll")] static extern IntPtr GetModuleHandle(string name);

    struct POINT { public int X, Y; }
    struct MSG { public IntPtr hwnd; public uint message; public IntPtr wParam, lParam; public uint time; public POINT pt; }

    const int WH_MOUSE_LL = 14;
    const int WM_LBUTTONDOWN = 0x201, WM_LBUTTONUP = 0x202, WM_RBUTTONDOWN = 0x204, WM_RBUTTONUP = 0x205;
    const uint WM_TIMER = 0x113, WM_QUIT = 0x12;
    const int VK_ESCAPE = 0x1B;
    const int TIMEOUT_MS = 30000;
    const uint SPI_SETCURSORS = 0x57;
    static readonly uint[] CURSORS = { 32512, 32513, 32649 }; // flèche, texte, main

    public static string Run(string line) {
      if (line != "pick") return "";
      string result = "";
      // Fil à part : le crochet souris a besoin de sa propre boucle de messages.
      var thread = new Thread(() => { result = Pick(); });
      thread.Start();
      thread.Join();
      return result;
    }

    static string Sample() {
      POINT p;
      GetCursorPos(out p);
      IntPtr dc = GetDC(IntPtr.Zero);
      uint c = GetPixel(dc, p.X, p.Y); // 0x00BBGGRR
      ReleaseDC(IntPtr.Zero, dc);
      return string.Format("#{0:x2}{1:x2}{2:x2}", c & 0xFF, (c >> 8) & 0xFF, (c >> 16) & 0xFF);
    }

    static string Pick() {
      SetThreadDpiAwarenessContext(new IntPtr(-4)); // pixels réels sur chaque écran (mise à l'échelle)
      uint self = GetCurrentThreadId();
      string color = null;
      int pickedAt = 0;
      bool released = false;
      HookProc proc = (code, w, l) => {
        if (code >= 0) {
          int m = w.ToInt32();
          if (color == null && m == WM_LBUTTONDOWN) { color = Sample(); pickedAt = Environment.TickCount; return (IntPtr)1; }
          if (color == null && m == WM_RBUTTONDOWN) { color = ""; pickedAt = Environment.TickCount; return (IntPtr)1; }
          if (color != null && !released && (m == WM_LBUTTONUP || m == WM_RBUTTONUP)) {
            released = true;
            PostThreadMessage(self, WM_QUIT, IntPtr.Zero, IntPtr.Zero);
            return (IntPtr)1;
          }
        }
        return CallNextHookEx(IntPtr.Zero, code, w, l);
      };
      IntPtr hook = SetWindowsHookEx(WH_MOUSE_LL, proc, GetModuleHandle(null), 0);
      if (hook == IntPtr.Zero) return "";
      foreach (uint id in CURSORS) SetSystemCursor(CopyIcon(LoadCursor(IntPtr.Zero, new IntPtr(32515))), id);
      try {
        SetTimer(IntPtr.Zero, UIntPtr.Zero, 50, IntPtr.Zero);
        int start = Environment.TickCount;
        MSG msg;
        while (GetMessage(out msg, IntPtr.Zero, 0, 0) > 0) {
          if (msg.message != WM_TIMER) continue;
          bool escape = (GetAsyncKeyState(VK_ESCAPE) & 0x8000) != 0;
          if (escape || Environment.TickCount - start > TIMEOUT_MS) break;
          if (color != null && Environment.TickCount - pickedAt > 1000) break; // relâchement jamais vu
        }
      } finally {
        UnhookWindowsHookEx(hook);
        SystemParametersInfo(SPI_SETCURSORS, 0, IntPtr.Zero, 0); // curseurs de l'utilisateur rétablis
        GC.KeepAlive(proc);
      }
      return color ?? "";
    }
  }
}
