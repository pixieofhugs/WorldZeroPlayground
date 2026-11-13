/**
 * Forfeit escalation on the unsubmit control (#718). `settled`: unsubmitting is
 * a permanent forfeit (ADR-0011) and the confirm must say so. `active`: a free
 * reopen, so NO warning. Cost figures come from the mocked game config.
 */
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisOut } from '../../../api/praxis'
import type { CurrentUser } from '../../../api/auth'
import type { DuelDetailOut, DuelStatus } from '../../../api/duel'
import type { GameConfigOut, FactionConfigOut } from '../../../api/gameConfig'
import { aDuel, aDuelSide } from '../../../test/fixtures'
import { anOwnedPraxis, anOwner, aPraxisDetailState, markup } from '../../../test/praxisDetail'


function faction(slug: string, win: number, lose: number): FactionConfigOut {
  return {
    slug,
    own_task_modifier: 1.0,
    other_task_modifier: 1.0,
    collab_own_modifier: 1.0,
    collab_other_modifier: 1.0,
    duel_win_modifier: win,
    duel_loss_modifier: lose,
    // #1869; irrelevant here but part of the contract.
    reads_the_array: false,
    takes_duel_ties: false,
  }
}

const CONFIG = {
  factions: [faction('snide', 2.0, 0.0), faction('wow', 1.5, 0.5)],
} as unknown as GameConfigOut

vi.mock('../../../hooks/useGameConfig', () => ({ useGameConfig: () => CONFIG }))

const { PraxisOwnerActions, PraxisSubmitControls } = await import('../shared')

const text = (element: ReactElement): string => markup(element).text

const praxis = (): PraxisOut =>
  anOwnedPraxis({ created_by_faction_slug: 'snide', duel_id: 5 })


const duel = (status: DuelStatus, foeSubmitted: boolean): DuelDetailOut =>
  aDuel({
    status,
    challenger: aDuelSide({ character_id: 1, faction_slug: 'snide', points_from_votes: 4, win_multiplier: 2, loss_multiplier: 0, tie_multiplier: 2 }),
    opponent: aDuelSide({
      praxis_id: 2,
      character_id: 2,
      display_name: 'Rax',
      faction_slug: 'wow',
      points_from_votes: 9,
      is_submitted: foeSubmitted,
    }),
  })

const user = (): CurrentUser => anOwner({ faction_slug: 'snide' })


const state = (overrides: Partial<PraxisDetailState>): PraxisDetailState =>
  aPraxisDetailState({ praxis: praxis(), isOwner: true, user: user(), ...overrides })

describe('forfeit escalation (#718)', () => {
  it('settled duel: the confirm warns, names the winner, and quotes the cost', () => {
    const t = text(
      <PraxisSubmitControls
        state={state({ duel: duel('settled', true), showWithdrawConfirm: true })}
      />,
    )
    expect(t).toMatch(/FORFEITS the duel/i)
    expect(t).toMatch(/Rax wins by default/i)
    // Snide's loss modifier is 0.0.
    expect(t).toMatch(/you keep 0 instead of 60/i)
  })

  it('settled duel: the quiet unsubmit control takes the forfeit verb', () => {
    const t = text(<PraxisSubmitControls state={state({ duel: duel('settled', true) })} />)
    expect(t).toMatch(/Forfeit/i)
  })

  it('active duel: no warning — the reopen is still free', () => {
    const t = text(
      <PraxisSubmitControls
        state={state({ duel: duel('active', false), showWithdrawConfirm: true })}
      />,
    )
    expect(t).not.toMatch(/FORFEIT/i)
    expect(t).not.toMatch(/wins by default/i)
  })

  it('no duel at all: the ordinary confirm is untouched', () => {
    const t = text(<PraxisSubmitControls state={state({ showWithdrawConfirm: true })} />)
    expect(t).not.toMatch(/FORFEIT/i)
  })
})

// One mount site for the destructive control, for every praxis (#646, #1090).
describe('owner controls carry the action cluster for every praxis (#1090)', () => {
  it('settled duel: the escalated forfeit confirm renders inline, not in a rail', () => {
    const t = text(
      <PraxisOwnerActions
        state={state({ duel: duel('settled', true), showWithdrawConfirm: true })}
      />,
    )
    expect(t).not.toMatch(/edit this praxis/i)
    expect(t).toMatch(/FORFEITS the duel/i)
    expect(t).toMatch(/Rax wins by default/i)
  })

  it('ordinary praxis: the cluster is unchanged', () => {
    const ordinary = { ...praxis(), duel_id: null }
    const t = text(
      <PraxisOwnerActions state={state({ praxis: ordinary, showWithdrawConfirm: true })} />,
    )
    expect(t).toMatch(/Yes, unsubmit/i)
  })
})
