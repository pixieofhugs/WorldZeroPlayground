/**
 * Duel stakes arithmetic (#718, #2865).
 *
 * #2865: the multipliers arrive RESOLVED on each `DuelSideOut`; the client only
 * multiplies by base points. The fixtures are deliberately skewed (nothing is
 * 1.0 by accident) so a wrong field read cannot hide.
 *
 * Two cases are places where the obvious implementation is wrong:
 *
 *  - **Snide's loss is 0, not "half".** Snide runs 2.0x/**0.0x** (`eras/era_1.py`),
 *    so a losing Snide duelist earns literally nothing.
 *  - **`pending` has no stakes at all.** If the opponent declines, the praxis
 *    scores as a plain solo praxis at 1.0x; a win/lose pair would promise a duel
 *    that may never happen.
 *
 * And one the server cannot decide for us: an unaffiliated viewer is sent the
 * scorer's fallback rates, but sees no stakes (zero behaviour change).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import type { DuelSideOut } from '../../../api/duel'
import { StakesTiles } from '../shared'

function side(over: Partial<DuelSideOut>): DuelSideOut {
  return {
    character_id: 1,
    display_name: 'Me',
    avatar_url: null,
    faction_slug: 'wow',
    is_submitted: false,
    win_multiplier: 1.5,
    loss_multiplier: 0.5,
    tie_multiplier: 1.0,
    ...over,
  } as DuelSideOut
}

function text(me: DuelSideOut, status: 'pending' | 'active' | 'settled' | 'declined'): string {
  const html = renderToStaticMarkup(
    <StakesTiles
      me={me}
      opponentName="Rax"
      taskPointValue={30}
      status={status}
      theme={{ accent: 'var(--color-border)' }}
    />,
  )
  return html.replace(/<[^>]*>/g, '')
}

// Distinct win / loss / tie so each figure can only come from its own field.
const SKEWED = side({ win_multiplier: 2.0, loss_multiplier: 0.0, tie_multiplier: 2.0 })

describe('StakesTiles', () => {
  it('renders a losing 0.0x side as 0, not half (#718 correction 2)', () => {
    const t = text(SKEWED, 'active')
    expect(t).toMatch(/If you win60/i) // 30 x 2.0
    expect(t).toMatch(/If you lose0/i) // 30 x 0.0 - NOT 15
  })

  it('renders each figure from its own resolved field', () => {
    const t = text(side({ win_multiplier: 1.5, loss_multiplier: 0.5, tie_multiplier: 1.0 }), 'active')
    expect(t).toMatch(/If you win45/i)
    expect(t).toMatch(/If you lose15/i)
    expect(t).toMatch(/A tie pays 30\./)
  })

  it('prints the server-resolved tie rate, whatever rule picked it (#2664, #2865)', () => {
    expect(text(SKEWED, 'active')).toMatch(/A tie pays 60\./)
    expect(text(side({ tie_multiplier: 0.5 }), 'active')).toMatch(/A tie pays 15\./)
  })

  it('renders nothing for an unaffiliated viewer, though the server sends fallback rates', () => {
    expect(text(side({ faction_slug: '' }), 'active')).toBe('')
    expect(text(side({ faction_slug: '' }), 'pending')).toBe('')
  })

  it('pending: the solo-fallback line replaces the win/lose pair (#718)', () => {
    const t = text(SKEWED, 'pending')
    expect(t).toMatch(/If Rax declines/i)
    expect(t).toMatch(/ordinary praxis worth 30/)
    expect(t).not.toMatch(/If you win|If you lose/i)
  })

  it('labels the figures as base points, before crowd votes', () => {
    expect(text(SKEWED, 'settled')).toMatch(/before crowd votes/i)
  })
})
