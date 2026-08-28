/**
 * Duel skin slot-invariant guard (#720), the `archetypeSlots.test.tsx` shape
 * applied to the duel SEAL registries.
 *
 * A skin owns the FRAME and may arrange the slots however its faction likes; it
 * may never DROP one and may never recompute one. The seal registry is walked
 * (plus its Default fallback) at BOTH form factors, so the faction skins that
 * follow Coven fail here the moment one of them loses a slot.
 *
 * ONE REGISTRY, BOTH WIDTHS (#1313). The seal is one responsive component and
 * `DuelSealSheet` owns the only form-factor branch, so a skin is rendered here
 * at both widths rather than once per registry — which is also what catches a
 * phone shell that drops a slot, something two separate component lists could
 * never catch for a faction that only registered one.
 *
 * The seal skins mount the real `StakesTiles` / `RaceRoster` / `SealActions`, so
 * the assertion is on the anchors those slots leave behind. The game config is
 * mocked; this is about composition, not transport.
 *
 * THE SEAL IS THE ONLY DUEL REGISTRY. The duel itself is not dispatched (#1090):
 * it is a card inside the praxis-detail archetype
 * (`pages/praxisDetail/DuelCard.tsx`), and its readings are guarded by
 * `praxisDetail/__tests__/duelCard.test.tsx`.
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
    takes_duel_ties: false,
  }
}

const CONFIG = {
  factions: [faction('wow', 1.5, 0.5), faction('snide', 2.0, 0.0)],
} as unknown as GameConfigOut

vi.mock('../../../hooks/useGameConfig', () => ({
  useGameConfig: () => CONFIG,
}))

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

// The harness has no DOM, so `renderToStaticMarkup` always takes
// `useSyncExternalStore`'s server snapshot ('desktop'). The phone shell is only
// reachable through this mock (#1313).
vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

const { DefaultDuelSealConfirm } = await import('../DuelSealConfirm')
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
  ]

  // Both modes and both form factors, every skin (#751, #1313). The seal dialog
  // doubles as the forfeit dialog, so a skin that renders every slot in `submit`
  // and quietly drops one in `forfeit` — the mode with the irreversible
  // consequence — fails here rather than in front of a player.
  type SlotCase = [
    string,
    ComponentType<DuelSealConfirmProps>,
    'submit' | 'forfeit',
    DuelDetailOut,
    'desktop' | 'mobile',
  ]
  const cases: SlotCase[] = skins.flatMap(([name, Skin]) =>
    (['desktop', 'mobile'] as const).flatMap((formFactor): SlotCase[] => [
      [`${name} (${formFactor})`, Skin, 'submit', DUEL, formFactor],
      [`${name} (${formFactor})`, Skin, 'forfeit', SETTLED_DUEL, formFactor],
    ]),
  )

  it.each(cases)('%s keeps stakes, roster and actions in %s mode', (_name, Skin, mode, duel, formFactor) => {
    mocks.formFactor = formFactor
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

  /**
   * #800: the Default dialog's body and reopen note sat at `--text-sm` (9px)
   * and `--text-xs` (8px) — half and less than half of the 18px content floor
   * — for text a player reads at the one duel moment with a genuinely
   * irreversible consequence (the forfeit mode added in #751). This is the
   * #769 guard, ported to the seal surface as that issue asked.
   *
   * Both Coven seal skins carried the matching defect on their note, as #800
   * named. Writing this guard against every registered skin (not just the
   * two named ones) also caught the same defect, previously unreported, on
   * both Snide seal skins — fixed alongside the named ones so the guard
   * ships green.
   *
   * Scoped to `<p>` tags so SealActions' buttons — legitimate `--text-sm`
   * button chrome, same exemption the rail guard carves out — don't false-
   * positive the check.
   */
  const LABEL_TIER = ['--text-xs', '--text-sm', '--text-base', '--text-md', '--text-lg']

  it.each(cases)(
    '%s does not sink body copy below the content floor in %s mode',
    (_name, Skin, mode, duel, formFactor) => {
      mocks.formFactor = formFactor
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
      const paragraphs = html.match(/<p[^>]*>/g) ?? []
      const offenders = paragraphs.filter((tag) =>
        LABEL_TIER.some((token) => tag.includes(`var(${token})`)),
      )
      expect(offenders).toEqual([])
    },
  )

  // The mode branch itself: each mode must actually SAY its own thing, so a
  // skin can't satisfy the slot walk above by hardcoding the submit copy.
  it.each(skins)('%s speaks the forfeit copy in forfeit mode', (_name, Skin) => {
    mocks.formFactor = 'desktop'
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
    expect(forfeit).not.toContain('Lock the duel?')

    const submit = render('submit', DUEL)
    expect(submit).toContain('Lock the duel?')
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
    expect(html.replace(/<[^>]*>/g, ' ')).toContain('Lock the duel?')
  })
})
