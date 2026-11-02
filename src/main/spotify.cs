// Outil natif Spotify (src/main/spotify.ts) : l'app Spotify de Windows, lue et pilotée par les
// contrôles média de Windows (ceux des touches multimédia), volume par son entrée du mélangeur.
// Une commande par ligne, une réponse JSON par ligne :
//   state | toggle | next | previous | shuffle | repeat | seek <secondes> | volume <0-100>
//     → {"found":false} ou {"found":true,"title":…,"artist":…,"playing":…,"time":…,"duration":…,
//        "canSeek":…,"volume":<0-100, -1 si Spotify ne joue sur aucune sortie>,
//        "shuffle":<true|false|null>,"repeat":<"none"|"all"|"one"|null>,"art":"<clé>"}
//   repeat fait tourner : désactivé → toute la file → ce morceau → désactivé.
//   art → {"data":"data:image/…;base64,…"} (pochette du morceau en cours, "" sans pochette)
// Les API WinRT sont appelées par réflexion : Add-Type (C# 5 de .NET Framework) ne sait pas
// référencer les .winmd de Windows.
using System;
using System.Collections;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;

namespace Photon {
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator {}

  [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumerator {
    void EnumAudioEndpoints(int flow, int stateMask, out IMMDeviceCollection devices);
  }

  [Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceCollection {
    void GetCount(out int count);
    void Item(int index, out IMMDevice device);
  }

  [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDevice {
    void Activate(ref Guid iid, int context, IntPtr parameters, [MarshalAs(UnmanagedType.IUnknown)] out object result);
  }

  [Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionManager2 {
    void GetAudioSessionControl(IntPtr guid, int flags, out IntPtr control);
    void GetSimpleAudioVolume(IntPtr guid, int flags, out IntPtr volume);
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
    void GetDisplayName(out IntPtr name);
    void SetDisplayName(IntPtr name, IntPtr context);
    void GetIconPath(out IntPtr path);
    void SetIconPath(IntPtr path, IntPtr context);
    void GetGroupingParam(out Guid param);
    void SetGroupingParam(IntPtr param, IntPtr context);
    void RegisterAudioSessionNotification(IntPtr events);
    void UnregisterAudioSessionNotification(IntPtr events);
    void GetSessionIdentifier(out IntPtr id);
    void GetSessionInstanceIdentifier(out IntPtr id);
    void GetProcessId(out int pid);
  }

  [Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface ISimpleAudioVolume {
    void SetMasterVolume(float level, ref Guid context);
    void GetMasterVolume(out float level);
  }

  public static class Spotify {
    const string WINRT = ", ContentType=WindowsRuntime";
    const string NET = ", System.Runtime.WindowsRuntime, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089";

    static Type Media(string name) {
      return Type.GetType("Windows.Media.Control.GlobalSystemMediaTransportControlsSession" + name + ", Windows.Media.Control" + WINRT, true);
    }

    static readonly Type Manager = Media("Manager"), Session = Media(""), Props = Media("MediaProperties"),
      Timeline = Media("TimelineProperties"), Playback = Media("PlaybackInfo"), Controls = Media("PlaybackControls");
    static readonly Type RepeatMode = Type.GetType("Windows.Media.MediaPlaybackAutoRepeatMode, Windows.Media" + WINRT, true);
    static readonly string[] REPEAT = { "none", "one", "all" }; // valeurs de MediaPlaybackAutoRepeatMode
    static readonly Type StreamRef = Type.GetType("Windows.Storage.Streams.IRandomAccessStreamReference, Windows.Storage.Streams" + WINRT, true);
    static readonly Type StreamTyped = Type.GetType("Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams" + WINRT, true);
    static readonly Type ContentType = Type.GetType("Windows.Storage.Streams.IContentTypeProvider, Windows.Storage.Streams" + WINRT, true);
    static readonly MethodInfo AsTask = Type.GetType("System.WindowsRuntimeSystemExtensions" + NET, true).GetMethods()
      .First(m => m.Name == "AsTask" && m.IsGenericMethod && m.GetParameters().Length == 1 &&
        m.GetParameters()[0].ParameterType.Name == "IAsyncOperation`1");
    static readonly MethodInfo AsStream = Type.GetType("System.IO.WindowsRuntimeStreamExtensions" + NET, true).GetMethods()
      .First(m => m.Name == "AsStreamForRead" && m.GetParameters().Length == 1);

    static object manager;

    static object Await(object operation, Type result) {
      object task = AsTask.MakeGenericMethod(result).Invoke(null, new[] { operation });
      return task.GetType().GetProperty("Result").GetValue(task);
    }

    static object Get(object target, Type type, string name) { return type.GetProperty(name).GetValue(target); }
    static object Call(object target, Type type, string name, params object[] args) { return type.GetMethod(name).Invoke(target, args); }

    // Session média de Spotify (app du Store ou Spotify.exe), null si Spotify n'en a pas.
    static object Find() {
      if (manager == null) manager = Await(Manager.GetMethod("RequestAsync").Invoke(null, null), Manager);
      foreach (object session in (IEnumerable)Call(manager, Manager, "GetSessions")) {
        string app = (string)Get(session, Session, "SourceAppUserModelId") ?? "";
        if (app.IndexOf("spotify", StringComparison.OrdinalIgnoreCase) >= 0) return session;
      }
      return null;
    }

    // Volume de Spotify dans le mélangeur, -1 s'il n'y a pas d'entrée ; level >= 0 : le règle
    // d'abord sur toutes ses entrées.
    static int Volume(float level) {
      int result = -1;
      Guid context = Guid.Empty;
      foreach (ISimpleAudioVolume volume in Volumes()) {
        if (level >= 0) volume.SetMasterVolume(level, ref context);
        float current;
        volume.GetMasterVolume(out current);
        result = (int)Math.Round(current * 100);
      }
      return result;
    }

    // Entrées du mélangeur de Spotify, toutes sorties confondues.
    static ISimpleAudioVolume[] Volumes() {
      IMMDeviceCollection devices;
      ((IMMDeviceEnumerator)new MMDeviceEnumerator()).EnumAudioEndpoints(0, 1, out devices);
      int count;
      devices.GetCount(out count);
      var found = new System.Collections.Generic.List<ISimpleAudioVolume>();
      for (int i = 0; i < count; i++) {
        IMMDevice device;
        devices.Item(i, out device);
        Guid iid = typeof(IAudioSessionManager2).GUID;
        object result;
        device.Activate(ref iid, 23, IntPtr.Zero, out result);
        IAudioSessionEnumerator sessions;
        ((IAudioSessionManager2)result).GetSessionEnumerator(out sessions);
        int n;
        sessions.GetCount(out n);
        for (int j = 0; j < n; j++) {
          IAudioSessionControl2 control;
          sessions.GetSession(j, out control);
          int pid;
          control.GetProcessId(out pid);
          if (pid != 0 && IsSpotify(pid)) found.Add((ISimpleAudioVolume)control);
        }
      }
      return found.ToArray();
    }

    static bool IsSpotify(int pid) {
      try { return Process.GetProcessById(pid).ProcessName.Equals("Spotify", StringComparison.OrdinalIgnoreCase); }
      catch (ArgumentException) { return false; } // processus terminé entre-temps
    }

    static string Quote(string text) {
      StringBuilder sb = new StringBuilder("\"");
      foreach (char c in text ?? "") {
        if (c == '"' || c == '\\') sb.Append('\\').Append(c);
        else if (c < ' ') sb.AppendFormat("\\u{0:x4}", (int)c);
        else sb.Append(c);
      }
      return sb.Append('"').ToString();
    }

    static string Number(double value) { return value.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture); }

    static string State(object session) {
      if (session == null) return "{\"found\":false}";
      object props = Await(Call(session, Session, "TryGetMediaPropertiesAsync"), Props);
      object timeline = Call(session, Session, "GetTimelineProperties");
      object playback = Call(session, Session, "GetPlaybackInfo");
      bool playing = Get(playback, Playback, "PlaybackStatus").ToString() == "Playing";
      object controls = Get(playback, Playback, "Controls");
      bool canSeek = (bool)Get(controls, Controls, "IsPlaybackPositionEnabled");
      // Nullable : null si Spotify ne publie pas l'état.
      object shuffle = (bool)Get(controls, Controls, "IsShuffleEnabled") ? Get(playback, Playback, "IsShuffleActive") : null;
      object repeat = (bool)Get(controls, Controls, "IsRepeatEnabled") ? Get(playback, Playback, "AutoRepeatMode") : null;
      double duration = ((TimeSpan)Get(timeline, Timeline, "EndTime")).TotalSeconds;
      double time = ((TimeSpan)Get(timeline, Timeline, "Position")).TotalSeconds;
      // Spotify ne publie la position qu'aux changements : on avance depuis la dernière mise à jour.
      if (playing) time += (DateTimeOffset.Now - (DateTimeOffset)Get(timeline, Timeline, "LastUpdatedTime")).TotalSeconds;
      time = Math.Max(0, duration > 0 ? Math.Min(time, duration) : time);
      int volume = Volume(-1);
      string title = (string)Get(props, Props, "Title"), artist = (string)Get(props, Props, "Artist");
      return "{\"found\":true,\"title\":" + Quote(title) + ",\"artist\":" + Quote(artist) +
        ",\"playing\":" + (playing ? "true" : "false") + ",\"time\":" + Number(time) + ",\"duration\":" + Number(duration) +
        ",\"canSeek\":" + (canSeek ? "true" : "false") + ",\"volume\":" + volume +
        ",\"shuffle\":" + (shuffle == null ? "null" : (bool)shuffle ? "true" : "false") +
        ",\"repeat\":" + (repeat == null ? "null" : Quote(REPEAT[Convert.ToInt32(repeat)])) +
        ",\"art\":" + Quote(title + "\n" + artist + "\n" + Get(props, Props, "AlbumTitle")) + "}";
    }

    static string Art(object session) {
      if (session == null) return "{\"data\":\"\"}";
      object props = Await(Call(session, Session, "TryGetMediaPropertiesAsync"), Props);
      object thumbnail = Get(props, Props, "Thumbnail");
      if (thumbnail == null) return "{\"data\":\"\"}";
      object stream = Await(Call(thumbnail, StreamRef, "OpenReadAsync"), StreamTyped);
      string type = (string)Get(stream, ContentType, "ContentType");
      using (Stream input = (Stream)AsStream.Invoke(null, new[] { stream }))
      using (MemoryStream bytes = new MemoryStream()) {
        input.CopyTo(bytes);
        if (!type.StartsWith("image/") || bytes.Length > 2 * 1024 * 1024) return "{\"data\":\"\"}";
        return "{\"data\":" + Quote("data:" + type + ";base64," + Convert.ToBase64String(bytes.ToArray())) + "}";
      }
    }

    public static string Run(string line) {
      try {
        string[] parts = line.Split(new[] { ' ' }, 2);
        string arg = parts.Length > 1 ? parts[1] : "";
        object session = Find();
        if (session != null) {
          switch (parts[0]) {
            case "art": return Art(session);
            case "toggle": Await(Call(session, Session, "TryTogglePlayPauseAsync"), typeof(bool)); break;
            case "next": Await(Call(session, Session, "TrySkipNextAsync"), typeof(bool)); break;
            case "previous": Await(Call(session, Session, "TrySkipPreviousAsync"), typeof(bool)); break;
            case "shuffle": {
              object active = Get(Call(session, Session, "GetPlaybackInfo"), Playback, "IsShuffleActive");
              Await(Call(session, Session, "TryChangeShuffleActiveAsync", !(active is bool && (bool)active)), typeof(bool));
              break;
            }
            case "repeat": {
              object mode = Get(Call(session, Session, "GetPlaybackInfo"), Playback, "AutoRepeatMode");
              int next = mode == null ? 2 : new[] { 2, 0, 1 }[Convert.ToInt32(mode)]; // none→all→one→none
              Await(Call(session, Session, "TryChangeAutoRepeatModeAsync", Enum.ToObject(RepeatMode, next)), typeof(bool));
              break;
            }
            case "seek":
              long ticks = TimeSpan.FromSeconds(Math.Max(0, double.Parse(arg, System.Globalization.CultureInfo.InvariantCulture))).Ticks;
              Await(Call(session, Session, "TryChangePlaybackPositionAsync", ticks), typeof(bool));
              break;
            case "volume":
              Volume(Math.Max(0, Math.Min(100, int.Parse(arg))) / 100f);
              break;
          }
        }
        return parts[0] == "art" ? Art(session) : State(session);
      } catch (Exception error) {
        Exception cause = error is TargetInvocationException && error.InnerException != null ? error.InnerException : error;
        return "{\"error\":" + Quote(cause.Message) + "}";
      }
    }
  }
}
