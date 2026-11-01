// Outil natif du volume (src/main/audio.ts) : API Core Audio de Windows, compilée par PowerShell
// (Add-Type) au premier usage. Une commande par ligne, une réponse JSON par ligne :
//   state            → {"volume":42,"muted":false,"current":"<id>","devices":[{"id":…,"name":…}]}
//   volume <0-100>   mute <0|1>   device <id>   → même réponse que state
// Changer de sortie passe par IPolicyConfig, interface non documentée mais stable depuis
// Windows 7 (utilisée par SoundSwitch, AudioDeviceCmdlets…).
using System;
using System.Runtime.InteropServices;
using System.Text;

namespace Photon {
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator {}
  [ComImport, Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9")] class PolicyConfigClient {}

  [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumerator {
    void EnumAudioEndpoints(int flow, int stateMask, out IMMDeviceCollection devices);
    void GetDefaultAudioEndpoint(int flow, int role, out IMMDevice device);
  }

  [Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceCollection {
    void GetCount(out int count);
    void Item(int index, out IMMDevice device);
  }

  [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDevice {
    void Activate(ref Guid iid, int context, IntPtr parameters, [MarshalAs(UnmanagedType.IUnknown)] out object result);
    void OpenPropertyStore(int access, out IPropertyStore store);
    void GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
  }

  [Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPropertyStore {
    void GetCount(out int count);
    void GetAt(int index, out PropertyKey key);
    void GetValue(ref PropertyKey key, out PropVariant value);
  }

  [StructLayout(LayoutKind.Sequential)] struct PropertyKey { public Guid fmtid; public int pid; }
  [StructLayout(LayoutKind.Sequential)] struct PropVariant { public ushort vt, r1, r2, r3; public IntPtr p, p2; }

  [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioEndpointVolume {
    void RegisterControlChangeNotify(IntPtr notify);
    void UnregisterControlChangeNotify(IntPtr notify);
    void GetChannelCount(out int count);
    void SetMasterVolumeLevel(float db, ref Guid context);
    void SetMasterVolumeLevelScalar(float level, ref Guid context);
    void GetMasterVolumeLevel(out float db);
    void GetMasterVolumeLevelScalar(out float level);
    void SetChannelVolumeLevel(int channel, float db, ref Guid context);
    void SetChannelVolumeLevelScalar(int channel, float level, ref Guid context);
    void GetChannelVolumeLevel(int channel, out float db);
    void GetChannelVolumeLevelScalar(int channel, out float level);
    void SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid context);
    void GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
  }

  [Guid("f8679f50-850a-41cf-9c72-430f290290c8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPolicyConfig {
    void GetMixFormat(string id, IntPtr format);
    void GetDeviceFormat(string id, int defaultFormat, IntPtr format);
    void ResetDeviceFormat(string id);
    void SetDeviceFormat(string id, IntPtr endpointFormat, IntPtr mixFormat);
    void GetProcessingPeriod(string id, int defaultPeriod, IntPtr defaultTime, IntPtr minTime);
    void SetProcessingPeriod(string id, IntPtr period);
    void GetShareMode(string id, IntPtr mode);
    void SetShareMode(string id, IntPtr mode);
    void GetPropertyValue(string id, IntPtr key, IntPtr value);
    void SetPropertyValue(string id, IntPtr key, IntPtr value);
    void SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string id, int role);
  }

  public static class Audio {
    const int RENDER = 0, ACTIVE = 1, CLSCTX_ALL = 23;

    [DllImport("ole32.dll")] static extern int PropVariantClear(ref PropVariant value);

    static IMMDeviceEnumerator Enumerator() { return (IMMDeviceEnumerator)new MMDeviceEnumerator(); }

    static IAudioEndpointVolume Volume() {
      IMMDevice device;
      Enumerator().GetDefaultAudioEndpoint(RENDER, 0, out device);
      Guid iid = typeof(IAudioEndpointVolume).GUID;
      object result;
      device.Activate(ref iid, CLSCTX_ALL, IntPtr.Zero, out result);
      return (IAudioEndpointVolume)result;
    }

    // Nom affiché par Windows (« Casque (Realtek Audio) »).
    static string Name(IMMDevice device) {
      IPropertyStore store;
      device.OpenPropertyStore(0, out store);
      PropertyKey key = new PropertyKey { fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"), pid = 14 };
      PropVariant value;
      store.GetValue(ref key, out value);
      string name = Marshal.PtrToStringUni(value.p) ?? "";
      PropVariantClear(ref value);
      return name;
    }

    static string Quote(string text) {
      StringBuilder sb = new StringBuilder("\"");
      foreach (char c in text) {
        if (c == '"' || c == '\\') sb.Append('\\').Append(c);
        else if (c < ' ') sb.AppendFormat("\\u{0:x4}", (int)c);
        else sb.Append(c);
      }
      return sb.Append('"').ToString();
    }

    static string State() {
      IMMDeviceEnumerator enumerator = Enumerator();
      IMMDevice current;
      enumerator.GetDefaultAudioEndpoint(RENDER, 0, out current);
      string currentId;
      current.GetId(out currentId);
      IMMDeviceCollection devices;
      enumerator.EnumAudioEndpoints(RENDER, ACTIVE, out devices);
      int count;
      devices.GetCount(out count);
      StringBuilder list = new StringBuilder();
      for (int i = 0; i < count; i++) {
        IMMDevice device;
        devices.Item(i, out device);
        string id;
        device.GetId(out id);
        if (i > 0) list.Append(',');
        list.Append("{\"id\":").Append(Quote(id)).Append(",\"name\":").Append(Quote(Name(device))).Append('}');
      }
      IAudioEndpointVolume volume = Volume();
      float level;
      bool muted;
      volume.GetMasterVolumeLevelScalar(out level);
      volume.GetMute(out muted);
      return "{\"volume\":" + (int)Math.Round(level * 100) + ",\"muted\":" + (muted ? "true" : "false") +
        ",\"current\":" + Quote(currentId) + ",\"devices\":[" + list + "]}";
    }

    public static string Run(string line) {
      try {
        string[] parts = line.Split(new[] { ' ' }, 2);
        string arg = parts.Length > 1 ? parts[1] : "";
        Guid context = Guid.Empty;
        switch (parts[0]) {
          case "volume":
            Volume().SetMasterVolumeLevelScalar(Math.Max(0, Math.Min(100, int.Parse(arg))) / 100f, ref context);
            break;
          case "mute":
            Volume().SetMute(arg == "1", ref context);
            break;
          case "device":
            IPolicyConfig policy = (IPolicyConfig)new PolicyConfigClient();
            for (int role = 0; role < 3; role++) policy.SetDefaultEndpoint(arg, role); // console, multimédia, communications
            break;
        }
        return State();
      } catch (Exception error) {
        return "{\"error\":" + Quote(error.Message) + "}";
      }
    }
  }
}
