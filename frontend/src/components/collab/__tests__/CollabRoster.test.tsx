import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import type { PraxisMemberOut } from '../../../api/praxis'
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

describe('CollabRoster render', () => {
  it('renders nothing for a solo/duel (fewer than two members)', () => {
    expect(renderToStaticMarkup(
      <CollabRoster members={[member(1, false)]} currentCharacterId={1} factionSlug={null} />,
    )).toBe('')
  })

  // A null slug takes the shared fallback tier, which speaks the domain noun
  // rather than any faction's verb (#1154) — the faction-voiced wording is
  // covered in collabCopy.test.ts (#591).
  it('shows a submitted pill for cast members and a not-submitted pill otherwise', () => {
    const html = renderToStaticMarkup(
      <CollabRoster members={[member(1, true), member(2, false)]} currentCharacterId={1} factionSlug={null} />,
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
      <CollabRoster members={[member(1, true), member(2, false)]} currentCharacterId={1} factionSlug="everymen" />,
    )
    expect(html).toContain('signed off')
    expect(html).toContain('still on the clock')
    expect(html).toContain('Waiting on the rest of the crew.')
    expect(html).not.toContain('not submitted')
  })
})

// Mirrors the backend `kick_member` guard — see the comment above `canKick`.
describe('CollabRoster kick × visibility (#959, #1076)', () => {
  const kick = () => {}

  it('offers the × on another member while the collab is still open', () => {
    const html = renderToStaticMarkup(
      <CollabRoster
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
        members={[member(1, false), member(2, false)]}
        currentCharacterId={99}
        factionSlug={null}
        onKick={kick}
      />,
    )
    expect(html).not.toContain('kick M2 from the collab')
  })
})
