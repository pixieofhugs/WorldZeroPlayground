import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import type { PraxisInviteOut, PraxisMemberOut } from '../../../api/praxis'
import { CollabRoster, deriveCollabGate } from '../CollabRoster'

function member(id: number, cast: boolean): PraxisMemberOut {
  return {
    id,
    praxis_id: 1,
    character_id: id,
    character_display_name: `M${id}`,
    has_submitted: cast,
    joined_at: '2026-01-01T00:00:00Z',
  }
}

function invite(
  id: number,
  name: string,
  status: PraxisInviteOut['status'],
): PraxisInviteOut {
  return {
    id,
    praxis_id: 1,
    inviter_id: 1,
    invitee_id: id + 100,
    inviter_display_name: 'M1',
    invitee_display_name: name,
    status,
    created_at: '2026-01-01T00:00:00Z',
  }
}

describe('deriveCollabGate — the consensus state machine (#591)', () => {
  it('nobody cast → writing', () => {
    const g = deriveCollabGate([member(1, false), member(2, false)], 1)
    expect(g).toMatchObject({ castCount: 0, memberCount: 2, iCast: false, state: 'writing' })
  })
  it('I cast, another has not → waiting', () => {
    expect(deriveCollabGate([member(1, true), member(2, false)], 1).state).toBe('waiting')
  })
  it('another cast, I have not → holdout', () => {
    expect(deriveCollabGate([member(1, false), member(2, true)], 1).state).toBe('holdout')
  })
  it('everyone cast → published', () => {
    expect(deriveCollabGate([member(1, true), member(2, true)], 1).state).toBe('published')
  })
})

// #1274. Every consensus reading is degenerate at one member: `castCount >=
// memberCount` calls a lone author "published" and the bar can only read 0% or
// 100%. `awaiting` is the honest fifth state — a collab nobody has joined yet.
describe('deriveCollabGate — one member is awaiting, never published (#1274)', () => {
  it('a lone member who has not submitted → awaiting', () => {
    expect(deriveCollabGate([member(1, false)], 1)).toMatchObject({
      memberCount: 1,
      castCount: 0,
      state: 'awaiting',
    })
  })

  // The bug this state exists to kill: consensus with yourself is not consensus.
  it('a lone member who HAS submitted → awaiting, not published', () => {
    expect(deriveCollabGate([member(1, true)], 1).state).toBe('awaiting')
  })

  it('an empty roster → awaiting', () => {
    expect(deriveCollabGate([], 1).state).toBe('awaiting')
  })
})

describe('CollabRoster render', () => {
  it('renders nothing for a solo praxis', () => {
    expect(renderToStaticMarkup(
      <CollabRoster
        praxisType="solo"
        members={[member(1, false)]}
        currentCharacterId={1}
        factionSlug={null}
      />,
    )).toBe('')
  })

  // A duel side is stored `type='solo'` + a non-null `duel_id` (ADR-0011), so
  // `type === 'duel'` never fires (#992) — gating on `!== 'solo'` would grow a
  // roster on every duel. Two members is the shape that would have rendered
  // under the old count gate.
  it('renders nothing for a duel side (type solo, whatever the member count)', () => {
    expect(renderToStaticMarkup(
      <CollabRoster
        praxisType="solo"
        members={[member(1, true), member(2, false)]}
        currentCharacterId={1}
        factionSlug={null}
      />,
    )).toBe('')
    expect(renderToStaticMarkup(
      <CollabRoster
        praxisType="duel"
        members={[member(1, true), member(2, false)]}
        currentCharacterId={1}
        factionSlug={null}
      />,
    )).toBe('')
  })

  // A null slug takes the shared fallback tier, which speaks the domain noun
  // rather than any faction's verb (#1154) — the faction-voiced wording is
  // covered in collabCopy.test.ts (#591).
  it('shows a submitted pill for cast members and a not-submitted pill otherwise', () => {
    const html = renderToStaticMarkup(
      <CollabRoster praxisType="collab" members={[member(1, true), member(2, false)]} currentCharacterId={1} factionSlug={null} />,
    )
    expect(html).toContain('✓ submitted')
    expect(html).toContain('not submitted')
    expect(html).toContain('1 of 2 submitted')
  })

  // The cast / pull-back action moved to the footer's PublishButton (#646); the
  // roster is pure display. Its faction-voiced button copy is now covered by
  // PublishButton.test.tsx (and collabCopy.test.ts for the words themselves).
  it('speaks the task faction voice for its display copy', () => {
    const html = renderToStaticMarkup(
      <CollabRoster praxisType="collab" members={[member(1, true), member(2, false)]} currentCharacterId={1} factionSlug="everymen" />,
    )
    expect(html).toContain('signed off')
    expect(html).toContain('still on the clock')
    expect(html).toContain('Waiting on the rest of the crew.')
    expect(html).not.toContain('not submitted')
  })
})

