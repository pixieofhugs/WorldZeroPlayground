/**
 * NOTHING DISPATCHED TO ALBESCENT HOLDS A STILL SPECTRUM (#2500, epic #2496).
 *
 * #2497 minted `.spectrum-rule` and `.spectrum-dial` for the seventeen unclassed
 * inline spectra scattered through the ten `Default*` files Albescent wears, and
 * its own note says why: *"#2500 is what will animate them."* This is that,
 * and the seam is the one the census exposed — a MOUNT WITH NO DRESSER OVER IT.
 *
 * ## The defect this goes red on
 *
 * Before this issue only two of those mounts moved, and both by a selector
 * naming one surface (`.alb-stamp .spectrum-rule`, #2501). Every other classed
 * spectrum on an Albescent surface — the task card's two hairlines and its
 * points ring, the task detail's four rules, the praxis detail's dial and two
 * bands, the faction body's five plate rules, the whole profile — stood still,
 * and nothing could see it: each one renders, paints and passes every existing
 * test whether or not a `::before` is walking across it.
 *
 * So the guard is a CENSUS, pinned. `alb-moves` is the marker that says "this
 * surface is dispatched to Albescent, so the na spectra inside it move"; the
 * list below is every wrapper that carries it and the reason. A wrapper dropped
 * from the list, or a new Albescent surface that forgets the class, is the exact
 * shape of the defect and turns this red.
 *
 * ## Why `:empty` is in the selector and not an oversight
 *
 * `.spectrum-rule` is worn by two different objects. Most mounts are ORNAMENT —
 * an `aria-hidden` hairline, band, chip or progress fill with no children — and
 * those travel. Four are FRAMES: a padded ramp wrapped around an opaque inner
 * sheet (the ×mult badge, the task-detail action panel, the praxis proof panel,
 * the profile identity band). A travelling child inside a frame has to be
 * clipped and its content lifted back over the rim, and the identity band would
 * then carry two ramps at two speeds, since `.alb-profile-edge` already travels
 * on it — the "one carrier per object" #2519 spent a PR establishing. `:empty`
 * is the difference between the two objects, stated once.
 *
 * That paragraph used to be prose here and prose in index.css, guarded by
 * nothing: the census below the wrappers asserts the marker per FILE, which is
 * blind to whether any given mount still matches `:empty` (#2543). The second
 * census — "the census, per mount" — is the same sentence with every mount
 * named and classified, so a hairline that grows a child fails by name instead
 * of quietly standing still.
 *
 * ## Harness
 *
 * The stylesheet read as source text, plus `renderToStaticMarkup` — no DOM and
 * no compositor in CI (SPEC-testing.md), so nothing here proves a pixel. The
 * pixels are visual QA and stated outstanding on the PR.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'

import '../i18n'
import { stripComments, ruleBodies } from '../utils/__tests__/cssVars'
import AlbescentSeal from '../components/metataskSeal/skins/AlbescentSeal'
import type { TaskOut } from '../api/tasks'
import { sourceFiles, toRelative } from '../test/sourceScan'
import { readIndexCss } from '../test/indexCss'

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

const INDEX = stripComments(readIndexCss())
const MOTION = stripComments(read('../motion.ornament.css'))

/**
 * THE CENSUS. Every row of `ALBESCENT_MANIFEST` whose na component declares a
 * `.spectrum-rule` or a `.spectrum-dial`, and therefore had a still spectrum on
 * it until this issue.
 */
