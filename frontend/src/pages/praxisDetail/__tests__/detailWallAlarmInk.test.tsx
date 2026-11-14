/**
 * Alarm marks in `shared.tsx` take the ink measured on the skin's own wall
 * (#1451); the neutral `--color-danger` misses AA on faction walls. Ratios live
 * in `utils/__tests__/factionContrast.test.ts`; this pins the dispatch.
 *
 * The ink keys off `task_faction_slug` (same as archetype dispatch), card family
 * for all but S.N.I.D.E. (its card is black in both themes, §6). Wash and rule
 * stay the neutral `--color-danger-*` rungs (#1169, ADR-0061).
 */
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { FACTION_MANIFESTS } from '../../../factions'
import {
  PraxisAdminBar,
  PraxisFlagBlock,
  PraxisStatusBanners,
  PraxisOwnerActions,
  PraxisSubmitControls,
} from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisOut } from '../../../api/praxis'
import { aPraxisDetailState, markup } from '../../../test/praxisDetail'

/**
 * slug → measured alarm token. `albescent` shares na's wall (#1140). Typed by
 * hand so it isn't a tautology; the population comes from the manifests (#2815).
 */
const ALARM_TOKEN: Record<string, string> = {
  na: '--faction-default-card-alarm',
  albescent: '--faction-default-card-alarm',
  coven: '--faction-coven-card-alarm',
  ephemerists: '--faction-ephemerists-card-alarm',
  everymen: '--faction-everymen-card-alarm',
  singularity: '--faction-singularity-card-alarm',
  snide: '--faction-snide-wall-alarm',
  ua: '--faction-ua-card-alarm',
  wow: '--faction-wow-card-alarm',
}

/** `null` = unaffiliated task → na's ink. */
const WALL_ALARM: [string | null, string][] = [
  [null, ALARM_TOKEN.na],
  ...FACTION_MANIFESTS.map((manifest): [string, string] => [
    manifest.slug,
    ALARM_TOKEN[manifest.slug],
  ]),
]

function praxis(overrides: Partial<PraxisOut> = {}): PraxisOut {
  return {
    id: 1,
    task_id: 7,
    task_title: 'Mangrove',
    task_point_value: 30,
    task_level_required: 3,
    task_faction_slug: null,
    type: 'solo',
    status: 'submitted',
    title: 'Reforestation',
    body_text: 'Seedlings.',
    moderation_status: 'visible',
    admin_note: null,
    flagged_at: null,
    submitted_at: '2026-01-02T00:00:00Z',
    submit_proposed_at: null,
    created_by_id: 1,
    created_by_display_name: 'Ada',
    created_by_faction_slug: 'na',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    members: [],
    invites: [],
    media_items: [],
    score: 0,
    metatask_points: 0,
    display_multiplier: 1.0,
    points_from_votes: 0,
    is_top_for_task: false,
    duel_id: null,
    can_flag: true,
    applied_metatasks: [],
    ...overrides,
  } as PraxisOut
}

function state(overrides: Partial<PraxisDetailState>): PraxisDetailState {
  return aPraxisDetailState({
    praxis: praxis(),
    isOwner: true,
    ...overrides,
  })
}

const html = (element: ReactElement): string => markup(element).html


describe('the praxis detail wall carries its own alarm ink (#1451)', () => {
  it.each(WALL_ALARM)('%s: has a measured alarm ink at all', (slug, token) => {
    // A clear failure for a kit missing from ALARM_TOKEN.
    expect(token, `${slug} is a registered kit with no row in ALARM_TOKEN`).toBeTypeOf('string')
  })

  it.each(WALL_ALARM)('%s: the failed banner reads its wall', (slug, token) => {
    const markup = html(
      <PraxisStatusBanners
        state={state({
          praxis: praxis({
            task_faction_slug: slug,
            moderation_status: 'failed',
            admin_note: 'No proof attached.',
          }),
        })}
      />,
    )
    expect(markup).toContain(`color:var(${token})`)
    expect(markup).not.toContain('color:var(--color-danger)')
    expect(markup).not.toContain('color:var(--color-warning)')
    expect(markup).toContain('background:var(--color-danger-veil)')
    expect(markup).toContain('border:2px solid var(--color-danger-edge)')
  })

  it.each(WALL_ALARM)('%s: the withdraw error reads its wall', (slug, token) => {
    const markup = html(
      <PraxisOwnerActions
        state={state({
          praxis: praxis({ task_faction_slug: slug }),
          withdrawError: 'That did not go through.',
        })}
      />,
    )
    expect(markup).toContain(`color:var(${token})`)
    expect(markup).not.toContain('color:var(--color-danger)')
  })

  it.each(WALL_ALARM)('%s: the pull-back confirm reads its wall', (slug, token) => {
    const markup = html(
      <PraxisSubmitControls
        state={state({
          praxis: praxis({ task_faction_slug: slug }),
          showWithdrawConfirm: true,
        })}
      />,
    )
    expect(markup).toContain(`color:var(${token})`)
    expect(markup).not.toContain('color:var(--color-danger)')
    expect(markup).toContain('background:var(--color-danger-veil)')
    expect(markup).toContain('border:1.5px solid var(--color-danger)')
  })

  it('the notice role stays a second hue on the same banner', () => {
    const markup = html(
      <PraxisStatusBanners
        state={state({
          praxis: praxis({
            task_faction_slug: 'wow',
            moderation_status: 'failed',
            admin_note: 'No proof attached.',
          }),
        })}
      />,
    )
    expect(markup).toContain('color:var(--faction-wow-card-alarm)')
    expect(markup).toContain('color:var(--faction-wow-card-notice)')
  })

  it('leaves the neutral-chrome cards on the global inks — #1413 moved their GROUND', () => {
    // `PraxisAdminBar`/`PraxisFlagBlock` sit on `.sidebar-card` on the app's
    // page ground (`card-on-page`, #1413), so they keep the global inks; a
    // faction ink can read 1.00:1 there. Every mount is checked (#1606).
    const bars = [
      html(<PraxisAdminBar state={state({ showAdminBar: true })} />),
      html(<PraxisFlagBlock state={state({ flagSubmitted: true })} />),
      html(<PraxisFlagBlock state={state({ showFlagForm: true, flagError: 'Nope' })} />),
    ]
    for (const bar of bars) {
      const cards = bar.match(/class="sidebar-card[^"]*"/g) ?? []
      expect(cards.length).toBeGreaterThan(0)
      for (const card of cards) {
        expect(card, 'moderation chrome owes ADR-0061 the app\'s own ground AND ink').toContain('card-on-page')
      }
    }
    expect(bars[0]).toContain('var(--color-danger)')
    expect(bars[2]).toContain('var(--color-danger)')
  })
})
