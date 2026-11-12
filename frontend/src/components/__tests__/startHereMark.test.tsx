/**
 * The *start here* mark (#1861, SPEC-onboarding § The hand-off). Drawn by the
 * dispatcher (not the skins) off `task.start_here` alone; the negative cases
 * are the load-bearing ones.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import i18n from '../../i18n'

import TaskCard from '../taskCard/TaskCard'
import { aTask } from '../../test/fixtures'

const LABEL = i18n.t('onboarding:mark.label')

function text(task = aTask()): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <TaskCard task={task} basePoints={task.point_value} />
    </MemoryRouter>,
  ).replace(/<[^>]*>/g, '')
}

describe('the start-here mark on a task card', () => {
  it('is drawn on a task the server marked', () => {
    expect(text(aTask({ start_here: true }))).toContain(LABEL)
  })

  it('is absent on a task the server did not mark', () => {
    expect(text(aTask({ start_here: false }))).not.toContain(LABEL)
  })

  it('is not inferred from the task — a level-0 task alone earns nothing', () => {
    // The derivation is the server's; guessing here would make the spec's one rule two.
    expect(text(aTask({ level_required: 0, primary_faction_slug: 'na' }))).not.toContain(
      LABEL,
    )
  })
})
