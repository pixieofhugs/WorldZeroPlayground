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
import type { ComponentType } from 'react'
import type { GameConfigOut, FactionConfigOut } from '../../../api/gameConfig'
import type { DuelDetailOut, DuelSideOut } from '../../../api/duel'
// Type-only, so these are erased before the vi.mock hoist and can't defeat the
// dynamic imports below.
import type { DuelSealConfirmProps } from '../DuelSealConfirm'
import type { DuelRailSkinProps } from '../../../pages/praxisDetail/DuelCrossLink'

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

const { DefaultDuelSealConfirm } = await import('../DuelSealConfirm')
const { DefaultDuelRail } = await import('../../../pages/praxisDetail/DuelCrossLink')
// Loaded after the mock, like the dispatchers above. surfaceMap resolves the
// faction skins lazily, so the manifests are the only registration seam.
const { surfaceMap } = await import('../../../factions')

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

/**
 * A settled duel with both sides cast — the only state in which unsubmitting is
 * a forfeit (`praxis.py` forfeits at `status == settled` only), so it is the
 * state the forfeit dialog actually opens in.
 */
const SETTLED_DUEL = {
  ...DUEL,
  status: 'settled',
  challenger: side({ character_id: 1, display_name: 'Ada', faction_slug: 'wow', is_submitted: true }),
  opponent: side({
    character_id: 2,
    praxis_id: 11,
    display_name: 'Rax',
    faction_slug: 'snide',
    is_submitted: true,
  }),
} as unknown as DuelDetailOut

describe('duel seal skins render every slot', () => {
  // Annotated as a tuple array rather than `as const`: the spreads widen to
  // (string | ComponentType)[] otherwise, and it.each then can't match the
  // two-arg callback signature.
  const skins: [string, ComponentType<DuelSealConfirmProps>][] = [
    ['default', DefaultDuelSealConfirm],
    ...Object.entries(surfaceMap('duelSeal')),
    ...Object.entries(surfaceMap('mobileDuelSeal')).map(
      ([slug, skin]) => [`${slug} (mobile)`, skin] as [string, ComponentType<DuelSealConfirmProps>],
    ),
  ]

  // Both modes, every skin (#751). The seal dialog doubles as the forfeit
  // dialog, so a skin that renders every slot in `submit` and quietly drops one
  // in `forfeit` — the mode with the irreversible consequence — fails here
  // rather than in front of a player.
  const cases: [string, ComponentType<DuelSealConfirmProps>, 'submit' | 'forfeit', DuelDetailOut][] =
    skins.flatMap(([name, Skin]) => [
      [name, Skin, 'submit', DUEL] as const,
      [name, Skin, 'forfeit', SETTLED_DUEL] as const,
    ])

  it.each(cases)('%s keeps stakes, roster and actions in %s mode', (_name, Skin, mode, duel) => {
    const html = renderToStaticMarkup(
      <Skin
        duel={duel}
        viewerCharacterId={1}
        taskPointValue={60}
        onConfirm={() => {}}
        onCancel={() => {}}
        mode={mode}
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

  // The mode branch itself: each mode must actually SAY its own thing, so a
  // skin can't satisfy the slot walk above by hardcoding the submit copy.
  it.each(skins)('%s speaks the forfeit copy in forfeit mode', (_name, Skin) => {
    const render = (mode: 'submit' | 'forfeit', duel: DuelDetailOut) =>
      renderToStaticMarkup(
        <Skin
          duel={duel}
          viewerCharacterId={1}
          taskPointValue={60}
          onConfirm={() => {}}
          onCancel={() => {}}
          mode={mode}
        />,
      ).replace(/<[^>]*>/g, ' ')

    const forfeit = render('forfeit', SETTLED_DUEL)
    // duelForfeit.confirmPrompt + duelForfeit.action, the shipped keys the
    // inline prompt already used.
    expect(forfeit).toContain('FORFEITS the duel')
    expect(forfeit).toContain('Forfeit')
    // duelForfeit.cost, interpolated with the SNIDE-aware lose figure.
    expect(forfeit).toContain('Rax wins by default')
    // The submit-mode heading must NOT leak into the forfeit dialog.
    expect(forfeit).not.toContain('Seal the duel?')

    const submit = render('submit', DUEL)
    expect(submit).toContain('Seal the duel?')
    expect(submit).not.toContain('FORFEITS the duel')
  })

  // Default mode is `submit`, so every existing mount site is untouched.
  it('defaults to submit mode when no mode is passed', () => {
    const html = renderToStaticMarkup(
      <DefaultDuelSealConfirm
        duel={DUEL}
        viewerCharacterId={1}
        taskPointValue={60}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(html.replace(/<[^>]*>/g, ' ')).toContain('Seal the duel?')
  })
})

describe('duel rail skins render every slot', () => {
  const skins: [string, ComponentType<DuelRailSkinProps>][] = [
    ['default', DefaultDuelRail],
    ...Object.entries(surfaceMap('duelRail')),
    ...Object.entries(surfaceMap('mobileDuelRail')).map(
      ([slug, skin]) => [`${slug} (mobile)`, skin] as [string, ComponentType<DuelRailSkinProps>],
    ),
  ]

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

  /**
   * #769: every rail skin set `fontSize: var(--text-sm)` (9px) on its wrapper,
   * so the roster, next-step line and stakes copy inherited half the 18px
   * content floor — functional text, at Label size, with no line of that text
   * naming a size anywhere. The slots now own their size and a frame owns none.
   *
   * The assertion is on the frame, not on the slots: the sentinels passed in
   * carry no styling, so ANY Label-tier font-size in the output came from the
   * skin's own chrome. A skin needing a small size for genuine ornament should
   * put it on that ornament's element with a raw value and an ornament comment
   * (WORLD_ZERO_STYLE §4a) — not on a container the slots sit inside.
   */
  const LABEL_TIER = ['--text-xs', '--text-sm', '--text-base', '--text-md', '--text-lg']

  it.each(skins)('%s does not impose a Label-tier size on its slots', (_name, Skin) => {
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
    const sizes = html.match(/font-size:\s*var\((--text-[a-z]+)\)/g) ?? []
    const offenders = sizes.filter((decl) => LABEL_TIER.some((token) => decl.includes(token)))
    expect(offenders).toEqual([])
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
