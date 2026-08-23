/**
 * Ornament motion is off the critical path, and only motion went (#2073).
 *
 * `src/motion.ornament.css` is reached only through `src/factionFaces.ts`, which
 * is only ever imported across a chunk boundary, so Vite emits it as a CSS asset
 * on an async chunk and `dist/index.html` never links it. `bundle-budget.mjs`
 * parses that HTML, so the sheet is outside the ledger by construction — the
 * same mechanism #2079 used for the 62 faction `@font-face` rules.
 *
 * WHY A GUARD AND NOT A SCREENSHOT
 * -------------------------------
 * Every way of getting this wrong is invisible in a passing build, and two of
 * them are invisible on screen as well.
 *
 * **Drop the `@media` wrapper on the way across** and the sheet ships motion to
 * a reader who asked for none. Nothing throws; the build is green; and it looks
 * correct to anyone who has not set the preference — which is nearly everyone
 * reviewing it.
 *
 * **Bring a colour, a size, a position or a font along** and it now arrives
 * after first paint. That is a flash or a reflow on a cold load and nothing at
 * all on a warm one, so it reproduces roughly never in review and always for a
 * stranger on a phone. This is the guardrail the whole deferral rests on: a
 * late `@keyframes` cannot shift layout, and that argument stops being true the
 * moment a non-motion declaration rides along.
 *
 * **Wire the sheet back onto the critical path** — an `@import` in index.css, or
 * a static import from anything the entry chunk reaches — and every byte counts
 * again at full price, with the build green and only the budget number any the
 * wiser. `factionFaceSplit.test.ts` already asserts `main.tsx` cannot statically
 * reach `factionFaces.ts`; the missing half is that this sheet has no SECOND
 * importer sitting somewhere the entry does reach, which is asserted below.
 *
 * WHAT IS DELIBERATELY NOT ASSERTED
 * ---------------------------------
 * That every chunk which draws one of these ornaments can reach the sheet.
 * `factionFaceSplit.test.ts` makes exactly that assertion for the FACES, because
 * a face that never arrives is a change of identity. A stranded ANIMATION is the
 * reduced-motion state, which every ornament in the sheet is already required to
 * render as a legible, fully drawn frame — so a strand here is a state the
 * design already ships, not a defect. Asserting it anyway would forbid the
 * degradation the deferral is built on.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { ruleBodies, stripComments } from '../utils/__tests__/cssVars'
import { readStripped, sourceFiles, toRelative } from '../test/sourceScan'

const read = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`../${name}`, import.meta.url)), 'utf8')

const SHEET = stripComments(read('motion.ornament.css'))
const INDEX = stripComments(read('index.css'))

const GATE = '@media (prefers-reduced-motion: no-preference)'

/**
 * The only properties a RULE in the deferred sheet may set.
 *
 * Everything here is inert without a `@keyframes` to drive it, which is what
 * makes arriving late free: `transform-origin` and `transform-box` move no
 * element on their own, they only choose the frame a rotation happens in.
 * A `@keyframes` body is exempt — a keyframe is motion by definition, and its
 * `opacity` / `top` / `background-position` steps are the animation itself.
 */
const MOTION_PROPERTIES = new Set([
  'animation',
  'animation-delay',
  'animation-direction',
  'animation-duration',
  'animation-fill-mode',
  'animation-iteration-count',
  'animation-name',
  'animation-play-state',
  'animation-timing-function',
  'transform-box',
  'transform-origin',
])

/**
 * The one shape that carries paint and still belongs in the sheet: a rule that
 * exists ONLY inside the gate, so there is no resting form to leave behind.
 *
 * Keyed by selector with the reason, and asserted to still be present, so the
 * list stays honest. It only shrinks — a NEW rule mixing motion with paint gets
 * split, with the paint left in index.css.
 */
