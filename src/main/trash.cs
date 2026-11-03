// Outil natif de la corbeille (src/main/trash.ts), tous disques confondus.
// « state » → {"count":n,"bytes":n} ; « empty » vide sans confirmation ni son, puis renvoie l'état.
using System;
using System.Runtime.InteropServices;

namespace Photon {
  public static class Trash {
    // Alignement par défaut : celui de shellapi.h en 64 bits (8 octets).
    [StructLayout(LayoutKind.Sequential)]
    struct QueryInfo {
      public int cbSize;
      public long i64Size;
      public long i64NumItems;
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    static extern int SHQueryRecycleBin(string root, ref QueryInfo info);
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    static extern int SHEmptyRecycleBin(IntPtr window, string root, uint flags);

    const uint NO_CONFIRMATION = 0x1, NO_PROGRESS = 0x2, NO_SOUND = 0x4;

    static string State() {
      QueryInfo info = new QueryInfo();
      info.cbSize = Marshal.SizeOf(typeof(QueryInfo));
      int result = SHQueryRecycleBin(null, ref info);
      if (result != 0) return "{\"error\":\"" + result + "\"}";
      return "{\"count\":" + info.i64NumItems + ",\"bytes\":" + info.i64Size + "}";
    }

    public static string Run(string line) {
      try {
        // Corbeille déjà vide : Windows renvoie une erreur sans gravité, l'état suit.
        if (line == "empty") SHEmptyRecycleBin(IntPtr.Zero, null, NO_CONFIRMATION | NO_PROGRESS | NO_SOUND);
        return State();
      } catch (Exception error) {
        return "{\"error\":\"" + error.GetType().Name + "\"}";
      }
    }
  }
}
