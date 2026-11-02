import { describe, expect, it } from 'vitest'
import { calculate } from './calc'
import { looksLikeSite, matchScore, usageBoost } from './rank'

describe('calculate', () => {
  it('priorités, parenthèses, virgule et puissance', () => {
    expect(calculate('24*17')).toBe(408)
    expect(calculate('2+3*4')).toBe(14)
    expect(calculate('(3,5+1)/2')).toBe(2.25)
    expect(calculate('2^3^2')).toBe(512)
    expect(calculate('-2 × 3')).toBe(-6)
    expect(calculate('-2^2')).toBe(-4)
    expect(calculate('2^-1')).toBe(0.5)
    expect(calculate('3*-2')).toBe(-6)
  })

  it('pas un calcul : null', () => {
    expect(calculate('42')).toBeNull()
    expect(calculate('discord')).toBeNull()
    expect(calculate('2+')).toBeNull()
    expect(calculate('1/0')).toBeNull()
    expect(calculate('alert(1)+2')).toBeNull()
    expect(calculate('2026-11-02')).toBeNull()
    expect(calculate('02/11/2026')).toBeNull()
    expect(calculate('06-12-34-56-78')).toBeNull()
  })
})

describe('matchScore', () => {
  it('début > début de mot > initiales > milieu > lettres dans l ordre', () => {
    expect(matchScore('Discord', 'disc')).toBe(80)
    expect(matchScore('Microsoft Edge', 'edge')).toBe(65)
    expect(matchScore('Visual Studio Code', 'vsc')).toBe(60)
    expect(matchScore('Facture.pdf', 'ctur')).toBe(45)
    expect(matchScore('Discord', 'dscd', true)).toBe(20)
    expect(matchScore('Discord', 'dscd')).toBe(0)
  })

  it('ignore accents et majuscules', () => {
    expect(matchScore('Été 2026.jpg', 'ete')).toBe(80)
  })
})

describe('usageBoost', () => {
  it('fréquence plafonnée et récence', () => {
    const now = Date.now()
    expect(usageBoost(undefined, now)).toBe(0)
    expect(usageBoost({ count: 1, last: now }, now)).toBe(22)
    expect(usageBoost({ count: 1000, last: 0 }, now)).toBe(30)
  })
})

describe('looksLikeSite', () => {
  it('site ou nom de fichier', () => {
    expect(looksLikeSite('ytb.com')).toBe(true)
    expect(looksLikeSite('github.com/x')).toBe(true)
    expect(looksLikeSite('https://exemple.md')).toBe(true)
    expect(looksLikeSite('rapport.pdf')).toBe(false)
    expect(looksLikeSite('notes.md')).toBe(false)
    expect(looksLikeSite('discord')).toBe(false)
  })
})
