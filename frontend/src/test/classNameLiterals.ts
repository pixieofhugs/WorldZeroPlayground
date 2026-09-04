/**
 * Find the template literals that build class names, and the interpolations
 * written flush against a class token inside them.
 *
 * WHY THIS EXISTS
 * ---------------
 * Tailwind does not evaluate the app. It reads the source as TEXT and keeps the
 * utility candidates it recognises; anything it does not see is never emitted,
 * and the class attribute at runtime names a rule that does not exist. Under v3
 * a regex extractor kept the candidate in
 *
 *     `… justify-end overflow-y-auto${phoneClassName ? ` ${phoneClassName}` : ''}`
 *
 * Under v4 the scanner does not: `overflow-y-auto` runs straight into `${`, the
 * candidate is dropped, and `DuelSealSheet` shipped a full-screen mobile dialog
 * that could not scroll (#2918, fixed in #3021). Nothing about that failure is
 * visible to the build, the linter, the typechecker or the suite — it was found
 * by diffing the emitted class set of two builds by hand. One space is the fix.
 *
 * WHAT COUNTS AS A FINDING, AND WHY IT IS A BRIGHT LINE
 * ----------------------------------------------------
 * A finding is an interpolation with a non-empty run of non-space characters
 * immediately before it, inside a template literal in CLASS POSITION. It does
 * NOT ask whether the run is a real Tailwind utility.
 *
 * That is deliberate. Asking would mean carrying Tailwind's utility vocabulary
 * — a second copy of a list this repo does not own, which rots on the next
 * upgrade and whose staleness looks exactly like a pass. And the narrower rule
 * buys nothing: a class token glued to `${` is at best unreadable and at worst
 * silently dropped, whichever half of it Tailwind would have recognised.
 * `` `p-${size}` `` is dropped by the same scanner for the same reason.
 *
 * So the rule is: in class position, put a space before the interpolation. A
 * site that genuinely cannot is registered in the guard's allowlist with its
 * reason, which is a line a human reads in a diff.
 *
 * CLASS POSITION, EXACTLY
 * -----------------------
 * The value of an assignment whose left-hand side names a class — the JSX
 * attribute `className={…}`, the props `phoneClassName` / `linkClassName` /
 * `ringClass`, an object key `classes:`, a `const skinClassName = …`. Whatever
 * shape the value takes, the whole balanced `{…}` is the region, so a ternary,
 * a nested call and a concatenation are all covered.
 *
 * ...plus one hop. A literal assigned to a local name that a class-value region
 * in the same file then READS is in class position too, whatever the name is —
 * otherwise `const base = …; <div className={base} />` walks out of the scan on
 * a rename, and a guard you can leave by renaming a variable is not a guard.
 * The hop costs nothing: it adds zero findings to today's tree.
 *
 * The boundary this draws, said out loud: a template literal that reaches a
 * class name through something other than one local assignment — returned
 * straight out of a helper, or handed through a second variable — is outside
 * the scan. Widening the rule to "any template literal anywhere" is what makes
 * this check unusable: `` `wz-roundel-${id}` `` (an SVG id),
 * `` `var(--spectrum-glow-${value})` `` (a CSS custom property),
 * `` `switcher-row-${id}` `` (a test id) and `` `na.tier${rung}` `` (an i18n
 * key) are all interpolations that COMPLETE a token rather than follow one, and
 * none of them is a class.
 *
 * WHY THIS FILE DOES NOT REUSE `stripComments`
 * --------------------------------------------
 * `sourceScan.ts`'s stripper deletes comment text, which moves every offset
 * after it, and it does not know about strings — a `//` inside a literal takes
 * the rest of the line with it, closing backtick included. This guard reports
 * line numbers and reads the source either side of an offset, so it needs a
 * pass that keeps length and knows where a string starts. That pass is here.
 */
import { readFileSync } from 'node:fs'

import { sourceFiles, toRelative, type ScanOptions } from './sourceScan'

/** One `${…}` inside a template literal, at that literal's own depth. */
export interface Interpolation {
  /** Offset of the `$` in `${`. */
  start: number
  /** Offset just past the `}` that closes it, or -1 if the file ended first. */
  end: number
}

/** One template literal, found by the scan below. */
export interface TemplateLiteral {
  /** Offset of the opening backtick. */
  start: number
  /** Offset just past the closing backtick, or -1 if the file ended first. */
  end: number
  /** Its own interpolations, in source order. Nested literals own theirs. */
  interpolations: Interpolation[]
}

export interface SourceScan {
  /**
   * The source with comment bodies and string/template TEXT replaced by spaces.
   * Offsets and line breaks are preserved, and delimiters, punctuation and the
   * code inside `${…}` all survive — so a pattern may be run over it without
   * matching prose, and braces may be balanced over it.
   */
  code: string
  /** Every template literal in the file, in the order they open. */
  templates: TemplateLiteral[]
  /** A template literal or block comment ran off the end of the file. */
  unterminated: boolean
}

