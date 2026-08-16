/**
 * The seam: the block control × the edge it is offered on (#1668, ADR-0009 —
 * superseded by ADR-0077, which moves the block off the edge entirely).
 *
 * THE DEFECT. `blockRelationship` (`api/relationships.ts`) had no caller. The
 * route, the service, the wrapper and the ADR all shipped; the button did not,
 * so a player could only ever be UNblocked — the profile's unblock affordance
 * was reachable exclusively by an edge blocked before the control existed.
 *
 * WHAT THIS PINS. Visibility is the whole safety contract of this control, and
 * it is the half a green build cannot see: a block button that renders on your
 * own profile, or beside `unblock` on an edge that is already blocked, is a
 * live wrong action, not a cosmetic slip. So the gate is asserted per case, and
 * the words are asserted against the catalog rather than eyeballed (a missing
 * key renders as the raw key string, which is what these `not.toContain` lines
 * are looking for).
 *
 * WHAT IT CANNOT PIN. `renderToStaticMarkup` has no DOM and never runs effects,
 * so the click that opens the confirm, the dialog's Escape/backdrop dismissal
 * and its focus move cannot run here — the same split `ConfirmDialog` (#1082)
 * documents. The confirm's WORDS are still assertable because the request is a
 * pure builder, so `blockConfirm()` is exercised directly below; the dialog
 * behaviour is hand-verified.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'

import '../../../i18n'
import common from '../../../locales/en/common.json'
import type { RelationshipListItem } from '../../../api/relationships'
import RelationshipBlockControl, { blockConfirm } from '../RelationshipBlockControl'

const VIEWER = 3
const TARGET = 7

function makeEdge(
  overrides: Partial<RelationshipListItem> = {},
): RelationshipListItem {
  return {
    id: 42,
    from_character_id: VIEWER,
    to_character_id: TARGET,
    type: 'foe',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    to_display_name: 'Reza',
    to_avatar_url: '',
    to_faction_slug: 'ephemerists',
    display_status: 'One-sided Foe',
    ...overrides,
  }
}

function markup(
  props: Partial<React.ComponentProps<typeof RelationshipBlockControl>> = {},
) {
  return renderToStaticMarkup(
    <RelationshipBlockControl
      relationship={makeEdge()}
      viewerCharacterId={VIEWER}
      targetCharacterId={TARGET}
      targetDisplayName="Reza"
      factionSlug="ephemerists"
      busy={false}
      onBlock={() => {}}
      {...props}
    />,
  )
}

describe('the block control renders where an edge can be blocked', () => {
  it('offers block on an active edge the viewer holds', () => {
    const html = markup()
    expect(html).toContain('<button')
    expect(html).toContain(common.relationships.block)
    // Named for a screen reader by the person, not by the bare verb.
    expect(html).toContain('aria-label="Block Reza"')
  })

  it('resolves its copy from the catalog, not the raw key', () => {
    const html = markup()
    expect(html).not.toContain('relationships.block')
  })
})

describe('the block control hides where it is not usable', () => {
  // A block on yourself is not a control with nothing to do — it is a control
  // the backend answers 422 for.
  it('renders nothing on your own profile', () => {
    expect(markup({ viewerCharacterId: TARGET, targetCharacterId: TARGET })).toBe('')
  })

  it('renders nothing on an already-blocked edge — unblock owns that slot', () => {
    expect(markup({ relationship: makeEdge({ display_status: 'Blocked' }) })).toBe('')
  })

  // The ceiling named in the component: the client only ever holds an id for
  // the viewer's OWN outgoing edge, so there is nothing to block until one
  // exists. The friend/foe buttons are what render here.
  it('renders nothing when no edge exists', () => {
    expect(markup({ relationship: null })).toBe('')
  })

  it('renders nothing for a viewer with no character of their own', () => {
    expect(markup({ viewerCharacterId: undefined })).toBe('')
  })
})

describe('the confirm names the consequence, not "are you sure"', () => {
  const request = blockConfirm('Reza')

  it('addresses the person by name and offers a worded affirmative', () => {
    expect(request.title).toContain('Reza')
    expect(request.confirmLabel).toBe(common.relationships.blockConfirm.action)
    expect(request.confirmLabel).not.toMatch(/^(OK|Yes)$/)
  })

  it('states what blocking does — visible to both, and reversible (ADR-0009, superseded by ADR-0077)', () => {
    expect(request.body).toBe(common.relationships.blockConfirm.body)
    // ADR-0009 diverges from the silent-block convention on purpose, and the
    // player is entitled to know that before they act. ADR-0077 supersedes
    // that choice — a block becomes silent — so this assertion changes with
    // the build (#1681).
    expect(request.body.toLowerCase()).toContain('unblock')
    expect(request.body).toContain(common.relationships.blocked)
  })

  it('carries no raw catalog keys', () => {
    expect(JSON.stringify(request)).not.toContain('relationships.block')
  })
})
