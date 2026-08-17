/**
 * The seam: `<Faction>ProfileBody` → `ProfileSkin` → rendered words (#1858).
 *
 * The seven faction kits used to hold their English as raw literals; the words
 * now come from `common.json` `profile.<slug>.*`. The catalog test next door
 * proves the KEYS resolve — it cannot prove each kit reads its OWN key, and a
 * kit pointed at a neighbour's branch would render fluent, wrong, green copy.
 *
 * So this renders every faction profile and asserts the exact strings that
 * shipped before the extraction. It is a MOVE, not a rewrite: a copy review is
 * in flight separately, and these assertions are what makes its diff readable —
 * when it reworders a line, exactly one place here changes with it.
 *
 * Empty `submissions` on purpose: the praxis empty state is copy on all seven
 * kits and is otherwise only reachable on a brand-new character.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

import '../../../i18n'
import type { CharacterOut } from '../../../api/auth'

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))

import FactionProfileBody, { type ProfileBodyProps } from '../FactionProfileBody'

function renderText(factionSlug: string): string {
  const character: CharacterOut = {
    id: 7,
    username: 'reza',
    display_name: 'Reza',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 7,
    score: 1880,
    all_time_score: 2400,
    faction_slug: factionSlug,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [{ key: 'sock_puppet', name: 'Sock Puppet' }],
    invitations: [],
  }
  const props: ProfileBodyProps = {
    character,
    submissions: [],
    proposedTasks: [],
    progression: {
      nextLevel: 8,
      currentThreshold: 1500,
      nextThreshold: 2000,
      progressPercent: 76,
    },
    identityActions: null,
  }
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <FactionProfileBody {...props} />
    </MemoryRouter>,
  )
  // Tags out, then the entities React escapes on the way in — `&` in "Honours &
  // Credentials", `>` in Singularity's terminal prompts, `'` in Snide's body.
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

/** Every string the kit used to carry as a literal, at level 7 → 8. */
const KIT_COPY: Record<string, readonly string[]> = {
  ua: [
    'anno',
    '380 / 500 points this anno',
    'next · anno 8',
    'Sealed by Reza',
    'Nothing sealed yet',
    'One true piece, then another. The first is always the boldest.',
    'Seals of the practice',
  ],
  snide: [
    'lvl',
    '380 / 500 pts this level',
    'next · lvl 8',
    'cases closed by Reza',
    'No priors. Yet.',
    "Clean record's a bad look around here. Go pull a job.",
    'The record',
  ],
  wow: [
    'rank',
    '380 / 500 huzzahs toward the next rank',
    'next · rank 8',
    'Chronicles sealed by Reza',
    'No chronicle yet',
    'The Court waits. Go and do something gloriously daft, then write it down.',
    // WOW's badge heading was 'Honours & Credentials' (`profile.wow.honours`),
    // shared with its phone stack. #1909 CUT the key with the rest of the
    // `profile.wow.*` block, so the kit reads the SHARED 'Badges' — which is
    // where #1910's `profileKit.{F}.badgeTitle` collapse settles every kit.
    'Badges',
  ],
  coven: [
    'lvl',
    '380 / 500 pts this level',
    'next · lvl 8',
    'sealed by Reza',
    'No spells sealed yet',
    'The first bit of mischief is always the hardest ✦',
    'Charms earned',
  ],
  ephemerists: [
    'level',
    '380 / 500 pvncta this level',
    // The kit formats the level as a roman numeral; the catalog value takes
    // whatever the kit hands it, so VIII must survive the {{level}} move.
    'next · level VIII',
    'Filed to the codex by Reza',
    'The codex holds no entry yet',
    'Walk a road, and set the first record down.',
    'Concordances',
  ],
  everymen: [
    'lvl',
    '380 / 500 pts this level',
    'NEXT · LVL 8',
    'Work Reza finished',
    'No work on the board yet',
    'Answer a call. Put in the first shift.',
    'Citations',
  ],
  singularity: [
    'lvl',
    '380 / 500 pts this level',
    'next // lvl 8',
    // It was the only kit with a score footnote — it named the absolute score,
    // not the threshold, which is why it could not share na's `ptsToNext`.
    // #1909 CUT `profile.singularity.scoreFootnote`, so no footnote is drawn.
    'Sealed outputs // by Reza',
    '> NO OUTPUT SEALED',
    'Run a protocol. Cast the first signal.',
    'Verified',
  ],
}

describe('faction profile kits render their catalog copy, unchanged', () => {
  for (const [slug, strings] of Object.entries(KIT_COPY)) {
    it(`${slug} says exactly what it said before the extraction`, () => {
      const text = renderText(slug)
      for (const expected of strings) {
        expect(text, `${slug}: "${expected}"`).toContain(expected)
      }
    })
  }

  it('keeps the shared praxis section heading ProfileSkin owns', () => {
    expect(renderText('coven')).toContain('Praxis')
  })

  it('leaves the na kit saying what it always said', () => {
    const text = renderText('na')
    expect(text).toContain('sealed by Reza')
    expect(text).toContain('No praxis sealed yet')
    expect(text).toContain('380 / 500 pts this level')
    expect(text).toContain('next · lvl 8')
  })
})
