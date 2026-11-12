/**
 * Ornament motion is off the critical path, and only motion went (#2073).
 *
 * `src/motion.ornament.css` is reached only via `src/factionFaces.ts` across a
 * chunk boundary, so `index.html` never links it (same mechanism as #2079's faces).
 *
 * Guarded, all invisible in a green build: losing the reduced-motion `@media`
 * wrapper; non-motion paint riding along (flash/reflow on a cold load); and a
 * second importer pulling the sheet back onto the critical path.
 * Not asserted: that every ornament's chunk reaches the sheet — a stranded
 * animation is just the reduced-motion frame, which the design already ships.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { ruleBodies, stripComments } from '../utils/__tests__/cssVars'
import { readStripped, sourceFiles, toRelative } from '../test/sourceScan'
import { readIndexCss } from '../test/indexCss'

const read = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`../${name}`, import.meta.url)), 'utf8')

const SHEET = stripComments(read('motion.ornament.css'))
const INDEX = stripComments(readIndexCss())

const GATE = '@media (prefers-reduced-motion: no-preference)'

/**
 * The only properties a rule in the deferred sheet may set: all inert without
 * a `@keyframes`, so arriving late is free. `@keyframes` bodies are exempt.
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
 * Paint allowed only on rules that exist solely inside the gate (no resting
 * form). Only shrinks — a new motion+paint rule gets split instead.
 */
const MOTION_SCAFFOLDING: Record<string, string> = {
  '.wow-balloon-sweep::after':
    "the WOW balloon plate's travelling rainbow band. Absolutely positioned, " +
    'pointer-events:none, parked at left:-55% outside its own overflow:hidden ' +
    'track, and declared nowhere but inside the gate — so with the sheet absent ' +
    'there is no band, which is exactly the reduced-motion rendering.',
  '.alb-task-edge::before, .alb-praxis-card-edge::before, .alb-detail-edge::before, .alb-praxis-edge::before, .alb-feed-edge::before, .alb-desk-edge::before, .alb-plate-edge::before, .alb-comment-edge::before, .alb-profile-edge::before':
    "the Albescent spectrum edges' travelling ramp (#2498; the faction page's " +
    'plates joined at #2504, the phone home at #2505, the praxis ' +
    "CARD's own 3px ring at #2499 when it stopped borrowing the rail's 1px one). Two " +
    "tiles of the mount's own `background-image: inherit`, six mount-widths wide inside " +
    "index.css's `overflow: hidden`, slid by transform because " +
    '`background-position` repaints every frame on the main thread. Declared ' +
    'nowhere but inside the gate: with the sheet absent there is no child, and ' +
    "the still ramp is the mount's own background in index.css — the exact " +
    'frame a reduced-motion reader already gets. EIGHT since #2553 took the ' +
    "composer's ring off — that sheet already wore na's OWN 3px spectrum " +
    'border (#2520), so the ring was a second frame just inside the first. ' +
    "NINE since #2732 hung the comment leaf's ring on it (ADR-0088 §3): that " +
    'leaf had been the standing exception to #2404, and stilling it again is ' +
    'the one-line retreat noted at the mount. All are masked rings ' +
    'since #2519: the odd one out used to be `.alb-desk .spectrum-rule`, a ' +
    "filled hairline travelling in place of an edge the field desk's identity " +
    'card did not have, and the design canvas takes that bar off and gives the ' +
    'card a ring — one carrier per object.',
  '.alb-profile-edge::before':
    'the same child, two band-widths instead of three, because the profile ' +
    "band's ring tiles at 200% where the four card edges tile at 300%. A `width` " +
    'and not a tile, which is the whole reason five keyframes could become one.',
  '.alb-moves .spectrum-rule:empty::before':
    "every ornament spectrum on a dispatched Albescent surface (#2501, widened " +
    'by #2500). Two tiles of ' +
    '`--faction-default-rainbow-loop` across a 200%-wide child, slid one tile by ' +
    'transform inside the `overflow: hidden` index.css puts on the band. The loop ' +
    'cut is NAMED rather than inherited, unlike the five edges above: the band ' +
    'rests on `--faction-default-rainbow`, whose last stop is not its first, so ' +
    'tiling that would seam. Declared nowhere but inside the gate — with the sheet ' +
    "absent there is no child and the still band is `.spectrum-rule`'s own " +
    'background, which is the na band exactly.',
  '.alb-moves .spectrum-dial::before':
    'every points ring, medallion and annulus on one (#2501, widened by ' +
    '#2500). `background-image: inherit` takes the ' +
    "annulus's own conic, so the rim registers exactly over the ring it replaces " +
    'and the sheet arriving late changes no pixel. It is a pseudo-element and not ' +
    'the mount so that the TOTAL inside the ring does not turn with it — the call ' +
    '`.alb-detail-ring` already makes. Declared nowhere but inside the gate: with ' +
    "the sheet absent the annulus is `.spectrum-dial`'s own background.",
}

