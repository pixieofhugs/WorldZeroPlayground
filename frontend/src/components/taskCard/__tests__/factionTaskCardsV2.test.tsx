/**
 * Every faction task card against the one {@link CardProps} contract (#1023,
 * ADR-0055/56): one responsive component per skin; points arrive UNMULTIPLIED
 * (showing `basePoints × multiplier` would multiply twice in a non-1.0 era).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType, ReactElement } from 'react'
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
import SnideTaskCard from '../SnideTaskCard'
import DefaultTaskCard from '../DefaultTaskCard'
import { surfaceMap } from '../../../factions'
import { aTask } from '../../../test/fixtures'

const TASK = aTask({
  description: 'Leave something small and honest where a stranger will find it.',
  created_by: 3,
  created_by_display_name: '',
  in_progress_count: 6,
})

interface Skin {
  slug: string
  Card: ComponentType<CardProps>
}

/** Resolved, not a key string: `t()` takes a typed literal (#1911). */
const SIGNUP = i18n.t('feed:taskCard.signup')

/**
 * Read off the registry (#2815) so a new kit can't be skipped. Wrappers render
 * synchronously because `src/test/preloadArchetypes.ts` warms every archetype.
 */
const SKINS: Skin[] = Object.entries(surfaceMap('taskCard')).map(([slug, Card]) => ({
  slug,
  Card,
}))

/**
 * Every `SignupDenialReason` (#1976). Written out, not derived from the mapper:
 * a table that reads the thing under test would pass a one-key mapper.
 */
const DENIALS: [reason: string, copy: string][] = [
  ['below_level', i18n.t('tasks:detail.signup.denied.belowLevel', { level: 2 })],
  ['task_status_closed', i18n.t('tasks:detail.signup.denied.taskStatusClosed')],
  ['already_active_member', i18n.t('tasks:detail.signup.denied.alreadyActiveMember')],
  ['bank_full', i18n.t('tasks:detail.signup.denied.bankFull')],
  ['is_metatask', i18n.t('tasks:detail.signup.denied.isMetatask')],
]

/**
 * Decoded before comparing to catalog strings (S.N.I.D.E.'s "I'M IN"). Decoding
 * can only make `toContain` pass, so it masks no regression.
 */
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
}

function markup(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|#x27);/g, (entity) => ENTITIES[entity])
  return { html, text }
}

function render(
  { Card }: Skin,
  props: Partial<Pick<CardProps, 'task' | 'multiplier' | 'inProgressCount' | 'onSignup'>> = {},
) {
  const task = props.task ?? TASK
  return markup(
    <Card
      task={task}
      basePoints={task.point_value}
      multiplier={props.multiplier ?? 1}
      inProgressCount={props.inProgressCount ?? 0}
      onSignup={props.onSignup}
    />,
  )
}

