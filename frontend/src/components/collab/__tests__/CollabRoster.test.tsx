import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import type { PraxisInviteOut, PraxisMemberOut } from '../../../api/praxis'
import { CollabRoster, deriveCollabGate } from '../CollabRoster'
import { collabCopy } from '../collabCopy'

function member(id: number, cast: boolean): PraxisMemberOut {
  return {
    id,
    praxis_id: 1,
    character_id: id,
    character_display_name: `M${id}`,
    character_avatar_url: '',
    has_submitted: cast,
    is_done: false,
    joined_at: '2026-01-01T00:00:00Z',
    nudged_at: null,
    submitted_at: null,
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
    invitee_display_name: name,
    invitee_avatar_url: '',
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
  it('pills each member by submission state, and tallies the count once', () => {
    const html = renderToStaticMarkup(
      <CollabRoster praxisType="collab" members={[member(1, true), member(2, false)]} currentCharacterId={1} factionSlug={null} />,
    )
    expect(html).toContain(collabCopy(null, 'pillCast'))
    expect(html).toContain(collabCopy(null, 'pillWeaving'))
    expect(html).toContain('1 of 2 approved')
  })

  // #1812 — the roster used to reframe every state in the task faction's voice
  // ("signed off" / "still on the clock" / "Waiting on the rest of the crew."
  // for the Everymen). Submission status is a mechanical fact a player has to
  // read correctly in order to act, so it reads the same everywhere now; this
  // is that ruling at the render seam, where the player meets it. The catalog
  // half of the guard is in collabCopy.test.ts.
  it('reads the same on a faction task as on an unaffiliated one', () => {
    const html = renderToStaticMarkup(
      <CollabRoster praxisType="collab" members={[member(1, true), member(2, false)]} currentCharacterId={1} factionSlug="everymen" />,
    )
    expect(html).toContain(collabCopy(null, 'pillCast'))
    expect(html).toContain(collabCopy(null, 'pillWeaving'))
    expect(html).toContain(collabCopy(null, 'castStatus', { cast: 1, total: 2 }))
    for (const voiced of ['signed off', 'still on the clock', 'rest of the crew']) {
      expect(html, voiced).not.toContain(voiced)
    }
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

  // The awaiting LINE names only whoever has not answered. A declined invite is
  // now a row of its own (#1416), so it is on the page — but it is not somebody
  // the collab is still waiting on, and the line must not say it is.
  it('names only the unanswered in the awaiting line', () => {
    const answered = html([
      invite(2, 'Accepted One', 'accepted'),
      invite(3, 'Declined One', 'declined'),
    ])
    expect(answered).not.toContain('Accepted One')
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

/**
 * #1416 — invites are rows, and the pill has four states.
 *
 * Every state is asserted, and each assertion also checks the three it is NOT:
 * a test that only looks for its own word cannot tell "renders the right pill"
 * from "always renders one pill".
 */
describe('CollabRoster — the four-state pill (#1416)', () => {
  // In catalog order: filed, accepted, invited, declined. Read from the
  // resolver so the words stay the catalog's — #1832 moved all four.
  const PILLS = (['pillCast', 'pillWeaving', 'pillInvited', 'pillDeclined'] as const).map(
    (key) => collabCopy(null, key),
  )
  const render = (
    members: PraxisMemberOut[],
    invites: PraxisInviteOut[] = [],
  ) =>
    renderToStaticMarkup(
      <CollabRoster
        praxisType="collab"
        members={members}
        invites={invites}
        currentCharacterId={1}
        factionSlug={null}
      />,
    )

  // Matched on the whole pill element, not by substring: `castStatus` puts the
  // word "submitted" in the header tally too.
  const pillsIn = (html: string) =>
    PILLS.filter((word) => html.includes(`>${word}</span>`))

  it('filed — a member who has submitted', () => {
    expect(pillsIn(render([member(1, true), member(2, true)]))).toEqual([PILLS[0]])
  })

  // #1832 — accepted-and-writing is its own positive state. It used to read
  // "not submitted", which described the member by what they had not done and
  // repeated a count the header tally already carries.
  it('accepted — a member who has not', () => {
    expect(pillsIn(render([member(1, false), member(2, false)]))).toEqual([PILLS[1]])
  })

  it('invited — a pending invite, which used to live outside the roster', () => {
    const html = render([member(1, false)], [invite(2, 'Asked', 'pending')])
    expect(html).toContain('Asked')
    expect(pillsIn(html)).toEqual([PILLS[1], PILLS[2]])
  })

  it('declined — which used to be filtered away entirely', () => {
    const html = render([member(1, false)], [invite(2, 'Refused', 'declined')])
    expect(html).toContain('Refused')
    expect(pillsIn(html)).toEqual([PILLS[1], PILLS[3]])
  })

  it('draws all four at once, one pill each', () => {
    const html = render(
      [member(1, true), member(2, false)],
      [invite(3, 'Asked', 'pending'), invite(4, 'Refused', 'declined')],
    )
    expect(pillsIn(html)).toEqual(PILLS)
  })

  // The pill must not carry its state in colour alone: the two unanswered
  // states are additionally dashed, and every state has its own word.
  it('dashes the unanswered states', () => {
    expect(render([member(1, false)], [invite(2, 'Asked', 'pending')])).toContain('dashed')
    expect(render([member(1, false)], [invite(2, 'Refused', 'declined')])).toContain('dashed')
    expect(render([member(1, true), member(2, false)])).not.toContain('dashed')
  })

  it('derives a monogram for every row', () => {
    const html = render([member(1, false)], [invite(2, 'Ada Lovelace', 'pending')])
    expect(html).toContain('>AL<')
  })
})

describe('CollabRoster — the panel header (#1416)', () => {
  const header = (members: PraxisMemberOut[]) =>
    renderToStaticMarkup(
      <CollabRoster
        praxisType="collab"
        members={members}
        currentCharacterId={1}
        factionSlug={null}
      />,
    )

  // Zero is reachable: `praxisType` is the only gate, so a collab whose members
  // have not loaded still mounts this block (#1274).
  it('names itself at zero members, with no tally to report', () => {
    const html = header([])
    expect(html).toContain('Collaborators · 0')
    expect(html).not.toContain('submitted')
  })

  it('names itself at one member, still with no tally', () => {
    const html = header([member(1, false)])
    expect(html).toContain('Collaborators · 1')
    expect(html).not.toContain('of 1 submitted')
  })

  it('reports the gate beside the count once there is one', () => {
    const html = header([member(1, true), member(2, false), member(3, false)])
    expect(html).toContain('Collaborators · 3')
    expect(html).toContain('1 of 3 approved')
  })

  // The count is MEMBERS, not rows — an invited row is somebody who has been
  // asked, and the tally beside it reads out of the same denominator.
  it('counts members, not invites', () => {
    const html = renderToStaticMarkup(
      <CollabRoster
        praxisType="collab"
        members={[member(1, true), member(2, false)]}
        invites={[invite(3, 'Asked', 'pending')]}
        currentCharacterId={1}
        factionSlug={null}
      />,
    )
    expect(html).toContain('Collaborators · 2')
    expect(html).toContain('1 of 2 approved')
  })
})

// The rescind × moved off the pending-invite chips and onto the invited row
// those chips became (#421, moved #1416) — deleting the chips without it would
// have deleted the feature.
describe('CollabRoster rescind × visibility (#1416)', () => {
  const rescind = () => {}
  const html = (status: PraxisInviteOut['status']) =>
    renderToStaticMarkup(
      <CollabRoster
        praxisType="collab"
        members={[member(1, false)]}
        invites={[invite(2, 'Asked', status)]}
        currentCharacterId={1}
        factionSlug={null}
        onRescindInvite={rescind}
      />,
    )

  it('offers the × on a still-pending invite', () => {
    expect(html('pending')).toContain('rescind invite to Asked')
  })

  it('withholds it from an invite that has already been answered', () => {
    expect(html('declined')).not.toContain('rescind invite to Asked')
  })

  // The read-only detail mount passes no callback and draws no author controls.
  it('withholds it where no handler is passed', () => {
    expect(
      renderToStaticMarkup(
        <CollabRoster
          praxisType="collab"
          members={[member(1, false)]}
          invites={[invite(2, 'Asked', 'pending')]}
          currentCharacterId={1}
          factionSlug={null}
        />,
      ),
    ).not.toContain('rescind invite to Asked')
  })
})

/**
 * The live "here now" dot (#1744).
 *
 * Presence is a PROP, never derived here: only the composer mount sits inside
 * `PraxisRoomProvider`, so the ten other mounts (praxis detail ×8, the waiting
 * surface, and the composer's own waiting stage) get "nothing known" for free —
 * and the dot becomes testable in a harness where no effect ever runs.
 *
 * The dot is ephemeral (a tab closing takes it away) while `StatusPill` is
 * persistent workflow state, so they must not look alike: "he's not here" and
 * "he hasn't approved" are different facts and only one blocks the publish.
 * That is why the dot is a bare filled badge on the avatar's corner rather than
 * a second bordered chip, and why it takes `card-credit` rather than the
 * `card-accent` the row already spends on *done*.
 */
describe('CollabRoster — the live presence dot (#1744)', () => {
  const rosterHtml = (present?: readonly number[]) =>
    renderToStaticMarkup(
      <CollabRoster
        praxisType="collab"
        members={[member(1, false), member(2, false)]}
        invites={[invite(7, 'Asked', 'pending')]}
        currentCharacterId={1}
        factionSlug="coven"
        presentCharacterIds={present}
      />,
    )

  it('lights the dot on the connected member only', () => {
    const html = rosterHtml([1])
    expect(html).toContain('M1 is here now')
    expect(html).not.toContain('M2 is here now')
  })

  // A public praxis-detail page knows nobody's connection state. An empty dot
  // column there would read as a crew that had left, which is a claim the page
  // is in no position to make — so absent means NO MARKUP, not "everyone away".
  it('draws no dot markup at all where the prop is absent', () => {
    const html = rosterHtml()
    expect(html).not.toContain('is here now')
    expect(html).not.toContain('role="img"')
  })

  // `invite()` derives `invitee_id` as `id + 100`, so 107 is the invitee behind
  // invite 7. Nobody who has not accepted can be in the room at all — the
  // membership check at connect (#1740) is what makes that true — so a claimed
  // id colliding with an invitee must never light their row.
  it('never lights an invited row, even for its own invitee id', () => {
    const html = rosterHtml([1, 2, 107])
    expect(html).toContain('M1 is here now')
    expect(html).toContain('M2 is here now')
    expect(html).not.toContain('Asked is here now')
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
