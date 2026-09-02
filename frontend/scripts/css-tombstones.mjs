#!/usr/bin/env node
/**
 * The CSS TOMBSTONE detector (#3001).
 *
 * A *tombstone* is a comment whose subject no longer exists anywhere in the
 * tree except in the comment announcing its removal. The reasoning is one
 * line: if the only occurrence of a name is the comment saying it is gone,
 * that comment is the last thing keeping it alive.
 *
 *   node scripts/css-tombstones.mjs            # the markdown report
 *   node scripts/css-tombstones.mjs --json     # the same findings, machine-readable
 *
 * WHY THIS READS THE CSS RAW
 * --------------------------
 * Every source-scan guard in this repo strips comments before it looks, because
 * it is hunting a draw call and the docblock above it legitimately names the
 * thing being banned. This tool is the exact inverse on one arm and the
 * ordinary way round on the other, and it needs BOTH readings of the same
 * bytes:
 *
 *   - the CANDIDATE arm reads `src/css/*.css` unmodified, because the subject
 *     it is hunting *is* a comment. Strip comments and it finds nothing, and
 *     passes on the day it is written;
 *   - the LIVENESS arm reads the whole frontend with comments stripped,
 *     because a name that survives only in prose is exactly what we are
 *     looking for. Leave the comments in and every candidate proves itself
 *     alive by being mentioned.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It deletes nothing and it decides nothing. It proposes a classification per
 * candidate (below) and a human ratifies it. "We tried X and it was wrong" is
 * the most valuable comment in any codebase and it names, by design, a thing
 * that does not exist — so a name with no declaration is evidence of nothing
 * on its own.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

/** `frontend/`. */
export const FRONTEND_DIR = fileURLToPath(new URL('..', import.meta.url))

/** The eleven-part cascade — the only files whose COMMENTS are read. */
export const CSS_DIR = join(FRONTEND_DIR, 'src', 'css')

/**
 * Where a name may prove itself alive.
 *
 * #3001 says "anywhere in `src/`". This is wider on purpose: `.ds-kit` and
 * `e2e` are shipped consumers of the same tokens, and widening the liveness
 * corpus can only ever REMOVE a candidate. A false negative here costs a
 * comment that stays; a false positive costs a comment that gets deleted.
 */
const LIVE_DIRS = ['src', '.ds-kit', 'e2e']

/** Source that can reference a token or a class. */
const LIVE_MATCH = /\.(tsx?|css|mjs|js|json|html)$/

/* -------------------------------------------------------------------------- */
/* Reading                                                                    */
/* -------------------------------------------------------------------------- */

/** Every file under `dir`, depth-first, that `match` accepts. */
function filesUnder(dir, match) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (entry === 'node_modules') return []
    if (statSync(path).isDirectory()) return filesUnder(path, match)
    return match.test(entry) ? [path] : []
  })
}

/** True for anything under a `__tests__/` directory. */
const isTest = (path) => toRelative(path).split('/').includes('__tests__')

/** The eleven cascade files, in cascade order. */
export const cascadeFiles = () => filesUnder(CSS_DIR, /\.css$/).sort()

/** A path as the report writes it: relative to `frontend/`. */
export const toRelative = (path) => relative(FRONTEND_DIR, path).split('\\').join('/')

/**
 * `/* … *\/` blocks in `raw`, with the 1-based line each one opens on.
 *
 * Deliberately NOT `test/sourceScan.ts`'s `stripComments`, and deliberately
 * not its inverse either — this needs the offsets, so it matches rather than
 * removes.
 */
