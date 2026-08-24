/**
 * THE NINE VOTE LADDERS, RUNG BY RUNG, AS A VOTER READS THEM (#2586).
 *
 * THE SEAM IS THE RENDERED WIDGET'S `aria-label`, per faction, through the real
 * `VoteUI` dispatcher — not the registry, and not the catalog. #2166 took every
 * printed caption off the vote control, so `Rate {{value}} — {{label}}` is now
 * the ONLY place a tier word reaches a person, and a registry-versus-registry
 * assertion (`VOTE_REFRAMES` compared to itself) would pass while the ladder
 * rendered upside down.
 *
 * WHY THIS EXISTS. #2586 renamed every catalog key from its own English word to
 * its rung number (`votes:snide.rad` → `votes:snide.tier3`) and renamed the
 * `unaffiliated` block to `na`. Not one word changed — ADR-0061 keeps vote
 * vocabulary as a sanctioned per-faction carve-out, and #1864 kept the star
 * ladder in faction voice. The one way that change can go wrong is silent: a
 * rung renamed to the wrong number reorders a faction's ladder, and every
 * key-shape test still passes because the keys are consistently, wrongly, named.
 * So the words below are LITERAL, in ladder order, and they are the words that
 * shipped before the rename.
 *
 * Albescent is the ninth widget and has no ladder: #783 took its "bear witness"
 * vocabulary away, because a vote word renders to every voter on an Albescent-
 * filed task and so announced the society to people never revealed to it. It
 * announces bare arabic numerals (`chrome.rateAriaPlain`), and that absence is
 * asserted here too, or "no vote voice" is a claim nothing checks.
 *
 * SSR-only harness (renderToStaticMarkup, no DOM, effects never run).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'

// The widgets reach for browser-only context; stub the three seams so server
// rendering works. None of them touch the vocabulary under test.
vi.mock('../useVote', () => ({
  useVote: () => ({ user: { id: 1 }, selected: 0, saving: false, error: '', vote: vi.fn() }),
}))
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, refetch: vi.fn() }),
}))
// `useTheme()` throws outside a ThemeProvider by design (#701) and CovenVote
// forks its whole plate on it; the vocabulary is the same on either side.
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggle: () => {} }),
}))

import VoteUI from '../VoteUI'

/** Every ladder, rung 1 → rung 5, in the words the widget announces. */
const LADDERS: Record<string, readonly string[]> = {
  // The metals ladder (#1207): a transmutation, lead → platinum.
  ephemerists: ['lead', 'copper', 'silver', 'gold', 'platinum'],
  everymen: ['fair', 'solid', 'good', 'excellent', 'legendary'],
  // Coven is the cozy-casual voice and WOW the archaic one — #821 had them
  // wearing each other's and #838 put them back (ADR-0050: go by metaphor, not
  // label). Reading them side by side here is the point.
  coven: ['sweet', 'lovely', 'wonderful', 'magical', 'iconic'],
  wow: ['a start', 'quite solid', 'jolly good', 'splendid!', 'legendary!'],
  snide: ['meh', 'not bad', 'rad', 'sick', 'ANARCHY'],
  singularity: ['NOISE', 'WEAK', 'SIGNAL', 'CLEAR', 'VERIFIED'],
  // The growing-mandala readings (#821): the filed work blooms fuller/warmer.
  ua: ['faint', 'forming', 'true', 'alive', 'radiant'],
  // The unaffiliated spectrum sweep — also what every themed-but-unskinned
  // faction renders, so this row is the widest-reaching of the eight.
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
