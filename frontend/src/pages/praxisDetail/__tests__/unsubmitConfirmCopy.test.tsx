/**
 * The unsubmit confirm says what `unsubmit_praxis` (`backend/services/praxis.py`)
 * actually does (#1094):
 *  - published collab: every member's `has_submitted` clears.
 *  - collab `pending`: only the caller's part comes back; pending is unscored.
 *  - duel `pending` and `active`: pre-settlement (ADR-0011 §Forfeit), paired in
 *    `_LIVE_INCOMPLETE_DUEL_STATUSES`, so no consequence language.
 * The `settled` forfeit dialog lives in `duelForfeitWarning.test.tsx`.
 */
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import { PraxisSubmitControls, unsubmitCase } from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisOut, PraxisMemberOut, PraxisStatus } from '../../../api/praxis'
import type { CurrentUser } from '../../../api/auth'
import type { DuelDetailOut, DuelStatus } from '../../../api/duel'
import { aDuel, aDuelSide, aMember } from '../../../test/fixtures'
import { anOwnedPraxis, anOwner, aPraxisDetailState, markup } from '../../../test/praxisDetail'


/** Rendered text with React's escaped entities restored, to quote catalog strings. */
function text(element: ReactElement): string {
  return markup(element)
    .text.replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

const member = (
  characterId: number,
  name: string,
  hasSubmitted: boolean,
): PraxisMemberOut =>
  aMember({
    id: characterId * 10,
    character_id: characterId,
    character_display_name: name,
    has_submitted: hasSubmitted,
  })

const praxis = (overrides: Partial<PraxisOut> = {}): PraxisOut =>
  anOwnedPraxis({ created_by_faction_slug: 'wow', ...overrides })


/** The opponent has NOT cast, which is what makes a live duel a free reopen. */
const duel = (status: DuelStatus): DuelDetailOut =>
  aDuel({
    status,
    challenger: aDuelSide({ character_id: 1, faction_slug: 'wow' }),
    opponent: aDuelSide({
      praxis_id: 2,
      character_id: 2,
      display_name: 'Rax',
      faction_slug: 'snide',
      is_submitted: false,
    }),
  })

const user = (): CurrentUser => anOwner({ faction_slug: 'wow' })


const state = (overrides: Partial<PraxisDetailState>): PraxisDetailState =>
  aPraxisDetailState({
    praxis: praxis(),
    isOwner: true,
    user: user(),
    showWithdrawConfirm: true,
    ...overrides,
  })

const COLLAB_MEMBERS = [member(1, 'Ada', true), member(2, 'Beth', true)]

describe('unsubmitCase — the branch, straight off the backend', () => {
  it('a solo praxis is solo', () => {
    expect(unsubmitCase(praxis(), null)).toBe('solo')
  })

  it('a published collab reopens the whole group', () => {
    expect(unsubmitCase(praxis({ members: COLLAB_MEMBERS }), null)).toBe('collabGroup')
  })

  it('a collab mid-consensus pulls back only the caller part', () => {
    const pending = praxis({ members: COLLAB_MEMBERS, status: 'pending' as PraxisStatus })
    expect(unsubmitCase(pending, null)).toBe('collabOwnPart')
  })

  it.each<DuelStatus>(['pending', 'active'])(
    'a duel at %s is a free live reopen, not a forfeit',
    (status) => {
      expect(unsubmitCase(praxis({ duel_id: 5 }), duel(status))).toBe('duelLive')
    },
  )

  it('a settled duel is NOT duelLive — the forfeit branch owns it', () => {
    expect(unsubmitCase(praxis({ duel_id: 5 }), duel('settled'))).not.toBe('duelLive')
  })
})

describe('unsubmit confirm copy (#1094)', () => {
  it('solo: the prompt names every real cost of reopening (#1397, #2094)', () => {
    // Each cost is read off the backend: stats recalc immediately (#2094; on a
    // solo the author-resolved score, ADR-0053, is the reader's); votes are
    // kept but stop scoring; `in_progress` is members-only (ADR-0024);
    // `_apply_seal` resets `submitted_at`. Nothing else costs, so no more warnings.
    const rendered = text(
      <PraxisSubmitControls state={state({ praxis: praxis({ score: 42.5 }) })} />,
    )
    expect(rendered, 'the figure that leaves the total').toMatch(
      /42\.5 points come off your total/,
    )
    expect(rendered, 'votes are kept, they just stop banking').toMatch(
      /votes are kept but stop counting/i,
    )
    expect(rendered, 'members-only while editing').toMatch(/Only you can see it/)
    expect(rendered, 'the publish date is overwritten').toMatch(/new date/)
    expect(rendered, 'the retired half-truth is gone').not.toMatch(/points & votes pause/i)
    expect(rendered).toMatch(/Yes, unsubmit/)
  })

  it('solo: the figure is the score, formatted like every other total', () => {
    // `formatPoints`, so dialog and stamp print one score the same way.
    const rendered = text(
      <PraxisSubmitControls state={state({ praxis: praxis({ score: 55.0 }) })} />,
    )
    expect(rendered).toMatch(/55 points come off your total/)
    expect(rendered).not.toMatch(/55\.0/)
  })

  it('solo: the trigger reads as the way to edit (#1397)', () => {
    const rendered = text(
      <PraxisSubmitControls state={state({ showWithdrawConfirm: false })} />,
    )
    expect(rendered).toMatch(/unsubmit to edit/)
  })

  it('collab: the reader loses their own points AND uncasts the group', () => {
    const rendered = text(
      <PraxisSubmitControls state={state({ praxis: praxis({ members: COLLAB_MEMBERS }) })} />,
    )
    expect(rendered, "the reader's own consequence comes first").toMatch(
      /your points from this praxis come off your total/i,
    )
    expect(rendered, 'then what they are doing to everyone else').toMatch(
      /every other member's/i,
    )
    expect(rendered).toMatch(/whole group/i)
    expect(rendered).toMatch(/votes are kept but stop counting/i)
    expect(rendered).toMatch(/Yes, reopen for everyone/i)
    expect(rendered).not.toMatch(/points & votes pause/i)
    // Anchored on the shipped solo string (#1397) so it cannot pass vacuously.
    expect(rendered).not.toMatch(/Only you can see it/)
  })

  it('collab: NO figure — `score` is the AUTHOR\'s, not the reader\'s (#2094)', () => {
    // ADR-0053: the score is resolved for the author, so a co-author would see
    // a wrong figure. Owner ruling (#2094): numberless, no per-member share.
    const rendered = text(
      <PraxisSubmitControls
        state={state({ praxis: praxis({ members: COLLAB_MEMBERS, score: 42.5 }) })}
      />,
    )
    expect(rendered).not.toMatch(/42\.5/)
  })

  it('collab mid-consensus: only your part comes back, and no scoring promise', () => {
    const rendered = text(
      <PraxisSubmitControls
        state={state({
          praxis: praxis({ members: COLLAB_MEMBERS, status: 'pending' as PraxisStatus }),
        })}
      />,
    )
    expect(rendered).toMatch(/only your part/i)
    expect(rendered).toMatch(/co-authors' casts stand/i)
    expect(rendered).toMatch(/Yes, pull my part back/i)
    // Pending praxes are unscored, so a points warning here would be false.
    expect(rendered).not.toMatch(/points/i)
  })

  it.each<DuelStatus>(['pending', 'active'])(
    'duel at %s: neutral pull-back wording, no forfeit language',
    (status) => {
      const rendered = text(
        <PraxisSubmitControls
          state={state({ praxis: praxis({ duel_id: 5 }), duel: duel(status) })}
        />,
      )
      // Points first, then the reassurance (#2094).
      expect(rendered).toMatch(/your points from this entry come off your total/i)
      expect(rendered).toMatch(/nothing is marked against you/i)
      expect(rendered).toMatch(/pulling back now is free/i)
      expect(rendered).toMatch(/Yes, pull my entry back/i)
      expect(rendered).not.toMatch(/forfeit/i)
      expect(rendered).not.toMatch(/wins by default/i)
      expect(rendered).not.toMatch(/points & votes pause/i)
      expect(rendered).not.toMatch(/Only you can see it/)
    },
  )

  it.each<DuelStatus>(['pending', 'active'])(
    'duel at %s: the trigger itself is the neutral pull-back verb',
    (status) => {
      const rendered = text(
        <PraxisSubmitControls
          state={state({
            praxis: praxis({ duel_id: 5 }),
            duel: duel(status),
            showWithdrawConfirm: false,
          })}
        />,
      )
      expect(rendered).toMatch(/pull my entry back/i)
      expect(rendered).not.toMatch(/forfeit/i)
    },
  )
})
