/**
 * The praxis detail's alarm marks take the ink measured on the skin's own wall
 * (#1451).
 *
 * Praxis detail is ONE shared page that nine factions dress (ADR-0061), so the
 * five slots `shared.tsx` owns — the failed banner's title and admin note, the
 * withdraw error, the forfeit trigger, the pull-back confirm's label — painted
 * `--color-danger` / `--color-warning` onto nine different grounds. The neutral
 * hues were chosen against the app's near-white page and miss AA on every one of
 * those walls in light (3.11:1 on the Ephemerists papyrus up to 4.41:1 on the na
 * sheet, veiled). `utils/__tests__/factionContrast.test.ts` owns the ratios;
 * this file pins the DISPATCH those ratios are only reachable through.
 *
 * Two claims worth separating. The ink resolves off `task_faction_slug` — the
 * same slug `pages/PraxisDetail` picks the archetype with, so the ink and the
 * wall can never disagree — and it is the CARD family for seven skins with
 * S.N.I.D.E. the one exception (§6: its card is photocopier-black in both themes
 * while its wall flips, which is also why #1302 and #1231 each carved it out).
 *
 * The third is a source guard, because it is unreachable from markup: the WASH
 * and the RULE stay the neutral `--color-danger-*` rungs (#1169). ADR-0061 —
 * danger is the platform speaking; only the paper under it is the faction's.
 *
 * `renderToStaticMarkup` only — no jsdom, effects never run.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import {
  PraxisStatusBanners,
  PraxisOwnerActions,
  PraxisSubmitControls,
} from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisOut } from '../../../api/praxis'

const SHARED_SOURCE = readFileSync(
  fileURLToPath(new URL('../shared.tsx', import.meta.url)),
  'utf8',
)

/**
 * slug → the alarm token the wall under it was measured with. Seven reuse the
 * card family; S.N.I.D.E. is the mint. `albescent` renders
 * `DefaultPraxisDetail` plus an ornament layer (#1140), so it shares na's wall
 * and must therefore share na's ink — `null` is the unaffiliated task.
 */
const WALL_ALARM: [string | null, string][] = [
  [null, '--faction-default-card-alarm'],
  ['na', '--faction-default-card-alarm'],
  ['albescent', '--faction-default-card-alarm'],
  ['coven', '--faction-coven-card-alarm'],
  ['ephemerists', '--faction-ephemerists-card-alarm'],
  ['everymen', '--faction-everymen-card-alarm'],
  ['singularity', '--faction-singularity-card-alarm'],
  ['snide', '--faction-snide-wall-alarm'],
  ['ua', '--faction-ua-card-alarm'],
  ['wow', '--faction-wow-card-alarm'],
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
  return {
    loading: false,
    praxis: praxis(),
    fetchError: null,
    comments: null,
    votes: null,
    voters: [],
    duel: null,
    isOwner: true,
    showAdminBar: false,
    user: null,
    withdrawing: false,
    showWithdrawConfirm: false,
    setShowWithdrawConfirm: () => {},
    withdrawError: null,
    adminFailNote: '',
    setAdminFailNote: () => {},
    showFailInput: false,
    setShowFailInput: () => {},
    moderating: false,
    moderateError: null,
    showFlagForm: false,
    setShowFlagForm: () => {},
    flagReason: null,
    setFlagReason: () => {},
    flagDetail: '',
    setFlagDetail: () => {},
    flagging: false,
    flagError: null,
    setFlagError: () => {},
    flagSubmitted: false,
    handleModerate: async () => {},
    handleWithdraw: async () => {},
    handleFlag: async () => {},
    ...overrides,
  } as PraxisDetailState
}

function html(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
}

describe('the praxis detail wall carries its own alarm ink (#1451)', () => {
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
    // The banner's own wash and rule stay the neutral rungs.
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
    // The fill and the 1.5px rule are still the platform's red.
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
    // `PraxisAdminBar` and `PraxisFlagBlock` sit on `.sidebar-card`. Its
    // translucent `--color-bg-surface` composites to a near-white lift on most
    // skins in light, so the global inks are correct against that stock and the
    // faction inks are not (`--faction-singularity-card-alarm` reads 1.00:1 on
    // it). What was broken was the ground, which is why this expectation now
    // reads `card-on-page`: #1413 gave `.sidebar-card` a declared
    // `--card-ground` and pointed the neutral chrome at the app's page — the
    // stock these inks were chosen on — so the wall is out of the pairing on all
    // nine skins. The INK claim is unchanged and is the half that matters here:
    // a later skin reaching for `wallInk` in these two blocks would be undoing
    // both issues at once.
    expect(SHARED_SOURCE).toContain(
      "className=\"sidebar-card card-on-page mb-4\" style={{ padding: 'var(--space-md) var(--space-lg)' }}",
    )
    for (const block of ['PraxisAdminBar', 'PraxisFlagBlock']) {
      const body = SHARED_SOURCE.slice(SHARED_SOURCE.indexOf(`export function ${block}`))
      expect(body.slice(0, body.indexOf('\n}\n'))).toContain('var(--color-danger)')
    }
  })
})
