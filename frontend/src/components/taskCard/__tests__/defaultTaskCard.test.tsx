/** The TaskCard dispatcher's prop defaults. The na card's slots run in factionTaskCardsV2 (na is a skin there). */
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
