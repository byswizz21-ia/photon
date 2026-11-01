// Calculs tapés dans la barre de commande (« 24*17 », « 2^10 », « (3,5+1)/2 »).
// Petit analyseur maison : jamais d'eval sur du texte tapé.

type Token = number | string

function tokenize(text: string): Token[] | null {
  const tokens: Token[] = []
  const source = text.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '')
  let i = 0
  while (i < source.length) {
    const number = /^\d+(?:[.,]\d+)?/.exec(source.slice(i))
    if (number) {
      tokens.push(Number(number[0].replace(',', '.')))
      i += number[0].length
    } else if ('+-*/%^()'.includes(source[i] ?? '')) {
      tokens.push(source[i] as string)
      i++
    } else return null
  }
  return tokens
}

// Résultat du calcul, ou null si ce n'est pas un calcul (au moins un opérateur entre deux nombres).
export function calculate(text: string): number | null {
  const parsed = tokenize(text)
  if (!parsed || parsed.filter((t) => typeof t === 'number').length < 2) return null
  const tokens = parsed
  let pos = 0
  const peek = (): Token | undefined => tokens[pos]

  // expression = terme (('+' | '-') terme)*
  function expression(): number {
    let value = term()
    while (peek() === '+' || peek() === '-')
      value = tokens[pos++] === '+' ? value + term() : value - term()
    return value
  }
  // terme = puissance (('*' | '/' | '%') puissance)*
  function term(): number {
    let value = power()
    for (let op = peek(); op === '*' || op === '/' || op === '%'; op = peek()) {
      pos++
      const right = power()
      value = op === '*' ? value * right : op === '/' ? value / right : value % right
    }
    return value
  }
  // puissance = unaire ('^' puissance)?  (associative à droite : 2^3^2 = 2^9)
  function power(): number {
    const base = unary()
    if (peek() !== '^') return base
    pos++
    return base ** power()
  }
  function unary(): number {
    if (peek() === '-') {
      pos++
      return -unary()
    }
    if (peek() === '+') pos++
    return primary()
  }
  function primary(): number {
    const token = tokens[pos++]
    if (typeof token === 'number') return token
    if (token === '(') {
      const value = expression()
      if (tokens[pos++] !== ')') throw new Error('parenthèse')
      return value
    }
    throw new Error('jeton')
  }

  try {
    const value = expression()
    return pos === tokens.length && Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}
