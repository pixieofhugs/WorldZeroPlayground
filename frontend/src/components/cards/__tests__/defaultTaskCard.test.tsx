/**
 * The na / Unaffiliated task card, and the prop plumbing every faction skin
 * inherits (#1022, ADR-0055 + ADR-0056).
 *
 * Two things are pinned here. First, the card is ONE responsive component: the
 * same element tree renders on both form factors and only the size set moves,
 * so the mobile assertions are about `useFormFactor` reaching the card, not
 * about a second file. Second, points arrive unmultiplied — the card must show
 * `basePoints`, never `basePoints × multiplier`, or a future non-1.0 era
 * multiplies twice.
 *
 * Rendered with `renderToStaticMarkup`; this repo has no jsdom, so effects
 * never run and click behaviour is out of reach. These are render-shape
 * assertions.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { TaskOut } from '../../../api/tasks'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// Imported after the mock is registered.
import DefaultTaskCard from '../DefaultTaskCard'
import TaskCard from '../../TaskCard'

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

function markup(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

function card(props: Partial<{
  multiplier: number
  inProgressCount: number
  onSignup: (id: number) => void
}> = {}) {
  return markup(
    <DefaultTaskCard
      task={TASK}
      basePoints={TASK.point_value}
      multiplier={props.multiplier ?? 1}
      inProgressCount={props.inProgressCount ?? 0}
      onSignup={props.onSignup}
    />,
  )
}

const SIGNUP = i18n.t('feed:taskCard.na.signup')

describe('na task card — content slots', () => {
  // #1020 gave every card a uniform "Task {id}" eyebrow; #1124 retired the id
  // from cards altogether. Both halves of this assertion are now negative: no
  // shared ordinal, and still no faction ordinal — the design canvas's "Task No."
  // ornament was never ours to draw either.
  it('draws no task id, in the uniform voice or a faction one', () => {
    const { text } = card()
    expect(text, 'no uniform ordinal').not.toContain('Task 7')
    expect(text, 'no Task No. ornament from the design canvas').not.toContain('№')
  })

  it('renders the title behind a link to the task, the call, level and marks', () => {
    const { html, text } = card()
    expect(html, 'task-link slot').toContain('href="/tasks/7"')
    expect(text, 'title slot').toContain('Photosynthesis')
    expect(text, 'call slot').toContain('stranger will find it')
    expect(text, 'level slot').toContain('2')
    expect(text, 'points slot').toContain('18')
  })

  it('shows the in-progress count only when someone is working it', () => {
    expect(card({ inProgressCount: 6 }).text).toContain(
      i18n.t('feed:taskCard.inProgress', { count: 6 }),
    )
    expect(card({ inProgressCount: 0 }).text).not.toContain(
      i18n.t('feed:taskCard.inProgress', { count: 0 }),
    )
  })

  it('hides the sign-up CTA rather than disabling it when the viewer cannot sign up', () => {
    expect(card({ onSignup: () => {} }).text).toContain(SIGNUP)
    expect(card().text, 'no onSignup → no control').not.toContain(SIGNUP)
  })
})

describe('na task card — base points + multiplier badge (ADR-0055)', () => {
  it('shows base points and no badge at the era_1 neutral factor', () => {
    const { text } = card({ multiplier: 1 })
    expect(text, 'base points').toContain('18')
    expect(text, 'no modifier caption').not.toContain(
      i18n.t('feed:taskCard.modifierCaption'),
    )
  })

  it('shows the badge on a tuned factor and STILL shows base points, unmultiplied', () => {
    const { text } = card({ multiplier: 1.5 })
    expect(text, 'badge').toContain(i18n.t('feed:taskCard.multiplier', { value: '1.50' }))
    expect(text).toContain(i18n.t('feed:taskCard.modifierCaption'))
    expect(text, 'base points, not 27').toContain('18')
    expect(text, 'the product must not be pre-applied').not.toContain('27')
  })

  it('treats float slop as neutral', () => {
    expect(card({ multiplier: 0.1 + 0.9 }).text).not.toContain(
      i18n.t('feed:taskCard.modifierCaption'),
    )
  })
})

describe('na task card — one component, two form factors (ADR-0056)', () => {
  it('renders every content slot on mobile as well as desktop', () => {
    for (const formFactor of ['desktop', 'mobile'] as const) {
      mocks.formFactor = formFactor
      const { html, text } = card({ inProgressCount: 6, onSignup: () => {} })
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

describe('TaskCard dispatcher — prop defaults', () => {
  it('falls through to the na card for an unfactioned task', () => {
    const { html } = markup(<TaskCard task={TASK} basePoints={TASK.point_value} />)
    expect(html, 'na card is the fallback skin').toContain('data-form-factor=')
  })

  it('reads inProgressCount off the task when the caller omits it', () => {
    const { text } = markup(<TaskCard task={TASK} basePoints={TASK.point_value} />)
    expect(text).toContain(i18n.t('feed:taskCard.inProgress', { count: 6 }))
  })

  it('treats a pre-#1021 task with no in_progress_count as zero, not NaN', () => {
    const legacy: TaskOut = { ...TASK, in_progress_count: undefined }
    const { text } = markup(<TaskCard task={legacy} basePoints={legacy.point_value} />)
    expect(text).not.toContain('NaN')
    expect(text).not.toContain(i18n.t('feed:taskCard.inProgress', { count: 0 }))
  })

  it('defaults the multiplier to neutral, so a caller with no viewer context shows no badge', () => {
    const { text } = markup(<TaskCard task={TASK} basePoints={TASK.point_value} />)
    expect(text).not.toContain(i18n.t('feed:taskCard.modifierCaption'))
  })
})
