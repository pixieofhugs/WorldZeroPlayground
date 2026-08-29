/**
 * The bespoke faction task cards, v2 (#1023 wave A — ADR-0055 + ADR-0056).
 *
 * One table rather than a file per skin: every card answers the SAME contract
 * ({@link CardProps}), so the interesting assertions are identical. A card that
 * stops honouring the contract flips one row red and names itself. The table
 * used to carry a per-faction signup key too; #1911 collapsed the nine into one
 * `feed:taskCard.signup`, so the verb is a module constant now.
 *
 * Two things are pinned. First, each card is ONE responsive component: the same
 * element tree renders on both form factors and only the size set moves, so the
 * mobile assertions are about `useFormFactor` reaching the card, not about a
 * second file. Second, points arrive UNMULTIPLIED — a card must show
 * `basePoints`, never `basePoints × multiplier`, or a future non-1.0 era
 * multiplies twice.
 *
 * Rendered with `renderToStaticMarkup`; this repo has no jsdom, so effects never
 * run and click behaviour is out of reach. These are render-shape assertions.
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

/**
 * The one sign-up verb all nine cards read (#1911). Resolved rather than held as
 * a key string: `t()` takes a typed literal, and a `string` field would need a
 * cast that defeats the catalog's key checking.
 */
const SIGNUP = i18n.t('feed:taskCard.signup')

/**
 * Every skin the taskCard surface dispatches to, read off the registry rather
 * than listed here (#2815).
 *
 * The table used to name eight components by hand, which made the range
 * something someone had to remember: a tenth kit could register a card and
 * never be rendered by this file. `surfaceMap('taskCard')` IS the dispatch, so
 * the loop now covers whatever the app can actually reach — including `na`,
 * whose `DefaultTaskCard` answers the same {@link CardProps} contract and had
 * simply been left off.
 *
 * The wrappers render synchronously here because `src/test/preloadArchetypes.ts`
 * warms every archetype before the suite runs; see `factions/lazyArchetype.tsx`.
 */
const SKINS: Skin[] = Object.entries(surfaceMap('taskCard')).map(([slug, Card]) => ({
  slug,
  Card,
}))

/**
 * Every value of `services/praxis.py`'s `SignupDenialReason`, with the copy the
 * card must show for it (#1976).
 *
 * Written out rather than derived from the mapper: a table that reads the thing
 * it is testing would pass just as happily if the mapper started returning one
 * generic key for all five. The `below_level` row leaves `{{level}}` uninterpolated
 * on purpose — `TASK.level_required` is 2 and its own test pins the number.
 */
const DENIALS: [reason: string, copy: string][] = [
  ['below_level', i18n.t('tasks:detail.signup.denied.belowLevel', { level: 2 })],
  ['task_status_closed', i18n.t('tasks:detail.signup.denied.taskStatusClosed')],
  ['already_active_member', i18n.t('tasks:detail.signup.denied.alreadyActiveMember')],
  ['bank_full', i18n.t('tasks:detail.signup.denied.bankFull')],
  ['is_metatask', i18n.t('tasks:detail.signup.denied.isMetatask')],
]

/**
 * The five entities React escapes on the way out. They have to come back before
 * the text is compared to a catalog string, or a perfectly correct card fails
 * for having an apostrophe in its CTA — which is exactly what S.N.I.D.E.'s
 * "I'M IN" did. Decoding can only ever make a `toContain` pass, so it cannot
 * mask a regression in the rows above; what it removes is a false negative that
 * scaled with how punctuated a faction's voice happens to be.
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
  // #1020 gave every card a uniform "Task {id}" eyebrow; #1124 retired the id
  // from cards altogether. Both halves are negative now: no shared ordinal, and
  // still none of the design canvases' per-faction ordinals — which is why the
  // regex survives the change that deleted the string it was guarding.
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
    // A character profile's task list and a faction page's roster are readouts.
    // They withhold `onSignup`, and they get neither a claim nor a refusal.
    expect(render(skin, { onSignup: () => {} }).text).toContain(SIGNUP)
    expect(render(skin).text, 'no onSignup → no control').not.toContain(SIGNUP)
    expect(render(skin).html, 'and nothing to refuse either').not.toContain('aria-disabled')
  })

  // #1976. The card used to say "Sign up" on a task the server would refuse, or
  // (where the list gated on `can_sign_up`) say nothing at all — either way it
  // disagreed with the detail page for the same task, which has read
  // `signup_reason` since #1497.
  it('states the reason instead of offering a claim the server will refuse', () => {
    for (const [reason, expected] of DENIALS) {
      const { html, text } = render(skin, {
        task: aTask({ ...TASK, can_sign_up: false, signup_reason: reason }),
        onSignup: () => {},
      })
      expect(text, `${reason} states why`).toContain(expected)
      expect(text, `${reason} does not still say ${SIGNUP}`).not.toContain(SIGNUP)
      // The control communicates its state rather than merely not working:
      // `aria-disabled` keeps it in the tab order and announces it, where the
      // `disabled` attribute would take it out of the tree unheard.
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
    // `multi_membership` is a PERMIT: Double Dipper lets its members go again,
    // and the detail page has said "Begin again" for it since #1497 while the
    // card said "Sign up". One mapper, one answer.
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

// `$slug renders through the taskCard manifest surface` stood here and asserted
// `surfaceMap('taskCard')[skin.slug]` was defined. Once SKINS comes from that
// very map (#2815) it asserts the map equals itself, so it is gone rather than
// left to read like coverage. What it was really guarding — which slugs are
// registered on which surface — is `factions/__tests__/surfaceDispatch.test.ts`.
it('covers every skin the app can dispatch taskCard to', () => {
  expect(SKINS).toHaveLength(9)
})

/* -------------------------------------------------------------------------- */
/* S.N.I.D.E. — the censor is ornament; it never touches authored text         */
/* -------------------------------------------------------------------------- */

