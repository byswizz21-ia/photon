// Citations intégrées, par thème (aucun réseau). Seulement des auteurs vérifiables : les
// citations célèbres mal attribuées (Einstein, Wilde, Confucius…) ont été laissées de côté.
// Ajouter une citation : une ligne [texte, auteur] dans le thème. Ajouter un thème : une entrée.
import { dayKey } from '../../../shared/day'

export type Quote = { text: string; author: string }

export const THEMES = {
  motivation: {
    label: 'Motivation',
    quotes: [
      [
        "Ce n'est pas parce que les choses sont difficiles que nous n'osons pas, c'est parce que nous n'osons pas qu'elles sont difficiles.",
        'Sénèque'
      ],
      ['Un voyage de mille lieues commence toujours par un premier pas.', 'Lao Tseu'],
      ['Rien ne sert de courir ; il faut partir à point.', 'Jean de La Fontaine'],
      ['Patience et longueur de temps font plus que force ni que rage.', 'Jean de La Fontaine'],
      ['Vingt fois sur le métier remettez votre ouvrage.', 'Nicolas Boileau'],
      ['À vaincre sans péril, on triomphe sans gloire.', 'Pierre Corneille'],
      ["Aux âmes bien nées, la valeur n'attend point le nombre des années.", 'Pierre Corneille'],
      [
        "Le génie est fait d'un pour cent d'inspiration et de quatre-vingt-dix-neuf pour cent de transpiration.",
        'Thomas Edison'
      ],
      [
        "On résiste à l'invasion des armées ; on ne résiste pas à l'invasion des idées.",
        'Victor Hugo'
      ],
      ["La meilleure façon de prédire l'avenir, c'est de l'inventer.", 'Alan Kay'],
      ['Restez affamés, restez fous.', 'Steve Jobs'],
      ["Il n'est pas de vent favorable pour celui qui ne sait pas où il va.", 'Sénèque']
    ]
  },
  business: {
    label: 'Business et travail',
    quotes: [
      [
        "Si vous n'avez pas honte de la première version de votre produit, vous l'avez lancée trop tard.",
        'Reid Hoffman'
      ],
      ['Avancer vite et casser des choses.', 'Mark Zuckerberg'],
      ["Le temps, c'est de l'argent.", 'Benjamin Franklin'],
      [
        "Votre temps est limité, ne le gâchez pas en vivant la vie de quelqu'un d'autre.",
        'Steve Jobs'
      ],
      [
        "Le design, ce n'est pas seulement ce à quoi ça ressemble. Le design, c'est comment ça marche.",
        'Steve Jobs'
      ],
      ["Le mieux est l'ennemi du bien.", 'Voltaire'],
      ["Le travail éloigne de nous trois grands maux : l'ennui, le vice et le besoin.", 'Voltaire'],
      ['Il faut cultiver notre jardin.', 'Voltaire'],
      [
        "Travaillez, prenez de la peine : c'est le fonds qui manque le moins.",
        'Jean de La Fontaine'
      ],
      [
        "Il semble que la perfection soit atteinte non quand il n'y a plus rien à ajouter, mais quand il n'y a plus rien à retrancher.",
        'Antoine de Saint-Exupéry'
      ]
    ]
  },
  code: {
    label: 'Code et tech',
    quotes: [
      [
        'Les programmes doivent être écrits pour être lus par des humains, et accessoirement pour être exécutés par des machines.',
        'Harold Abelson'
      ],
      [
        "N'importe quel imbécile peut écrire du code qu'un ordinateur comprend. Les bons programmeurs écrivent du code que les humains comprennent.",
        'Martin Fowler'
      ],
      ["L'optimisation prématurée est la racine de tous les maux.", 'Donald Knuth'],
      ['Parler ne coûte rien. Montre-moi le code.', 'Linus Torvalds'],
      [
        "Il n'y a que deux choses difficiles en informatique : l'invalidation de cache et le nommage des choses.",
        'Phil Karlton'
      ],
      [
        "Débugger est deux fois plus difficile qu'écrire le code. Si vous l'écrivez aussi intelligemment que possible, vous n'êtes donc pas assez intelligent pour le débugger.",
        'Brian Kernighan'
      ],
      ['Fais que ça marche, puis que ce soit juste, puis que ce soit rapide.', 'Kent Beck'],
      ['Toute technologie suffisamment avancée est indiscernable de la magie.', 'Arthur C. Clarke'],
      ['Le logiciel est en train de dévorer le monde.', 'Marc Andreessen'],
      [
        'Se demander si une machine peut penser est aussi intéressant que se demander si un sous-marin peut nager.',
        'Edsger Dijkstra'
      ],
      ["L'ordinateur est une bicyclette pour l'esprit.", 'Steve Jobs'],
      ['Les ordinateurs sont inutiles. Ils ne savent que donner des réponses.', 'Pablo Picasso']
    ]
  },
  philosophy: {
    label: 'Philosophie',
    quotes: [
      ['Je pense, donc je suis.', 'René Descartes'],
      ['Tout ce que je sais, c’est que je ne sais rien.', 'Socrate'],
      ['Connais-toi toi-même.', 'Temple de Delphes'],
      ["L'homme est condamné à être libre.", 'Jean-Paul Sartre'],
      ['Il faut imaginer Sisyphe heureux.', 'Albert Camus'],
      ['Le cœur a ses raisons que la raison ne connaît point.', 'Blaise Pascal'],
      [
        "L'homme n'est qu'un roseau, le plus faible de la nature ; mais c'est un roseau pensant.",
        'Blaise Pascal'
      ],
      ['Ce qui ne me tue pas me rend plus fort.', 'Friedrich Nietzsche'],
      ['On ne se baigne jamais deux fois dans le même fleuve.', 'Héraclite'],
      [
        'Ce ne sont pas les choses qui nous troublent, mais les jugements que nous portons sur les choses.',
        'Épictète'
      ],
      ["Ce n'est pas que nous ayons peu de temps, c'est que nous en perdons beaucoup.", 'Sénèque']
    ]
  },
  science: {
    label: 'Science',
    quotes: [
      ["L'imagination est plus importante que le savoir.", 'Albert Einstein'],
      ["Si j'ai vu plus loin, c'est en me tenant sur les épaules de géants.", 'Isaac Newton'],
      [
        "Dans les champs de l'observation, le hasard ne favorise que les esprits préparés.",
        'Louis Pasteur'
      ],
      ["Rien dans la vie n'est à craindre, tout est à comprendre.", 'Marie Curie'],
      ['Rien ne se perd, rien ne se crée, tout se transforme.', 'Antoine Lavoisier'],
      [
        'Le premier principe est de ne pas vous tromper vous-même, et vous êtes la personne la plus facile à tromper.',
        'Richard Feynman'
      ],
      ["Science sans conscience n'est que ruine de l'âme.", 'François Rabelais'],
      ["Nous sommes faits de matière d'étoiles.", 'Carl Sagan'],
      ['Le livre de la nature est écrit en langage mathématique.', 'Galilée']
    ]
  },
  sport: {
    label: 'Sport',
    quotes: [
      [
        "L'important dans la vie, ce n'est point le triomphe, mais le combat.",
        'Pierre de Coubertin'
      ],
      ['Plus vite, plus haut, plus fort.', 'Henri Didon'],
      ["Vole comme le papillon, pique comme l'abeille.", 'Muhammad Ali'],
      [
        "J'ai détesté chaque minute d'entraînement, mais je me disais : n'abandonne pas, souffre maintenant et vis le reste de ta vie en champion.",
        'Muhammad Ali'
      ],
      ['Tu rates 100 % des tirs que tu ne tentes pas.', 'Wayne Gretzky'],
      [
        "J'ai échoué encore et encore dans ma vie. Et c'est pour ça que je réussis.",
        'Michael Jordan'
      ],
      [
        "Le talent fait gagner des matchs, mais le travail d'équipe et l'intelligence font gagner des championnats.",
        'Michael Jordan'
      ],
      ["Ce n'est pas fini tant que ce n'est pas fini.", 'Yogi Berra'],
      [
        "Si tu ne vas plus chercher un trou qui existe, tu n'es plus un pilote de course.",
        'Ayrton Senna'
      ],
      ["Il n'y a pas de raccourci vers un endroit qui vaut la peine.", 'Beverly Sills']
    ]
  },
  art: {
    label: 'Art et création',
    quotes: [
      [
        "Tout enfant est un artiste. Le problème, c'est de rester un artiste en grandissant.",
        'Pablo Picasso'
      ],
      ["L'inspiration existe, mais elle doit te trouver au travail.", 'Pablo Picasso'],
      ['Sans la musique, la vie serait une erreur.', 'Friedrich Nietzsche'],
      [
        'Il faut porter encore en soi un chaos pour pouvoir mettre au monde une étoile dansante.',
        'Friedrich Nietzsche'
      ],
      [
        "On ne voit bien qu'avec le cœur. L'essentiel est invisible pour les yeux.",
        'Antoine de Saint-Exupéry'
      ],
      ['Créer, c’est vivre deux fois.', 'Albert Camus'],
      ["Le style est l'homme même.", 'Buffon'],
      [
        "La photographie, c'est mettre sur la même ligne de mire la tête, l'œil et le cœur.",
        'Henri Cartier-Bresson'
      ],
      ["La couleur est un moyen d'exercer une influence directe sur l'âme.", 'Vassily Kandinsky'],
      ["La vie est courte, l'art est long.", 'Hippocrate']
    ]
  },
  humor: {
    label: 'Humour',
    quotes: [
      ["Le travail, c'est la santé. Rien faire, c'est la conserver.", 'Henri Salvador'],
      ['Je peux résister à tout, sauf à la tentation.', 'Oscar Wilde'],
      [
        "Je ne voudrais pas faire partie d'un club qui accepterait de m'avoir pour membre.",
        'Groucho Marx'
      ],
      [
        "J'adore les dates butoirs. J'aime le bruit qu'elles font quand elles passent.",
        'Douglas Adams'
      ],
      [
        'La réponse à la grande question sur la vie, l’univers et le reste est 42.',
        'Douglas Adams'
      ],
      ["Une fois qu'on a passé les bornes, il n'y a plus de limites.", 'Alphonse Allais'],
      [
        "Ceux qui ne savent rien en savent toujours autant que ceux qui n'en savent pas plus qu'eux.",
        'Pierre Dac'
      ],
      [
        'Le football est un jeu simple : vingt-deux hommes courent après un ballon pendant quatre-vingt-dix minutes, et à la fin ce sont les Allemands qui gagnent.',
        'Gary Lineker'
      ]
    ]
  }
} satisfies Record<string, { label: string; quotes: [string, string][] }>

export type Theme = keyof typeof THEMES

// Citations perso, une par ligne : « Texte — Auteur » (tiret, demi-cadratin ou cadratin).
export function parseCustom(raw: string): Quote[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^(.+?)\s+[-–—]\s+([^-–—]+)$/.exec(line)
      return match ? { text: match[1]!, author: match[2]!.trim() } : { text: line, author: '' }
    })
}

export function pool(themes: string[], custom: string): Quote[] {
  const builtIn = themes
    .filter((t): t is Theme => t in THEMES)
    .flatMap((t) => THEMES[t].quotes.map(([text, author]) => ({ text, author })))
  return [...builtIn, ...parseCustom(custom)]
}

// Citation du jour : la même toute la journée, `skip` passe aux suivantes. Pas de 37 (premier) :
// l'ordre saute d'un thème à l'autre et fait le tour de la liste avant de se répéter.
// ponytail: si la liste compte un multiple de 37 citations, le tour est plus court.
export function pick(quotes: Quote[], now: Date, skip: number): Quote | null {
  if (!quotes.length) return null
  const day = Date.parse(dayKey(now)) / 86_400_000
  return quotes[((day + skip) * 37) % quotes.length] ?? null
}
