/**
 * Nothing dispatched to Albescent holds a still spectrum (#2500). A still one
 * renders and passes everything, so the guard is a census: `alb-moves` marks a
 * surface whose na spectra travel.
 *
 * `:empty` in the selector splits ORNAMENT (childless hairline/band/fill:
 * travels) from FRAME (ramp around content: stays still, else two speeds on
 * one object, #2519). The per-mount census pins which is which (#2543).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'

import '../i18n'
import { stripComments, ruleBodies } from '../utils/__tests__/cssVars'
import AlbescentSeal from '../components/metataskSeal/skins/AlbescentSeal'
import FactionSelectCard from '../components/selectCard/FactionSelectCard'
import type { TaskOut } from '../api/tasks'
import { sourceFiles, toRelative } from '../test/sourceScan'
import { readIndexCss } from '../test/indexCss'

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

const INDEX = stripComments(readIndexCss())
const MOTION = stripComments(read('../motion.ornament.css'))

/** `ALBESCENT_MANIFEST` rows whose na component declares a classed spectrum. */
const WEARS_THE_MARKER: Record<string, string> = {
  '../components/taskCard/AlbescentTaskCard.tsx': 'task card',
  '../components/praxisCard/desktop/AlbescentPraxisCard.tsx': 'praxis card',
  '../components/praxisCard/scoreStamp/AlbescentScoreStamp.tsx': 'score stamp',
  '../pages/taskDetail/archetypes/AlbescentTaskDetail.tsx': 'task detail',
  '../pages/praxisDetail/archetypes/AlbescentPraxisDetail.tsx': 'praxis detail',
  '../pages/characterProfile/archetypes/AlbescentProfileBody.tsx': 'profile',
  '../pages/factionDetail/archetypes/AlbescentFactionBody.tsx': 'faction body',
  '../components/metataskSeal/skins/AlbescentSeal.tsx': 'metatask seal',
  // The shared `CredentialCard.tsx` portrait ring (#2992).
  '../pages/characterPaths/archetypes/AlbescentCreateCharacter.tsx': 'character creation',
  '../pages/characterPaths/archetypes/AlbescentEditCharacter.tsx': 'character editing',
  // `DefaultSelectCard`'s hairline (#2632).
  '../components/selectCard/AlbescentSelectCard.tsx': 'select card',
}

/** Rows whose na component declares neither class; a `Default*` growing one turns this red. */
const NO_CLASSED_SPECTRUM: Record<string, string> = {
  '../components/feed/FactionFeedFrame.tsx': 'feed frame',
  '../pages/editPraxis/archetypes/DefaultEditPraxis.tsx': 'composer',
  '../components/factionHero/DefaultFactionHero.tsx': 'faction hero',
  '../components/avatar/FactionAvatar.tsx': 'avatar',
  '../components/vote/AlbescentVote.tsx': 'vote',
  // Pass-throughs (#2531). The comment sheet does draw a hairline, but its ramp
  // is per-slug `factionFill`, which a class can't express.
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

  /** The desk's bar is removed, not moved: the identity card's border carries (#2519). */
  it('the field desk drops its bar rather than moving it', () => {
    // A list prelude, which `ruleBodies` (whole-prelude matching) can't reach.
    const at = INDEX.indexOf('.alb-desk .spectrum-rule')
    expect(at).toBeGreaterThan(-1)
    expect(INDEX.slice(at, INDEX.indexOf('}', at))).toContain('display: none')
  })
})

/**
 * Per-mount census (#2543): every `.spectrum-rule`, in source order per file.
 * ORNAMENT must stay childless (travels); FRAME must keep its children.
 * Dials have no `:empty`, so they're censused separately below (#3024).
 * Read from source, not a render: some mounts sit behind props/form factors.
 */
type Mount = readonly ['ornament' | 'frame', string]

const SPECTRUM_MOUNTS: Record<string, readonly Mount[]> = {
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
    // Mounted via `SelectCardOrnament` (#3130); emptiness asserted on markup below.
    ['ornament', "the tile's one hairline, between pitch and footer"],
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
  // Duel reader (ADR-0092): Albescent passes through, so nothing travels yet.
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
    ['frame', 'the action panel, around the worth cell and the CTA'],
    ['ornament', 'the eyebrow faction chip'],
    ['ornament', "the gallery head's hairline"],
  ],
}

const SRC = fileURLToPath(new URL('../', import.meta.url))

/** `.spectrum-rule` mounts in source order; childless = self-closing or immediately closed (`:empty`). */
function ruleMounts(source: string): { line: number; childless: boolean }[] {
  const mounts: { line: number; childless: boolean }[] = []
  for (const attr of source.matchAll(/className=(["'])([^"']*)\1/g)) {
    if (!attr[2].split(/\s+/).includes('spectrum-rule')) continue
    const at = attr.index ?? 0
    // Walk to the tag's `>`, skipping braces, strings and comments (a quote in
    // a `//` note would otherwise swallow the `/>`).
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

/** So a new file can't grow a spectrum without a table row. */
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

  /** The select tile mounts through a component, so its emptiness is read off markup. */
  it.each(['na', 'albescent'])("the %s select tile's hairline renders EMPTY, so `:empty` still reaches it", (slug) => {
    const html = renderToStaticMarkup(<FactionSelectCard faction={slug} state="member" members={12} />)
    const rules = html.match(/<div[^>]*class="[^"]*\bspectrum-rule\b[^"]*"[^>]*>/g) ?? []
    expect(rules, 'one hairline on the tile').toHaveLength(1)
    expect(rules[0]).toContain('data-select-slot="ornament"')
    expect(html, 'the ornament has gained a child and stopped travelling').toContain(`${rules[0]}</div>`)
  })
})

/**
 * Dial census over all of `src/` (#3024), so shared components like
 * `CredentialCard` are seen. A dial has no `:empty` guard, so the line is drawn
 * at the mount: ORNAMENT wears the class; FRAME (inside an object that already
 * travels, #2519) must not, and `CredentialCard`'s `stillRing` says so.
 * Mirror: `albescentProfileRingStill.test.tsx`.
 */
const DIAL_MOUNTS: Record<string, readonly Mount[]> = {
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
  '../pages/characterProfile/archetypes/profileSkin.tsx': [
    ['frame', "the credential ring — `.alb-profile-edge` already travels on the band around it"],
  ],
  '../pages/praxisDetail/archetypes/DefaultPraxisDetail.tsx': [
    ['ornament', "the member's avatar dial"],
  ],
}

/** Source minus comments: the kit names these classes in prose more than it mounts them. */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n')
}

/** In any string literal, not only `className`. */
const dialMounts = (source: string) =>
  [...code(source).matchAll(/(["'])[^"']*\bspectrum-dial\b[^"']*\1/g)].length

const stilledRings = (source: string) =>
  [...code(source).matchAll(/<CredentialCard\b[^>]*\bstillRing\b/g)].length

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

  /** Replaces #2501's per-surface selectors; two rules would fork the duration. */
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

  /** Never animate a gradient parameter: it re-rasterises every frame. */
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
    // Router: the band is a `<Link>` (#2648).
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AlbescentSeal metatask={METATASK} />
      </MemoryRouter>,
    )
    expect(html).toContain('alb-moves')
    expect(html).toContain('spectrum-rule')
    // No inline ramp: CSS couldn't reach it.
    expect(html).not.toContain('--faction-default-rainbow)')
  })
})