describe('snide renders the brief whole and slices only the headline', () => {
  const props = { basePoints: TASK.point_value, multiplier: 1, inProgressCount: 0 }

  it('never redacts the task description', () => {
    // The design struck two words of the brief out as black bars, seeded off the
    // task id. Owner ruling (#1023): a skin does not get to mutilate authored
    // text, however well the joke fits. This is the guard against it coming
    // back — the strike's tell was a `color: transparent` word on an ink block.
    const { html, text } = markup(<SnideTaskCard task={TASK} {...props} />)
    expect(text, 'the brief, unedited').toContain(TASK.description)
    expect(html, 'no struck-out words').not.toContain('color:transparent')
  })

  it('keeps the cut-up headline as ONE readable string', () => {
    // The multi-font slice survives the ruling precisely because it RESTYLES
    // words instead of destroying them: the cuts are spans inside the <h3>, so
    // the heading's accessible name is still the unbroken title.
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

/* -------------------------------------------------------------------------- */
/* Albescent — the one card in this wave that is NOT a bespoke skin            */
/* -------------------------------------------------------------------------- */

describe('albescent task card is na + drift, never a repaint (ADR-0048)', () => {
  const props = { basePoints: TASK.point_value, multiplier: 1, inProgressCount: 6 }

  it('contains the na sheet whole, and adds only the wrapper and one edge', () => {
    const albescent = markup(<AlbescentTaskCard task={TASK} {...props} />)
    const unaffiliated = markup(<DefaultTaskCard task={TASK} {...props} />)

    // The strongest statement of the rule: strip the wrapper and the edge and
    // what is left is the unaffiliated card, byte for byte. A future edit that
    // "just tweaks" one slot for Albescent fails here.
    expect(albescent.html).toContain(unaffiliated.html)
    expect(albescent.html, 'the drifting spectrum edge').toContain('alb-task-edge')

    // #2499: the breathing aurora is gone as a SPAN and back as a GROUND. The
    // card's whole ornament budget is now one class on the wrapper and one ring,
    // and the class is what the alternation law takes — see
    // taskCard/__tests__/albescentPrismAlternates.test.tsx.
    expect(albescent.html, 'the prism ground').toContain('alb-prism')
    expect(albescent.html, 'and no overlay beside it').not.toContain('alb-task-aurora')
  })

  it('speaks na words — a per-faction verb is as identifying as a per-faction hue', () => {
    // Albescent kept an orphaned verb of its own ("acknowledge") from the
    // bespoke card #783 deleted, and this pinned that it never reached a
    // screen: wiring it back would un-hide the society on an ordinary surface
    // (ADR-0048 — the card IS the na card plus a drift, and a per-faction WORD
    // is as identifying as a per-faction hue, WORLD_ZERO_STYLE §3). #1911
    // collapsed the nine signup keys to one, which DELETED the orphan, so there
    // is no second verb left to catch the card saying. What survives, and is
    // what the ruling was actually about, is that the card says the shared word
    // and paints in none of Albescent's own tokens.
    const { text, html } = markup(
      <AlbescentTaskCard task={TASK} {...props} onSignup={() => {}} />,
    )
    expect(text).toContain(SIGNUP)
    expect(html, 'no --faction-albescent-* token may reach a rendered surface')
      .not.toContain('--faction-albescent')
  })
})

/**
 * #1654 — the Ephemerists card draws the kit's marks, at the CARD's densities.
 *
 * Its glyph table, its `Glyph`, its `Octagon` and its `Cornice` were local
 * copies of the plate's, and its tally strokes were the plate's `Tally` written
 * out inline. `ephemeristsPlateSurfaces.test.tsx` pins that none of them may be
 * declared twice again; what is left, and what only rendering can say, is that
 * the collapse kept the two numbers the card did NOT share with the page.
 *
 * Both are counts of ornament, so they are legible in the markup and nowhere
 * else: neither is a token, neither is text, and a wrong one still renders a
 * perfectly good cornice.
 */
describe('the Ephemerists card keeps its own ornament densities (#1654)', () => {
  const card = () => render(SKINS.find((skin) => skin.slug === 'ephemerists')!).html

  it('strikes 40 cornice flutes, not the page kit default of 52', () => {
    // The flutes are `flex: 1`, so the count is the fluting's pitch: 52 across
    // a 384px band closes it up. 40 is the task-card design's (#1023); 52 is
    // the task-details design's (#1041). Counted on the SHORT flute, which the
    // cornice alternates in and nothing else on the card draws — every other
    // stroke, so 20 of them.
    expect(card().match(/height:3\.5px/g)).toHaveLength(20)
  })

  it('marches no register at all — the motif is at the CTA now (#2067)', () => {
    // It used to march two named 12-sign rows across a 110px night band, where
    // the page fills its width from a cycled 16-sign register. The re-pulled
    // design's masthead carries no ornament and the motif returns as
    // `EphemeristsNotationBand`, so the card's own orders and the `register()`
    // helper are gone with the canvas they needed. `Glyph` is still kit
    // vocabulary and four other Ephemerists surfaces still cut it — what this
    // asserts is that no register creeps back onto THIS band.
    expect(card()).not.toContain('class="epg-glyph"')
  })

  it('draws the level as the kit tally, one stroke per level', () => {
    // TASK is level 2, and `Tally` clamps to 1..9. The inline copy this
    // replaced carried the same clamp, and it came across with it.
    expect(card().match(/width:1\.6px/g)).toHaveLength(2)
  })
})
