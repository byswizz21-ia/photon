// Outil natif des batteries (src/main/batteries.ts) : interroge en HID les appareils sans fil
// connus, branchés à ce moment. Commande « state » → [{"name":…,"level":0-100|null,"charging":bool}]
// (level null : appareil éteint ou hors de portée de son dongle).
// Protocoles repris de HeadsetControl (github.com/Sapd/HeadsetControl).
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32;
using Microsoft.Win32.SafeHandles;

namespace Photon {
  public static class Batteries {
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern SafeFileHandle CreateFile(string name, uint access, uint share, IntPtr security, uint creation, uint flags, IntPtr template);
    [DllImport("hid.dll")] static extern bool HidD_GetPreparsedData(SafeFileHandle device, out IntPtr data);
    [DllImport("hid.dll")] static extern bool HidD_FreePreparsedData(IntPtr data);
    [DllImport("hid.dll")] static extern int HidP_GetCaps(IntPtr data, out Caps caps);

    [StructLayout(LayoutKind.Sequential)]
    struct Caps {
      public ushort Usage, UsagePage, InputLength, OutputLength, FeatureLength;
      [MarshalAs(UnmanagedType.ByValArray, SizeConst = 27)] public ushort[] Reserved;
    }

    const string HID_INTERFACE = "#{4d1e55b2-f16f-11cf-88cb-001111000030}";

    // Chemins des interfaces HID présentes d'un appareil (VID, PID, interface USB).
    static string[] Paths(string id) {
      using (RegistryKey key = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Enum\HID\" + id)) {
        if (key == null) return new string[0];
        string[] instances = key.GetSubKeyNames();
        for (int i = 0; i < instances.Length; i++) instances[i] = @"\\?\HID#" + id + "#" + instances[i] + HID_INTERFACE;
        return instances;
      }
    }

    // Envoie une requête, renvoie la première réponse qui commence par `echo` (null : pas de réponse).
    static byte[] Ask(string path, byte[] request, byte echo) {
      using (SafeFileHandle handle = CreateFile(path, 0xC0000000, 3, IntPtr.Zero, 3, 0x40000000, IntPtr.Zero)) {
        if (handle.IsInvalid) return null; // appareil débranché (instance gardée par Windows)
        IntPtr parsed;
        if (!HidD_GetPreparsedData(handle, out parsed)) return null;
        Caps caps;
        HidP_GetCaps(parsed, out caps);
        HidD_FreePreparsedData(parsed);
        using (FileStream stream = new FileStream(handle, FileAccess.ReadWrite, 1, true)) {
          byte[] output = new byte[caps.OutputLength];
          Array.Copy(request, output, Math.Min(request.Length, output.Length));
          stream.Write(output, 0, output.Length);
          for (int tries = 0; tries < 4; tries++) {
            byte[] input = new byte[caps.InputLength];
            var read = stream.ReadAsync(input, 0, input.Length);
            if (!read.Wait(800)) return null;
            if (read.Result > 4 && input[1] == echo) return input;
          }
          return null;
        }
      }
    }

    static string Device(string name, int? level, bool charging) {
      return "{\"name\":\"" + name + "\",\"level\":" + (level.HasValue ? level.Value.ToString() : "null") +
        ",\"charging\":" + (charging ? "true" : "false") + "}";
    }

    // SteelSeries Arctis 7+ : requête 0xB0 ; réponse [id, B0, état (1 = éteint), niveau 0-4, charge (1)].
    static string Arctis(string id, string name) {
      foreach (string path in Paths(id)) {
        byte[] r;
        try { r = Ask(path, new byte[] { 0x00, 0xB0 }, 0xB0); } catch (IOException) { continue; }
        if (r == null) continue;
        if (r[2] == 0x01) return Device(name, null, false);
        return Device(name, Math.Min(4, (int)r[3]) * 25, r[4] == 0x01);
      }
      return null;
    }

    public static string Run(string line) {
      StringBuilder list = new StringBuilder("[");
      try {
        string[] found = { Arctis("VID_1038&PID_220E&MI_03", "Arctis 7+") };
        foreach (string device in found) {
          if (device == null) continue;
          if (list.Length > 1) list.Append(',');
          list.Append(device);
        }
      } catch (Exception error) {
        return "{\"error\":\"" + error.Message.Replace("\\", "/").Replace("\"", "'").Replace('\r', ' ').Replace('\n', ' ') + "\"}";
      }
      return list.Append(']').ToString();
    }
  }
}
