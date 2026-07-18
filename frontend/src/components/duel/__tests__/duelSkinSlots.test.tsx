/**
 * Duel skin slot-invariant guard (#720), the `archetypeSlots.test.tsx` shape
 * applied to the two duel registries.
 *
 * A skin owns the FRAME and may arrange the slots however its faction likes; it
 * may never DROP one and may never recompute one. Both registries are walked
 * (plus their Default fallback), so the faction skins that follow Wow fail here
 * the moment one of them loses a slot.
 *
 * Two registries, two techniques:
 *  - The RAIL skins receive their slots as already-rendered `ReactNode` props,
 *    so sentinel nodes prove passthrough directly — and prove, by construction,
 *    that the skin could not have recomputed anything.
 *  - The SEAL skins mount the real `StakesTiles` / `RaceRoster` / `SealActions`,
 *    so the assertion is on the anchors those slots leave behind. The game
 *    config is mocked; this is about composition, not transport.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { GameConfigOut, FactionConfigOut } from '../../../api/gameConfig'
import type { DuelDetailOut, DuelSideOut } from '../../../api/duel'

function faction(slug: string, win: number, lose: number): FactionConfigOut {
  return {
    slug,
    can_always_rejoin: false,
    own_task_modifier: 1.0,
    other_task_modifier: 1.0,
    collab_own_modifier: 1.0,
    collab_other_modifier: 1.0,
    duel_win_modifier: win,
    duel_loss_modifier: lose,
  }
}

const CONFIG = {
  factions: [faction('wow', 1.5, 0.5), faction('snide', 2.0, 0.0)],
} as unknown as GameConfigOut

vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => CONFIG,
}))

const { DefaultDuelSealConfirm, DUEL_SEAL_BY_SLUG, MOBILE_DUEL_SEAL_BY_SLUG } = await import(
  '../DuelSealConfirm'
)
const { DefaultDuelRail, DUEL_RAIL_BY_SLUG, MOBILE_DUEL_RAIL_BY_SLUG } = await import(
  '../../../pages/praxisDetail/DuelCrossLink'
)

function side(overrides: Partial<DuelSideOut>): DuelSideOut {
  return {
    character_id: 1,
    praxis_id: 10,
    display_name: 'Ada',
    faction_slug: 'wow',
    avatar_url: null,
    is_submitted: false,
    points_from_votes: 0,
    ...overrides,
  } as DuelSideOut
}

const DUEL = {
  id: 5,
  status: 'active',
  forfeited_by_character_id: null,
  challenger: side({ character_id: 1, display_name: 'Ada', faction_slug: 'wow' }),
  opponent: side({ character_id: 2, praxis_id: 11, display_name: 'Rax', faction_slug: 'snide' }),
} as unknown as DuelDetailOut

describe('duel seal skins render every slot', () => {
  const skins = [
    ['default', DefaultDuelSealConfirm],
    ...Object.entries(DUEL_SEAL_BY_SLUG),
    ...Object.entries(MOBILE_DUEL_SEAL_BY_SLUG).map(([slug, skin]) => [`${slug} (mobile)`, skin]),
  ] as const

  it.each(skins)('%s keeps stakes, roster and actions', (_name, Skin) => {
    const html = renderToStaticMarkup(
      <Skin
        duel={DUEL}
        viewerCharacterId={1}
        taskPointValue={60}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const text = html.replace(/<[^>]*>/g, ' ')
    // StakesTiles: the wow win figure (60 × 1.5) and the lose figure (60 × 0.5).
    expect(text).toContain('90')
    expect(text).toContain('30')
    // RaceRoster: the opponent's row.
    expect(text).toContain('Rax')
    // SealActions: two buttons, cancel then confirm.
    expect(html.match(/<button/g) ?? []).toHaveLength(2)
    // The dialog contract the composer relies on.
    expect(html).toContain('role="dialog"')
  })
})

describe('duel rail skins render every slot', () => {
  const skins = [
    ['default', DefaultDuelRail],
    ...Object.entries(DUEL_RAIL_BY_SLUG),
    ...Object.entries(MOBILE_DUEL_RAIL_BY_SLUG).map(([slug, skin]) => [`${slug} (mobile)`, skin]),
  ] as const

  it.each(skins)('%s passes headline, tally, note and body through', (_name, Skin) => {
    const html = renderToStaticMarkup(
      <Skin
        accent="var(--faction-snide)"
        soft="var(--faction-snide-light)"
        maxWidth="42rem"
        headline={<span>SLOT_HEADLINE</span>}
        tally={<span>SLOT_TALLY</span>}
        note={<span>SLOT_NOTE</span>}
        body={<span>SLOT_BODY</span>}
      />,
    )
    expect(html).toContain('SLOT_HEADLINE')
    expect(html).toContain('SLOT_TALLY')
    expect(html).toContain('SLOT_NOTE')
    expect(html).toContain('SLOT_BODY')
  })

  // declined / forfeited legitimately arrive with no race left; a skin must not
  // crash or invent one.
  it.each(skins)('%s survives the empty-body states', (_name, Skin) => {
    const html = renderToStaticMarkup(
      <Skin
        accent="var(--faction-snide)"
        soft="var(--faction-snide-light)"
        maxWidth="42rem"
        headline={<span>SLOT_HEADLINE</span>}
        tally={null}
        note={null}
        body={null}
      />,
    )
    expect(html).toContain('SLOT_HEADLINE')
  })
})