export function commentBlocks(raw) {
  const blocks = []
  for (const match of raw.matchAll(/\/\*[\s\S]*?\*\//g)) {
    const before = raw.slice(0, match.index)
    const after = raw.slice(match.index + match[0].length)
    blocks.push({
      // The block's own indentation, restored, so a quoted block in the
      // report lines up the way it does in the file.
      text: (before.match(/[ \t]*$/)?.[0] ?? '') + match[0],
      line: before.split('\n').length,
      lines: match[0].split('\n').length,
      attached: attachedTo(after),
    })
  }
  return blocks
}

/**
 * The declaration or selector a block is the header FOR, or null.
 *
 * This is the single most consequential thing the detector reports, and it
 * came out of reading the first run's proposals: three of five looked like
 * standalone tombstones and were in fact the headers of live rules —
 * `--rank-silver`, `.em-broadsheet`, `--faction-wow-gilt-mid`. Each block
 * mentions a dead name in one sentence and documents the live thing below it
 * in the rest, one of them with a measured 3.47:1 and one with an owner QA
 * ruling. Cutting them as blocks would take the live half with the dead half.
 *
 * "Attached" means the very next line, not the next non-blank line: this
 * cascade separates a standalone tombstone from what follows with an empty
 * line, and treating a gap as attachment would swallow the real finds. The
 * error runs the safe way — a header that does leave a blank line is reported
 * as detached, and every detached row is printed in FULL for exactly that
 * reason.
 */
function attachedTo(after) {
  const next = after.split('\n')[1]?.trim() ?? ''
  if (next === '' || next === '}' || next.startsWith('/*')) return null
  return next
}

/** The one block per file that carries `SECTION — …`. Never a candidate. */
const isSectionHeader = (block) => /SECTION\s+—/.test(block.text)

/**
 * Comments out, so that what is left is only what the browser and the bundler
 * see. `//` is left alone in CSS on purpose: it is not a comment there, and
 * eating it would eat `url(https://…)`.
 */
const stripComments = (source, isCss) => {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, ' ')
  return isCss ? withoutBlocks : withoutBlocks.replace(/\/\/[^\n]*/g, ' ')
}

/* -------------------------------------------------------------------------- */
/* The noise floor                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The filters, stated so a reviewer can judge whether they were right. The
 * first pass on #3001 reported 115 tokens and 15 classes; most of them were
 * these four shapes, and a report full of `--color-` rows is a report nobody
 * reads.
 */
