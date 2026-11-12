/**
 * Duel seal skin slot guard (#720): a skin owns the frame but may never drop or
 * recompute a slot. Walked at both form factors (#1313). The duel card itself
 * is not dispatched (#1090); see `praxisDetail/__tests__/duelCard.test.tsx`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { ComponentType } from 'react'
import type { GameConfigOut, FactionConfigOut } from '../../../api/gameConfig'
import type { DuelDetailOut, DuelSideOut } from '../../../api/duel'
// Type-only, so it can't defeat the vi.mock hoist.
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

// Static render always takes the 'desktop' snapshot; mock to reach phone.
vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

const { DefaultDuelSealConfirm } = await import('../DuelSealConfirm')
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
    win_multiplier: 1.5,
    loss_multiplier: 0.5,
    tie_multiplier: 1.0,
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

/** Forfeit only happens at `status == settled` (`praxis.py`). */
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
  // Tuple-typed: `as const` spreads widen and break it.each's signature.
  const skins: [string, ComponentType<DuelSealConfirmProps>][] = [
    ['default', DefaultDuelSealConfirm],
    ...Object.entries(surfaceMap('duelSeal')),
  ]

  // Both modes (#751): forfeit is the irreversible one.
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
    expect(text).toContain('Rax')
    expect(html.match(/<button/g) ?? []).toHaveLength(2)
    expect(html).toContain('role="dialog"')
  })

  /** Body copy stays at the 18px content floor (#800). `<p>` only: buttons
   * legitimately use `--text-sm`. */
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

  // Stops a skin passing the slot walk by hardcoding submit copy.
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
    expect(forfeit).toContain('FORFEITS the duel')
    expect(forfeit).toContain('Forfeit')
    expect(forfeit).toContain('Rax wins by default')
    expect(forfeit).not.toContain('Lock the duel?')

    const submit = render('submit', DUEL)
    expect(submit).toContain('Lock the duel?')
    expect(submit).not.toContain('FORFEITS the duel')
  })

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