const WEARS_THE_MARKER: Record<string, string> = {
  // two hairlines (the in-progress chip, the CTA rule) + DefaultPointsRing's dial
  '../components/taskCard/AlbescentTaskCard.tsx': 'task card',
  // the vote divider
  '../components/praxisCard/desktop/AlbescentPraxisCard.tsx': 'praxis card',
  // the band and the working-out rule — #2501's two, generalised
  '../components/praxisCard/scoreStamp/AlbescentScoreStamp.tsx': 'score stamp',
  // two section heads, the eyebrow chip, the breakdown hairline
  '../pages/taskDetail/archetypes/AlbescentTaskDetail.tsx': 'task detail',
  // the member dial, a section head, the sheet-head band
  '../pages/praxisDetail/archetypes/AlbescentPraxisDetail.tsx': 'praxis detail',
  // the section heads, the badge and laurel dials, the progression fill
  '../pages/characterProfile/archetypes/AlbescentProfileBody.tsx': 'profile',
  // the five plates' hairlines
  '../pages/factionDetail/archetypes/AlbescentFactionBody.tsx': 'faction body',
  // the pale sheet's one strip — classed here, since the seal is Albescent's own
  '../components/metataskSeal/skins/AlbescentSeal.tsx': 'metatask seal',
  // The live credential card's portrait ring, at BOTH widths since #2992. It
  // used to be the phone branch's 104px photo well — one mount on one form
  // factor — and that branch retired when the na kit went onto the composer
  // chassis. The conic now lives in the shared `components/CredentialCard.tsx`,
  // which #2497's sweep never reached because it censused the `Default*`
  // archetype files and the card is not one of them.
  '../pages/characterPaths/archetypes/AlbescentCreateCharacter.tsx': 'character creation',
  // The same card's ring on the EDIT half, and the row this census was missing:
  // the surface has been in `ALBESCENT_MANIFEST` since #2537 and appeared in
  // neither table, so the header's "every row" was one short. It belongs on THIS
  // side rather than the other — na drew two rings here until #2991 (the phone
  // column's photo well and the desktop plate's portrait ring), and when that
  // pair retired onto the composer chassis the credential card's classed ring
  // took both their places at both widths.
  '../pages/characterPaths/archetypes/AlbescentEditCharacter.tsx': 'character editing',
  // The directory tile's one hairline. It moved sides in #2632: the tile used to
  // be bespoke vellum markup with no classed spectrum on it at all, and the
  // collapse onto `DefaultSelectCard` handed it na's rule — which the same pass
  // classed, for exactly the reason the style guide gives for asking first,
  // "unreachable or merely unclassed".
  '../components/selectCard/AlbescentSelectCard.tsx': 'select card',
}

/**
 * The rows deliberately WITHOUT it, each because its na component declares
 * neither class — so there is no still spectrum for a marker to reach. The
 * assertion is computed rather than asserted by hand: a `Default*` that grows
 * one turns this red and sends the reader back to the census.
 */
const NO_CLASSED_SPECTRUM: Record<string, string> = {
  '../components/feed/FactionFeedFrame.tsx': 'feed frame',
  '../pages/editPraxis/archetypes/DefaultEditPraxis.tsx': 'composer',
  '../components/factionHero/DefaultFactionHero.tsx': 'faction hero',
  '../components/avatar/FactionAvatar.tsx': 'avatar',
  '../components/vote/AlbescentVote.tsx': 'vote',
  // The three PASS-THROUGH rows #2531 added. Each is listed against the na
  // component it wraps, because that is where the answer lives: no classed
  // spectrum there means no still spectrum for a marker to reach, which is the
  // finding each registration was made to record. The comment sheet is the one
  // to read twice — na DOES draw a spectrum hairline on it, but the ramp is
  // `factionFill(slug, 'bar')`, computed per slug, and a class cannot be
  // conditional (the hold-out `spectrumClasses.test.tsx` already names for the
  // rung dots). So "no classed spectrum" is true of it for a reason the other
  // rows do not share, and if that ever changes this row goes red.
  '../components/layout/WatercolorBackground.tsx': 'backdrop',
  '../components/comments/CommentThread.tsx': 'comment',
  '../components/duel/DuelSealConfirm.tsx': 'duel seal',
}