/**
 * #1274 — the roster is gated on TYPE, so a collab nobody has joined yet lists
 * its one member instead of vanishing. What it must NOT do is report consensus
 * with one person: no progress bar, no "1 of 1 submitted".
 */
describe('CollabRoster — a one-member collab (#1274)', () => {
  const html = (invites?: PraxisInviteOut[]) =>
    renderToStaticMarkup(
      <CollabRoster
        praxisType="collab"
        members={[member(1, false)]}
        currentCharacterId={1}
        factionSlug={null}
        invites={invites}
      />,
    )

  it('lists the author instead of rendering nothing', () => {
    expect(html()).toContain('M1')
  })

  it('draws no consensus bar and no cast tally', () => {
    expect(html()).not.toContain('progressbar')
    expect(html()).not.toContain('1 of 1 submitted')
  })

  it('names whoever has been invited and has not answered', () => {
    expect(html([invite(2, 'Invitee', 'pending')])).toContain('Invitee')
  })

  it('ignores answered invites', () => {
    const answered = html([
      invite(2, 'Accepted One', 'accepted'),
      invite(3, 'Declined One', 'declined'),
    ])
    expect(answered).not.toContain('Accepted One')
    expect(answered).not.toContain('Declined One')
    // …and falls back to the nobody-yet line, which the composer needs too:
    // invites are member-only on the wire, so a stranger's read view sees [].
    expect(answered).toContain('Nobody else has joined')
  })

  // A lone author who has submitted used to read `published`, which credited
  // them for a consensus of one and hid the kick control. Awaiting says so.
  it('does not announce a published collab for a lone author who submitted', () => {
    const lone = renderToStaticMarkup(
      <CollabRoster
        praxisType="collab"
        members={[member(1, true)]}
        currentCharacterId={1}
        factionSlug={null}
        taskPointValue={30}
      />,
    )
    expect(lone).not.toContain('All parts submitted')
    expect(lone).not.toContain('+30')
  })
})

// Mirrors the backend `kick_member` guard — see the comment above `canKick`.
describe('CollabRoster kick × visibility (#959, #1076)', () => {
  const kick = () => {}

  it('offers the × on another member while the collab is still open', () => {
    const html = renderToStaticMarkup(
      <CollabRoster
        praxisType="collab"
        members={[member(1, true), member(2, false)]}
        currentCharacterId={1}
        factionSlug={null}
        onKick={kick}
      />,
    )
    expect(html).toContain('kick M2 from the collab')
    expect(html).not.toContain('kick M1 from the collab') // never on my own pill
  })

  it('withholds the × once every member has cast (the praxis is published)', () => {
    const html = renderToStaticMarkup(
      <CollabRoster
        praxisType="collab"
        members={[member(1, true), member(2, true)]}
        currentCharacterId={1}
        factionSlug={null}
        onKick={kick}
      />,
    )
    expect(html).not.toContain('kick M2 from the collab')
  })

  it('withholds the × from a non-member viewer', () => {
    const html = renderToStaticMarkup(
      <CollabRoster
        praxisType="collab"
        members={[member(1, false), member(2, false)]}
        currentCharacterId={99}
        factionSlug={null}
        onKick={kick}
      />,
    )
    expect(html).not.toContain('kick M2 from the collab')
  })
})
