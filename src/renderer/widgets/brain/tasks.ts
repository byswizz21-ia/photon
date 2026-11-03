// Ce que le widget demande à Claude : pour chaque tâche, la consigne, le schéma JSON de la réponse
// (imposé par Claude Code) et la relecture, qui borne tout ce qui revient avant affichage.
import { TEXT } from './data'

export interface Task<T> {
  prompt: string
  schema: object
  parse(value: unknown): T | null
}

// --- Schémas ---

const S = { type: 'string' } as const
const N = { type: 'number' } as const
const obj = (properties: Record<string, object>): object => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false
})
const arr = (items: object, minItems: number, maxItems: number): object => ({
  type: 'array',
  items,
  minItems,
  maxItems
})
const MCQ = obj({ q: S, options: arr(S, 4, 4), answer: N, why: S })

// --- Relecture ---

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown, max = 1200): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : ''
const score = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(100, Math.max(0, v))) : 0
const strings = (v: unknown, max: number): string[] =>
  (Array.isArray(v) ? v : [])
    .map((s) => text(s, 300))
    .filter(Boolean)
    .slice(0, max)

export interface Mcq {
  q: string
  options: string[]
  answer: number // index de la bonne option
  why: string
}

function mcq(v: unknown): Mcq | null {
  if (!isObject(v)) return null
  const options = strings(v.options, 4)
  const answer = typeof v.answer === 'number' ? Math.round(v.answer) : -1
  const q = text(v.q, TEXT.q)
  if (!q || options.length !== 4 || answer < 0 || answer > 3) return null
  return { q, options, answer, why: text(v.why, 600) }
}

const mcqs = (v: unknown, min: number): Mcq[] | null => {
  const list = (Array.isArray(v) ? v : []).map(mcq).filter((m) => m !== null)
  return list.length >= min ? list : null
}

// Texte de l'utilisateur placé entre balises : Claude le lit comme matière, pas comme consigne.
const quote = (tag: string, value: string): string => `<${tag}>\n${value.trim()}\n</${tag}>`

// --- Mémoire : cartes depuis un texte ---

export interface CardsResult {
  title: string
  cards: { q: string; a: string }[]
}

export function cardsTask(source: string, count: number, focus = ''): Task<CardsResult> {
  return {
    prompt: [
      `Crée ${count} cartes de révision (question / réponse) à partir de la matière ci-dessous.`,
      'Règles : une seule idée par carte ; questions qui font réfléchir (pourquoi, comment, différence entre…), pas du par cœur de mots ; réponses courtes (1 à 3 phrases) et autonomes ; couvre les notions les plus importantes d’abord ; garde la langue des termes techniques.',
      focus ? `Objectif de l'apprenant : ${focus}` : '',
      'Donne aussi un titre court au paquet (3 à 5 mots).',
      quote('matiere', source)
    ]
      .filter(Boolean)
      .join('\n\n'),
    schema: obj({ title: S, cards: arr(obj({ q: S, a: S }), 1, 40) }),
    parse(v) {
      if (!isObject(v) || !Array.isArray(v.cards)) return null
      const cards = v.cards
        .filter(isObject)
        .map((c) => ({ q: text(c.q, TEXT.q), a: text(c.a, TEXT.a) }))
        .filter((c) => c.q && c.a)
        .slice(0, 40)
      return cards.length ? { title: text(v.title, TEXT.name) || 'Nouveau paquet', cards } : null
    }
  }
}

// --- Entraînement : séance du jour ---

export const PROBLEM_KINDS = {
  logic: 'logique',
  estimation: 'estimation (type Fermi)',
  math: 'maths du quotidien',
  lateral: 'pensée latérale',
  strategy: 'stratégie et décision'
} as const
export type ProblemKind = keyof typeof PROBLEM_KINDS

export interface Session {
  problem: { kind: string; title: string; statement: string; hint: string; solution: string }
  calibration: Mcq[]
  bias: Mcq & { scenario: string }
  concept: { name: string; why: string }
}

export function sessionTask(kind: ProblemKind, level: number, known: string[]): Task<Session> {
  return {
    prompt: [
      'Prépare la séance quotidienne de musculation mentale (environ 10 minutes) :',
      `1. problem : un problème de ${PROBLEM_KINDS[kind]}, difficulté ${level}/5, résoluble de tête ou sur papier en 3 à 5 minutes, sans connaissance pointue. Énoncé précis et complet, un indice qui débloque sans donner la réponse, une solution rédigée étape par étape.`,
      '2. calibration : 5 questions de culture générale variées (sciences, histoire, géographie, chiffres), à 4 options, de difficulté moyenne à dure : la bonne réponse ne doit pas être évidente. answer = index (0 à 3) de la bonne option, why = une phrase d’explication. Faits vérifiables uniquement.',
      '3. bias : un court scénario réaliste (3 à 5 phrases, vie quotidienne, pub, média, travail) qui contient un biais cognitif ou un sophisme. q = « Quel piège se cache ici ? », 4 noms de biais plausibles en options, answer = index du bon, why = explication en 2 phrases.',
      '4. concept : une notion utile et un peu surprenante à expliquer avec ses mots (science, économie, psycho, informatique), avec why = pourquoi elle vaut le coup en une phrase.',
      known.length ? `Évite ces notions déjà vues : ${known.slice(-30).join(', ')}.` : '',
      'Varie les thèmes d’un jour à l’autre.'
    ]
      .filter(Boolean)
      .join('\n'),
    schema: obj({
      problem: obj({ kind: S, title: S, statement: S, hint: S, solution: S }),
      calibration: arr(MCQ, 5, 5),
      bias: obj({ scenario: S, q: S, options: arr(S, 4, 4), answer: N, why: S }),
      concept: obj({ name: S, why: S })
    }),
    parse(v) {
      if (!isObject(v) || !isObject(v.problem) || !isObject(v.bias) || !isObject(v.concept)) {
        return null
      }
      const p = v.problem
      const problem = {
        kind: text(p.kind, 60) || PROBLEM_KINDS[kind],
        title: text(p.title, TEXT.name),
        statement: text(p.statement, 2000),
        hint: text(p.hint, 600),
        solution: text(p.solution, 3000)
      }
      const calibration = mcqs(v.calibration, 3)
      const bias = mcq(v.bias)
      const scenario = text(v.bias.scenario, 1500)
      const concept = { name: text(v.concept.name, TEXT.name), why: text(v.concept.why, 400) }
      if (!problem.statement || !calibration || !bias || !scenario || !concept.name) return null
      return { problem, calibration, bias: { ...bias, scenario }, concept }
    }
  }
}

