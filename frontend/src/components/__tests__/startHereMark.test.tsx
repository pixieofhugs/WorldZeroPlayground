/**
 * The *start here* mark (#1861, SPEC-onboarding § The hand-off).
 *
 * THE SEAM IS THE DISPATCHER. The mark is mounted by `TaskCard` (and by
 * `TaskDetail`, the same five lines) rather than by the nine faction skins, so
 * what is worth pinning is that the dispatcher draws it off `task.start_here`
 * and off nothing else. A skin that had to remember the mark is eight more
 * chances to forget it.
 *
 * The negative case is the load-bearing one: `start_here` is false on every
 * task but the onboarding one, and false there too once the viewer has
 * completed it, so a mark that drew unconditionally would decorate the whole
 * board and no assertion about the positive case would notice.
 *
 * Rendered with `renderToStaticMarkup` — no jsdom, effects never run.
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
    // The derivation is the SERVER's, off the viewer's praxis history. If this
    // surface ever learned to guess from a level, a title or a faction, the
    // spec's "one rule" would have quietly become two.
    expect(text(aTask({ level_required: 0, primary_faction_slug: 'na' }))).not.toContain(
      LABEL,
    )
  })
})
