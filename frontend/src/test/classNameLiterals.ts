/**
 * Find class-name template literals and interpolations glued to a class token.
 *
 * Tailwind v4 reads source as text: in `` `… overflow-y-auto${x}` `` the token
 * runs into `${` and is dropped, silently to build/lint/types/tests (#2918).
 *
 * A finding is any non-space run right before `${` in a class-position literal;
 * it does not check the run is a real utility (that would mean owning Tailwind's
 * vocabulary). Exceptions go in the guard's allowlist with a reason.
 *
 * Class position: the value of an LHS naming a class (`className={…}`,
 * `phoneClassName`, `ringClass`, `classes:`), the whole balanced `{…}`, plus one
 * hop: a literal assigned to a local that such a region reads (so a rename can't
 * escape). Beyond that (helper returns, second variable) is out of scope; "any
 * literal" would flag ids, CSS vars and i18n keys that complete a token.
 *
 * Not `stripComments`: that shifts offsets and ignores strings; this keeps length.
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
  /** Comments and string/template text blanked; offsets, newlines, `${…}` code kept. */
  code: string
  /** Every template literal in the file, in the order they open. */
  templates: TemplateLiteral[]
  /** A template literal or block comment ran off the end of the file. */
  unterminated: boolean
}

/**
 * A `/` after one of these opens a regex, else division. Matters: a quote inside
 * a regex mistaken for a string would mask the rest of the file (clean board).
 */
const OPENS_A_REGEX =
  /(?:[([{,;:=!&|?+\-*%~^<>]|\b(?:return|typeof|case|in|of|new|delete|void|instanceof|yield|await|do|else))\s*$/

/** Covers the longest keyword. */
const REGEX_LOOKBEHIND = 24

/**
 * One pass masking non-code and recording template literals. Not a parser: knows
 * strings, comments, regexes and template nesting only.
 */
export function scanSource(source: string): SourceScan {
  // `split('')`, NOT `[...source]`: offsets are UTF-16 code units; spreading by
  // code point would misalign every span after an astral char (e.g. "🔗").
  const code = source.split('')
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
      // Stop at newline too: a JSX-text apostrophe must not mask the file.
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
      // Not a regex: division.
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

/** LHS naming a class (`className=`, `classes:`, `ringClass =`); not `classList`. */
const CLASS_VALUE = /\b[\w$]*[Cc]lass(?:[Nn]ames?|es)?\s*[=:]\s*/g

/**
 * `[start, end)` spans a class name is assigned from: a whole `{…}`, a bare
 * template literal, else an empty span.
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

const IDENTIFIER = /[A-Za-z_$][\w$]*/g

/** `const base =`, `base =`, `base:`. */
const ASSIGNED_TO = /(?:\b(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*[=:]\s*$/

const ASSIGNMENT_LOOKBEHIND = 60

/** Literals inside a class-value region, plus one hop via a local those regions read. */
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
 * Glued interpolations in class-position literals. The stem runs back to a space,
 * the backtick, or the previous interpolation's end (`` `a ${b}${c}` `` has none).
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

export interface GluedFinding extends GluedInterpolation {
  /** Relative to `src`, forward slashes. */
  path: string
  /** `path:stem`, the allowlist key. */
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
