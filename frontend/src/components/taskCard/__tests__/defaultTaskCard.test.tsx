/**
 * The na task card and the prop plumbing every skin inherits (#1022, ADR-0055/56).
 * One responsive component; points arrive unmultiplied — showing
 * `basePoints × multiplier` would multiply twice in a non-1.0 era.
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
import TaskCard from '../TaskCard'
import { aTask } from '../../../test/fixtures'

const TASK = aTask({
  description: 'Leave something small and honest where a stranger will find it.',
  created_by: 3,
  created_by_display_name: '',
  in_progress_count: 6,
})

function markup(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

function card(props: Partial<{
  task: TaskOut
  multiplier: number
  inProgressCount: number
  onSignup: (id: number) => void
}> = {}) {
  const task = props.task ?? TASK
  return markup(
    <DefaultTaskCard
      task={task}
      basePoints={task.point_value}
      multiplier={props.multiplier ?? 1}
      inProgressCount={props.inProgressCount ?? 0}
      onSignup={props.onSignup}
    />,
  )
}

const SIGNUP = i18n.t('feed:taskCard.signup')

describe('na task card — content slots', () => {
  // #1124 retired the id from cards.
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

  it('draws no action slot at all on a surface that did not ask for one', () => {
    expect(card({ onSignup: () => {} }).text).toContain(SIGNUP)
    expect(card().text, 'no onSignup → no control').not.toContain(SIGNUP)
    expect(card().html, 'and nothing to refuse either').not.toContain('aria-disabled')
  })

  // na is only reached via Albescent in the manifest loop, so pin it here (#1976).
  it('states why sign-up is shut instead of offering a claim the server refuses', () => {
    const { html, text } = card({
      task: aTask({ ...TASK, level_required: 4, can_sign_up: false, signup_reason: 'below_level' }),
      onSignup: () => {},
    })
    expect(text).toContain(i18n.t('tasks:detail.signup.denied.belowLevel', { level: 4 }))
    expect(text, 'and stops calling it a sign-up').not.toContain(SIGNUP)
    expect(html, 'not actionable, and it says so').toContain('aria-disabled="true"')
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

  it('draws no in-progress line, and no NaN, for a task with nobody on it', () => {
    const empty: TaskOut = { ...TASK, in_progress_count: 0 }
    const { text } = markup(<TaskCard task={empty} basePoints={empty.point_value} />)
    expect(text).not.toContain('NaN')
    expect(text).not.toContain(i18n.t('feed:taskCard.inProgress', { count: 0 }))
  })

  it('defaults the multiplier to neutral, so a caller with no viewer context shows no badge', () => {
    const { text } = markup(<TaskCard task={TASK} basePoints={TASK.point_value} />)
    expect(text).not.toContain(i18n.t('feed:taskCard.modifierCaption'))
  })
})
