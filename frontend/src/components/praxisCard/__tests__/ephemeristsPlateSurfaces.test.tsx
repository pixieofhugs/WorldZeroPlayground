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

  it('heads the record with the CARD TIER band, on the medallion disc', () => {
    // #2185: a praxis card wears the same band its task card wears, and #2067
    // restrained `EphemeristsTaskCard` to the kit's plain `CardMasthead` on the
    // plate DISC. So the 110px night band with its incised `GlyphRegister` is
    // off this card, and the engraved masthead with it.
    const markup = html()
    expect(markup, 'the kit band from #2029').toContain('data-card-masthead="ephemerists"')
    expect(markup, "the medallion's disc, not the cornice band").toContain(
      'var(--faction-ephemerists-plate-disc)',
    )
    // THE DATUM ROW'S INK IS STILL THE TELL, BUT IT IS NOW SCOPED TO THE BAND,
    // and the rescoping is the finding rather than a tidy-up. This asserted the
    // absence of `-plate-band-quiet` from the WHOLE CARD, on the stated premise
    // that the ink "exists nowhere else on this card". #2141 expired that
    // premise: `-plate-disc` is a chip that does not flip, so the score stamp's
    // caption had to leave the SHEET ink `-plate-caption` (2.63:1 on the chip in
    // light) for the band's quiet tier, and the ink is now legitimately on this
    // card, several hundred pixels below the masthead. A whole-card proxy is
    // only a proxy while its exclusivity holds — and an expired one fails on the
    // NEXT honest change, which is exactly what it did.
    //
    // The masthead is an <a>, and anchors do not nest, so its own markup is the
    // slice between `data-card-masthead` and the first `</a>` after it. That is
    // the region the engraved register would have to be in. Everything the
    // assertion was ever about is inside it, and nothing else is.
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
    // #1634 retired the brass cartouche pill that repeated the faction's name
    // 40px under the masthead. The band still names the faction, so the pill
    // must still be gone: a header plus a subtitle saying the same word is the
    // failure that renders perfectly.
    const rendered = text(html())
    const name = i18n.t('factions:names.ephemerists')
    expect(rendered).toContain(name)
    expect(
      rendered.split(new RegExp(name, 'i')).length - 1,
      'the band names the faction; nothing else on the card does',
    ).toBe(1)
    // The pill's own copy, spelled out: `praxis:card.masthead.ephemerists` was
    // deleted with the pill, and a key kept alive by a negative assertion is a
    // key the next dead-key sweep cannot tell from a live one.
    expect(rendered).not.toContain('Ephemeris · sealed entry')
    // The four-kanji register (星 暦 観 録) is GONE, and so is the English it
    // was glossed with: #1909 CUT all eight `ephemerists.masthead.*` strings —
    // no other faction had a register row, and the audit ruled the masthead
    // generic. Asserted as an absence so a voice pass cannot quietly put a
    // faction-only band back on a surface ruled shared.
    expect(rendered).not.toContain('星')
  })

  /* The plate gloss ("for:", `praxis:card.ephemerists.for`) and the card's own
     vote prompt ("Cast your metal", `votes:chrome.ephemerists.prompt`) each had
     a test here. #1909 CUT both keys — the gloss was a two-faction flourish on a
     surface ruled generic, and the whole `chrome.{F}.prompt` slot went because
     only three of nine factions rendered one. What remains of the second test —
     the drift strip breathing on the shared gate rather than inline — is the
     assertion below, which is the part that was never about copy. */

  it('rules the byline with the shared rune strip, not a private drift', () => {
    const markup = html()
    // #2312 — the strip moved from above the vote block to the byline's rule,
    // and it is the shared component now (`EphemeristsNotationBand`, which
    // absorbed the strip in #2230). The old assertion read a single mark (`∮`)
    // out of the retired 32-mark array; the marks are seeded per praxis since
    // #2146, and since #2230 the COUNT is measured off the element, so a row
    // rendered here is empty by construction. What is assertable at this seam is
    // the divider's IDENTITY; the draw is
    // `factionMarks/__tests__/ephemeristsNotationBand.test.tsx`'s business.
    expect(markup).toContain('data-eph-runes="divider"')
    expect(markup, 'the retired inline copy').not.toContain('epg-glyph')
    // Still no inline animation: the strip's motion is a reduced-motion-gated
    // class in the deferred sheet, so a reader who never receives it sees a
    // full static row.
    expect(markup).not.toContain('animation:')
  })

  it('keeps no hex in the frame it draws', () => {
    // Scoped to the frame: the shared avatar below still paints in hex-backed
    // codex tokens, which is the sweep's problem, not this card's.
    const markup = html()
    expect(markup.slice(0, markup.indexOf('>'))).not.toMatch(HEX)
  })

  /**
   * #2240 — THE CROWN IS DRAWN OVER THE CORNICE, NOT UNDER IT.
   *
   * `EphemeristsScoreStamp` hangs the crown at `top: -13`, so it overhangs the
   * leaf's top edge on purpose (#2122 already moved it out of the panel's own
   * `clip-path` for that reason). On this card the overhang landed under the
   * cavetto: the leaf is a stacking context at `z-index: 2` and `Cornice` is
   * one at `3`, so the band painted over the mark whatever the crown's own
   * `z-index: 3` said — the inner number cannot lift a child out of its
   * parent's context.
   *
   * NOT an `overflow` bug, which is the other way this defect presents on this
   * kit (#2150's shaved plates): the frame's `overflow: hidden` clips at the
   * card's border box, and the crown overhangs 13px into a ~12px cornice that
   * sits well inside it. Nothing is clipped; the order was wrong.
   *
   * The seam is the two declared layers, because an overlap is not decidable in
   * an SSR harness: what IS decidable is that the layer carrying the crown
   * composites above the layer carrying the band.
   */
  it('paints the crowned leaf above the cornice, not under it (#2240)', () => {
    const markup = render(
      <EphemeristsPraxisCard praxis={praxis({ is_top_for_task: true })} adminProps={adminProps} />,
    )
    // The crown really is on this render, and really is in the leaf.
    expect(markup, 'the one praxis mark').toContain('var(--fdl-ring)')
    const cornice = markup.match(/aria-hidden="true" style="position:relative;z-index:(\d+)/)
    const leaf = markup.match(/<div style="position:relative;z-index:(\d+);padding:/)
    expect(cornice?.[1], 'the cavetto band declares a layer').toBeDefined()
    expect(leaf?.[1], 'the journal leaf declares a layer').toBeDefined()
    expect(Number(leaf?.[1])).toBeGreaterThan(Number(cornice?.[1]))
  })

  /**
   * #2360 — THE ENTRY GETS ITS AIR, THE SEAL KEEPS THE CORNICE.
   *
   * This was the only praxis card in the kit opening with zero top padding, so
   * the title butted the cavetto. The obvious repair — a top pad on the leaf —
   * is the one that must NOT happen: the crown hangs at `top: -13` off the
   * SCORE STAMP's box, and the stamp's box sits at the leaf's content top, so
   * padding the leaf moves the crown down out of the 12px cornice and into the
   * new padding. It still LOOKS right, because the crown only draws on a
   * crowned praxis — hence this test renders one.
   *
   * The air therefore goes on the TITLE, a flex SIBLING of the stamp's column:
   * a margin there cannot displace the stamp. What is decidable in an SSR
   * harness with no layout engine is exactly that split, so all three legs are
   * asserted together — each alone is satisfiable by the wrong fix.
   */
  it('gives the title its space without moving the crown off the cornice (#2360)', () => {
    const markup = render(
      <EphemeristsPraxisCard praxis={praxis({ is_top_for_task: true })} adminProps={adminProps} />,
    )
    // (1) The crowned path really is the one under test.
    expect(markup, 'the one praxis mark').toContain('var(--fdl-ring)')
    expect(markup, "the crown's overhang, unchanged").toContain('top:-13px')

    // (2) The leaf's top edge has not moved: the first rung of its padding
    // shorthand is still zero, so the -13 measures from the cavetto's underside.
    const leaf = markup.match(/<div style="position:relative;z-index:\d+;padding:([^ ;"]*)/)
    expect(leaf?.[1], 'the leaf declares a padding').toBeDefined()
    expect(leaf?.[1], 'a top pad here would pull the crown out of the cornice').toBe('0')

    // (3) Nor has the heading ROW gained one — it carries the stamp.
    const row = markup.match(/<div style="display:flex;justify-content:space-between;[^"]*"/)
    expect(row?.[0], 'the heading row is rendered').toBeDefined()
    expect(row?.[0], 'a pad on the row moves the stamp with the title').not.toMatch(
      /(margin|padding)-(top|block-start)/,
    )

    // (4) And the air is on the title itself, at the kit's rung.
    const title = markup.match(/<h2 class="content-title[^"]*" style="([^"]*)"/)
    expect(title?.[1], 'the title is rendered').toBeDefined()
    expect(title?.[1], "the entry's air, matching its eight fellows").toContain(
      'margin-top:var(--space-xl)',
    )
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

describe('one ornament vocabulary, and it is the notation band (#2210)', () => {
  it('leaves no FlutedRule anywhere — not a mount, not a second declaration (#1638)', () => {
    expect(sources().filter(({ source }) => source.includes('FlutedRule'))).toEqual([])
  })

  /**
   * #2143 gave the masthead the NOTATION BAND — mathematical marks — and
   * retired none of the astro/alchemical register it replaced, so both drew and
   * they overlapped wherever they shared a band. The owner's ruling is that the
   * register retires ENTIRELY rather than moving clear: the band is the
   * faction's only ornament row.
   *
   * The seam is the SOURCE tree for the same reason #1638's was. Eight mounts
   * across eight files render perfectly on their own; only a sweep of the tree
   * can say that none of them is left, and only a sweep catches a NEW mount
   * appearing later.
   */
  it('leaves no glyph register anywhere — not a mount, not a declaration', () => {
    const files = sources()
    for (const retired of ['GlyphRegister', 'RuneRule']) {
      const alive = files.filter(({ source }) => new RegExp(`\\b${retired}\\b`).test(source))
      expect(alive.map((file) => file.path), `${retired} still ships`).toEqual([])
    }
    // `Glyph` drew one sign for the register and had no other caller: the task
    // card and the task page both reach `GLYPHS` directly, and `Sign` is the
    // kit's one-mark component. Word-bounded, or `GlyphRegister` (gone above)
    // and `GlossedGlyph` would answer for it.
    const glyph = files.filter(({ source }) => /\b(?:function|const)\s+Glyph\b/.test(source))
    expect(glyph.map((file) => file.path), 'Glyph still ships').toEqual([])
  })

  /**
   * THE BAND'S OWN MOUNT CENSUS MOVED (#2230). It read "from the masthead and
   * nowhere else" — true while the band was the masthead's last line and the
   * rune strip was a second drawing of the same motif. #2230 retired the strip
   * INTO the band, so the band now has five mounts and the census belongs beside
   * the component it counts: `factionMarks/__tests__/ephemeristsNotationBand`,
   * which also carries the harder guard #2341 asked for — keyed on the mark POOL
   * rather than on the component's name, because a re-transcription can be
   * renamed and a pool cannot be left behind. Restating the list here would give
   * one ruling two homes to drift between.
   */
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
    for (const mark of ['Octagon', 'Cornice', 'Tally', 'Sign']) {
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
    // Two nodes since #2562: the bonus is drawn in the compass rose, the score
    // stamp's anatomy, so the catalog split the one "+N PTS" string in two.
    expect(body).toContain(i18n.t('praxis:detail.seal.bonusFigure', { points: 35 }))
    expect(body).toContain(i18n.t('praxis:card.stamp.points', { count: 35 }))
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
