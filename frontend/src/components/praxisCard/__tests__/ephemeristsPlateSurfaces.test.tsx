/**
 * #1207 — Ephemerists praxis card and metatask seal on the Valley plate.
 * Pins the TOKEN FAMILY: the retired `--eph-*` codex family is still declared,
 * so a skin reading it renders fine with the wrong paint. SSR-only harness.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import '../../../i18n'
import i18n from '../../../i18n'
import type { PraxisCardOut } from '../../../api/praxis'
import type { TaskOut } from '../../../api/tasks'
import EphemeristsPraxisCard from '../desktop/EphemeristsPraxisCard'
import { GLYPHS } from '../../factionMarks/ephemeristsPlate'
import MetataskSeal from '../../metataskSeal/MetataskSeal'
import { factionName } from '../../../utils/factions'
import { sourceFiles, stripComments } from '../../../test/sourceScan'

const CODEX = /--eph-[a-z]/
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
    created_at: '2026-01-01T00:00:00Z',
    can_sign_up: false,
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
    const frame = markup.slice(0, markup.indexOf('>'))
    expect(frame).toContain('--faction-ephemerists-plate-bg')
    expect(frame).not.toMatch(CODEX)
    expect(markup).toContain('color:var(--faction-ephemerists-plate-quiet)')
    expect(markup).not.toContain('--eph-rubric')
    expect(markup).not.toContain('--eph-muted')
    // The shared byline portrait still wears `--eph-vellum*`; that's the sweep's job.
  })

  it('heads the record with the CARD TIER band, on the medallion disc', () => {
    // #2185: same band as the task card (plain `CardMasthead` on the plate disc).
    const markup = html()
    expect(markup, 'the kit band from #2029').toContain('data-card-masthead="ephemerists"')
    expect(markup, "the medallion's disc, not the cornice band").toContain(
      'var(--faction-ephemerists-plate-disc)',
    )
    // Scoped to the band: `-plate-band-quiet` is legitimately on the card's score
    // stamp caption since #2141. The masthead is an <a> (no nesting), so slice to `</a>`.
    const at = markup.indexOf('data-card-masthead')
    const band = markup.slice(at, markup.indexOf('</a>', at))
    expect(band, 'the slice really is the masthead').toContain(
      'var(--faction-ephemerists-plate-disc)',
    )
    expect(band, 'no engraved datum row in the band').not.toContain(
      'var(--faction-ephemerists-plate-band-quiet)',
    )
  })

  it('says the wordmark ONCE', () => {
    // #1634 retired the cartouche pill that repeated the name under the masthead.
    const rendered = text(html())
    const name = i18n.t('factions:names.ephemerists')
    expect(rendered).toContain(name)
    expect(
      rendered.split(new RegExp(name, 'i')).length - 1,
      'the band names the faction; nothing else on the card does',
    ).toBe(1)
    // Spelled out, not via a deleted key a dead-key sweep couldn't tell from live.
    expect(rendered).not.toContain('Ephemeris · sealed entry')
    // #1909 cut the faction-only kanji register; guard against it returning.
    expect(rendered).not.toContain('星')
  })

  it('rules the byline with the shared rune strip, not a private drift', () => {
    const markup = html()
    // #2312: shared `EphemeristsNotationBand` divider; its draw is tested in
    // `factionMarks/__tests__/ephemeristsNotationBand.test.tsx`.
    expect(markup).toContain('data-eph-runes="divider"')
    expect(markup, 'the retired inline copy').not.toContain('epg-glyph')
    // Motion is a reduced-motion-gated class in the deferred sheet, never inline.
    expect(markup).not.toContain('animation:')
  })

  it('keeps no hex in the frame it draws', () => {
    // Frame only: the shared avatar still uses hex-backed codex tokens.
    const markup = html()
    expect(markup.slice(0, markup.indexOf('>'))).not.toMatch(HEX)
  })

  /**
   * #2240 — the crown (`top: -13` on the score stamp) overhangs into the cornice.
   * Leaf and `Cornice` are both stacking contexts, so the leaf's layer must be
   * above the cornice's; the crown's own z-index can't escape its parent.
   */
  it('paints the crowned leaf above the cornice, not under it (#2240)', () => {
    const markup = render(
      <EphemeristsPraxisCard praxis={praxis({ is_top_for_task: true })} adminProps={adminProps} />,
    )
    expect(markup, 'the one praxis mark').toContain('var(--fdl-ring)')
    const cornice = markup.match(/aria-hidden="true" style="position:relative;z-index:(\d+)/)
    const leaf = markup.match(/<div style="position:relative;z-index:(\d+);padding:/)
    expect(cornice?.[1], 'the cavetto band declares a layer').toBeDefined()
    expect(leaf?.[1], 'the journal leaf declares a layer').toBeDefined()
    expect(Number(leaf?.[1])).toBeGreaterThan(Number(cornice?.[1]))
  })

  /**
   * #2360/#2655 — leaf pads `--space-sm` (8px < the crown's 13px overhang, so the
   * crown still reaches the cornice), title keeps `--space-lg`: 8 + 16 = 24.
   * All four legs together; each alone passes for a wrong fix.
   */
  it('gives the title its space without moving the crown off the cornice (#2360/#2655)', () => {
    const markup = render(
      <EphemeristsPraxisCard praxis={praxis({ is_top_for_task: true })} adminProps={adminProps} />,
    )
    expect(markup, 'the one praxis mark').toContain('var(--fdl-ring)')
    expect(markup, "the crown's overhang, unchanged").toContain('top:-13px')

    const leaf = markup.match(/<div style="position:relative;z-index:\d+;padding:([^ ;"]*)/)
    expect(leaf?.[1], 'the leaf declares a padding').toBeDefined()
    expect(leaf?.[1], 'the host states the gap above the stamp (#2655)').toBe('var(--space-sm)')

    const row = markup.match(/<div style="display:flex;justify-content:space-between;[^"]*"/)
    expect(row?.[0], 'the heading row is rendered').toBeDefined()
    expect(row?.[0], 'a pad on the row moves the stamp with the title').not.toMatch(
      /(margin|padding)-(top|block-start)/,
    )

    const title = markup.match(/<h2 class="content-title[^"]*" style="([^"]*)"/)
    expect(title?.[1], 'the title is rendered').toBeDefined()
    expect(title?.[1], "the entry's air, less the leaf's rung").toContain(
      'margin-top:var(--space-lg)',
    )
  })
})

