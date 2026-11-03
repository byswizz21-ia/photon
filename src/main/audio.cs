// Outil natif du volume (src/main/audio.ts) : API Core Audio de Windows, compilée par PowerShell
// (Add-Type) au premier usage. Une commande par ligne, une réponse JSON par ligne :
//   state            → {"volume":42,"muted":false,"current":"<id>","devices":[{"id":…,"name":…}]}
//   volume <0-100>   mute <0|1>   device <id>   → même réponse que state
//   apps             → {"apps":[{"id":"spotify","name":"Spotify","volume":80,"muted":false,"path":…}]}
//   appvolume <id> <0-100>   → même réponse que apps (toutes les sessions de cette app)
// Changer de sortie passe par IPolicyConfig, interface non documentée mais stable depuis
// Windows 7 (utilisée par SoundSwitch, AudioDeviceCmdlets…).
using System;
using System.Collections.Generic;
using System.Diagnostics;
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

  // Sessions audio (une par app qui joue ou a joué sur la sortie) : volume du mélangeur de Windows.
  [Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionManager2 {
    void GetAudioSessionControl(IntPtr group, int flags, out IntPtr control);
    void GetSimpleAudioVolume(IntPtr group, int flags, out IntPtr volume);
    void GetSessionEnumerator(out IAudioSessionEnumerator sessions);
  }

  [Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionEnumerator {
    void GetCount(out int count);
    void GetSession(int index, out IAudioSessionControl2 session);
  }

  [Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionControl2 {
    void GetState(out int state);
    void GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string name);
    void SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string name, ref Guid context);
    void GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string path);
    void SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string path, ref Guid context);
    void GetGroupingParam(out Guid param);
    void SetGroupingParam(ref Guid param, ref Guid context);
    void RegisterAudioSessionNotification(IntPtr notify);
    void UnregisterAudioSessionNotification(IntPtr notify);
    void GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string id);
    void GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string id);
    [PreserveSig] int GetProcessId(out uint pid);
    [PreserveSig] int IsSystemSoundsSession();
    void SetDuckingPreference([MarshalAs(UnmanagedType.Bool)] bool optOut);
  }

  [Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface ISimpleAudioVolume {
    void SetMasterVolume(float level, ref Guid context);
    void GetMasterVolume(out float level);
    void SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid context);
    void GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
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

    // Nom et chemin d'un processus, gardés : lire le module principal coûte quelques ms.
    static readonly Dictionary<uint, string[]> procs = new Dictionary<uint, string[]>();

    static string[] Proc(uint pid) {
      string[] known;
      if (procs.TryGetValue(pid, out known)) return known;
      string key = "", name = "", path = "";
      try {
        Process p = Process.GetProcessById((int)pid);
        key = p.ProcessName.ToLowerInvariant();
        name = p.ProcessName;
        try {
          path = p.MainModule.FileName;
          string description = p.MainModule.FileVersionInfo.FileDescription;
          if (!string.IsNullOrWhiteSpace(description)) name = description.Trim();
        } catch (Exception) { } // processus protégé ou 32 bits : nom court seulement
      } catch (Exception) { }
      known = new[] { key, name, path };
      procs[pid] = known;
      return known;
    }

    struct App { public string name, path; public float volume; public bool muted; public List<ISimpleAudioVolume> volumes; }

    // Sessions de la sortie par défaut, regroupées par app (Chrome en ouvre plusieurs).
    static SortedDictionary<string, App> ListApps() {
      IMMDevice device;
      Enumerator().GetDefaultAudioEndpoint(RENDER, 0, out device);
      Guid iid = typeof(IAudioSessionManager2).GUID;
      object result;
      device.Activate(ref iid, CLSCTX_ALL, IntPtr.Zero, out result);
      IAudioSessionEnumerator sessions;
      ((IAudioSessionManager2)result).GetSessionEnumerator(out sessions);
      int count;
      sessions.GetCount(out count);
      SortedDictionary<string, App> apps = new SortedDictionary<string, App>(StringComparer.Ordinal);
      for (int i = 0; i < count; i++) {
        IAudioSessionControl2 session;
        sessions.GetSession(i, out session);
        int state;
        session.GetState(out state);
        if (state == 2) continue; // session terminée
        string key, name, path = "";
        if (session.IsSystemSoundsSession() == 0) {
          key = "~system"; // trié en dernier
          name = "Sons système";
        } else {
          uint pid;
          session.GetProcessId(out pid);
          string[] proc = Proc(pid);
          if (proc[0] == "") continue;
          key = proc[0]; name = proc[1]; path = proc[2];
        }
        ISimpleAudioVolume volume = (ISimpleAudioVolume)session;
        App app;
        if (!apps.TryGetValue(key, out app)) {
          app = new App { name = name, path = path, volumes = new List<ISimpleAudioVolume>() };
          volume.GetMasterVolume(out app.volume);
          volume.GetMute(out app.muted);
        }
        app.volumes.Add(volume);
        apps[key] = app;
      }
      return apps;
    }

    static string Apps(SortedDictionary<string, App> apps) {
      StringBuilder list = new StringBuilder();
      foreach (KeyValuePair<string, App> entry in apps) {
        if (list.Length > 0) list.Append(',');
        list.Append("{\"id\":").Append(Quote(entry.Key)).Append(",\"name\":").Append(Quote(entry.Value.name))
          .Append(",\"volume\":").Append((int)Math.Round(entry.Value.volume * 100))
          .Append(",\"muted\":").Append(entry.Value.muted ? "true" : "false")
          .Append(",\"path\":").Append(Quote(entry.Value.path)).Append('}');
      }
      return "{\"apps\":[" + list + "]}";
    }

    public static string Run(string line) {
      try {
        string[] parts = line.Split(new[] { ' ' }, 2);
        string arg = parts.Length > 1 ? parts[1] : "";
        Guid context = Guid.Empty;
        switch (parts[0]) {
          case "apps":
            return Apps(ListApps());
          case "appvolume": {
            string[] args = arg.Split(' ');
            float level = Math.Max(0, Math.Min(100, int.Parse(args[1]))) / 100f;
            SortedDictionary<string, App> apps = ListApps();
            App app;
            if (apps.TryGetValue(args[0], out app)) foreach (ISimpleAudioVolume v in app.volumes) v.SetMasterVolume(level, ref context);
            return Apps(ListApps());
          }
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