describe('the census: every Albescent surface with a classed spectrum wears the marker', () => {
  for (const [path, surface] of Object.entries(WEARS_THE_MARKER)) {
    it(`${surface} carries alb-moves`, () => {
      expect(read(path)).toContain('alb-moves')
    })
  }

  for (const [path, surface] of Object.entries(NO_CLASSED_SPECTRUM)) {
    it(`${surface} has no classed spectrum to move`, () => {
      const source = read(path)
      expect(source).not.toContain('className="spectrum-rule')
      expect(source).not.toContain("className='spectrum-rule")
      expect(source).not.toContain('className="spectrum-dial')
      expect(source).not.toContain("className='spectrum-dial")
    })
  }

  /**
   * The mobile field desk is the one exception and it is a REPLACEMENT, not an
   * omission: `DefaultFieldDesk` does draw a `.spectrum-rule`, and #2519 took it
   * off the Albescent desk when the identity card grew a travelling border. One
   * carrier per object — so the desk needs no marker because the bar is gone,
   * and this is the line that says so.
   */
  it('the field desk drops its bar rather than moving it', () => {
    // The mount shares a rule with the composer's retired band, so the prelude
    // is a list and `ruleBodies` (whole-prelude matching) cannot reach it.
    const at = INDEX.indexOf('.alb-desk .spectrum-rule')
    expect(at).toBeGreaterThan(-1)
    expect(INDEX.slice(at, INDEX.indexOf('}', at))).toContain('display: none')
  })
})

/**
 * THE ORNAMENT / FRAME TABLE, MADE EXECUTABLE (#2543).
 *
 * The census above is per FILE — it asserts the marker string appears in each
 * Albescent wrapper. That cannot see the selector the marker exists to feed.
 * `.alb-moves .spectrum-rule:empty` reads a MOUNT, and `:empty` is the whole
 * ornament/frame distinction: nest one span inside a hairline and that spectrum
 * stops moving with every test in the repo still green. So this is the same
 * census, per MOUNT. Every `.spectrum-rule` in the kit, in source order within
 * its file, with the side of the line it is on:
 *
 *   ORNAMENT — an `aria-hidden` hairline, band, chip or progress fill with no
 *     children. `:empty` reaches it, so it travels. It must STAY CHILDLESS.
 *   FRAME — a padded ramp wrapped around an opaque inner sheet. `:empty` must
 *     NOT reach it, because a travelling child paints over the content the
 *     frame frames. It must KEEP ITS CHILDREN.
 *
 * Four frames, and they are exactly the four `.alb-moves`'s own comment names
 * in prose: the ×mult badge and the action panel on the task detail, the proof
 * panel on the praxis detail, the profile's identity band. This is that
 * paragraph, in a form the suite can read.
 *
 * `.spectrum-dial` has no rows HERE and that is not an omission: neither of its
 * selectors carries `:empty`. The rim is drawn whether or not there is a face,
 * and `.alb-moves .spectrum-dial > *` lifts the face when there is one, so a
 * dial has no childless-ness to pin. `FdlLaurel`'s dial is childless and the
 * roster medallion's is not; both are correct, which is why neither is listed.
 * The dial's own ornament/frame line is a different question with a different
 * answer, and #3024 put it in the third census at the bottom of this file.
 *
 * READ FROM SOURCE, NOT FROM A RENDER, deliberately. Several of these mounts
 * sit behind a prop or a form factor (`hasWorking`, `eyebrowFaction`,
 * `desktop`), so a fixture rendering each surface once would cover a subset and
 * call the rest guarded — the same blindness this issue is about. A scan sees
 * every mount a file declares, reachable in that fixture or not.
 */
type Mount = readonly ['ornament' | 'frame', string]

