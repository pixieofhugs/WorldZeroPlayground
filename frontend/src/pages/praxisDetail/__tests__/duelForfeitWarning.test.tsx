/**
 * Settled-duel forfeit escalation on the submit/pull-back/forfeit control (#718).
 *
 * The asymmetry this guards is the whole point of the issue, and it is exactly
 * the kind of thing a "warn on any duel" implementation gets wrong:
 *
 *  - `settled` (both sides cast): unsubmitting is a PERMANENT forfeit — the
 *    opponent wins by default (ADR-0011 §Forfeit; the backend forfeits only at
 *    `status == settled`). The confirm must say so, in the forfeit's own verb.
 *  - `active` (opponent hasn't cast): unsubmitting is a FREE neutral reopen. The
 *    warning must NOT appear — telling a player they're about to forfeit when
 *    they aren't would cost them an edit they were entitled to make.
 *
 * The cost figures come from the mocked game config, so a Snide side is told it
 * keeps 0 rather than an invented "half".
 *
 * #752 relocated this control from the owner controls into the duel RAIL, so the
 * duel cases below mount `PraxisSubmitControls` directly. #1090 deleted the rail
 * — the duel is a reading card now and owner actions live in the main column
 * (epic #1085) — so the control came BACK inline, and the last two cases pin the
 * un-relocation: the owner controls render it for a duel praxis and an ordinary
 * one alike, which is still exactly one mount site (the #646 rule).
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
    // #1869: Singularity's perk flag. Irrelevant to the duel axis these
    // fixtures exercise, but part of the contract.
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
    challenger: aDuelSide({ character_id: 1, faction_slug: 'snide', points_from_votes: 4 }),
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
    // Snide's loss modifier is 0.0 — the cost line must not invent a half.
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

// #1090: the rail that #752 moved this control into is gone, so the owner
// controls own it again for EVERY praxis. The invariant that matters is
// unchanged and is what these two cases pin — one mount site, never two rows of
// the same destructive control (#646). The duel card in the aside is a reading
// card: it draws no button in any state, which is why there is nowhere else for
// a second one to appear.
describe('owner controls carry the action cluster for every praxis (#1090)', () => {
  it('settled duel: the escalated forfeit confirm renders inline, not in a rail', () => {
    const t = text(
      <PraxisOwnerActions
        state={state({ duel: duel('settled', true), showWithdrawConfirm: true })}
      />,
    )
    // #2136 deleted the edit link that used to sit beside it, so the cluster is
    // the forfeit escalation and nothing else.
    expect(t).not.toMatch(/edit this praxis/i)
    // The forfeit escalation reaches the player through the owner controls now.
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