export const NOISE_RULES = [
  {
    id: 'family-stem',
    why: 'Ends in `-`: a family prefix written mid-sentence (`--color-`, `--badge-`, `.btn-`), not a name.',
    reject: (name) => name.endsWith('-'),
  },
  {
    id: 'wildcard-stem',
    why: 'A glob stem (`--sky-*`, `.eph-turn-*`): the `*` is dropped by the harvest regex, leaving a prefix.',
    reject: (name, block) =>
      new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[-\\w]*\\*`).test(block),
  },
  {
    id: 'one-char-tail',
    why: 'Last segment is a single letter: a placeholder, not a name. `.alb-x` is the generic stand-in in `AlbescentProfileBody`\'s docblock.',
    reject: (name) => name.split('-').pop().length < 2,
  },
  {
    id: 'single-segment',
    why: 'A `--foo` with no hyphen inside it. The frontend declares no such custom property — not one — so every match is prose shorthand or a metasyntactic stand-in (`var(--other)`, `color-mix(--pk-lt, --card)`).',
    reject: (name) => name.startsWith('--') && !name.slice(2).includes('-'),
  },
  {
    id: 'unhyphenated-class',
    why: 'A `.foo` with no hyphen: a file extension (`index.css`, `Body.tsx`), a sentence break (`e.g`), or prose (`the .plum`). The cascade has exactly ONE hyphen-free class selector, `.redacted`, and it is live — so this can only ever cost a false negative, never a wrong deletion.',
    reject: (name) => name.startsWith('.') && !name.slice(1).includes('-'),
  },
]

/** The first rule that rejects `name`, or null. */
const noiseRule = (name, block) => NOISE_RULES.find((rule) => rule.reject(name, block)) ?? null

/* -------------------------------------------------------------------------- */
/* Liveness                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Every `[\w-]` run in the comment-free, test-free frontend, as a set.
 *
 * Whole tokens, not substrings: `--faction-ua-card` must not be proved alive
 * by `--faction-ua-card-text`. A class is looked up without its leading dot,
 * because `className="eph-vote-star"` is how the majority of references are
 * written.
 *
 * `__tests__/` is excluded, which is `test/sourceScan.ts`'s own default and
 * for its documented reason — a guard asks about SHIPPED code. It is also
 * load-bearing here rather than merely conventional. A RETIREMENT guard holds
 * a dead name as a string literal on purpose (`motionSplit.test.ts` and
 * `albescentPrismSheet.test.ts` both hold `.alb-praxis-aurora`), so counting
 * tests as liveness makes the best-documented tombstones in the cascade
 * invisible — #3001's own worked example among them. Those literals are read
 * below instead, as the KEEP-guard signal they actually are.
 */
export function liveNames() {
  const names = new Set()
  for (const dir of LIVE_DIRS) {
    for (const path of filesUnder(join(FRONTEND_DIR, dir), LIVE_MATCH)) {
      if (isTest(path)) continue
      const text = stripComments(readFileSync(path, 'utf8'), path.endsWith('.css'))
      for (const [word] of text.matchAll(/[\w-]+/g)) names.add(word)
    }
  }
  return names
}

/** How a candidate is written when we ask whether it is alive. */
const bareName = (name) => (name.startsWith('.') ? name.slice(1) : name)

/* -------------------------------------------------------------------------- */
/* Classification                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Words that mark a block as carrying a REASON rather than a record. A block
 * that argues — "we tried it, it was wrong, do not bring it back" — is the
 * kind #3001's landmine 1 says to keep, and the kind whose subject is missing
 * *by design*.
 */
const REASONING = /\b(because|reason|wrong|instead|ruling|do not|don't|never|retired|deliberat|invit|mistake|tried|would|cannot|beware|measured|contrast|ratio)\b/i

/**
 * This detector's OWN test, which is not a retirement guard.
 *
 * It pins `--color-level-inactive`, `.eph-vote-star` and the rest of #3001's
 * verified samples as fixtures — asserting that they are FOUND. Counting that
 * as "a guard already holds this name" is the detector marking its own
 * homework: adding the test silently moved two blocks out of the cut list and
 * into KEEP-guard, with a citation pointing back at itself.
 */
const SELF_TEST = '__tests__/cssTombstones.test.ts'

/**
 * `name` → the test files that hold it as a string literal.
 *
 * `retiredSurfaces.test.ts` exists to keep deleted names out of shipped
 * source, and it is not the only one of its kind — `motionSplit`,
 * `albescentPrismSheet` and `retiredIdentities` all pin names they forbid. So
 * this reads EVERY test rather than a hardcoded pair: a fifth guard should
 * register itself by existing, not by being added to a list here.
 *
 * A quoted literal only — comments are stripped first, so a test's own
 * explanatory header cannot nominate a name it merely discusses.
 */
function guardedNames() {
  const names = new Map()
  for (const [path, source] of testSources()) {
    for (const [, word] of source.matchAll(/['"`]\.?(--?[\w-]+|[a-z][\w-]*-[\w-]+)['"`]/g)) {
      names.set(word, [...new Set([...(names.get(word) ?? []), path])])
    }
  }
  return names
}

/**
 * `[relative path, comment-free source]` for every test that could be a guard.
 *
 * Read once and shared by both guard arms, so the corpus they judge against —
 * `__tests__` only, this detector's own test excluded, comments stripped —
 * cannot drift between "a guard holds the name" and "a guard holds the
 * colour".
 */
