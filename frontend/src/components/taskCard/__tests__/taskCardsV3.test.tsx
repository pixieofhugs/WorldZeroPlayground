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
    expect(text, 'score').toContain(i18n.t('feed:taskCard.pointsUnit', { count: TASK.point_value }))
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

/**
 * The drawn size of the mark is a PROP, and the slot it sits in is not (#2056).
 *
 * S.N.I.D.E. draws its A at 24 where the kit draws 20. Until now that lived in
 * `index.css` as `[data-masthead-mark="snide"] svg { width: 24px }` — a rule
 * reaching past `CardMasthead`'s API into the SVG it renders, which no test
 * here could see and which would have broken silently the day `SnideSigil`'s
 * markup changed. It is `markSize` now, so the size is in the markup and these
 * assertions can hold it.
 *
 * The second `it` is the answer to the question #2056 asks: growing the drawing
 * does NOT grow the box the `1fr auto 1fr` grid measures its centring against,
 * so a louder mark cannot take the wordmark off the card's centreline.
 */
describe('the mark\'s drawn size (#2056)', () => {
  /** Everything from the mark's slot to the end of the tag that follows it. */
  function mark(html: string, slug: string): string {
    return html.slice(html.indexOf(`data-masthead-mark="${slug}"`)).slice(0, 400)
  }

  it('is 24 for S.N.I.D.E., from the card rather than from the stylesheet', () => {
    const snide = mark(render(SKINS.find((s) => s.slug === 'snide')!).html, 'snide')
    expect(snide.slice(snide.indexOf('<svg'))).toContain('width="24"')
  })

  it('leaves the grid\'s measured slot at 20 on all seven bands', () => {
    // The box is the kit's, whatever the drawing does — the wordmark has no
    // business moving because one faction's mark got louder. A `markSize` that
    // grew the span instead of the drawing fails here.
    for (const skin of SKINS.filter((s) => MASTHEADED.includes(s.slug))) {
      expect(mark(render(skin).html, skin.slug), skin.slug).toContain('width:20px;height:20px')
    }
  })

  it('is the slot\'s own 20 for every skin that asks for nothing', () => {
    // UA is absent on purpose: its ensō is a CSS mask on a <div>, not an <svg>,
    // so it carries no width attribute to read. Its slot is covered above.
    for (const slug of ['coven', 'ephemerists', 'everymen', 'singularity', 'wow']) {
      const band = mark(render(SKINS.find((s) => s.slug === slug)!).html, slug)
      expect(band.slice(band.indexOf('<svg')), slug).toContain('width="20"')
    }
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

/* -------------------------------------------------------------------------- */
/* C (#2030) — the sign-up as an inset button                                  */
/* -------------------------------------------------------------------------- */

/** The reconciled rule table. The other five draw their own bottom treatment. */
const RULED: Record<string, string> = {
  na: 'default',
  albescent: 'default',
  ua: 'ua',
  ephemerists: 'ephemerists',
}

describe.each(SKINS)('$slug sign-up affordance (#2030)', (skin) => {
  it('is an inset button — never the card\'s own bottom edge', () => {
    const { html } = render(skin)
    const button = html.slice(html.indexOf('<button'))
    expect(button, 'a control to look at').toContain('</button>')
    // The four bar skins shipped `width:100%` on the button itself, which is
    // what made it the card's edge. Nothing may say it again.
    expect(button.slice(0, button.indexOf('</button>'))).not.toContain('width:100%')
  })

  it('meets the 44px floor, on both form factors', () => {
    for (const formFactor of ['desktop', 'mobile'] as const) {
      mocks.formFactor = formFactor
      const { html } = render(skin)
      expect(html.slice(html.indexOf('<button')), formFactor).toContain('min-height:44px')
    }
    mocks.formFactor = 'desktop'
  })

  it('draws the rule its faction draws, and no other', () => {
    const { html } = render(skin)
    const rules = [...html.matchAll(/data-cta-rule="([a-z]+)"/g)].map((m) => m[1])
    expect(rules).toEqual(skin.slug in RULED ? [RULED[skin.slug]] : [])
  })

  it('renders no control at all where sign-up is not on offer', () => {
    // #2030 changes what the affordance LOOKS like; `signupAffordance.ts` still
    // decides whether there is one. A rule with nothing under it would be the
    // tell that the two got tangled.
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <skin.Card
          task={TASK}
          basePoints={TASK.point_value}
          multiplier={1}
          inProgressCount={0}
        />
      </MemoryRouter>,
    )
    expect(html, 'no onSignup → no button').not.toContain('<button')
    expect(html, 'and no rule left ruling off nothing').not.toContain('data-cta-rule')
  })
})

describe('albescent draws the same rule, fainter (#2030)', () => {
  it('carries the opacity as a cascade rather than a fork in the sheet', () => {
    // The na sheet must still come out byte-for-byte inside the Albescent one
    // (ADR-0048), so the 0.45 cannot be a prop or a branch — it is
    // `--faction-default-cta-rule-opacity`, repointed by `.alb-task` in
    // index.css and inherited by the sheet inside.
    const albescent = render(SKINS.find((s) => s.slug === 'albescent')!)
    const unaffiliated = render(SKINS.find((s) => s.slug === 'na')!)
    expect(albescent.html).toContain(unaffiliated.html)
    expect(albescent.html).toContain('class="alb-task"')
    expect(unaffiliated.html).toContain('opacity:var(--faction-default-cta-rule-opacity, 0.6)')
  })
})


/* -------------------------------------------------------------------------- */
/* #2359 — the one denial that is a door, in all nine hands                     */
/* -------------------------------------------------------------------------- */

/**
 * `signupAffordance.test.ts` pins the DECISION value-out; only a render can
 * prove the nine skins act on it. Each of them used to hand-write its own
 * `<button type="button" onClick={cta.onPress}>`, so "the slot is a link now"
 * was nine separate chances to still draw a button that does nothing.
 *
 * The three properties asserted here are exactly the ones that survive a
 * DOM-less harness, and they are the ones that matter: the element is an
 * anchor, it points at the draft's editor, and it still stands on the 44px
 * floor `CARD_CTA` sets. The paint is each skin's own and is not this suite's
 * business — `taskCardsV3` above already guards the shape it sits in.
 */
const HELD = aTask({
  can_sign_up: false,
  signup_reason: 'already_active_member',
  in_progress_praxis_id: 77,
})

/** The same shut card with nothing to land on — submitted, or pending. */
const HELD_WITH_NO_DRAFT = aTask({
  can_sign_up: false,
  signup_reason: 'already_active_member',
  in_progress_praxis_id: null,
})

function renderTask({ Card }: Skin, task: typeof HELD): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Card
        task={task}
        basePoints={task.point_value}
        multiplier={1}
        inProgressCount={task.in_progress_count}
        onSignup={() => {}}
      />
    </MemoryRouter>,
  )
}

/** The card-wide `<Link>` every skin draws; the slot is the OTHER anchor. */
const CARD_LINK = `href="/tasks/${HELD.id}"`

/**
 * Visible text, with the entities the server renderer escapes put back. The
 * denial copy contains an apostrophe ("You're on this task"), which arrives as
 * `&#x27;` and would otherwise make a correct card look wrong.
 */
function visible(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

describe.each(SKINS)('$slug offers a draft you already hold (#2359)', (skin) => {
  it('draws the slot as a link to that draft, on the 44px floor', () => {
    const html = renderTask(skin, HELD)
    expect(visible(html)).toContain(i18n.t('tasks:detail.signup.workOnThis'))
    const slot = html.match(/<a [^>]*href="\/praxis\/77\/edit"[^>]*>/)
    expect(slot, 'the slot is an anchor to the draft').not.toBeNull()
    expect(slot![0], 'the tap floor').toContain('min-height:44px')
  })

  it('does not offer the sign-up the server refused', () => {
    const html = renderTask(skin, HELD)
    // Every skin's ONE button is its sign-up; in this state there is no claim
    // to press, so a button left standing is a control that does nothing.
    expect(html).not.toContain('<button')
    expect(visible(html)).not.toContain(
      i18n.t('tasks:detail.signup.denied.alreadyActiveMember'),
    )
  })

  it('falls back to the plain label when there is no draft behind the denial', () => {
    const html = renderTask(skin, HELD_WITH_NO_DRAFT)
    expect(html).toContain('<button')
    expect(visible(html)).toContain(
      i18n.t('tasks:detail.signup.denied.alreadyActiveMember'),
    )
    // The card-wide link stays; nothing points at an editor that is not there.
    expect(html).toContain(CARD_LINK)
    expect(html).not.toContain('href="/praxis/')
  })

  it.each(['below_level', 'task_status_closed', 'bank_full', 'is_metatask'])(
    'leaves a %s denial a plain label',
    (reason) => {
      const html = renderTask(
        skin,
        aTask({ can_sign_up: false, signup_reason: reason, level_required: 4 }),
      )
      expect(html).toContain('<button')
      expect(html).not.toContain('href="/praxis/')
    },
  )
})
