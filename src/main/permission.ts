// Mode Agent : ce que Claude veut faire, écrit pour être relu avant d'accepter. Le détail montre
// tout ce qui compte (commande entière, fichier visé, texte écrit) : on n'accepte pas à l'aveugle.
const MAX_DETAIL = 4_000

const text = (v: unknown): string => (typeof v === 'string' ? v : '')

const cut = (s: string): string =>
  s.length > MAX_DETAIL
    ? `${s.slice(0, MAX_DETAIL)}\n… (${s.length - MAX_DETAIL} caractères de plus)`
    : s

export function describeAction(
  tool: string,
  input: Record<string, unknown>
): { title: string; detail: string } {
  switch (tool) {
    case 'Bash':
    case 'PowerShell':
      return {
        title: text(input['description']) || 'Exécuter une commande',
        detail: cut(text(input['command']))
      }
    case 'Write':
      return {
        title: 'Créer ou remplacer un fichier',
        detail: cut(`${text(input['file_path'])}\n\n${text(input['content'])}`)
      }
    case 'Edit':
      return {
        title: 'Modifier un fichier',
        detail: cut(
          `${text(input['file_path'])}\n\n- ${text(input['old_string'])}\n+ ${text(input['new_string'])}`
        )
      }
    case 'WebFetch':
      return { title: 'Ouvrir une page web', detail: cut(text(input['url'])) }
    case 'WebSearch':
      return { title: 'Chercher sur le web', detail: cut(text(input['query'])) }
    default:
      return { title: `Utiliser l'outil ${tool}`, detail: cut(JSON.stringify(input, null, 2)) }
  }
}