describe.each(SKINS)('$slug task card v2 — content slots', (skin) => {
  // #1124 retired the id from cards.
  it('draws no task id, in the uniform voice or a faction one', () => {
    const { text } = render(skin)
    expect(text, 'no uniform ordinal').not.toContain('Task 7')
    expect(text, 'no folio/fragment/dispatch ornament from the design canvas')
      .not.toMatch(/№|Nº|Fragment|Folio|Dispatch/)
  })

  it('renders the title behind a link to the task, plus the call, level and points', () => {
    const { html, text } = render(skin)
    expect(html, 'task-link slot').toContain('href="/tasks/7"')
    expect(text, 'title slot').toContain('Photosynthesis')
    expect(text, 'call slot').toContain('stranger will find it')
    expect(text, 'level slot').toContain('2')
    expect(text, 'points slot').toContain('18')
  })

  it('shows the uniform in-progress line only when someone is working it', () => {
    expect(render(skin, { inProgressCount: 6 }).text).toContain(
      i18n.t('feed:taskCard.inProgress', { count: 6 }),
    )
    expect(render(skin, { inProgressCount: 0 }).text).not.toContain(
      i18n.t('feed:taskCard.inProgress', { count: 0 }),
    )
  })

  it('draws no action slot at all on a surface that did not ask for one', () => {
    // Readouts (profile, roster) withhold `onSignup`: no claim, no refusal.
    expect(render(skin, { onSignup: () => {} }).text).toContain(SIGNUP)
    expect(render(skin).text, 'no onSignup → no control').not.toContain(SIGNUP)
    expect(render(skin).html, 'and nothing to refuse either').not.toContain('aria-disabled')
  })

  // #1976: the card must agree with the detail page's `signup_reason`.
  it('states the reason instead of offering a claim the server will refuse', () => {
    for (const [reason, expected] of DENIALS) {
      const { html, text } = render(skin, {
        task: aTask({ ...TASK, can_sign_up: false, signup_reason: reason }),
        onSignup: () => {},
      })
      expect(text, `${reason} states why`).toContain(expected)
      expect(text, `${reason} does not still say ${SIGNUP}`).not.toContain(SIGNUP)
      // `aria-disabled`, not `disabled`: stays in the tab order and is announced.
      expect(html, `${reason} is not actionable`).toContain('aria-disabled="true"')
    }
  })

  it('interpolates the level the viewer is short of, rather than a generic no', () => {
    const { text } = render(skin, {
      task: aTask({ ...TASK, level_required: 4, can_sign_up: false, signup_reason: 'below_level' }),
      onSignup: () => {},
    })
    expect(text).toContain(i18n.t('tasks:detail.signup.denied.belowLevel', { level: 4 }))
    expect(text, 'the placeholder must not survive to the screen').not.toContain('{{level}}')
  })

  it('keeps the claim pressable, and says the detail page words, when sign-up is open', () => {
    // `multi_membership` is a PERMIT: "Begin again", as on the detail page.
    const again = render(skin, {
      task: aTask({ ...TASK, signup_reason: 'multi_membership' }),
      onSignup: () => {},
    })
    expect(again.text).toContain(i18n.t('tasks:detail.signup.ctaAgain'))
    expect(again.html, 'still a live control').not.toContain('aria-disabled')

    const open = render(skin, { onSignup: () => {} })
    expect(open.text, "the faction's own verb, unchanged").toContain(SIGNUP)
    expect(open.html, 'still a live control').not.toContain('aria-disabled')
  })
})

describe.each(SKINS)('$slug task card v2 — base points + modifier badge (ADR-0055)', (skin) => {
  it('shows base points and no badge at the era_1 neutral factor', () => {
    const { text } = render(skin, { multiplier: 1 })
    expect(text, 'base points').toContain('18')
    expect(text, 'no modifier caption').not.toContain(i18n.t('feed:taskCard.modifierCaption'))
  })

  it('shows the badge on a tuned factor and STILL shows base points, unmultiplied', () => {
    const { text } = render(skin, { multiplier: 1.5 })
    expect(text, 'badge').toContain(i18n.t('feed:taskCard.multiplier', { value: '1.50' }))
    expect(text).toContain(i18n.t('feed:taskCard.modifierCaption'))
    expect(text, 'base points, not 27').toContain('18')
    expect(text, 'the product must not be pre-applied').not.toContain('27')
  })

  it('treats float slop as neutral', () => {
    expect(render(skin, { multiplier: 0.1 + 0.9 }).text).not.toContain(
      i18n.t('feed:taskCard.modifierCaption'),
    )
  })
})

describe.each(SKINS)('$slug task card v2 — one component, two form factors (ADR-0056)', (skin) => {
  it('renders every content slot on mobile as well as desktop', () => {
    for (const formFactor of ['desktop', 'mobile'] as const) {
      mocks.formFactor = formFactor
      const { html, text } = render(skin, { inProgressCount: 6, onSignup: () => {} })
      expect(html, formFactor).toContain(`data-form-factor="${formFactor}"`)
      expect(html, `${formFactor} task link`).toContain('href="/tasks/7"')
      expect(text, `${formFactor} title`).toContain('Photosynthesis')
      expect(text, `${formFactor} points`).toContain('18')
      expect(text, `${formFactor} in progress`).toContain(
        i18n.t('feed:taskCard.inProgress', { count: 6 }),
      )
      expect(text, `${formFactor} signup`).toContain(SIGNUP)
    }
    mocks.formFactor = 'desktop'
  })
})