const MOTION_SCAFFOLDING: Record<string, string> = {
  '.wow-balloon-sweep::after':
    "the WOW balloon plate's travelling rainbow band. Absolutely positioned, " +
    'pointer-events:none, parked at left:-55% outside its own overflow:hidden ' +
    'track, and declared nowhere but inside the gate — so with the sheet absent ' +
    'there is no band, which is exactly the reduced-motion rendering.',
  '.alb-task-edge::before, .alb-detail-edge::before, .alb-praxis-edge::before, .alb-feed-edge::before, .alb-profile-edge::before, .alb-plate-edge::before':
    "the six Albescent spectrum edges' travelling ramp (#2498, +#2504). Two tiles of " +
    'the ring\'s own `background-image: inherit`, six mount-widths wide inside ' +
    "index.css's `overflow: hidden`, slid by transform because " +
    '`background-position` repaints every frame on the main thread. Declared ' +
    'nowhere but inside the gate: with the sheet absent there is no child, and ' +
    "the still ring is the mount's own background in index.css — the exact " +
    'frame a reduced-motion reader already gets.',
  '.alb-profile-edge::before':
    'the same child, two band-widths instead of three, because the profile ' +
    "band's ring tiles at 200% where the four card edges tile at 300%. A `width` " +
    'and not a tile, which is the whole reason five keyframes could become one.',
  '.alb-stamp .spectrum-rule::before':
    "the Albescent score stamp's travelling band (#2501). Two tiles of " +
    '`--faction-default-rainbow-loop` across a 200%-wide child, slid one tile by ' +
    'transform inside the `overflow: hidden` index.css puts on the band. The loop ' +
    'cut is NAMED rather than inherited, unlike the five edges above: the band ' +
    'rests on `--faction-default-rainbow`, whose last stop is not its first, so ' +
    'tiling that would seam. Declared nowhere but inside the gate — with the sheet ' +
    "absent there is no child and the still band is `.spectrum-rule`'s own " +
    'background, which is the na band exactly.',
  '.alb-stamp .spectrum-dial::before':
    "the same stamp's turning rim (#2501). `background-image: inherit` takes the " +
    "annulus's own conic, so the rim registers exactly over the ring it replaces " +
    'and the sheet arriving late changes no pixel. It is a pseudo-element and not ' +
    'the mount so that the TOTAL inside the ring does not turn with it — the call ' +
    '`.alb-detail-ring` already makes. Declared nowhere but inside the gate: with ' +
    "the sheet absent the annulus is `.spectrum-dial`'s own background.",
}

/** Delete every `prefix { … }` block, brace-matched, and return what is left. */
function withoutBlocks(css: string, opener: RegExp): string {
  let out = ''
  let cursor = 0
  for (const match of [...css.matchAll(opener)]) {
    const open = css.indexOf('{', match.index)
    if (open === -1) continue
    if (match.index < cursor) continue
    let depth = 1
    let index = open + 1
    while (index < css.length && depth > 0) {
      if (css[index] === '{') depth += 1
      else if (css[index] === '}') depth -= 1
      index += 1
    }
    out += css.slice(cursor, match.index)
    cursor = index
  }
  return out + css.slice(cursor)
}

/** `selector { a: 1; b: 2 }` pairs inside one gate body. One level deep only. */
function declarations(body: string): Array<[string, string]> {
  return [...body.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(([, selector, block]) =>
    block
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration): [string, string] => [
        selector.trim().replace(/\s+/g, ' '),
        declaration.slice(0, declaration.indexOf(':')).trim(),
      ]),
  )
}

const GATES = ruleBodies(SHEET, GATE)