const SPECTRUM_MOUNTS: Record<string, readonly Mount[]> = {
  // The seal's one strip. It moved OUT of `AlbescentSeal.tsx` and into
  // `AlbescentBand` with #2648, which changes nothing the selector reads:
  // `.alb-moves .spectrum-rule:empty` is a DESCENDANT rule, the marker is still
  // on the seal's root, and the strip is still the band's flush, childless rule.
  // `DefaultBand` beside it draws no ramp — the na seal's spectrum is its frame.
  '../components/metataskSeal/sealBands.tsx': [
    ['ornament', "the Albescent band's rule"],
  ],
  '../components/praxisCard/desktop/DefaultPraxisCard.tsx': [
    ['ornament', 'the vote divider'],
  ],
  '../components/praxisCard/scoreStamp/DefaultScoreStamp.tsx': [
    ['ornament', 'the rule over the working out'],
  ],
  '../components/selectCard/DefaultSelectCard.tsx': [
    ['ornament', "the tile's one hairline, under the faction name"],
  ],
  '../components/taskCard/DefaultTaskCard.tsx': [
    ['ornament', 'the in-progress chip'],
    ['ornament', 'the CTA rule'],
  ],
  '../pages/characterProfile/archetypes/DefaultProfileBody.tsx': [
    ['ornament', "`SectionHeading`'s hairline, drawn three times"],
    ['frame', 'the identity band — `.alb-profile-edge` already travels on it'],
    ['ornament', 'the level-bar fill (epic #2496 ruling 3 names this one)'],
  ],
  // The side-by-side duel reader (#1084, ADR-0092). Its three are the same
  // three `DefaultPraxisDetail` has, and for the same reasons — the reader is
  // that page's anatomy drawn twice. Albescent's row on this surface is a
  // PASS-THROUGH (brief §6 bars a dress without an owner ruling), so nothing
  // here travels today; the census classifies the mounts so it cannot start
  // travelling by accident the day one does.
  '../pages/duelReader/shared.tsx': [
    ['ornament', "`defaultSectionHead`'s trailing hairline"],
    ['ornament', "the winner's rule on a resolved duel (artboard 2e)"],
    ['frame', 'the proof panel, around the media gallery'],
    ['ornament', 'the sheet-head band'],
  ],
  '../pages/factionDetail/archetypes/DefaultFactionBody.tsx': [
    ['ornament', "`PLATE_RULE`, the plate's hairline"],
  ],
  '../pages/fieldDesk/mobileArchetypes/DefaultFieldDesk.tsx': [
    ['ornament', "the desk's head bar — `display: none` under `.alb-desk`"],
  ],
  '../pages/praxisDetail/archetypes/DefaultPraxisDetail.tsx': [
    ['ornament', "`sectionHead`'s trailing hairline"],
    ['frame', 'the proof panel, around the media gallery'],
    ['ornament', 'the sheet-head band'],
  ],
  '../pages/taskDetail/archetypes/DefaultTaskDetail.tsx': [
    ['ornament', "`sectionHead`'s trailing hairline"],
    // The ×mult badge's frame and the breakdown hairline left this file in
    // #2554 along with the readout that held them — the worth cell is
    // `DefaultScoreStamp` now, and its own spectra are censused there.
    ['frame', 'the action panel, around the worth cell and the CTA'],
    ['ornament', 'the eyebrow faction chip'],
    ['ornament', "the gallery head's hairline"],
  ],
}

const SRC = fileURLToPath(new URL('../', import.meta.url))

/**
 * Every `.spectrum-rule` element a file declares, in source order, and whether
 * it is written CHILDLESS — which is what `:empty` matches at runtime. Childless
 * is a self-closing tag, or an open tag whose next non-space characters are its
 * own close.
 */
