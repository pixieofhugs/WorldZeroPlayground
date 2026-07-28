/**
 * The bespoke faction task cards, v2 (#1023 wave A — ADR-0055 + ADR-0056).
 *
 * One table rather than a file per skin: every card answers the SAME contract
 * ({@link CardProps}), so the interesting assertions are identical and only the
 * per-faction signup key differs. A card that stops honouring the contract flips
 * one row red and names itself.
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
import type { TaskOut } from '../../../api/tasks'
import type { CardProps } from '../../TaskCard'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// Imported after the mock is registered.
import CovenTaskCard from '../CovenTaskCard'
import EphemeristsTaskCard from '../EphemeristsTaskCard'
import EverymenTaskCard from '../EverymenTaskCard'
import AlbescentTaskCard from '../AlbescentTaskCard'
import DefaultTaskCard from '../DefaultTaskCard'
import { surfaceMap } from '../../../factions'

const TASK: TaskOut = {
  id: 7,
  title: 'Photosynthesis',
  description: 'Leave something small and honest where a stranger will find it.',
  point_value: 18,
  level_required: 2,
  status: 'active',
  task_type: 'standard',
  created_by: 3,
  primary_faction_slug: null,
  metatask_faction_slug: null,
  is_task_vision_eligible: false,
  created_at: '2026-01-01T00:00:00Z',
  in_progress_count: 6,
  can_submit_praxis: true,
  allowed_modes: ['solo'],
  eligible_for_current_user: true,
}

interface Skin {
  slug: string
  Card: ComponentType<CardProps>
  /**
   * The faction's own signup copy — reused, never reinvented (#1020). Resolved
   * here rather than held as a key string: `t()` takes a typed literal, and a
   * `string` field would need a cast that defeats the catalog's key checking.
   */
  signup: string
}

const SKINS: Skin[] = [
  { slug: 'coven', Card: CovenTaskCard, signup: i18n.t('feed:taskCard.coven.signup') },
  {
    slug: 'ephemerists',
    Card: EphemeristsTaskCard,
    signup: i18n.t('feed:taskCard.ephemerists.signup'),
  },
  { slug: 'everymen', Card: EverymenTaskCard, signup: i18n.t('feed:taskCard.everymen.signup') },
  {
    // Albescent's row reads na's key ON PURPOSE, and it is the one row where
    // that is not an oversight: the card IS the na card plus a drift
    // (ADR-0048), and a per-faction WORD is as identifying as a per-faction
    // hue (WORLD_ZERO_STYLE §3). `feed:taskCard.albescent.signup` still exists
    // in the catalog, orphaned since #783 deleted the bespoke card it belonged
    // to; wiring it back would un-hide the society on an ordinary surface.
    slug: 'albescent',
    Card: AlbescentTaskCard,
    signup: i18n.t('feed:taskCard.na.signup'),
  },
]

function markup(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

function render(
  { Card }: Skin,
  props: Partial<Pick<CardProps, 'multiplier' | 'inProgressCount' | 'onSignup'>> = {},
) {
  return markup(
    <Card
      task={TASK}
      basePoints={TASK.point_value}
      multiplier={props.multiplier ?? 1}
      inProgressCount={props.inProgressCount ?? 0}
      onSignup={props.onSignup}
    />,
  )
}

describe.each(SKINS)('$slug task card v2 — content slots', (skin) => {
  it('carries the uniform "Task {id}" ordinal, no faction ordinal', () => {
    const { text } = render(skin)
    expect(text).toContain(i18n.t('feed:taskCard.ordinal', { id: 7 }))
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

  it('hides the sign-up CTA rather than disabling it when the viewer cannot sign up', () => {
    expect(render(skin, { onSignup: () => {} }).text).toContain(skin.signup)
    expect(render(skin).text, 'no onSignup → no control').not.toContain(skin.signup)
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
      expect(text, `${formFactor} signup`).toContain(skin.signup)
    }
    mocks.formFactor = 'desktop'
  })
})

describe.each(SKINS)('$slug renders through the taskCard manifest surface', (skin) => {
  it('is the registered skin for its slug', () => {
    expect(surfaceMap('taskCard')[skin.slug]).toBeDefined()
  })
})

/* -------------------------------------------------------------------------- */
/* Albescent — the one card in this wave that is NOT a bespoke skin            */
/* -------------------------------------------------------------------------- */

describe('albescent task card is na + drift, never a repaint (ADR-0048)', () => {
  const props = { basePoints: TASK.point_value, multiplier: 1, inProgressCount: 6 }

  it('contains the na sheet whole, and adds only the two flourish overlays', () => {
    const albescent = markup(<AlbescentTaskCard task={TASK} {...props} />)
    const unaffiliated = markup(<DefaultTaskCard task={TASK} {...props} />)

    // The strongest statement of the rule: strip the wrapper and the two
    // overlays and what is left is the unaffiliated card, byte for byte. A
    // future edit that "just tweaks" one slot for Albescent fails here.
    expect(albescent.html).toContain(unaffiliated.html)
    expect(albescent.html, 'the drifting spectrum edge').toContain('alb-task-edge')
    expect(albescent.html, 'the breathing aurora').toContain('alb-task-aurora')
  })

  it('speaks na words — a per-faction verb is as identifying as a per-faction hue', () => {
    const { text, html } = markup(
      <AlbescentTaskCard task={TASK} {...props} onSignup={() => {}} />,
    )
    expect(text).toContain(i18n.t('feed:taskCard.na.signup'))
    expect(text, 'the orphaned pre-#783 Albescent verb must stay orphaned')
      .not.toContain(i18n.t('feed:taskCard.albescent.signup'))
    expect(html, 'no --faction-albescent-* token may reach a rendered surface')
      .not.toContain('--faction-albescent')
  })
})
