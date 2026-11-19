import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import i18n, { loadAppCopy, resources } from '../i18n'

describe('route-loaded app copy', () => {
  it('keeps admin and forms out of the eager catalog, and feed in it', () => {
    for (const ns of ['admin', 'forms']) expect(ns in resources.en).toBe(false)
    expect('feed' in resources.en).toBe(true)
  })

  it('registers both on load, under an override applied first', async () => {
    for (const ns of ['admin', 'forms']) i18n.removeResourceBundle('en', ns)
    i18n.addResource('en', 'admin', 'flagReasons.other', 'EDITED')
    expect(i18n.exists('forms:editPraxis.confirm.dropTask')).toBe(false)
    await loadAppCopy()
    expect(i18n.exists('forms:editPraxis.confirm.dropTask')).toBe(true)
    expect(i18n.t('admin:flagReasons.other')).toBe('EDITED')
  })

  it('has App await the copy for every page except the onboarding ones', () => {
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
    const bare = app
      .split('\n')
      .filter((line) => /import\('\.\/(pages|components)\//.test(line))
      .filter((line) => !/withAppCopy|withOnboardingCopy|accountDeletedLoader/.test(line))
    expect(bare).toEqual([])
  })
})