describe('the deferred ornament-motion sheet (#2073)', () => {
  it('holds nothing outside a @keyframes or a reduced-motion gate', () => {
    // Both block kinds removed, whatever is left is a rule the deferred sheet
    // applies unconditionally — either motion that escaped its gate, or
    // something that was never motion at all. There is no third possibility.
    const leftover = withoutBlocks(
      withoutBlocks(SHEET, /@keyframes\s+[\w-]+\s*(?=\{)/g),
      /@media \(prefers-reduced-motion: no-preference\)\s*(?=\{)/g,
    )
    expect(
      leftover.trim(),
      `This text is in src/motion.ornament.css outside every @keyframes and
every \`${GATE}\` block, so it applies to everyone the sheet reaches. If it is
motion, wrap it in the gate — a deferred sheet that drops the wrapper ships
motion to people who asked for none. If it is not motion, it does not belong in
a deferred sheet at all: move it back to src/index.css.`,
    ).toBe('')
  })

  it('sets nothing but motion inside those gates', () => {
    // A zero here would pass vacuously; the sheet applies motion to ~20 rules.
    const pairs = GATES.flatMap(declarations)
    expect(pairs.length).toBeGreaterThan(20)

    const offenders = pairs
      .filter(
        ([selector, property]) =>
          !MOTION_PROPERTIES.has(property) && !(selector in MOTION_SCAFFOLDING),
      )
      .map(([selector, property]) => `${selector} { ${property} }`)

    expect(
      [...new Set(offenders)].sort(),
      `Each line is a declaration src/motion.ornament.css would deliver AFTER
first paint. Motion can arrive late for free — nothing reflows, and the element
is already drawn in its final colours at its final size. A colour, a size, a
position, a font or anything a layout depends on cannot: it flashes or it
reflows, on a cold load, for a stranger on a phone, and never in review.
Split the rule and leave that half in src/index.css. The one exception is a rule
declared NOWHERE ELSE, which has no resting form to leave behind — add it to
MOTION_SCAFFOLDING with the reason, the way .wow-balloon-sweep::after is.`,
    ).toEqual([])
  })

  it('keeps MOTION_SCAFFOLDING honest — every entry still exists', () => {
    // Whitespace-insensitive, because the keys come from `declarations()`, which
    // collapses runs of whitespace — so a multi-selector entry's key can never
    // match the sheet's own one-per-line house style literally.
    const flat = SHEET.replace(/\s+/g, ' ')
    for (const [selector, reason] of Object.entries(MOTION_SCAFFOLDING)) {
      expect(flat, reason).toContain(selector)
    }
  })

  it('leaves no ungated twin of a moved animation behind in index.css', () => {
    // The gate is an OPT-IN, so an `animation` on the same selector outside it
    // is not a fallback — it is motion for a reader who asked for none, at the
    // same specificity, decided by file order.
    const animated = new Set(
      GATES.flatMap(declarations)
        .filter(([, property]) => property.startsWith('animation'))
        .map(([selector]) => selector),
    )
    expect(animated.size).toBeGreaterThan(10)

    const twins = [...animated]
      .filter((selector) =>
        ruleBodies(INDEX, selector).some((body) => /\banimation\s*:/.test(body)),
      )
      .sort()

    expect(
      twins,
      `These selectors carry an \`animation\` in src/index.css as well as in the
deferred sheet. index.css keeps only the RESTING form of a moved ornament — the
sweep's parked \`top\`, the shock ring's \`opacity: 0\`, the watermark's
\`transform-origin\`. An animation there is on the critical path AND outside the
reduced-motion gate.`,
    ).toEqual([])
  })

  it('carries every Albescent ornament animation but the spark (#2498)', () => {
    // The sheet's own "WHAT IS STILL IN index.css AND COULD FOLLOW" list named
    // "the Albescent drifts" as a candidate on one test: does every consumer
    // treat the motion as ornament, and is the un-animated frame the one a
    // reduced-motion reader already gets? Each of these nine says so in its own
    // words in index.css — "stilled, the page is a static wash and a static
    // prism ring; nothing carries meaning through motion alone" — and each
    // leaves its resting `transform` behind in index.css, so nothing jumps.
    //
    // `alb-drift`'s KEYFRAME is the one thing that did not travel. #2404 already
    // reaches it from here across the chunk boundary because index.css is the
    // always-loaded entry sheet, and railSpectrumFrame.test.ts asserts that.
    const albescent = (css: string): string[] => [
      ...new Set(
        [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
          .filter(([, , body]) => /\banimation(-name)?\s*:/.test(body))
          .flatMap(([, prelude]) =>
            prelude.split(',').map((one) => one.trim().replace(/\s+/g, ' ')),
          )
          .filter((selector) => selector.startsWith('.alb-')),
      ),
    ]

    const here = albescent(SHEET)
    for (const selector of [
      '.alb-rainbow',
      '.alb-task-aurora::before',
      '.alb-detail-aurora::before',
      '.alb-detail-foil::before',
      '.alb-detail-foil::after',
      '.alb-detail-ring::before',
      '.alb-praxis-aurora::before',
      '.alb-praxis-ring::before',
      '.alb-feed-aurora::before',
    ]) {
      expect(here, `${selector} still animates from somewhere else`).toContain(selector)
    }

    // THE SPARK IS THE ONE THAT MAY NOT FOLLOW, and it is the only one left.
    expect(
      albescent(INDEX),
      `Every Albescent animation index.css still runs. Only .alb-spark may be
here: its gate does not merely add motion, it drops the glyph to opacity 0 and
lets the keyframe carry it back up. A paint declaration may never defer, so the
opacity has to stay — and with the animation deferred and the sheet stranded the
spark would be an invisible mark rather than a still one, which is the exact
degradation this sheet is not allowed to cause.`,
    ).toEqual(['.alb-spark'])
  })

  it('leaves the spark behind for a reason that is still true', () => {
    // Asserted, not asserted-in-a-comment: if the gated rule ever stops setting
    // the paint, the spark becomes a legible still frame and may follow.
    const gated = GATES.flatMap((body) => declarations(body))
    expect(gated.some(([selector]) => selector === '.alb-spark')).toBe(false)

    const spark = ruleBodies(INDEX, '.alb-spark').filter((body) =>
      /\banimation\s*:/.test(body),
    )
    expect(spark, '.alb-spark no longer animates from index.css at all').toHaveLength(1)
    expect(spark[0], 'the spark animates without touching paint — it may follow').toContain(
      'opacity: 0',
    )
  })

  it('is reached only through src/factionFaces.ts, so it stays off the entry HTML', () => {
    // Comments stripped, because index.css and the sheet itself both discuss the
    // filename at length and should go on doing so — only an `import` counts.
    // `readStripped` also drops `//` lines, which is right for a module and
    // wrong for a stylesheet (a `url(https://…)` would lose its tail), so the
    // two file kinds take the two strippers.
    const importers = sourceFiles({ match: /\.(tsx?|css)$/ })
      .filter((path) =>
        (path.endsWith('.css')
          ? stripComments(readFileSync(path, 'utf8'))
          : readStripped(path)
        ).includes('motion.ornament.css'),
      )
      .map(toRelative)
      .sort()

    expect(
      importers,
      `src/factionFaces.ts must be the sheet's only importer. A SECOND importer
gives Vite a second chunk to copy every rule into; an \`@import\` from
src/index.css, or a static import from anything src/main.tsx reaches, folds the
whole sheet back into the render-blocking stylesheet — build green,
bundle-budget.mjs the only witness. Reach it the way factions/lazyArchetype.tsx
does, with \`import('../factionFaces')\`.`,
    ).toEqual(['factionFaces.ts'])
  })
})
