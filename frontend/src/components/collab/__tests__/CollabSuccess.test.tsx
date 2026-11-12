/**
 * #591: the post-publish success screen — the `shouldShowCollabSuccess` gate
 * (only a multi-member collab my cast just closed), and the screen itself
 * (every member credited, manual continue, never a timer).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { PraxisMemberOut } from '../../../api/praxis'
import { CollabSuccess } from '../CollabSuccess'
import { deriveCollabGate } from '../CollabRoster'

function member(id: number, name: string, cast: boolean): PraxisMemberOut {
  return {
    id: id * 10,
    praxis_id: 1,
    character_id: id,
    character_display_name: name,
    character_avatar_url: '',
    has_submitted: cast,
    is_done: false,
    joined_at: '2026-01-01T00:00:00Z',
    nudged_at: null,
    submitted_at: null,
  }
}

/** Mirrors useEditPraxis.publish's post-cast decision. */
function shouldShowCollabSuccess(
  members: readonly PraxisMemberOut[],
  currentCharacterId: number | null,
): boolean {
  const gate = deriveCollabGate(members, currentCharacterId)
  return gate.memberCount > 1 && gate.state === 'published'
}

describe('shouldShowCollabSuccess — when the beat fires', () => {
  it('fires when my cast closed the gate', () => {
    expect(
      shouldShowCollabSuccess([member(1, 'Ada', true), member(2, 'Beth', true)], 1),
    ).toBe(true)
  })

  it('does not fire while a co-author is still weaving', () => {
    expect(
      shouldShowCollabSuccess([member(1, 'Ada', true), member(2, 'Beth', false)], 1),
    ).toBe(false)
  })

  it('does not fire on a solo/duel praxis (single member)', () => {
    expect(shouldShowCollabSuccess([member(1, 'Ada', true)], 1)).toBe(false)
  })
})

describe('CollabSuccess render', () => {
  const MEMBERS = [member(1, 'Ada', true), member(2, 'Beth', true)]

  it('credits every member with the full task value', () => {
    const html = renderToStaticMarkup(
      <CollabSuccess
        members={MEMBERS}
        currentCharacterId={1}
        factionSlug={null}
        taskPointValue={30}
        onContinue={() => {}}
      />,
    )
    expect(html).toContain('Ada')
    expect(html).toContain('Beth')
    // Every member is paid in full, not a split.
    expect(html.match(/\+30/g)).toHaveLength(2)
    expect(html).toContain('The praxis is submitted')
    expect(html).toContain('2 of 2 approved')
  })

  // #1812: same shared wording as the roster.
  it('speaks the one shared voice on a faction task too', () => {
    const html = renderToStaticMarkup(
      <CollabSuccess
        members={MEMBERS}
        currentCharacterId={1}
        factionSlug="ua"
        taskPointValue={30}
        onContinue={() => {}}
      />,
    )
    expect(html).toContain('The praxis is submitted')
    for (const voiced of ['Sealed', 'Every hand has signed.', 'View the work']) {
      expect(html, voiced).not.toContain(voiced)
    }
  })

  it('offers a manual continue action, not an auto-redirect', () => {
    const onContinue = vi.fn()
    const html = renderToStaticMarkup(
      <CollabSuccess
        members={MEMBERS}
        currentCharacterId={1}
        factionSlug={null}
        taskPointValue={30}
        onContinue={onContinue}
      />,
    )
    expect(html).toContain('View the praxis')
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('is a labelled modal dialog', () => {
    const html = renderToStaticMarkup(
      <CollabSuccess
        members={MEMBERS}
        currentCharacterId={1}
        factionSlug={null}
        onContinue={() => {}}
      />,
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
  })

  it('omits the points column when the task value is unknown', () => {
    const html = renderToStaticMarkup(
      <CollabSuccess
        members={MEMBERS}
        currentCharacterId={1}
        factionSlug={null}
        taskPointValue={null}
        onContinue={() => {}}
      />,
    )
    expect(html).not.toContain('+')
  })
})
