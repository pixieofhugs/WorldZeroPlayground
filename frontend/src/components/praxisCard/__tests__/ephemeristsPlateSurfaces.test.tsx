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
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
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

  it('carries the night-band masthead: the engraved title over an incised register', () => {
    const markup = html()
    // The register's signs and the cornice are the kit's, not a second copy.
    expect(markup).toContain('class="epg-glyph"')
    expect(markup).toContain('var(--faction-ephemerists-plate-band)')
  })

  it('heads the record with the engraved masthead, and says the wordmark ONCE', () => {
    // #1634 replaced the winged disc + Poiret One wordmark with the engraved
    // masthead, and retired the brass cartouche pill that repeated the faction's
    // name 40px below it. Both halves are asserted here because a mount that
    // adds the masthead and leaves the pill is the failure that still renders:
    // it looks like a masthead with a subtitle.
    const rendered = text(html())
    expect(rendered).toContain(i18n.t('factions:names.ephemerists'))
    // The pill's own copy, spelled out: `praxis:card.masthead.ephemerists` was
    // deleted with the pill, and a key kept alive by a negative assertion is a
    // key the next dead-key sweep cannot tell from a live one.
    expect(rendered).not.toContain('Ephemeris · sealed entry')
    // The masthead's own register, at the card scale's rung.
    expect(rendered).toContain('星')
    expect(html()).toContain('var(--faction-ephemerists-plate-band-quiet)')
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

/**
 * #1638 — FLUTED RULES BECOME SHIFTING RUNES, "on every surface that draws it".
 *
 * The seam is the SOURCE, not the markup, and that is the whole point of this
 * block. `FlutedRule` had six mounts reachable by following imports and a
 * SEVENTH declaration hand-copied into `EphemeristsTaskDetail` — so a sweep
 * done through the import graph converts six surfaces, leaves two mounts on the
 * old drawing, and every test still passes because each file renders fine.
 *
 * Rendering all seven here would need seven page harnesses to assert one
 * ornament; grepping the tree costs nothing and catches the case rendering
 * cannot see, which is a NEW hand-copy appearing later.
 */
const SKINS = fileURLToPath(new URL('../../..', import.meta.url))
const KIT = fileURLToPath(new URL('../../factionMarks/ephemeristsPlate.tsx', import.meta.url))

/**
 * Every shipped `.ts`/`.tsx` under `src/`, with comments stripped and tests
 * skipped. Both exclusions matter: the files that RETIRED a mark name it in
 * prose so the next reader knows it was deleted rather than mislaid, and this
 * very file names them in the assertions below.
 */
function sources(): { path: string; source: string }[] {
  const found: { path: string; source: string }[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '__tests__') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry.name)) {
        found.push({
          path: full,
          source: readFileSync(full, 'utf8')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/^\s*\/\/.*$/gm, ''),
        })
      }
    }
  }
  walk(SKINS)
  return found
}

describe('the fluted rule is retired kit-wide (#1638)', () => {
  it('leaves no FlutedRule anywhere — not a mount, not a second declaration', () => {
    expect(sources().filter(({ source }) => source.includes('FlutedRule'))).toEqual([])
  })

  it('mounts the rune band on every surface the flute had', () => {
    // Six imports plus the task page, whose local copy #1638 collapsed into the
    // shared one. Counted as FILES rather than mounts because the task page
    // draws it twice, and the number that can silently drift is how many
    // surfaces reach the kit at all.
    //
    // Seven until #1314. `EphemeristsFactionPage` was one of them and is gone
    // with the whole `mobileFactionPage` surface (ADR-0077) — the band it drew
    // is still on the phone, because `EphemeristsFactionBody` (already counted)
    // now serves both widths. A DELETED surface is the one way this number may
    // fall; it must never fall because a mount was dropped.
    const mounts = sources().filter(({ source }) => source.includes('<RuneRule'))
    expect(mounts.length).toBe(6)
  })

  it('draws the band out of the kit register, in brass rather than gold', () => {
    // Gold is the masthead's ink on a night band; on the papyrus page it is a
    // stain. `-brass` is the plate's rule colour and never an ink.
    const kit = readFileSync(KIT, 'utf8')
    const rule = kit.slice(kit.indexOf('export function RuneRule'))
    expect(rule).toContain('<GlyphRegister')
    expect(rule).toContain('color={BRASS}')
    // The shift is the register's own `.epg-glyph` cycle, already gated on
    // reduced-motion — the band declares no animation of its own.
    expect(rule.slice(0, rule.indexOf('\n}'))).not.toContain('animation')
  })
})

