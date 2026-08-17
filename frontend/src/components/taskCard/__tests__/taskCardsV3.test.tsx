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
import { factionName } from '../../../utils/factions'

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

/* -------------------------------------------------------------------------- */
/* B (#2029) — one masthead anatomy                                            */
/* -------------------------------------------------------------------------- */

/**
 * Seven cards carry a band; `na` and `albescent` carry none, which ADR-0048
 * makes a rule rather than a gap — a band naming the society would un-hide it.
 */
const MASTHEADED = ['coven', 'ephemerists', 'everymen', 'singularity', 'snide', 'ua', 'wow']

function mastheads(html: string): string[] {
  return [...html.matchAll(/data-card-masthead="([a-z]+)"/g)].map((m) => m[1])
}

describe.each(SKINS)('$slug masthead anatomy (#2029)', (skin) => {
  it('mounts the shared band exactly once, or not at all', () => {
    const { html } = render(skin)
    const bands = mastheads(html)
    expect(bands).toEqual(MASTHEADED.includes(skin.slug) ? [skin.slug] : [])
  })

  it('names the faction on the band, and marks it once', () => {
    if (!MASTHEADED.includes(skin.slug)) return
    const { html, text } = render(skin)
    expect(text, 'the band says whose card this is').toContain(factionName(skin.slug))
    // The one-mark rule (#2029): UA's eyebrow ensō and Coven's pentagram badge
    // both stood down when their bands were built, and a card that grows a
    // second header mark fails here rather than at review.
    expect(html.match(/data-masthead-mark=/g) ?? []).toHaveLength(1)
  })

  it('centres the title on the band rather than beside the mark', () => {
    if (!MASTHEADED.includes(skin.slug)) return
    // The tell is the grid: equal `1fr` gutters are what put the title on the
    // card's centreline whatever stands next to the mark. A skin that reverted
    // to a flex row would still LOOK centred on the one card whose left
    // cluster is only the mark, and be off true on Singularity's.
    expect(render(skin).html).toContain('grid-template-columns:1fr auto 1fr')
  })
})

describe('the anatomy lives in one place (#2029)', () => {
  it('is the same band markup on all seven, up to the skin\'s own paint', () => {
    // Every masthead is the same three-cell grid from `CardMasthead`; nothing
    // re-implements it. Asserted as the shared declarations appearing together
    // on each band, which a hand-rolled twin would not reproduce by accident.
    for (const skin of SKINS.filter((s) => MASTHEADED.includes(s.slug))) {
      const band = render(skin).html.split(`data-card-masthead="${skin.slug}"`)[1] ?? ''
      expect(band.slice(0, 400), skin.slug).toContain('display:grid')
      expect(band.slice(0, 400), skin.slug).toContain('grid-template-columns:1fr auto 1fr')
    }
  })
})
