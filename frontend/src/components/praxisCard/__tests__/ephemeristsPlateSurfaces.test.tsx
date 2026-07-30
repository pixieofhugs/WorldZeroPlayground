/**
 * #1207 — the Ephemerists praxis CARD, its mobile twin and the metatask seal,
 * crossing from THE CODEX (#841) to the Valley plate.
 *
 * The seam is each surface's rendered markup. What these pin is the one thing a
 * port can lose while still rendering perfectly: the TOKEN FAMILY. The retired
 * `--eph-*` illuminated-codex family is still declared and still painted by
 * every other Ephemerists surface, so a skin that keeps reading it compiles,
 * renders, and quietly puts vellum-and-lapis on a papyrus card.
 *
 * SSR-only harness (renderToStaticMarkup, no DOM, effects never run), so these
 * are assertions about markup given props — never interaction.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import '../../../i18n'
import i18n from '../../../i18n'
import type { PraxisCardOut } from '../../../api/praxis'
import type { TaskOut } from '../../../api/tasks'
import EphemeristsPraxisCard from '../desktop/EphemeristsPraxisCard'
import EphemeristsMobilePraxisCard from '../mobile/EphemeristsMobilePraxisCard'
import MetaTaskSeal from '../../metaTaskSeal/MetaTaskSeal'

/** The retired illuminated-codex family. None of it may reach a plate surface. */
const CODEX = /--eph-[a-z]/
/** No hex may reach the markup — every colour is a token. */
const HEX = /#[0-9a-fA-F]{3,8}\b/

function praxis(overrides: Partial<PraxisCardOut> = {}): PraxisCardOut {
  return {
    id: 1,
    title: "Hauled the block's recycling to the depot",
    task_id: 4,
    task_title: 'A chore nobody asked you to',
    created_by_id: 7,
    created_by_display_name: 'Brother Anselm',
    created_by_faction_slug: 'ephemerists',
    created_by_avatar_url: '',
    task_faction_slug: 'ephemerists',
    task_level_required: 3,
    task_point_value: 12,
    member_count: 1,
    score: 13.6,
    display_multiplier: 0.8,
    metatask_points: 0,
    points_from_votes: 4,
    voter_count: 3,
    is_top_for_task: false,
    media_items: [],
    applied_metatasks: [],
    ...overrides,
  } as PraxisCardOut
}

function metatask(overrides: Partial<TaskOut> = {}): TaskOut {
  return {
    id: 99,
    title: 'Logged as a dawn field-observation',
    description: null,
    point_value: 35,
    level_required: 1,
    status: 'active',
    task_type: 'metatask',
    created_by: 3,
    primary_faction_slug: 'ephemerists',
    metatask_faction_slug: 'ephemerists',
    is_task_vision_eligible: false,
    created_at: '2026-01-01T00:00:00Z',
    can_submit_praxis: false,
    allowed_modes: [],
    eligible_for_current_user: false,
    ...overrides,
  } as TaskOut
}

const adminProps = {
  praxis: praxis(),
  showAdminControls: false,
  onHide: () => {},
  onDelete: () => {},
} as unknown as Parameters<typeof EphemeristsPraxisCard>[0]['adminProps']

const render = (node: ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

const text = (html: string) => html.replace(/<[^>]*>/g, '')

describe('the Ephemerists praxis card wears the Valley plate (#1207)', () => {
  const html = () => render(<EphemeristsPraxisCard praxis={praxis()} adminProps={adminProps} />)

  it('paints from the plate family and never the retired codex tokens', () => {
    expect(html()).toContain('--faction-ephemerists-plate-')
    expect(html()).not.toMatch(CODEX)
  })

  it('carries the night-band masthead: winged disc between incised registers', () => {
    const markup = html()
    // The register's signs and the cornice are the kit's, not a second copy.
    expect(markup).toContain('class="epg-glyph"')
    expect(markup).toContain('var(--faction-ephemerists-plate-band)')
  })

  it('heads the record with the cartouche, ruled off at both ends', () => {
    expect(text(html())).toContain(i18n.t('praxis:card.masthead.ephemerists'))
  })

  it('reads the task through the plate gloss rather than as a bare reference', () => {
    expect(text(html())).toContain(i18n.t('praxis:card.ephemerists.for'))
  })

  it('drifts a glyph strip above the vote block', () => {
    // The strip is ornament: aria-hidden, and never in the accessible name.
    expect(html()).toContain('eph-glyph-strip')
  })

  it('keeps no hex anywhere in the frame', () => {
    expect(html()).not.toMatch(HEX)
  })
})

describe('the Ephemerists mobile card follows the same plate (#1207)', () => {
  const html = () => render(<EphemeristsMobilePraxisCard praxis={praxis()} />)

  it('paints from the plate family and never the retired codex tokens', () => {
    expect(html()).toContain('--faction-ephemerists-plate-')
    expect(html()).not.toMatch(CODEX)
  })

  it('carries the same masthead, so it does not read as another faction', () => {
    expect(html()).toContain('var(--faction-ephemerists-plate-band)')
    expect(text(html())).toContain(i18n.t('praxis:card.masthead.ephemerists'))
  })
})

describe('the Ephemerists metatask seal is a margin note on papyrus (#1207)', () => {
  const html = () => render(<MetaTaskSeal metatasks={[metatask()]} />)

  it('paints from the plate family and never the retired codex tokens', () => {
    expect(html()).toContain('--faction-ephemerists-plate-')
    expect(html()).not.toMatch(CODEX)
  })

  it('keeps the three-field contract: issuer, condition, bonus', () => {
    const body = text(html())
    expect(body).toContain(i18n.t('praxis:detail.seal.label', { faction: 'The Ephemerists' }))
    expect(body).toContain('Logged as a dawn field-observation')
    expect(body).toContain(i18n.t('praxis:detail.seal.bonus', { points: 35 }))
  })

  it('sits FLAT — the specimen tilt is staging, not the seal', () => {
    expect(html()).not.toContain('rotate(')
  })

  it('renders the peel control only where a surface asks for one', () => {
    expect(html()).not.toContain(i18n.t('praxis:detail.seal.remove'))
    const removable = render(
      <MetaTaskSeal metatasks={[metatask()]} removable onRemove={() => {}} />,
    )
    expect(removable).toContain(i18n.t('praxis:detail.seal.remove'))
  })
})
