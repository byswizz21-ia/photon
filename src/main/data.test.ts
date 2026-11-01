import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, expect, test, vi } from 'vitest'

const dir = mkdtempSync(join(tmpdir(), 'photon-data-'))
vi.mock('electron', () => ({ app: { getPath: () => dir } }))

const { createProfile, data, deleteProfile, loadAll, saveProfile, switchProfile } =
  await import('./data')

afterAll(() => rmSync(dir, { recursive: true, force: true }))

test('créer, renommer, basculer, supprimer un profil', async () => {
  await loadAll() // premier lancement : rien sur le disque
  expect(data.profiles).toMatchObject([{ id: 'default', name: 'Principal', focus: false }])
  await saveProfile(data.profile)

  expect(await createProfile('work')).toBe(true)
  const work = data.settings.activeProfile
  expect(data.profile.name).toBe('Travail')
  expect(data.profile.widgets.map((w) => w.type)).toContain('claude')

  await saveProfile({ ...data.profile, name: 'Boulot' })
  expect(data.profiles.map((p) => p.name)).toEqual(['Principal', 'Boulot'])
  expect(await createProfile('inconnu')).toBe(false)
  expect(await switchProfile('../settings')).toBe(false)

  expect(await switchProfile('default')).toBe(true)
  expect(data.profile.name).toBe('Principal')
  expect(await switchProfile(work)).toBe(true)
  expect(data.profile.name).toBe('Boulot')

  // Au redémarrage, la liste relue du disque garde l'ordre de création.
  await loadAll()
  expect(data.profiles.map((p) => p.name)).toEqual(['Principal', 'Boulot'])

  expect(await deleteProfile()).toBe(true)
  expect(data.settings.activeProfile).toBe('default')
  expect(data.profiles).toMatchObject([{ id: 'default', name: 'Principal', focus: false }])
  expect(readdirSync(join(dir, 'profiles'))).toContain(`${work}.json.deleted`)
  expect(await deleteProfile()).toBe(false) // jamais le dernier
})

test('modèle Focus : profil marqué focus', async () => {
  expect(await createProfile('focus')).toBe(true)
  expect(data.profile.focus).toBe(true)
  expect(data.profiles.at(-1)).toMatchObject({ name: 'Focus', focus: true })
})
