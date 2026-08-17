/**
 * The second screen of the game (#1972).
 *
 * With the eligibility filter defaulting ON, a level-0 player who claims their
 * one startable task empties their own board — `evaluate_signup` then answers
 * `already_active_member` for every row. This is what they are shown, and the
 * three sentences it chooses between are the whole component:
 *
 *   - bank full — the cap emptied the list, and "you already hold twenty" is a
 *     different situation from "nothing matches"
 *   - holding something — go finish it, which is the level-0 case above
 *   - holding nothing — the plain caught-up sentence
 *
 * Plus the button, which must say what the tap DOES: the player did not apply
 * this filter, the default did, so "clear all filters" would name something
 * they never did.
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
