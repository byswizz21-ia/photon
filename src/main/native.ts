// Outils natifs Windows (fichiers .cs) gardés ouverts dans un PowerShell : compilés une fois
// (≈ 0,6 s), puis quelques ms par commande. Une commande par ligne, une réponse par ligne.
// Chaque outil s'arrête tout seul à la fermeture de Photon (son entrée standard se ferme).
// Le code C# arrive par l'entrée standard, avant les commandes : en ligne de commande
// (-EncodedCommand), il butait sur la limite de 32 767 caractères de Windows.
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface } from 'node:readline'

const STUCK_MS = 10_000 // outil bloqué : on le tue, la commande suivante le relance
const END_OF_SOURCE = '#photon-end-of-source'

// className : classe C# exposant `public static string Run(string line)`.
export function nativeTool(source: string, className: string) {
  const script = `[Console]::InputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$source = [Text.StringBuilder]::new()
while ($null -ne ($line = [Console]::In.ReadLine()) -and $line -ne '${END_OF_SOURCE}') { [void]$source.AppendLine($line) }
Add-Type -TypeDefinition $source.ToString()
while ($null -ne ($line = [Console]::In.ReadLine())) { [Console]::Out.WriteLine([${className}]::Run($line)) }`
  let child: ChildProcessWithoutNullStreams | null = null
  const waiting: ((line: string | null) => void)[] = [] // une réponse par ligne, dans l'ordre

  function helper(): ChildProcessWithoutNullStreams {
    if (child) return child
    const proc = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        Buffer.from(script, 'utf16le').toString('base64')
      ],
      { windowsHide: true }
    )
    const stop = (): void => {
      if (child === proc) child = null
      for (const reply of waiting.splice(0)) reply(null)
    }
    proc.on('exit', stop)
    proc.on('error', stop)
    proc.stdin.on('error', () => {}) // outil déjà fermé : la réponse arrive à null par stop()
    createInterface({ input: proc.stdout }).on('line', (line) => waiting.shift()?.(line))
    proc.stdin.write(`${source}\n${END_OF_SOURCE}\n`)
    child = proc
    return proc
  }

  // Réponse brute, ou null si l'outil est indisponible ou plus lent que `wait` ms.
  // Une réponse en retard est quand même consommée : l'ordre des lignes reste juste.
  function send(command: string, wait = STUCK_MS): Promise<string | null> {
    return new Promise((resolve) => {
      const proc = helper()
      const late = setTimeout(() => resolve(null), wait)
      const stuck = setTimeout(() => proc.kill(), STUCK_MS)
      waiting.push((line) => {
        clearTimeout(late)
        clearTimeout(stuck)
        resolve(line)
      })
      proc.stdin.write(`${command}\n`)
    })
  }

  return { send, start: (): void => void helper() }
}
