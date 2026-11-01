// Markdown simple des réponses de Claude, découpé en blocs que Svelte affiche comme du texte :
// jamais de HTML injecté ({@html}), donc une réponse ne peut pas exécuter de code dans Photon.
// Couvre ce que Claude écrit vraiment : paragraphes, titres, listes, code, `code` et **gras**.

export type Inline = { kind: 'text' | 'code' | 'bold'; text: string }

export type Block =
  | { kind: 'paragraph'; inline: Inline[] }
  | { kind: 'heading'; inline: Inline[] }
  | { kind: 'list'; ordered: boolean; items: Inline[][] }
  | { kind: 'code'; lang: string; text: string }

export function inline(text: string): Inline[] {
  const parts: Inline[] = []
  // `code` d'abord (son contenu reste brut), puis **gras**.
  for (const [i, piece] of text.split(/(`[^`\n]+`)/).entries()) {
    if (!piece) continue
    if (i % 2 === 1) {
      parts.push({ kind: 'code', text: piece.slice(1, -1) })
      continue
    }
    for (const [j, part] of piece.split(/\*\*([^*\n]+)\*\*/).entries()) {
      if (part) parts.push({ kind: j % 2 === 1 ? 'bold' : 'text', text: part })
    }
  }
  return parts
}

const LIST_ITEM = /^\s*(?:([-*•])|(\d+)[.)])\s+(.*)$/

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = []
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  let paragraph: string[] = []

  const flush = (): void => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', inline: inline(paragraph.join('\n')) })
    paragraph = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const fence = /^\s*```(\S*)/.exec(line)
    if (fence) {
      flush()
      const body: string[] = []
      // Bloc pas encore fermé (réponse en cours) : tout le reste est du code.
      while (++i < lines.length && !/^\s*```\s*$/.test(lines[i] ?? '')) body.push(lines[i] ?? '')
      blocks.push({ kind: 'code', lang: fence[1] ?? '', text: body.join('\n') })
      continue
    }
    const heading = /^#{1,6}\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      blocks.push({ kind: 'heading', inline: inline(heading[1] ?? '') })
      continue
    }
    const item = LIST_ITEM.exec(line)
    if (item) {
      flush()
      const ordered = item[2] !== undefined
      const last = blocks.at(-1)
      if (last?.kind === 'list' && last.ordered === ordered) last.items.push(inline(item[3] ?? ''))
      else blocks.push({ kind: 'list', ordered, items: [inline(item[3] ?? '')] })
      continue
    }
    if (line.trim()) paragraph.push(line)
    else flush()
  }
  flush()
  return blocks
}
