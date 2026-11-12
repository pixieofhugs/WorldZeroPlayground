/**
 * The second screen of the game (#1972): a level-0 player who claims their one
 * startable task empties their own eligible board. The button says "see
 * everything" because the default, not the player, applied the filter.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { PraxisCardOut } from '../../../api/praxis'
import { aPraxisCard } from '../../../test/fixtures'

const active: { current: PraxisCardOut[] } = { current: [] }
const maxSlots: { current: number | null } = { current: 20 }

vi.mock('../../../hooks/useMyActiveTasks', () => ({
  useMyActiveTasks: () => ({
    activeTasks: active.current,
    loading: false,
    refetch: () => {},
  }),
}))
vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () =>
    maxSlots.current === null ? null : { max_task_signups: maxSlots.current },
}))

const { default: CanSignUpEmpty } = await import('../CanSignUpEmpty')

const holding = (count: number): PraxisCardOut[] =>
  Array.from({ length: count }, (_, index) => aPraxisCard({ id: index + 1 }))

/** Tags out, and the apostrophe the static renderer emits as `&#x27;` back in. */
function text(): string {
  return renderToStaticMarkup(<CanSignUpEmpty onClearAll={() => {}} />)
    .replace(/<[^>]*>/g, '')
    .replace(/&#x27;|&#39;/g, "'")
}

const HINT_EMPTY = i18n.t('tasks:listPage.emptyEligible')
const HINT_HOLDING = i18n.t('tasks:listPage.finishWhatYouHold')

describe('the eligible-empty board (#1972)', () => {
  it('sends a player holding a task off to finish it', () => {
    active.current = holding(1)
    maxSlots.current = 20
    const out = text()
    expect(out, 'the level-0 second screen').toContain(HINT_HOLDING)
    expect(out).not.toContain(HINT_EMPTY)
  })

  it('says the bank is full when the cap is what emptied the list', () => {
    active.current = holding(20)
    maxSlots.current = 20
    const out = text()
    expect(out).toContain(
      i18n.t('tasks:listPage.bankFull', { used: 20, max: 20 }),
    )
    expect(out).not.toContain(HINT_HOLDING)
  })

  it('falls back to the plain sentence when nothing is held', () => {
    active.current = []
    maxSlots.current = 20
    expect(text()).toContain(HINT_EMPTY)
  })

  it('offers "see everything", not "clear all filters" — nobody applied this', () => {
    active.current = []
    const out = text()
    expect(out).toContain(i18n.t('tasks:listPage.seeEverything'))
    expect(out).not.toContain(i18n.t('common:filters.bar.clearAllFilters'))
  })
})
