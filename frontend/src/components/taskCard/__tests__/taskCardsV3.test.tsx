/**
 * Task cards v3, the three KIT-wide passes (#2027), asserted over all nine skins:
 * A (#2028) shared words, B (#2029) masthead anatomy, C (#2030) inset sign-up.
 * Static markup only: elements, text and inline declarations, no geometry.
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
import { surfaceMap } from '../../../factions'
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

/** All nine, `na` and `albescent` included; read off the kit's map (#2815). */
const SKINS: Skin[] = Object.entries(surfaceMap('taskCard')).map(([slug, Card]) => ({
  slug,
  Card,
}))

it('covers every skin the app can dispatch taskCard to', () => {
  expect(SKINS).toHaveLength(9)
})

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

/* A (#2028) — one word for level, points and sign-up */

/**
 * Wording is guarded by `factionCopyCollapse`; this proves no skin formats it
 * locally. Casing must be `textTransform`, so a skin using `.toUpperCase()` or
 * its own "Lvl 2" fails here while looking identical on screen.
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
    expect(text).not.toMatch(/\b(?:lvl|pts|pvncta|puncta|acknowledge)\b/i)
  })
})

/* B (#2029) — one masthead anatomy */

/** `na` and `albescent` carry no band (ADR-0048: it would un-hide the society). */
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
    // One header mark per card (#2029).
    expect(html.match(/data-masthead-mark=/g) ?? []).toHaveLength(1)
  })

  it('centres the title on the band rather than beside the mark', () => {
    if (!MASTHEADED.includes(skin.slug)) return
    // Equal `1fr` gutters centre the title whatever stands beside the mark;
    // a flex row only looks centred when the left cluster is just the mark.
    expect(render(skin).html).toContain('grid-template-columns:1fr auto 1fr')
  })
})

/**
 * The mark's drawn size is the `markSize` prop; its grid slot is fixed (#2056),
 * so a louder mark cannot take the wordmark off the centreline.
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
    // A `markSize` that grew the span instead of the drawing fails here.
    for (const skin of SKINS.filter((s) => MASTHEADED.includes(s.slug))) {
      expect(mark(render(skin).html, skin.slug), skin.slug).toContain('width:20px;height:20px')
    }
  })

  it('is the slot\'s own 20 for every skin that asks for nothing', () => {
    // No UA: its ensō is a CSS mask on a <div>, with no width attribute.
    for (const slug of ['coven', 'ephemerists', 'everymen', 'singularity', 'wow']) {
      const band = mark(render(SKINS.find((s) => s.slug === slug)!).html, slug)
      expect(band.slice(band.indexOf('<svg')), slug).toContain('width="20"')
    }
  })
})

describe('the anatomy lives in one place (#2029)', () => {
  it('is the same band markup on all seven, up to the skin\'s own paint', () => {
    // Every band is `CardMasthead`'s grid; a hand-rolled twin would differ.
    for (const skin of SKINS.filter((s) => MASTHEADED.includes(s.slug))) {
      const band = render(skin).html.split(`data-card-masthead="${skin.slug}"`)[1] ?? ''
      expect(band.slice(0, 400), skin.slug).toContain('display:grid')
      expect(band.slice(0, 400), skin.slug).toContain('grid-template-columns:1fr auto 1fr')
    }
  })
})

/* C (#2030) — the sign-up as an inset button */

/** Skins drawing the shared CTA rule; the other five draw their own. */
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
    // `width:100%` on the button is what makes it the card's edge.
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
    // `signupAffordance.ts` decides whether there is one; a lone rule = tangled.
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
    // The na sheet must appear byte-for-byte inside Albescent's (ADR-0048), so
    // the opacity is a var repointed by `.alb-task` in CSS, not a prop.
    const albescent = render(SKINS.find((s) => s.slug === 'albescent')!)
    const unaffiliated = render(SKINS.find((s) => s.slug === 'na')!)
    expect(albescent.html).toContain(unaffiliated.html)
    // `alb-moves` animates the spectra; `alb-prism` is the droppable ground.
    expect(albescent.html).toContain('class="alb-task alb-moves alb-prism"')
    expect(unaffiliated.html).toContain('opacity:var(--faction-default-cta-rule-opacity, 0.6)')
  })
})


/* #2359 — the one denial that is a door, in all nine skins */

/**
 * `signupAffordance.test.ts` pins the decision; this proves all nine skins act
 * on it: an anchor, to the draft's editor, on the 44px floor.
 */
const HELD = aTask({
  can_sign_up: false,
  signup_reason: 'already_active_member',
  in_progress_praxis_id: 77,
})

/** The same shut card, the praxis already FILED (#2643) — a door to READ it. */
const FILED = aTask({
  can_sign_up: false,
  signup_reason: 'already_active_member',
  submitted_praxis_id: 91,
})

/** Nothing to land on: a `pending` praxis is neither editable nor readable. */
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

/** Visible text with escaped entities restored (the denial copy has an apostrophe). */
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
    // Every skin's one button is its sign-up.
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

/** #2643 — the filed-praxis half of the same denial, in all nine skins. */
describe.each(SKINS)('$slug offers a praxis you already filed (#2643)', (skin) => {
  it('draws the slot as a link to the praxis, on the 44px floor', () => {
    const html = renderTask(skin, FILED)
    expect(visible(html)).toContain(i18n.t('tasks:detail.submitted.view'))
    const slot = html.match(/<a [^>]*href="\/praxis\/91"[^>]*>/)
    expect(slot, 'the slot is an anchor to the filed praxis').not.toBeNull()
    expect(slot![0], 'the tap floor').toContain('min-height:44px')
  })

  it('points at the READ page, not the editor that would bounce', () => {
    // `/edit` bounces a submitted praxis back to `/praxis/:id` (#1164).
    expect(renderTask(skin, FILED)).not.toContain('/edit')
  })

  it('replaces the refusal rather than sitting beside it', () => {
    const html = renderTask(skin, FILED)
    expect(html).not.toContain('<button')
    expect(visible(html)).not.toContain(
      i18n.t('tasks:detail.signup.denied.alreadyActiveMember'),
    )
  })
})