/**
 * #1654 — the mark vocabulary has ONE home, and this is what says so.
 *
 * The task card and the task page each carried a transcription of the plate's
 * marks: eleven local redefinitions between them, plus the tally written out
 * inline. Nothing imported them, so nothing linked the copies — a sign redrawn
 * in the kit left the other two standing, and every test stayed green while one
 * surface drew last month's mark. That is the failure this pins, and it can
 * only be pinned against the SOURCE tree: a second declaration is invisible to
 * the import graph and invisible to markup, which renders perfectly either way.
 *
 * The path strings are the sharper half. A copy can be renamed, inlined, or
 * split up and the component-name sweep below misses it; the ankh's `d` is the
 * same 44 characters however it is smuggled.
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
    // `Glyph` is exported for the task card, which composes its own register
    // out of the sign rather than taking `GlyphRegister` — so the sign is kit
    // and the ORDER is the card's. Word-bounded, or `AuthorOctagon`,
    // `GlossedGlyph` and `LotusSign` would each answer for their base name.
    const files = sources()
    for (const mark of ['Glyph', 'GlyphRegister', 'Octagon', 'Cornice', 'Tally', 'Sign']) {
      const declared = files.filter(({ source }) =>
        new RegExp(`\\b(?:function|const)\\s+${mark}\\b`).test(source),
      )
      expect(declared.map((file) => file.path), `${mark} is redeclared`).toEqual([KIT])
    }
  })

  it('keeps the two cornice densities apart — a prop, not two components', () => {
    // 40 flutes is the task-card design's (#1023) across a 384px band and 52
    // the task-details design's (#1041) across the page. The flutes are
    // `flex: 1`, so the count IS the pitch and the two are not interchangeable.
    // Neither drifted from the other — they were never one drawing — which is
    // why the collapse parameterised the count instead of picking a winner.
    const kit = readFileSync(KIT, 'utf8')
    expect(kit).toContain('flutes = 52')
    const card = readFileSync(
      fileURLToPath(new URL('../../taskCard/EphemeristsTaskCard.tsx', import.meta.url)),
      'utf8',
    )
    expect(card).toContain('<Cornice flutes={40} />')
  })
})

/**
 * #1664 — the label VOICE and the monogram helper live in the kit too.
 *
 * Neither is a mark, so #1654 left both behind, and the task page's copies were
 * the last of it: `SMALL_CAPS` byte-identical, `initialsOf` byte-identical
 * except for the empty case, where it dropped the kit's "·" and rendered an
 * empty disc. That is the shape a name-based sweep is worst at — the copy is
 * correct enough to review clean and wrong in one input nobody types.
 *
 * So this sweeps by VALUE, and scopes to the surfaces that already reach the
 * kit: a file importing `factionMarks/ephemeristsPlate` and then restating part
 * of it is a copy, whatever it called the local. The scoping is what keeps this
 * honest about the other factions — `covenSlip` declares the same initials
 * helper for the Coven's own vocabulary, and the seven other task/praxis
 * archetypes each carry a local one. Those are their kits' business, not the
 * plate's, and a repo-wide equality here would either fail on them or quietly
 * claim authority over drawings this file has never seen.
 *
 * The task CARD keeps its own `SMALL_CAPS` and is expected to: it tracks at
 * 0.26em, which is the card design's drawing rather than a drift from the
 * page's, exactly like the cornice's 40 flutes against the page's 52. The value
 * sweep passes it for free — a different value is not a transcription.
 */
describe("the plate's label voice and monogram are declared once (#1664)", () => {
  /** The kit's own values, spelled out. A copy can rename the const; it cannot
   *  restate the voice without restating these four properties in this order. */
  const LABEL_VOICE =
    'fontFamily: CAPS, fontWeight: 500, letterSpacing: "0.24em", textTransform: "uppercase"'
  /** The tail of `initialsOf` — the two-letter cut and the no-name mark. */
  const INITIALS = '.slice(0, 2) .join("") .toUpperCase() || "·"'
  const squash = (source: string) => source.replace(/\s+/g, ' ')

  /** Every shipped surface that reaches the kit, the kit itself excepted. */
  const plateSurfaces = () =>
    sources().filter(({ path, source }) => path !== KIT && source.includes('factionMarks/ephemeristsPlate'))

  it('is the kit that holds both values', () => {
    // If a refactor moves or reformats either, this fails HERE rather than
    // silently turning the sweep below into an assertion about nothing.
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
