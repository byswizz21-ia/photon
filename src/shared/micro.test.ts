import { expect, test } from 'vitest'
import { euros, nextDeclaration, parseAmount, parseMicro, total } from './micro'

test('montant tapé à la française', () => {
  expect(parseAmount('1 234,50')).toBe(123_450)
  expect(parseAmount('800 €')).toBe(80_000)
  expect(parseAmount('12.5')).toBe(1_250)
  expect(parseAmount('0')).toBeNull()
  expect(parseAmount('-20')).toBeNull()
  expect(parseAmount('12,345')).toBeNull()
  expect(parseAmount('abc')).toBeNull()
  expect(parseAmount(euros(123_450, true))).toBe(123_450) // espaces insécables d'Intl
})

test('déclaration mensuelle : le mois précédent, avant la fin du mois', () => {
  expect(nextDeclaration('2026-11-02', 'mois')).toEqual({
    from: '2026-10-01',
    to: '2026-10-31',
    deadline: '2026-11-30',
    name: 'octobre 2026'
  })
  expect(nextDeclaration('2027-01-31', 'mois').name).toBe('décembre 2026')
  expect(nextDeclaration('2026-03-01', 'mois').to).toBe('2026-02-28')
})

test('déclaration trimestrielle : échéances 30 avril, 31 juillet, 31 octobre, 31 janvier', () => {
  expect(nextDeclaration('2026-11-02', 'trimestre')).toEqual({
    from: '2026-10-01',
    to: '2026-12-31',
    deadline: '2027-01-31',
    name: '4e trimestre 2026'
  })
  expect(nextDeclaration('2026-10-31', 'trimestre').deadline).toBe('2026-10-31')
  expect(nextDeclaration('2027-01-15', 'trimestre').name).toBe('4e trimestre 2026')
  expect(nextDeclaration('2027-02-01', 'trimestre')).toMatchObject({
    name: '1er trimestre 2027',
    deadline: '2027-04-30'
  })
})

test('totaux, fichier abîmé, affichage', () => {
  const { payments } = parseMicro({
    payments: [
      { id: 'a', date: '2026-10-05', amount: 100_000, label: 'Site' },
      { id: 'b', date: '2026-11-01', amount: 50_050, label: '' },
      { id: 'c', date: '2026-11-01', amount: -5, label: '' },
      { id: 'd', date: 'hier', amount: 10, label: '' }
    ]
  })
  expect(payments.map((p) => p.id)).toEqual(['a', 'b'])
  expect(total(payments, '2026-01-01', '2026-12-31')).toBe(150_050)
  expect(total(payments, '2026-10-01', '2026-10-31')).toBe(100_000)
  expect(euros(150_050).replace(/\s/g, ' ')).toBe('1 501 €')
  expect(euros(150_050, true).replace(/\s/g, ' ')).toBe('1 500,50 €')
})
