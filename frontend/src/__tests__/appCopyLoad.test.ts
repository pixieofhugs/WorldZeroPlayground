import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import i18n, { loadAppCopy, resources } from '../i18n'

describe('route-loaded app copy', () => {
  it('keeps admin, feed and forms out of the eager catalog', () => {
    for (const ns of ['admin', 'feed', 'forms']) expect(ns in resources.en).toBe(false)
  })

  it('registers all three on load, under an override applied first', async () => {
    for (const ns of ['admin', 'feed', 'forms']) i18n.removeResourceBundle('en', ns)
    i18n.addResource('en', 'feed', 'taskCard.levelCaption', 'EDITED')
    expect(i18n.exists('forms:editPraxis.confirm.dropTask')).toBe(false)
    await loadAppCopy()
    expect(i18n.exists('forms:editPraxis.confirm.dropTask')).toBe(true)
    expect(i18n.exists('admin:flagReasons.other')).toBe(true)
    expect(i18n.t('feed:taskCard.levelCaption')).toBe('EDITED')
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
