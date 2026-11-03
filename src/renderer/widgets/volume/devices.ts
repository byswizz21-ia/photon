// Sorties audio : nom affiché et genre d'appareil (Windows ne donne pas le type simplement).

// « Casque (Realtek Audio) » → nom « Casque », détail « Realtek Audio ».
export function split(name: string): [string, string] {
  const match = /^(.*) \(([^()]*)\)$/.exec(name)
  return match ? [match[1]!, match[2]!] : [name, '']
}

export type DeviceKind = 'headphones' | 'monitor' | 'speaker'

export function deviceKind(name: string): DeviceKind {
  if (/casque|headphone|headset|écouteur|earphone|arctis|airpods|buds/i.test(name))
    return 'headphones'
  if (/écran|monitor|display|hdmi|nvidia|\btv\b|téléviseur/i.test(name)) return 'monitor'
  return 'speaker'
}