// --- Corrections ---

export interface Verdict {
  score: number // 0 à 100
  verdict: string // une phrase
  feedback: string
}

export function judgeTask(statement: string, solution: string, answer: string): Task<Verdict> {
  return {
    prompt: [
      'Corrige la réponse de l’apprenant à ce problème. Note le raisonnement autant que le résultat (0 = rien de juste, 100 = juste et bien raisonné). verdict : une phrase. feedback : ce qui est bien, l’erreur principale s’il y en a une, et la prochaine fois quoi faire, en 3 à 5 phrases.',
      quote('probleme', statement),
      quote('solution_de_reference', solution),
      quote('reponse_apprenant', answer)
    ].join('\n\n'),
    schema: obj({ score: N, verdict: S, feedback: S }),
    parse: (v) =>
      isObject(v)
        ? { score: score(v.score), verdict: text(v.verdict, 300), feedback: text(v.feedback, 1500) }
        : null
  }
}

export interface Explanation {
  score: number
  summary: string // ce qui est juste, en une phrase
  gaps: string[] // trous de compréhension
  vague: string[] // passages flous ou jargon non expliqué
  better: string // explication modèle, simple
}

export function feynmanTask(concept: string, explanation: string): Task<Explanation> {
  return {
    prompt: [
      `Méthode Feynman. L’apprenant explique « ${concept} » avec ses mots, comme à quelqu’un de 12 ans. Évalue la compréhension réelle, pas le style.`,
      'score : 0 à 100. summary : ce qui est juste, une phrase. gaps : idées clés absentes ou fausses (0 à 4, courtes). vague : expressions floues, circulaires ou jargon non expliqué, cités entre guillemets (0 à 4). better : une explication modèle simple en 3 à 5 phrases, avec une analogie.',
      quote('explication', explanation)
    ].join('\n\n'),
    schema: obj({ score: N, summary: S, gaps: arr(S, 0, 4), vague: arr(S, 0, 4), better: S }),
    parse: (v) =>
      isObject(v)
        ? {
            score: score(v.score),
            summary: text(v.summary, 400),
            gaps: strings(v.gaps, 4),
            vague: strings(v.vague, 4),
            better: text(v.better, 1500)
          }
        : null
  }
}

// --- Coach : parcours ---

export interface Plan {
  title: string
  steps: { title: string; detail: string; minutes: number }[]
  pretest: Mcq[]
}

export const LEVELS = ['Débutant', 'Quelques bases', 'Intermédiaire', 'Avancé'] as const

export function planTask(topic: string, level: string, minutes: number, weeks: number): Task<Plan> {
  return {
    prompt: [
      `Construis un parcours pour apprendre : « ${topic} ».`,
      `Niveau de départ : ${level}. Temps disponible : ${minutes} minutes par jour pendant ${weeks} semaine(s).`,
      'title : nom court du parcours. steps : 5 à 8 étapes dans l’ordre, chacune avec un titre court, un détail concret (quoi apprendre, quel exercice faire, quel petit projet ; 2 à 3 phrases) et une durée en minutes. Le parcours alterne apprendre, pratiquer et expliquer ; la dernière étape est un mini-projet qui prouve la compétence.',
      'pretest : 5 questions à 4 options qui couvrent tout le parcours, du plus simple au plus dur, pour mesurer ce que l’apprenant sait déjà (answer = index de la bonne option, why = une phrase).'
    ].join('\n\n'),
    schema: obj({
      title: S,
      steps: arr(obj({ title: S, detail: S, minutes: N }), 3, 8),
      pretest: arr(MCQ, 3, 6)
    }),
    parse(v) {
      if (!isObject(v) || !Array.isArray(v.steps)) return null
      const steps = v.steps
        .filter(isObject)
        .map((s) => ({
          title: text(s.title, TEXT.name),
          detail: text(s.detail, TEXT.detail),
          minutes:
            typeof s.minutes === 'number' ? Math.round(Math.min(600, Math.max(5, s.minutes))) : 30
        }))
        .filter((s) => s.title)
        .slice(0, 8)
      const pretest = mcqs(v.pretest, 3)
      return steps.length >= 3 && pretest
        ? { title: text(v.title, TEXT.name) || topic, steps, pretest }
        : null
    }
  }
}

// --- Appel ---

export async function run<T>(task: Task<T>): Promise<{ value: T | null; error: string | null }> {
  try {
    const reply = await window.photon.brainAsk(task.prompt, task.schema)
    if (reply.error) return { value: null, error: reply.error }
    const value = task.parse(reply.value)
    return value ? { value, error: null } : { value: null, error: 'Réponse incomplète, réessaie' }
  } catch {
    return { value: null, error: 'Claude Code ne répond pas' }
  }
}
