/**
 * The block control × the viewer's own block record, not an edge (#1907,
 * ADR-0077). Visibility is the safety contract: a block button on your own
 * profile or beside `unblock` is a live wrong action. Static markup only; the
 * dialog behaviour is hand-verified, its words come from `blockConfirm()`.
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
  // A block needs no edge (ADR-0077): the foe'd party with none gets it.
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
  // The backend answers 422 for a self-block.
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
    // A block is silent: copy must not promise the other party sees a label.
    expect(request.body).not.toContain(common.relationships.blocked)
    expect(request.body.toLowerCase()).toContain('not told')
  })

  it('carries no raw catalog keys', () => {
    expect(JSON.stringify(request)).not.toContain('relationships.block')
  })
})