/** Delete every `prefix { … }` block, brace-matched. */
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
    // Whitespace-collapsed, like the keys `declarations()` produces.
    const flat = SHEET.replace(/\s+/g, ' ')
    for (const [selector, reason] of Object.entries(MOTION_SCAFFOLDING)) {
      expect(flat, reason).toContain(selector)
    }
  })

  it('leaves no ungated twin of a moved animation behind in index.css', () => {
    // The gate is opt-in: an ungated twin is motion for readers who asked for none.
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

  it('carries EVERY Albescent ornament animation, with no exception left (#2555)', () => {
    // Each leaves its resting `transform` in index.css, so nothing jumps. The
    // `alb-drift` keyframe stays in index.css: the rail still uses it.
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
      '.alb-detail-foil::before',
      '.alb-detail-ring::before',
      '.alb-praxis-ring::before',
    ]) {
      expect(here, `${selector} still animates from somewhere else`).toContain(selector)
    }

    // Retired by #2499 (now `.alb-prism` paint): gone from both sheets.
    for (const retired of [
      '.alb-rainbow',
      '.alb-task-aurora',
      '.alb-detail-aurora',
      '.alb-detail-foil::after',
      '.alb-praxis-aurora',
      '.alb-feed-aurora',
    ]) {
      expect(
        `${SHEET}\n${INDEX}`,
        `${retired} is back. #2499 made the Albescent ground a LAYER of the na
card's own background (\`.alb-prism\`); an overlay span beside it is the divergence
the owner reported — two cards drawing the same light two different ways.`,
      ).not.toContain(`${retired} {`)
    }

    // No exceptions (#2555). An ornament that must animate from the entry sheet
    // has to justify itself here.
    expect(
      albescent(INDEX),
      `An Albescent animation is running from src/index.css. Every one of them
belongs in the deferred sheet: motion may arrive after first paint for free, and
the still frame is what a reduced-motion reader gets either way. The one historical
exception (.alb-spark) was retired with the twinkle at #2555, so there is no
precedent to lean on — if this rule really cannot defer, it is because its gate
also carries PAINT, and the fix is to split it and leave the paint here.`,
    ).toEqual([])
  })

  it('has no spark left to leave behind (#2555)', () => {
    // Resurrection guard: rule, keyframe, or any `animation:` naming it.
    const both = `${SHEET}\n${INDEX}`
    const why = `The Albescent twinkle is back. #2555 is an owner ruling that it is
not part of the kit — three ✦ glyphs at hardcoded offsets over the praxis card —
and the ruling was "it comes out", not "make it subtler". The card's delta over the
unaffiliated one is the prism ground and the travelling edge (ADR-0083).`

    expect(both, why).not.toContain('.alb-spark {')
    expect(both, why).not.toContain('@keyframes alb-spark')
    expect(both, why).not.toMatch(/animation(-name)?\s*:[^;}]*\balb-spark\b/)

    const gated = GATES.flatMap((body) => declarations(body))
    expect(gated.some(([selector]) => selector.includes('.alb-spark'))).toBe(false)
  })

  it('is reached only through src/factionFaces.ts, so it stays off the entry HTML', () => {
    // Comments stripped; CSS uses its own stripper (`//` would eat `url(https://…)`).
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

/**
 * Every `animation` names a keyframe that exists (#2504). A dangling name is
 * silently dropped and looks like the reduced-motion frame. Both sheets
 * together: keyframe names are document-global.
 */
describe('no animation names a keyframe that was renamed out from under it', () => {
  const BOTH = `${INDEX}\n${SHEET}`
  const declared = new Set(
    [...BOTH.matchAll(/@keyframes\s+([\w-]+)/g)].map(([, name]) => name),
  )

  /** The name in an `animation` shorthand: the one word that is not a value. */
  const KEYWORDS =
    /^(none|infinite|normal|reverse|alternate|alternate-reverse|forwards|backwards|both|running|paused|linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end|initial|inherit|unset)$/

  const referenced = new Set<string>()
  for (const [, value] of BOTH.matchAll(/(?:^|[;{]|\s)animation\s*:\s*([^;}]+)/g)) {
    for (const word of value.trim().split(/\s+/)) {
      if (
        /^[a-zA-Z][\w-]*$/.test(word) &&
        !KEYWORDS.test(word) &&
        !word.startsWith('var(')
      ) {
        referenced.add(word)
      }
    }
  }

  it('found animations to check at all', () => {
    expect(referenced.size).toBeGreaterThan(5)
    expect(declared.size).toBeGreaterThan(5)
  })

  it('declares every keyframe any rule animates', () => {
    expect([...referenced].filter((name) => !declared.has(name))).toEqual([])
  })
})
