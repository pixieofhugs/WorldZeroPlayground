/**
 * Duel stakes arithmetic (#718).
 *
 * The two cases the issue calls out by name, because both are places where the
 * obvious implementation is wrong:
 *
 *  - **Snide's loss is 0, not "half".** The design handoff said 1.5×/0.5×; that
 *    is six factions out of seven. Snide runs 2.0×/**0.0×** (`eras/era_1.py`),
 *    so a losing Snide duelist earns literally nothing. Any hardcoded ratio
 *    passes a wow test and lies to a Snide player — hence a test that pins the
 *    figure to `0` specifically.
 *  - **`pending` has no stakes at all.** Casting before the opponent accepts is
 *    ungated, and if they decline the praxis scores as a plain solo praxis at
 *    1.0× (`praxis_scoring.py` only picks up active/settled duels). Showing a
 *    win/lose pair there would promise a duel that may never happen.
 *
 * The game config is mocked rather than fetched: these tests are about the
 * arithmetic on top of the config, not the transport.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { GameConfigOut, FactionConfigOut } from '../../../api/gameConfig'

function faction(slug: string, win: number, lose: number): FactionConfigOut {
  return {
    slug,
    own_task_modifier: 1.0,
    other_task_modifier: 1.0,
    collab_own_modifier: 1.0,
    collab_other_modifier: 1.0,
    duel_win_modifier: win,
    duel_loss_modifier: lose,
    // #1869: Singularity's perk flag. Irrelevant to the duel axis these
    // fixtures exercise, but part of the contract.
    reads_the_array: false,
  }
}

// Mirrors era_1.py: snide is the high-risk outlier, wow the ordinary case.
const CONFIG = {
  factions: [faction('snide', 2.0, 0.0), faction('wow', 1.5, 0.5)],
} as unknown as GameConfigOut

vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => CONFIG,
}))

const { StakesTiles } = await import('../shared')

function text(props: {
  viewer: string
  opponent: string
  status: 'pending' | 'active' | 'settled' | 'declined'
}): string {
  const html = renderToStaticMarkup(
    <StakesTiles
      viewerFactionSlug={props.viewer}
      opponentFactionSlug={props.opponent}
      opponentName="Rax"
      taskPointValue={30}
      status={props.status}
      theme={{ accent: 'var(--color-border)' }}
    />,
  )
  return html.replace(/<[^>]*>/g, '')
}

describe('StakesTiles', () => {
  it('renders a losing Snide duelist 0, not half (#718 correction 2)', () => {
    const t = text({ viewer: 'snide', opponent: 'wow', status: 'active' })
    expect(t).toMatch(/If you win/i)
    expect(t).toMatch(/60/) // 30 × 2.0
    // Tag-stripping glues the label to its figure, which is exactly what we
    // want to pin: the number sitting under "If you lose" is 0.
    expect(t).toMatch(/If you lose0/i) // 30 × 0.0 — NOT 15
    expect(t).not.toMatch(/If you lose15/i)
  })

  it('renders an ordinary faction its own win/lose pair', () => {
    const t = text({ viewer: 'wow', opponent: 'snide', status: 'active' })
    expect(t).toMatch(/45/) // 30 × 1.5
    expect(t).toMatch(/15/) // 30 × 0.5
  })

  it('pays a tie 1.0x when neither side is Snide', () => {
    const t = text({ viewer: 'wow', opponent: 'wow', status: 'active' })
    expect(t).toMatch(/A tie pays 30\./)
  })

  it('gives Snide the win rate on a tie, and its opponent the loss rate', () => {
    expect(text({ viewer: 'snide', opponent: 'wow', status: 'active' })).toMatch(
      /A tie pays 60\./,
    )
    expect(text({ viewer: 'wow', opponent: 'snide', status: 'active' })).toMatch(
      /A tie pays 15\./,
    )
  })

  it('pending: the solo-fallback line replaces the win/lose pair (#718)', () => {
    const t = text({ viewer: 'snide', opponent: 'wow', status: 'pending' })
    expect(t).toMatch(/If Rax declines/i)
    expect(t).toMatch(/ordinary praxis worth 30/)
    expect(t).not.toMatch(/If you win|If you lose/i)
  })

  it('labels the figures as base points, before crowd votes', () => {
    const t = text({ viewer: 'wow', opponent: 'wow', status: 'settled' })
    expect(t).toMatch(/before crowd votes/i)
  })
})