function testSources() {
  const sources = []
  for (const path of filesUnder(join(FRONTEND_DIR, 'src'), /\.tsx?$/)) {
    const relative = toRelative(path)
    if (!isTest(path) || relative.endsWith(SELF_TEST)) continue
    sources.push([relative, stripComments(readFileSync(path, 'utf8'), false)])
  }
  return sources
}

/**
 * A raw colour value, in the two notations this cascade's prose quotes.
 *
 * Colours ONLY, deliberately, and this is the boundary to argue with. A block
 * can point at a guard through any pinned value — a measured `4.83:1` would
 * qualify on the same reasoning — but a ratio appears in these comments
 * unquoted and by the dozen, and `factionContrast.test.ts` holds hundreds of
 * them, so widening to ratios would sweep most of the cascade into KEEP-guard
 * and say nothing. A colour is the narrow case that earns its keep: this repo
 * has a guard whose entire subject is raw colour literals
 * (`rawColourRule.test.ts`), and #3001's own landmine names exactly that
 * relationship.
 */
const COLOUR_LITERAL = /^(#[0-9a-f]{3,8}|(?:rgba?|hsla?|oklch|color-mix)\([^)]*\))$/i

/** The same, unanchored, for harvesting out of a test file's code. */
const COLOUR_IN_CODE = /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?|oklch|color-mix)\([^)]*\)/gi

/** `rgba(10, 26, 14)` and `rgba(10,26,14)` are the same pin. */
const normaliseColour = (literal) => literal.replace(/\s+/g, '').toLowerCase()

/**
 * What a comment block QUOTES — in backticks, or single or double quotes.
 *
 * The quoting requirement is the whole narrowing, and it does real work: the
 * `--faction-snide-pink-deep` block writes "held #be185d" bare, as a fact
 * about a value, while the punch-hole block writes "an inline
 * `rgba(10,26,14)`" — citing the literal AS a literal. Only the second is a
 * pointer at the thing a guard holds.
 */