function ruleMounts(source: string): { line: number; childless: boolean }[] {
  const mounts: { line: number; childless: boolean }[] = []
  for (const attr of source.matchAll(/className=(["'])([^"']*)\1/g)) {
    if (!attr[2].split(/\s+/).includes('spectrum-rule')) continue
    const at = attr.index ?? 0
    // Walk to the end of this opening tag. A `>` inside a prop expression, a
    // string or a comment is not the tag's, so braces, quotes and comments are
    // all tracked past it — `DefaultPraxisCard`'s divider carries a `//` note
    // holding both an apostrophe and a backtick, and either one read as a quote
    // swallows the `/>` and reports a childless mount as full.
    let i = at + attr[0].length
    let depth = 0
    let quote = ''
    for (; i < source.length; i += 1) {
      const c = source[i]
      if (quote) {
        if (c === '\\') i += 1
        else if (c === quote) quote = ''
      } else if (c === '/' && source[i + 1] === '/') {
        i = source.indexOf('\n', i)
      } else if (c === '/' && source[i + 1] === '*') {
        i = source.indexOf('*/', i) + 1
      } else if (c === '"' || c === "'" || c === '`') quote = c
      else if (c === '{') depth += 1
      else if (c === '}') depth -= 1
      else if (c === '>' && depth === 0) break
    }
    mounts.push({
      line: source.slice(0, at).split('\n').length,
      childless: source[i - 1] === '/' || /^\s*<\//.test(source.slice(i + 1)),
    })
  }
  return mounts
}

/** Every file under `src/` that mounts one, tests aside — so a NEW file cannot
 *  grow a spectrum without appearing in the table above. */
const filesWithARule = () =>
  sourceFiles({ dir: SRC, match: /\.tsx$/ })
    .filter((path) => ruleMounts(readFileSync(path, 'utf8')).length > 0)
    .map((path) => `../${toRelative(path)}`)
    .sort()

describe('the census, per mount: which spectra travel and which frame content', () => {
  it('the table classifies every file in src/ that mounts a rule', () => {
    expect(filesWithARule()).toEqual(Object.keys(SPECTRUM_MOUNTS).sort())
  })

  for (const [path, table] of Object.entries(SPECTRUM_MOUNTS)) {
    const file = path.slice(path.lastIndexOf('/') + 1)

    table.forEach(([kind, name], index) => {
      const rule =
        kind === 'ornament'
          ? 'ORNAMENT — childless, so `:empty` reaches it and it travels'
          : 'FRAME — holds content, so `:empty` misses it and it stays still'

      it(`${file}: ${name} is ${rule}`, () => {
        const found = ruleMounts(read(path))
        expect(
          found.length,
          `${file} declares ${found.length} \`.spectrum-rule\` mounts and the ` +
            `table classifies ${table.length}. A new mount needs a row saying ` +
            'whether it travels or frames something.',
        ).toBe(table.length)

        const mount = found[index]
        expect(
          mount.childless,
          kind === 'ornament'
            ? `${file}:${mount.line} — ${name} is an ORNAMENT and has GAINED A ` +
              'CHILD, so `.alb-moves .spectrum-rule:empty` no longer matches it ' +
              'and it has silently stopped moving. Keep the mount empty and put ' +
              'the child in a sibling, or move it to the frame side of the table ' +
              'and say why it may stand still.'
            : `${file}:${mount.line} — ${name} is a FRAME and has LOST ITS ` +
              'CHILDREN, so `.alb-moves .spectrum-rule:empty` now matches it and ' +
              'a travelling child will paint over what the frame frames.',
        ).toBe(kind === 'ornament')
      })
    })
  }
})

/**
 * THE DIAL CENSUS, AND THE SHARED COMPONENT THE OTHER TWO CANNOT SEE (#3024).
 *
 * The two censuses above read the na and Albescent ARCHETYPE files. That is the
 * blind spot #2992's own comment in `components/CredentialCard.tsx` names: the
 * ring on the create page, the edit page and the profile header is one
 * `.spectrum-dial` declared in a SHARED component, which is not a `Default*`
 * archetype and appears in no manifest, so no row looked at it — and it is
 * precisely a shared spectrum that reaches surfaces its author was not thinking
 * about. This walk is over `src/`, so the next one has a row the day it lands.
 *
 * THE DIAL'S OWN ORNAMENT/FRAME LINE. `.spectrum-rule`'s is `:empty`, written
 * into the selector. A dial has no such guard — `.alb-moves .spectrum-dial`
 * turns anything wearing the class — so the line is drawn at the MOUNT instead:
 *
 *   ORNAMENT — nothing around it travels, so the dresser may turn it. It wears
 *     the class.
 *   FRAME — an object that already travels holds it, so a second spectrum on it
 *     would be two speeds on one object (#2519). It must NOT wear the class,
 *     and `CredentialCard`'s `stillRing` is how one mount says so — the ramp
 *     comes back inline in the class's place, because the class carries the
 *     resting conic as well as the reach.
 *
 * One frame today: the profile header's credential ring, inside the identity
 * band `.alb-profile-edge` travels on — the same object the `.spectrum-rule`
 * table above lists as a frame, one layer further in.
 *
 * READ FROM SOURCE for the reason the table above gives, plus one of its own:
 * whether a ring turns is decided at the mount, and `profileSkin` is the only
 * file that decides it for the profile. `albescentProfileRingStill.test.tsx`
 * renders both surfaces and asserts the same thing from the other side.
 */
const DIAL_MOUNTS: Record<string, readonly Mount[]> = {
  // The shared credential card's portrait ring — the create preview, the edit
  // preview and the profile header, at both widths since #2992.
  '../components/CredentialCard.tsx': [
    ['ornament', 'the portrait ring, wherever the mount does not stand it still'],
  ],
  '../components/factionMarks/DefaultPointsRing.tsx': [
    ['ornament', "the task card's points ring"],
  ],
  '../pages/characterProfile/archetypes/DefaultProfileBody.tsx': [
    ['ornament', "the FDL laurel's ring"],
    ['ornament', 'the badge medallion'],
  ],
  // The profile header's mount of the card above. It declares no dial of its
  // own and stands one still, which is the whole row.
  '../pages/characterProfile/archetypes/profileSkin.tsx': [
    ['frame', "the credential ring — `.alb-profile-edge` already travels on the band around it"],
  ],
  '../pages/praxisDetail/archetypes/DefaultPraxisDetail.tsx': [
    ['ornament', "the member's avatar dial"],
  ],
}

/**
 * A file's source with its COMMENTS TAKEN OUT. Every scan below reads a class
 * name out of a string literal, and this kit names both classes in prose far
 * more often than it mounts them — `CredentialCard`'s docblock quotes
 * `.spectrum-dial` five times above the line that writes it.
 */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n')
}

/** Every `.spectrum-dial` a file declares — in a `className` attribute or, as
 *  the credential card does, in a string on its way to one. */
const dialMounts = (source: string) =>
  [...code(source).matchAll(/(["'])[^"']*\bspectrum-dial\b[^"']*\1/g)].length

/** Every mount of the shared card that stands its ring still (#3024). */
const stilledRings = (source: string) =>
  [...code(source).matchAll(/<CredentialCard\b[^>]*\bstillRing\b/g)].length

/** Every file under `src/` that decides whether a dial turns — by mounting the
 *  class, or by taking it off a ring. Tests aside. */
const filesDecidingADial = () =>
  sourceFiles({ dir: SRC, match: /\.tsx$/ })
    .filter((path) => {
      const source = readFileSync(path, 'utf8')
      return dialMounts(source) > 0 || stilledRings(source) > 0
    })
    .map((path) => `../${toRelative(path)}`)
    .sort()

describe('the census, per dial: which rings turn and which stand still', () => {
  it('the table classifies every file in src/ that decides whether a dial turns', () => {
    expect(
      filesDecidingADial(),
      'A dial declared in a SHARED component reaches every surface that mounts ' +
        'it, including ones whose motion is already spoken for. A new one needs ' +
        'a row saying which it is.',
    ).toEqual(Object.keys(DIAL_MOUNTS).sort())
  })

  for (const [path, table] of Object.entries(DIAL_MOUNTS)) {
    const file = path.slice(path.lastIndexOf('/') + 1)
    const named = (kind: Mount[0]) =>
      table.filter(([mountKind]) => mountKind === kind).map(([, name]) => name)
    const turning = named('ornament')
    const still = named('frame')

    it(`${file}: ${turning.join(', ') || 'nothing here'} wears the class`, () => {
      expect(
        dialMounts(read(path)),
        `${file} declares ${dialMounts(read(path))} \`.spectrum-dial\` mounts ` +
          `and the table classifies ${turning.length} as turning.`,
      ).toBe(turning.length)
    })

    it(`${file}: ${still.join(', ') || 'nothing here'} stands still`, () => {
      expect(
        stilledRings(read(path)),
        still.length === 0
          ? `${file} has started standing a credential ring still. That is a ` +
            'FRAME mount and needs a row saying what travels around it.'
          : `${file} has stopped standing ${still.join(', ')} still, so ` +
            '`.alb-moves .spectrum-dial::before` reaches it again and the ' +
            'object around it carries two spectra at two speeds (#2519).',
      ).toBe(still.length)
    })
  }
})

describe('the track lives on the blocking sheet', () => {
  it('an ornament rule is a clip with a containing block', () => {
    const body = ruleBodies(INDEX, '.alb-moves .spectrum-rule:empty').join('\n')
    expect(body).toContain('overflow: hidden')
    expect(body).toContain('position: relative')
  })

  it('a dial and its face are both in the positioned layer', () => {
    expect(ruleBodies(INDEX, '.alb-moves .spectrum-dial').join('\n')).toContain(
      'position: relative',
    )
    expect(ruleBodies(INDEX, '.alb-moves .spectrum-dial > *').join('\n')).toContain(
      'position: relative',
    )
  })

  /** Paint may not defer, and motion may not block. Neither may cross. */
  it('index.css declares no animation for the marker', () => {
    const marker = INDEX.split('\n').filter((line) => line.includes('.alb-moves'))
    expect(marker.join('\n')).not.toContain('animation')
  })

  /**
   * The generalisation REPLACES #2501's two selectors rather than standing
   * beside them. Two rules doing the same job to the same mounts is how a
   * duration silently forks.
   */
  it('the score stamp no longer names itself', () => {
    expect(INDEX).not.toContain('.alb-stamp .spectrum-rule {')
    expect(MOTION).not.toContain('.alb-stamp .spectrum-rule::before')
    expect(MOTION).not.toContain('.alb-stamp .spectrum-dial::before')
  })
})

describe('the motion is a transform on a pre-painted gradient', () => {
  const gate = '@media (prefers-reduced-motion: no-preference)'

  it('both children exist only inside the reduced-motion gate', () => {
    for (const selector of [
      '.alb-moves .spectrum-rule:empty::before',
      '.alb-moves .spectrum-dial::before',
    ]) {
      const at = MOTION.indexOf(selector)
      expect(at, selector).toBeGreaterThan(-1)
      expect(MOTION.lastIndexOf(gate, at), selector).toBeGreaterThan(-1)
      expect(INDEX, selector).not.toContain(selector)
    }
  })

  it('the band states the loop cut and the rim inherits its wheel', () => {
    const band = ruleBodies(MOTION, '.alb-moves .spectrum-rule:empty::before').join('\n')
    // A two-tile child slid by exactly one tile — the only cut that cannot seam.
    expect(band).toContain('width: 200%')
    expect(band).toContain('background-size: 50% 100%')
    expect(band).toContain('var(--faction-default-rainbow-loop)')
    expect(band).toContain('alb-edge-travel')

    const rim = ruleBodies(MOTION, '.alb-moves .spectrum-dial::before').join('\n')
    expect(rim).toContain('background-image: inherit')
    expect(rim).toContain('alb-spin')
  })

  /**
   * Epic ruling: never animate a gradient parameter. `@property` inside a
   * `conic-gradient` re-rasterises every frame; so does walking
   * `background-position`. Both keyframes named above are bare transforms and
   * are declared elsewhere on this sheet — nothing new is minted here.
   */
  it('neither child walks a gradient parameter', () => {
    const bodies = [
      ...ruleBodies(MOTION, '.alb-moves .spectrum-rule:empty::before'),
      ...ruleBodies(MOTION, '.alb-moves .spectrum-dial::before'),
    ].join('\n')
    expect(bodies).not.toContain('background-position')
    expect(bodies).not.toContain('@property')
  })
})

describe('the seal, whose only spectrum was unclassed', () => {
  const METATASK = {
    id: 12,
    title: 'File it before the tide turns',
    point_value: 15,
    metatask_faction_slug: 'albescent',
  } as unknown as TaskOut

  it('wears the marker over a classed strip', () => {
    // The strip is `AlbescentBand`'s rule since #2648 and the marker is still
    // the seal root's, which is the pairing that matters: the selector is
    // `.alb-moves .spectrum-rule:empty`, a descendant, so it does not care which
    // file declares the mount. The `MemoryRouter` is what the band's `<Link>`
    // needs.
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AlbescentSeal metatask={METATASK} />
      </MemoryRouter>,
    )
    expect(html).toContain('alb-moves')
    expect(html).toContain('spectrum-rule')
    // The ramp is the class's now — an inline copy would be a second declaration
    // of the same paint, and the one the stylesheet cannot reach.
    expect(html).not.toContain('--faction-default-rainbow)')
  })
})
