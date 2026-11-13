/**
 * Duel stakes arithmetic (#718, #2865). Multipliers arrive resolved; fixtures are
 * skewed so a wrong field read cannot hide. `pending` shows no win/lose pair: a
 * declined duel scores as a plain solo praxis.
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

  it("an unaffiliated ('na') viewer sees the scorer's 1.5/0.5 tiles, as the server sends them", () => {
    const t = text(
      side({ faction_slug: 'na', win_multiplier: 1.5, loss_multiplier: 0.5, tie_multiplier: 1.0 }),
      'active',
    )
    expect(t).toMatch(/If you win45/i)
    expect(t).toMatch(/If you lose15/i)
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