const quotedSpans = (text) =>
  [...text.matchAll(/[`'"]([^`'"\n]+)[`'"]/g)].map((match) => match[1].trim())

/**
 * A normalised colour literal → the test files whose CODE pins it.
 *
 * Read from the same comment-stripped test sources as `guardedNames`, for the
 * same reason: `rawColourRule.test.ts` writes `rgba(10,26,14)` in its own
 * docblock at line 67 AND in two assertions at 84–85, and only the assertions
 * are a guard.
 */
function guardedColours() {
  const colours = new Map()
  for (const [path, source] of testSources()) {
    for (const [literal] of source.matchAll(COLOUR_IN_CODE)) {
      const key = normaliseColour(literal)
      colours.set(key, [...new Set([...(colours.get(key) ?? []), path])])
    }
  }
  return colours
}

/**
 * The classes, proposed and never applied.
 *
 * #3001 asks for three. There are four, and the fourth is not a refinement of
 * the taxonomy — it is a finding. `KEEP-header` exists because three of the
 * first run's five CUT proposals turned out to be the headers of live rules
 * (see `attachedTo`). "Records only a plain removal" is a true statement about
 * a SENTENCE and a false one about the block that sentence sits in, and the
 * verdict has to be able to say so or the report invites the wrong edit.
 *
 * Precedence is by how the block resists deletion, strongest first: a guard
 * pins something the block cites, a live rule sits under it, or it argues its
 * own case.
 */
function classify(block, names, guarded, colours) {
  const pointers = [
    ...names.flatMap((name) => (guarded.get(bareName(name)) ?? []).map((file) => [file, name])),
    ...quotedSpans(block.text)
      .filter((span) => COLOUR_LITERAL.test(span))
      .flatMap((span) => (colours.get(normaliseColour(span)) ?? []).map((file) => [file, span])),
  ]
  if (pointers.length > 0) {
    return {
      verdict: 'KEEP-guard',
      why: 'A guard already pins something this block cites — its dead name, or a colour its prose quotes. The block is that guard\'s readable half, and should point at it rather than be deleted.',
      guards: [...new Set(pointers.map(([file]) => file))],
      guardedVia: [...new Set(pointers.map(([, via]) => via))],
    }
  }
  if (block.attached !== null) {
    return {
      verdict: 'KEEP-header',
      why: 'The block is the header of a LIVE declaration below it. At most a sentence comes out — never the block.',
    }
  }
  if (REASONING.test(block.text)) {
    return {
      verdict: 'KEEP-reason',
      why: 'The block argues, not just records — it says why the thing is gone or must stay gone.',
    }
  }
  return {
    verdict: 'CUT-candidate',
    why: 'Standalone, and records a rename or a plain removal with no reasoning attached. Printed in full: this is the list to read.',
  }
}

/* -------------------------------------------------------------------------- */
/* The detector                                                               */
/* -------------------------------------------------------------------------- */

/**
 * One entry per comment block that names at least one dead name.
 *
 * Grouped by BLOCK, not by name, because the unit of deletion is a block: a
 * block naming five dead tokens is one judgement, and reporting it five times
 * makes the report longer than the thing it is describing.
 */
export function tombstones() {
  const live = liveNames()
  const guarded = guardedNames()
  const colours = guardedColours()
  const findings = []
  const filtered = []

  for (const path of cascadeFiles()) {
    // RAW. See the header: strip and there is nothing left to find.
    const raw = readFileSync(path, 'utf8')
    for (const block of commentBlocks(raw)) {
      if (isSectionHeader(block)) continue
      const seen = new Set()
      const dead = []
      for (const [name] of [
        ...block.text.matchAll(/--[\w-]+/g),
        ...block.text.matchAll(/\.[a-z][\w-]+/g),
      ]) {
        if (seen.has(name)) continue
        seen.add(name)
        if (live.has(bareName(name))) continue
        const rule = noiseRule(name, block.text)
        if (rule) filtered.push({ name, rule: rule.id, file: toRelative(path), line: block.line })
        else dead.push(name)
      }
      if (dead.length === 0) continue
      findings.push({
        file: toRelative(path),
        line: block.line,
        blockLines: block.lines,
        names: dead.sort(),
        attached: block.attached,
        ...classify(block, dead, guarded, colours),
        excerpt: excerpt(block.text),
        text: block.text,
      })
    }
  }
  return { findings, filtered }
}

/** The block's first two prose lines, flattened, so the report reads at a glance. */
function excerpt(text) {
  const flat = text
    .replace(/^\s*\/\*+/, '')
    .replace(/\*+\/$/, '')
    .replace(/[\s─═|]+/g, ' ')
    .trim()
  return flat.length > 220 ? `${flat.slice(0, 219)}…` : flat
}

/* -------------------------------------------------------------------------- */
/* Output                                                                     */
/* -------------------------------------------------------------------------- */

const VERDICT_ORDER = ['CUT-candidate', 'KEEP-header', 'KEEP-reason', 'KEEP-guard']

function markdown({ findings, filtered }) {
  const out = []
  out.push('<!-- Generated by `node frontend/scripts/css-tombstones.mjs`. Do not hand-edit the tables. -->')
  out.push('')
  out.push('# CSS tombstone report (#3001)')
  out.push('')
  out.push(
    'Generated in full by `node frontend/scripts/css-tombstones.mjs`. To refresh it:',
    '`node frontend/scripts/css-tombstones.mjs > docs/research/css-tombstones.md`. Nothing here is',
    'hand-written, so a re-run after the cascade changes costs one command and loses no annotation',
    'that is not in this file\'s git history.',
    '',
    'A **tombstone** is a comment whose subject no longer exists anywhere in the tree except in the',
    'comment announcing its removal. **Nothing has been deleted**; the classification below is',
    '*proposed*, and the deletion pass is gated on a human ratifying it.',
    '',
  )

  const cut = findings.filter((f) => f.verdict === 'CUT-candidate')
  const cutLines = cut.reduce((n, f) => n + f.blockLines, 0)
  out.push('## The answer, first', '')
  out.push(
    `The mechanical half is worth **${cutLines} lines**.`,
    '',
    `${findings.length} comment blocks in the cascade name at least one name that exists nowhere else`,
    `in the tree. **${cut.length} of them can be cut**, for ${cutLines} lines. Every one of the other`,
    `${findings.length - cut.length} resists deletion for a stated reason: a guard already pins something the block`,
    'cites, a live declaration sits underneath it, or it argues its own case.',
    '',
    '#3001 asked what the mechanical half is worth before committing to the judgement pass — "if',
    `tombstones remove 800 lines, the judgement pass may not be worth its risk". They remove ${cutLines}.`,
    '',
    'The reason the number is small is the most useful thing in this report, and it came out of',
    'reading proposals one at a time rather than trusting the sweep. Two rounds of that shrank the',
    'cut list from five blocks to one:',
    '',
    '- most "plain removal record" blocks are the HEADER of a live rule — `--rank-silver`,',
    '  `.em-broadsheet`, `--faction-wow-gilt-mid` — carrying a measured ratio or an owner QA ruling in',
    '  the same block as the dead name. "Records only a removal" is true of a SENTENCE and false of',
    '  the block it sits in;',
    '- and a block can point at a guard by something OTHER than its dead name. The largest remaining',
    '  proposal cited `rgba(10,26,14)` in prose, which `rawColourRule.test.ts` pins as its worked',
    '  example under the same issue the block cites (#1912). Nothing keyed on the dead name could see',
    '  that, because the dead name really does appear nowhere else.',
    '',
    'A sweep that cut by block would have taken live documentation with it in both cases, and would',
    'have looked entirely correct while doing so.',
    '',
  )

  out.push('## The count', '')
  out.push('| verdict | blocks | comment lines |', '|---|---|---|')
  for (const verdict of VERDICT_ORDER) {
    const rows = findings.filter((f) => f.verdict === verdict)
    out.push(`| ${verdict} | ${rows.length} | ${rows.reduce((n, f) => n + f.blockLines, 0)} |`)
  }
  out.push(`| **total** | **${findings.length}** | **${findings.reduce((n, f) => n + f.blockLines, 0)}** |`)
  out.push('')

  out.push('## Per file', '')
  out.push('| file | blocks | comment lines | of which CUT-candidate (lines) |', '|---|---|---|---|')
  for (const file of [...new Set(findings.map((f) => f.file))]) {
    const rows = findings.filter((f) => f.file === file)
    const cut = rows.filter((f) => f.verdict === 'CUT-candidate')
    out.push(
      `| \`${file}\` | ${rows.length} | ${rows.reduce((n, f) => n + f.blockLines, 0)} | ${cut.length} (${cut.reduce((n, f) => n + f.blockLines, 0)}) |`,
    )
  }
  out.push('')

  out.push('## The noise floor', '')
  out.push('Names the harvest matched and these rules rejected, before liveness was even consulted:', '')
  out.push('| rule | rejected | why |', '|---|---|---|')
  for (const rule of NOISE_RULES) {
    const hits = filtered.filter((f) => f.rule === rule.id)
    const sample = [...new Set(hits.map((f) => f.name))].slice(0, 6)
    out.push(`| \`${rule.id}\` | ${hits.length} | ${rule.why}${sample.length ? ` e.g. ${sample.map((n) => `\`${n}\``).join(', ')}` : ''} |`)
  }
  out.push('')
  out.push('The eleven `SECTION — …` headers are excluded outright and can never be proposed.')
  out.push('')

  out.push('## What counted as alive', '')
  out.push(
    `A name survives if it appears in **comment-free** source under \`${LIVE_DIRS.join('`, `')}\`, matching`,
    `\`${LIVE_MATCH.source}\`. Two choices are worth ratifying:`,
    '',
    '- **`__tests__/` does not count as liveness.** That is `test/sourceScan.ts`\'s own default, and',
    '  here it is load-bearing: a retirement guard holds a dead name as a string literal on purpose,',
    '  so counting tests would hide the best-documented tombstones in the cascade — `#3001`\'s own',
    '  `.alb-praxis-aurora` example among them. Those literals are read as the KEEP-guard signal',
    '  instead, and each KEEP-guard row below names the file that holds it.',
    '- **`.ds-kit` and `e2e` DO count**, though #3001 said "`src/`". They are consumers of the same',
    '  tokens, and widening the liveness corpus can only remove a candidate, never add one.',
    '',
    'Not modelled: a token assembled at runtime (`--faction-${slug}-card-text`). Nothing in the list',
    'below is of that shape, but a future candidate might be — check before cutting a `--faction-*`.',
    '',
  )

  out.push('## What counts as pointing at a guard', '')
  out.push(
    'A KEEP-guard row means a test already pins something the block cites, so the block is that',
    'guard\'s readable half. Each row below names the guard file and what routed to it. There are two',
    'routes, and the second is the narrower and more arguable:',
    '',
    '- **the dead name itself**, held as a string literal in a test;',
    '- **a colour literal the prose QUOTES** — in backticks or quotes — that a test pins in code.',
    '  `--faction-singularity-punch-hole` exists nowhere else in the tree, so nothing keyed on the',
    '  name can see that its block is `rawColourRule.test.ts`\'s worked example; the link is carried by',
    '  the backticked `rgba(10,26,14)`, under the same issue (#1912) both cite. Whitespace is',
    '  normalised, so `rgba(10, 26, 14)` and `rgba(10,26,14)` are one pin.',
    '',
    '**Colours only, and quoted only — that is the boundary to argue with.** A block can in principle',
    'point at a guard through any pinned value, and a measured `4.83:1` would qualify on the same',
    'reasoning. Ratios are excluded because this cascade writes them unquoted and by the dozen while',
    '`factionContrast.test.ts` holds hundreds, so admitting them would sweep most of the cascade into',
    'KEEP-guard and say nothing. The quoting requirement does the rest of the narrowing: one block',
    'writes "held #be185d" as a fact about a value, another writes "an inline `rgba(10,26,14)`" as a',
    'citation, and only the second is a pointer. As it stands the colour route moves exactly ONE',
    'block — widen either half and check that number before trusting the result.',
    '',
  )

  for (const verdict of VERDICT_ORDER) {
    const rows = findings.filter((f) => f.verdict === verdict)
    out.push(`## ${verdict} — ${rows.length} block${rows.length === 1 ? '' : 's'}`, '')
    if (rows.length > 0) out.push(`> ${rows[0].why}`, '')
    for (const row of rows) {
      out.push(
        `- **\`${row.file}:${row.line}\`** (${row.blockLines} lines) — ${row.names.map((n) => `\`${n}\``).join(', ')}`,
      )
      if (row.attached !== null) out.push(`  <br>heads the live \`${row.attached}\``)
      if (row.guards !== undefined) {
        out.push(
          `  <br>guarded by ${row.guards.map((g) => `\`${g}\``).join(', ')}` +
            ` — via ${row.guardedVia.map((v) => `\`${v}\``).join(', ')}`,
        )
      }
      if (verdict === 'CUT-candidate') {
        out.push('', '  ```css', ...row.text.split('\n').map((line) => `  ${line}`), '  ```', '')
      } else {
        out.push(`  > ${row.excerpt}`)
      }
    }
    out.push('')
  }
  return out.join('\n')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = tombstones()
  process.stdout.write(
    process.argv.includes('--json')
      ? `${JSON.stringify(result, null, 2)}\n`
      : `${markdown(result)}\n`,
  )
}