// Registration per surface lives in `factions/__tests__/surfaceDispatch.test.ts`.
it('covers every skin the app can dispatch taskCard to', () => {
  expect(SKINS).toHaveLength(9)
})

/* S.N.I.D.E. — the censor is ornament; it never touches authored text */

describe('snide renders the brief whole and slices only the headline', () => {
  const props = { basePoints: TASK.point_value, multiplier: 1, inProgressCount: 0 }

  it('never redacts the task description', () => {
    // Owner ruling (#1023): a skin never mutilates authored text.
    const { html, text } = markup(<SnideTaskCard task={TASK} {...props} />)
    expect(text, 'the brief, unedited').toContain(TASK.description)
    expect(html, 'no struck-out words').not.toContain('color:transparent')
  })

  it('keeps the cut-up headline as ONE readable string', () => {
    // The cuts restyle words; the heading's text stays the unbroken title.
    const long = { ...TASK, title: 'Name the thing everyone is pretending not to notice' }
    expect(markup(<SnideTaskCard task={long} {...props} />).text).toContain(long.title)
  })

  it('cannot be pushed past its card width by one unbroken word', () => {
    const runOn = { ...TASK, title: 'Antidisestablishmentarianismandthensome' }
    const { html, text } = markup(<SnideTaskCard task={runOn} {...props} />)
    expect(text).toContain(runOn.title)
    expect(html, 'every cut wraps rather than overflowing').toContain('overflow-wrap:anywhere')
  })
})

/* Albescent — na + drift, not a bespoke skin */

describe('albescent task card is na + drift, never a repaint (ADR-0048)', () => {
  const props = { basePoints: TASK.point_value, multiplier: 1, inProgressCount: 6 }

  it('contains the na sheet whole, and adds only the wrapper and one edge', () => {
    const albescent = markup(<AlbescentTaskCard task={TASK} {...props} />)
    const unaffiliated = markup(<DefaultTaskCard task={TASK} {...props} />)

    // Strip wrapper and edge: what's left is the na card, byte for byte.
    expect(albescent.html).toContain(unaffiliated.html)
    expect(albescent.html, 'the drifting spectrum edge').toContain('alb-task-edge')

    // The ground is a class (#2499); see albescentPrismAlternates.test.tsx.
    expect(albescent.html, 'the prism ground').toContain('alb-prism')
    expect(albescent.html, 'and no overlay beside it').not.toContain('alb-task-aurora')
  })

  it('speaks na words — a per-faction verb is as identifying as a per-faction hue', () => {
    // A per-faction word or token would un-hide the society (ADR-0048, §3).
    const { text, html } = markup(
      <AlbescentTaskCard task={TASK} {...props} onSignup={() => {}} />,
    )
    expect(text).toContain(SIGNUP)
    expect(html, 'no --faction-albescent-* token may reach a rendered surface')
      .not.toContain('--faction-albescent')
  })
})

/**
 * #1654: the card mounts the kit's marks but keeps its own ornament counts,
 * visible only in markup.
 */
describe('the Ephemerists card keeps its own ornament densities (#1654)', () => {
  const card = () => render(SKINS.find((skin) => skin.slug === 'ephemerists')!).html

  it('strikes 40 cornice flutes, not the page kit default of 52', () => {
    // 40 is the task-card design's pitch (#1023). Counted on the short flute,
    // every other stroke, so 20.
    expect(card().match(/height:3\.5px/g)).toHaveLength(20)
  })

  it('marches no register at all — the motif is at the CTA now (#2067)', () => {
    expect(card()).not.toContain('class="epg-glyph"')
  })

  it('draws the level as the kit tally, one stroke per level', () => {
    // TASK is level 2; `Tally` clamps to 1..9.
    expect(card().match(/width:1\.6px/g)).toHaveLength(2)
  })
})
