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
import MetataskSeal from '../../metataskSeal/MetataskSeal'

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

  it('paints its frame and its slots from the plate family, not the codex', () => {
    const markup = html()
    // The frame itself: the root element's whole style attribute.
    const frame = markup.slice(0, markup.indexOf('>'))
    expect(frame).toContain('--faction-ephemerists-plate-bg')
    expect(frame).not.toMatch(CODEX)
    // The slots this file dresses — the meta line and the media well were the
    // two that kept reading `--eph-rubric` / `--eph-muted` through the frame.
    expect(markup).toContain('color:var(--faction-ephemerists-plate-quiet)')
    expect(markup).not.toContain('--eph-rubric')
    expect(markup).not.toContain('--eph-muted')
    // What is left is the shared byline PORTRAIT (`FactionAvatar`), which wears
    // the codex family (`--eph-vellum*`) on every surface it appears on and
    // belongs to the sweep, not to this card.
  })

  it('carries the night-band masthead: winged disc over an incised register', () => {
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

  it('drifts a glyph strip above the vote block, and heads the cast', () => {
    const markup = html()
    // The strip breathes on the shared `.epg-glyph` gate rather than an inline
    // animation, so a reduced-motion reader still gets the marks.
    expect(text(markup)).toContain('∮')
    expect(markup).not.toContain('animation:')
    // The CARD states the vote prompt — the widget carries none, so the detail
    // page's own section heading is not doubled up.
    expect(text(markup)).toContain(i18n.t('votes:chrome.ephemerists.prompt'))
  })

  it('keeps no hex in the frame it draws', () => {
    // Scoped to the frame: the shared avatar below still paints in hex-backed
    // codex tokens, which is the sweep's problem, not this card's.
    const markup = html()
    expect(markup.slice(0, markup.indexOf('>'))).not.toMatch(HEX)
  })
})

describe('one card, both form factors (ADR-0067)', () => {
  /**
   * The card this issue dresses is the ONLY praxis card the Ephemerists have:
   * #1277 deleted `praxisCard/mobile/` and made each faction's frame
   * responsive. So the plate must survive a 375px column without a form-factor
   * branch — which means no fixed width on the frame and nothing in it that
   * cannot shrink.
   */
  it('carries no fixed frame width and no form-factor branch', () => {
    const markup = render(<EphemeristsPraxisCard praxis={praxis()} adminProps={adminProps} />)
    // `frameBase`'s flex basis, not a width: one card per row at 375px. The
    // basis is a custom property since #1137, so a MOUNT can narrow it (the
    // task-detail gallery does) without forking this frame — but the fallback
    // is the feed's 394px, and it is still a basis rather than a width, which
    // is the property this test exists to hold.
    expect(markup).toContain('flex:1 1 var(--praxis-card-basis, 394px)')
    expect(markup).not.toMatch(/(^|[^-])width:39\d/)
  })
})

describe('the Ephemerists metatask seal is a margin note on papyrus (#1207)', () => {
  const html = () => render(<MetataskSeal metatasks={[metatask()]} />)

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
      <MetataskSeal metatasks={[metatask()]} removable onRemove={() => {}} />,
    )
    expect(removable).toContain(i18n.t('praxis:detail.seal.remove'))
  })
})
