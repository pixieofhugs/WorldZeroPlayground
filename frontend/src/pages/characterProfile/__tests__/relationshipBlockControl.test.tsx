/**
 * The seam: the block control × the viewer's own block record (#1907,
 * ADR-0077). Not × an edge — that is the whole change.
 *
 * THE DEFECT #1907 FIXES. The control used to require an edge, because a block
 * was a `status` on one and the client had to name a row id. So the motivating
 * case — B declared a foe by A, holding no edge of their own — rendered the
 * friend/foe buttons and NO block. The one player the feature was written for
 * was the one who could not act. The first case below is that bug.
 *
 * WHAT THIS PINS. Visibility is the whole safety contract of this control, and
 * it is the half a green build cannot see: a block button that renders on your
 * own profile, or beside `unblock` on someone you have already blocked, is a
 * live wrong action, not a cosmetic slip. So the gate is asserted per case, and
 * the words are asserted against the catalog rather than eyeballed (a missing
 * key renders as the raw key string, which is what these `not.toContain` lines
 * are looking for).
 *
 * The confirm's copy is pinned against ADR-0077 ruling 2 rather than left to a
 * reviewer's eye: a block is SILENT now, so copy telling the player it "reads as
 * Blocked to both of you" would be a false promise made at the exact moment they
 * are deciding. `not.toContain` is the ratchet on that reversal.
 *
 * WHAT IT CANNOT PIN. `renderToStaticMarkup` has no DOM and never runs effects,
 * so the click that opens the confirm, the dialog's Escape/backdrop dismissal
 * and its focus move cannot run here — the same split `ConfirmDialog` (#1082)
 * documents. The confirm's WORDS are still assertable because the request is a
 * pure builder, so `blockConfirm()` is exercised directly below; the dialog
 * behaviour is hand-verified.
 *
 * And it cannot pin what the BLOCKED party sees, because there is nothing to
 * render: `GET /relationships/blocks` is outgoing-only, so the client has no
 * incoming block to draw from. That silence is structural, not a branch, which
 * is why no test here asserts its absence.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'

import '../../../i18n'
import common from '../../../locales/en/common.json'
import RelationshipBlockControl, { blockConfirm } from '../RelationshipBlockControl'

const VIEWER = 3
const TARGET = 7

function markup(
  props: Partial<React.ComponentProps<typeof RelationshipBlockControl>> = {},
) {
  return renderToStaticMarkup(
    <RelationshipBlockControl
      viewerCharacterId={VIEWER}
      targetCharacterId={TARGET}
      targetDisplayName="Reza"
      factionSlug="ephemerists"
      alreadyBlocked={false}
      busy={false}
      onBlock={() => {}}
      {...props}
    />,
  )
}

describe('the block control renders wherever a character can be blocked', () => {
  // ADR-0077's headline: a block needs no edge, so a viewer who has declared
  // nothing — the foe'd party with no declaration of their own — gets the
  // control. This case rendered nothing before #1907.
  it('offers block to a viewer who holds no relationship at all', () => {
    const html = markup()
    expect(html).toContain('<button')
    expect(html).toContain(common.relationships.block)
    // Named for a screen reader by the person, not by the bare verb.
    expect(html).toContain('aria-label="Block Reza"')
  })

  it('resolves its copy from the catalog, not the raw key', () => {
    expect(markup()).not.toContain('relationships.block')
  })
})

describe('the block control hides where it is not usable', () => {
  // A block on yourself is not a control with nothing to do — it is a control
  // the backend answers 422 for.
  it('renders nothing on your own profile', () => {
    expect(markup({ viewerCharacterId: TARGET, targetCharacterId: TARGET })).toBe('')
  })

  it('renders nothing on someone already blocked — unblock owns that slot', () => {
    expect(markup({ alreadyBlocked: true })).toBe('')
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

  it('says the block is silent and reversible (ADR-0077 rulings 2 and 5)', () => {
    expect(request.body).toBe(common.relationships.blockConfirm.body)
    expect(request.body.toLowerCase()).toContain('unblock')
    // The reversal ADR-0077 makes, ratcheted: the copy must not tell the player
    // the other party will see a label. Nothing shows them one any more.
    expect(request.body).not.toContain(common.relationships.blocked)
    expect(request.body.toLowerCase()).toContain('not told')
  })

  it('carries no raw catalog keys', () => {
    expect(JSON.stringify(request)).not.toContain('relationships.block')
  })
})
