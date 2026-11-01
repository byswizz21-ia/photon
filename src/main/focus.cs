// Outil natif « Ne pas déranger » (src/main/focus.ts). Windows n'a pas d'API publique : on passe
// par le service COM QuietHoursSettings, non documenté mais présent depuis Windows 10 1903
// (utilisé par WinDndToggle, traywise…). Une commande par ligne, une réponse par ligne :
//   get              → profil actuel, ex. Microsoft.QuietHoursProfile.Unrestricted (DND coupé)
//   set <profil>     → ok
// Profils : Unrestricted (coupé), PriorityOnly (prioritaires seulement), AlarmsOnly.
using System;
using System.Runtime.InteropServices;

namespace Photon {
  // Méthodes aux emplacements 3 et 4 de la vtable, juste après IUnknown.
  [ComImport, Guid("6BFF4732-81EC-4FFB-AE67-B6C1BC29631F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IQuietHoursSettings {
    [PreserveSig] int GetUserSelectedProfile(out IntPtr profile); // chaîne CoTaskMem
    [PreserveSig] int SetUserSelectedProfile([MarshalAs(UnmanagedType.LPWStr)] string profile);
  }

  public static class Dnd {
    static IQuietHoursSettings Settings() {
      var type = Type.GetTypeFromCLSID(new Guid("F53321FA-34F8-4B7F-B9A3-361877CB94CF"));
      return (IQuietHoursSettings)Activator.CreateInstance(type);
    }

    public static string Run(string line) {
      try {
        line = line.Trim();
        if (line == "get") {
          IntPtr text;
          int hr = Settings().GetUserSelectedProfile(out text);
          if (hr != 0) return "error " + hr.ToString("x8");
          string profile = Marshal.PtrToStringUni(text);
          Marshal.FreeCoTaskMem(text);
          return profile;
        }
        if (line.StartsWith("set ")) {
          int hr = Settings().SetUserSelectedProfile(line.Substring(4));
          return hr == 0 ? "ok" : "error " + hr.ToString("x8");
        }
        return "error commande inconnue";
      } catch (Exception e) {
        return "error " + e.Message.Replace("\n", " ");
      }
    }
  }
}
