/**
 * Task cards v3, Phase 1 — the three SHARED passes (epic #2027).
 *
 * A (#2028) one word for level, points and sign-up · B (#2029) one masthead
 * anatomy · C (#2030) the sign-up as an inset button. All three are properties
 * of the KIT rather than of any one skin, so they are asserted once over the
 * table of nine and a card that drifts names itself.
 *
 * The seam is the same one `factionTaskCardsV2.test.tsx` works at: the rendered
 * markup of a skin, via `renderToStaticMarkup`. This repo has no jsdom, so
 * effects never run and geometry is out of reach — what is checkable is which
 * elements exist, what they say, and which inline declarations they carry. That
 * is enough for all three passes, because all three are structural.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { CardProps } from '../TaskCard'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// Imported after the mock is registered.
import AlbescentTaskCard from '../AlbescentTaskCard'
import CovenTaskCard from '../CovenTaskCard'
import DefaultTaskCard from '../DefaultTaskCard'
import EphemeristsTaskCard from '../EphemeristsTaskCard'
import EverymenTaskCard from '../EverymenTaskCard'
import SingularityTaskCard from '../SingularityTaskCard'
import SnideTaskCard from '../SnideTaskCard'
import UaTaskCard from '../UaTaskCard'
import WowTaskCard from '../WowTaskCard'
import { aTask } from '../../../test/fixtures'

const TASK = aTask({
  description: 'Leave something small and honest where a stranger will find it.',
  in_progress_count: 4,
})

interface Skin {
  slug: string
  Card: ComponentType<CardProps>
}

/** All nine, `na` and `albescent` included — they are cards, not exceptions. */
const SKINS: Skin[] = [
  { slug: 'na', Card: DefaultTaskCard },
  { slug: 'albescent', Card: AlbescentTaskCard },
  { slug: 'coven', Card: CovenTaskCard },
  { slug: 'ephemerists', Card: EphemeristsTaskCard },
  { slug: 'everymen', Card: EverymenTaskCard },
  { slug: 'singularity', Card: SingularityTaskCard },
  { slug: 'snide', Card: SnideTaskCard },
  { slug: 'ua', Card: UaTaskCard },
  { slug: 'wow', Card: WowTaskCard },
]

function render({ Card }: Skin): { html: string; text: string } {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <Card
        task={TASK}
        basePoints={TASK.point_value}
        multiplier={1}
        inProgressCount={TASK.in_progress_count}
        onSignup={() => {}}
      />
    </MemoryRouter>,
  )
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

/* -------------------------------------------------------------------------- */
/* A (#2028) — one word for level, points and sign-up                          */
/* -------------------------------------------------------------------------- */

/**
 * The wording itself is the catalog's, and `locales/__tests__/factionCopyCollapse`
 * guards it there. What only a RENDER can prove is the other half of #2028 —
 * the shape: that no skin still formats a caption locally to work around a
 * per-faction catalog difference that no longer exists. Casing is the tell,
 * because every one of these cards shouts: Everymen strikes POINTS into a
 * rubber seal, Snide types LEVEL, Coven hand-letters its name in lower case.
 * All of that is `textTransform`, so the text node still reads the catalog's
 * word — and a skin that reached for `.toUpperCase()` instead, or spelled its
 * own "Lvl 2", fails here while looking identical on screen.
 */
describe.each(SKINS)('$slug speaks the kit\'s three words (#2028)', (skin) => {
  it('reads the shared level, points and sign-up strings, unedited', () => {
    const { text } = render(skin)
    expect(text, 'level gate').toContain(i18n.t('feed:taskCard.levelCaption'))
    expect(text, 'score').toContain(i18n.t('feed:taskCard.pointsUnit'))
    expect(text, 'call to action').toContain(i18n.t('feed:taskCard.signup'))
  })

  it('carries none of the nine per-faction variants #1911 retired', () => {
    const { text } = render(skin)
    // `pvncta` moves to the Ephemerists script rotation (Phase 3) as a
    // decorative constant; until then no card may spell it, and none may
    // resurrect `lvl` / `pts` / `PTS` / Albescent's `acknowledge`.
    expect(text).not.toMatch(/\b(?:lvl|pts|pvncta|puncta|acknowledge)\b/i)
  })
})
