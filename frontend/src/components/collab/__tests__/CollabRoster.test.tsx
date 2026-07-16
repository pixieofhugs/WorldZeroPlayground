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
      <CollabRoster members={[member(1, false)]} currentCharacterId={1} factionSlug="wow" />,
    )).toBe('')
  })

  it('shows a cast pill for cast members and a weaving pill otherwise', () => {
    const html = renderToStaticMarkup(
      <CollabRoster members={[member(1, true), member(2, false)]} currentCharacterId={1} factionSlug="wow" />,
    )
    expect(html).toContain('cast')
    expect(html).toContain('weaving')
    expect(html).toContain('1 of 2 cast')
  })

  it('offers pull-back when I have cast, cast when I have not', () => {
    const action = { onCast: () => {}, onPullBack: () => {}, submitting: false }
    const waiting = renderToStaticMarkup(
      <CollabRoster members={[member(1, true), member(2, false)]} currentCharacterId={1} factionSlug="wow" action={action} />,
    )
    expect(waiting).toContain('Pull my part back')
    const holdout = renderToStaticMarkup(
      <CollabRoster members={[member(1, false), member(2, true)]} currentCharacterId={1} factionSlug="wow" action={action} />,
    )
    // castCount === memberCount - 1 → the go-live wording.
    expect(holdout).toContain('send it live')
  })
})
