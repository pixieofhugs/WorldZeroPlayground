/**
 * Each faction's vote ladder as announced by the rendered `aria-label` via the
 * real `VoteUI` (#2586), the only place a tier word reaches a person (#2166).
 * Words are LITERAL in rung order: keys are `tierN`, so a misnumbered rung would
 * pass every key-shape test. Albescent has no ladder (#783: a vote word would
 * reveal the society to voters on its tasks) and reads arabic numerals.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'

vi.mock('../useVote', () => ({
  useVote: () => ({ user: { id: 1 }, selected: 0, saving: false, error: '', vote: vi.fn() }),
}))
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, refetch: vi.fn() }),
}))
// `useTheme()` throws outside a ThemeProvider (#701).
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggle: () => {} }),
}))

import VoteUI from '../VoteUI'

const LADDERS: Record<string, readonly string[]> = {
  ephemerists: ['lead', 'copper', 'silver', 'gold', 'platinum'],
  everymen: ['fair', 'solid', 'good', 'excellent', 'legendary'],
  // Coven cozy, WOW archaic; easy to swap (ADR-0050).
  coven: ['sweet', 'lovely', 'wonderful', 'magical', 'iconic'],
  wow: ['a start', 'quite solid', 'jolly good', 'splendid!', 'legendary!'],
  snide: ['meh', 'not bad', 'rad', 'sick', 'ANARCHY'],
  singularity: ['NOISE', 'WEAK', 'SIGNAL', 'CLEAR', 'VERIFIED'],
  ua: ['faint', 'forming', 'true', 'alive', 'radiant'],
  // Also every themed-but-unskinned faction's fallback.
  na: ['so-so', 'decent', 'good', 'great', 'brilliant'],
}

function render(slug: string): string {
  return renderToStaticMarkup(<VoteUI factionSlug={slug} praxisId={7} />)
}

describe('every vote widget announces its ladder in order (#2586)', () => {
  for (const [slug, words] of Object.entries(LADDERS)) {
    it(`${slug}: rungs 1–5 read ${words.join(' → ')}`, () => {
      const html = render(slug)
      words.forEach((word, index) => {
        expect(html, `${slug} rung ${index + 1}`).toContain(
          `aria-label="Rate ${index + 1} — ${word}"`,
        )
      })
    })
  }

  it('albescent still has no vote voice, and counts in arabic (#783)', () => {
    const html = render('albescent')
    for (let value = 1; value <= 5; value++) {
      expect(html).toContain(`aria-label="Rate ${value} of 5"`)
    }
    for (const words of Object.values(LADDERS)) {
      for (const word of words) expect(html).not.toContain(`— ${word}"`)
    }
  })
})