describe('one card, both form factors (ADR-0067)', () => {
  it('carries no fixed frame width and no form-factor branch', () => {
    const markup = render(<EphemeristsPraxisCard praxis={praxis()} adminProps={adminProps} />)
    // A flex basis (mount-overridable, #1137), never a width, so it fits 375px.
    expect(markup).toContain('flex:1 1 var(--praxis-card-basis, 394px)')
    expect(markup).not.toMatch(/(^|[^-])width:39\d/)
  })
})

/**
 * Source-tree sweeps: a hand-copied declaration is invisible to the import graph
 * and to markup, and only a sweep catches a new copy appearing later (#1638).
 */
const KIT = fileURLToPath(new URL('../../factionMarks/ephemeristsPlate.tsx', import.meta.url))

/** Shipped `src/` files, comments stripped, tests skipped (retired names live in prose). */
function sources(): { path: string; source: string }[] {
  return sourceFiles().map((path) => ({ path, source: stripComments(readFileSync(path, 'utf8')) }))
}

// The band's mount census lives in `factionMarks/__tests__/ephemeristsNotationBand` (#2230); retired ornament names are in retiredIdentities.

/**
 * #1654 — the mark vocabulary has ONE home. Path strings are the sharper half:
 * a copy can be renamed, but the ankh's `d` is the same however it's smuggled.
 */
describe('the Ephemerists mark vocabulary is declared once (#1654)', () => {
  it('draws each sign in exactly one file', () => {
    const files = sources()
    for (const [name, path] of Object.entries(GLYPHS)) {
      const drawn = files.filter(({ source }) => source.includes(path))
      expect(drawn.map((file) => file.path), `${name} is transcribed`).toEqual([KIT])
    }
  })

  it('declares each mark COMPONENT once, and in the kit', () => {
    // Word-bounded, or `AuthorOctagon`/`LotusSign` would answer for their base name.
    const files = sources()
    for (const mark of ['Octagon', 'Cornice', 'Tally', 'Sign']) {
      const declared = files.filter(({ source }) =>
        new RegExp(`\\b(?:function|const)\\s+${mark}\\b`).test(source),
      )
      expect(declared.map((file) => file.path), `${mark} is redeclared`).toEqual([KIT])
    }
  })
})

/**
 * #1664 — label voice and monogram helper live in the kit. Swept by VALUE, scoped
 * to files importing the kit (other factions' local helpers are their own). The
 * task card's 0.26em `SMALL_CAPS` is its own design and passes as a different value.
 */
describe("the plate's label voice and monogram are declared once (#1664)", () => {
  const LABEL_VOICE =
    'fontFamily: CAPS, fontWeight: 500, letterSpacing: "0.24em", textTransform: "uppercase"'
  const INITIALS = '.slice(0, 2) .join("") .toUpperCase() || "·"'
  const squash = (source: string) => source.replace(/\s+/g, ' ')

  const plateSurfaces = () =>
    sources().filter(({ path, source }) => path !== KIT && source.includes('factionMarks/ephemeristsPlate'))

  it('is the kit that holds both values', () => {
    // Fails here if the kit reformats, rather than hollowing the sweep below.
    const kit = squash(readFileSync(KIT, 'utf8'))
    expect(kit, 'SMALL_CAPS').toContain(LABEL_VOICE)
    expect(kit, 'initialsOf').toContain(INITIALS)
  })

  it('leaves no plate surface restating them', () => {
    const surfaces = plateSurfaces()
    expect(surfaces.length, 'the sweep found the plate surfaces at all').toBeGreaterThan(10)
    const restating = (value: string) =>
      surfaces.filter(({ source }) => squash(source).includes(value)).map((file) => file.path)
    expect(restating(LABEL_VOICE), 'SMALL_CAPS is transcribed').toEqual([])
    expect(restating(INITIALS), 'initialsOf is transcribed').toEqual([])
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
    // Issuer is the shared band's wordmark (#2648): the faction NAME.
    expect(body).toContain(factionName('ephemerists'))
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