/**
 * A `/` after one of these begins a regex literal; after anything else it is
 * division. The distinction matters because a regex may contain a quote or a
 * backtick, and a scanner that mistook one for a string would swallow the rest
 * of the file and report a clean board — the failure mode this repo cares about
 * most. Checked against a short window of already-masked source, so a `/` in a
 * comment or a string never reaches here.
 */
const OPENS_A_REGEX =
  /(?:[([{,;:=!&|?+\-*%~^<>]|\b(?:return|typeof|case|in|of|new|delete|void|instanceof|yield|await|do|else))\s*$/

/** How far back `OPENS_A_REGEX` looks. Long enough for the longest keyword. */
const REGEX_LOOKBEHIND = 24

/**
 * Walk `source` once, masking what is not code and recording every template
 * literal. Deliberately not a parser: it knows strings, comments, regex
 * literals and template nesting, which is everything the two questions below
 * need, and nothing about JSX, types or scope.
 */
export function scanSource(source: string): SourceScan {
  const code = [...source]
  const templates: TemplateLiteral[] = []
  type Frame =
    | { kind: 'code'; depth: number; interpolation: Interpolation | null }
    | { kind: 'template'; literal: TemplateLiteral }
  const stack: Frame[] = [{ kind: 'code', depth: 0, interpolation: null }]
  let unterminated = false
  let i = 0

  const blank = (from: number, to: number): void => {
    for (let k = Math.max(0, from); k < Math.min(to, code.length); k += 1) {
      if (code[k] !== '\n') code[k] = ' '
    }
  }

  while (i < source.length) {
    const frame = stack[stack.length - 1]
    const character = source[i]

    if (frame.kind === 'template') {
      if (character === '\\') {
        blank(i, i + 2)
        i += 2
        continue
      }
      if (character === '`') {
        frame.literal.end = i + 1
        stack.pop()
        i += 1
        continue
      }
      if (character === '$' && source[i + 1] === '{') {
        const interpolation: Interpolation = { start: i, end: -1 }
        frame.literal.interpolations.push(interpolation)
        stack.push({ kind: 'code', depth: 1, interpolation })
        i += 2
        continue
      }
      blank(i, i + 1)
      i += 1
      continue
    }

    if (character === '/' && source[i + 1] === '/') {
      const newline = source.indexOf('\n', i)
      const end = newline === -1 ? source.length : newline
      blank(i, end)
      i = end
      continue
    }

    if (character === '/' && source[i + 1] === '*') {
      const close = source.indexOf('*/', i + 2)
      if (close === -1) {
        unterminated = true
        blank(i, source.length)
        i = source.length
        continue
      }
      blank(i, close + 2)
      i = close + 2
      continue
    }

    if (character === '"' || character === "'") {
      // A newline ends the run as well as the closing quote. An apostrophe in
      // JSX text is not a string, and recovering at the line end keeps one from
      // masking the rest of the file.
      let j = i + 1
      for (; j < source.length; j += 1) {
        if (source[j] === '\\') {
          j += 1
          continue
        }
        if (source[j] === character || source[j] === '\n') break
      }
      blank(i + 1, j)
      i = Math.min(j + 1, source.length)
      continue
    }

    if (
      character === '/' &&
      OPENS_A_REGEX.test(code.slice(Math.max(0, i - REGEX_LOOKBEHIND), i).join(''))
    ) {
      let j = i + 1
      let inBracket = false
      for (; j < source.length; j += 1) {
        const inner = source[j]
        if (inner === '\\') {
          j += 1
          continue
        }
        if (inner === '\n') break
        if (inBracket) {
          if (inner === ']') inBracket = false
          continue
        }
        if (inner === '[') inBracket = true
        else if (inner === '/') break
      }
      if (j < source.length && source[j] === '/') {
        blank(i + 1, j)
        i = j + 1
        continue
      }
      // Not a regex after all. Fall through and treat it as division.
    }

    if (character === '`') {
      const literal: TemplateLiteral = { start: i, end: -1, interpolations: [] }
      templates.push(literal)
      stack.push({ kind: 'template', literal })
      i += 1
      continue
    }

    if (character === '{') {
      frame.depth += 1
      i += 1
      continue
    }

    if (character === '}') {
      frame.depth -= 1
      if (frame.depth === 0 && stack.length > 1) {
        if (frame.interpolation !== null) frame.interpolation.end = i + 1
        stack.pop()
      }
      i += 1
      continue
    }

    i += 1
  }

  return { code: code.join(''), templates, unterminated: unterminated || stack.length > 1 }
}

/**
 * An assignment whose left-hand side names a class: `className=`, `class=`,
 * `classes:`, `phoneClassName=`, `ringClass =`. `classList` does not match —
 * the `=` or `:` has to come next.
 */
const CLASS_VALUE = /\b[\w$]*[Cc]lass(?:[Nn]ames?|es)?\s*[=:]\s*/g

/**
 * The spans of source that a class name is assigned from, as `[start, end)`.
 *
 * A `{…}` value is taken whole, so everything the expression reaches for is
 * inside the span. A bare template literal value is taken to its closing
 * backtick. Anything else (a plain string, an identifier) has no literal in it
 * and yields an empty span, which is harmless and keeps the count honest.
 */
export function classValueRegions(scan: SourceScan): Array<[number, number]> {
  const regions: Array<[number, number]> = []
  for (const match of scan.code.matchAll(CLASS_VALUE)) {
    const start = match.index + match[0].length
    if (scan.code[start] === '{') {
      let depth = 0
      let end = start
      for (let i = start; i < scan.code.length; i += 1) {
        if (scan.code[i] === '{') depth += 1
        else if (scan.code[i] === '}') {
          depth -= 1
          if (depth === 0) {
            end = i + 1
            break
          }
        }
      }
      regions.push([start, end])
      continue
    }
    if (scan.code[start] === '`') {
      const literal = scan.templates.find((candidate) => candidate.start === start)
      regions.push([start, literal === undefined || literal.end === -1 ? start : literal.end])
      continue
    }
    regions.push([start, start])
  }
  return regions
}

/** Any JS identifier, for harvesting the names a class-value region reads. */
const IDENTIFIER = /[A-Za-z_$][\w$]*/g

/** `const base =`, `base =`, `base:` — the name a literal is assigned to. */
const ASSIGNED_TO = /(?:\b(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*[=:]\s*$/

/** How far back `ASSIGNED_TO` looks. Long enough for `const <a long name> = `. */
const ASSIGNMENT_LOOKBEHIND = 60

/**
 * Every template literal a class name is built from: the ones inside a
 * class-value region, plus the ones assigned to a name such a region reads.
 *
 * The second half is one hop and no further. Following the value across files,
 * or through a second variable, would need a resolver; following it once is a
 * substring match on the same file, and it is what stops the two `FactionLaneName`
 * shapes — `const className = …` in the players pages — from depending on the
 * variable happening to be called `className`.
 */
export function classPositionTemplates(scan: SourceScan): TemplateLiteral[] {
  const regions = classValueRegions(scan)
  const read = new Set<string>()
  for (const [start, end] of regions) {
    for (const [name] of scan.code.slice(start, end).matchAll(IDENTIFIER)) read.add(name)
  }

  return scan.templates.filter((literal) => {
    if (literal.end === -1) return false
    if (regions.some(([start, end]) => literal.start >= start && literal.end <= end)) return true
    const head = scan.code.slice(Math.max(0, literal.start - ASSIGNMENT_LOOKBEHIND), literal.start)
    const name = ASSIGNED_TO.exec(head)?.[1]
    return name !== undefined && read.has(name)
  })
}

/** An interpolation written flush against a class token. */
export interface GluedInterpolation {
  /** The run of non-space characters immediately before the `${`. */
  stem: string
  /** Offset of the `${`. */
  offset: number
  /** 1-based line the `${` is on. */
  line: number
}

/**
 * Every glued interpolation in a class-position template literal in `source`.
 *
 * The stem runs back from the `${` to the nearest space, to the opening
 * backtick, or to the end of this literal's previous interpolation — so
 * `` `a ${b}${c}` `` has no stem at either interpolation, and the value
 * `` `…overflow-y-auto${…}` `` has the stem `overflow-y-auto`.
 */
export function gluedClassInterpolations(source: string): GluedInterpolation[] {
  const scan = scanSource(source)
  const glued: GluedInterpolation[] = []

  for (const literal of classPositionTemplates(scan)) {
    let floor = literal.start + 1
    for (const interpolation of literal.interpolations) {
      let cursor = interpolation.start
      while (cursor > floor && !/\s/.test(source[cursor - 1])) cursor -= 1
      const stem = source.slice(cursor, interpolation.start)
      if (stem !== '') {
        glued.push({
          stem,
          offset: interpolation.start,
          line: source.slice(0, interpolation.start).split('\n').length,
        })
      }
      floor = interpolation.end === -1 ? literal.end : interpolation.end
    }
  }

  return glued
}

/** A glued interpolation, located. */
export interface GluedFinding extends GluedInterpolation {
  /** The file, as the guards report paths: relative to `src`, forward slashes. */
  path: string
  /** `path:stem` — the key the guard's allowlist is written in. */
  key: string
}

/** Every glued class interpolation under `src`, in path order. */
export function gluedClassInterpolationsInSource(options: ScanOptions = {}): GluedFinding[] {
  return sourceFiles(options)
    .flatMap((file) => {
      const path = toRelative(file)
      return gluedClassInterpolations(readFileSync(file, 'utf8')).map((glued) => ({
        ...glued,
        path,
        key: `${path}:${glued.stem}`,
      }))
    })
    .sort((a, b) => a.key.localeCompare(b.key))
}
