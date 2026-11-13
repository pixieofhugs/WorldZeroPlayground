#!/usr/bin/env node
/**
 * v3 vs v4 computed-style audit (#2918): what `npm run parity` cannot see.
 * Parity proves a class still has a rule; this proves the rule computes the same.
 *
 *   npm run audit:tailwind -- [--ref origin/main] [--work DIR] [--captured DIR] [--no-build]
 *
 * Builds `--ref` (the v3 side) in a throwaway git worktree under DIR, builds this
 * tree (v4), loads both blocking sheets in headless Chromium and diffs getComputedStyle.
 * Two inputs, because each misses what the other catches:
 *  - SHAPES: every (tag, type, className) a JSX element writes, in isolation, at 375 and
 *    1280, light and dark, with :hover/:focus/:focus-visible/:active forced over CDP.
 *    Reliable and exhaustive over src; blind to ancestors and inline styles.
 *  - FRAGMENTS: every distinct HTML string the vitest suite hands react-dom/server,
 *    captured by capture.setup.ts and mounted whole, so ancestor selectors, inline
 *    styles and layer order are real. Only as wide as the suite's render tests; no states.
 * Exit 1 on a difference that KNOWN below does not explain. Add to KNOWN only with a reason.
 * Not covered: pixels, fonts, other engines, forced states inside fragments.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const HERE = dirname(fileURLToPath(import.meta.url))
const FRONTEND = resolve(HERE, '..', '..')
const REPO = resolve(FRONTEND, '..')
const require = createRequire(join(FRONTEND, 'package.json'))
const ts = require('typescript')

const argv = process.argv.slice(2)
const opt = (flag, fallback) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : fallback)
const REF = opt('--ref', 'origin/main')
const WORK = resolve(opt('--work', join(tmpdir(), 'wz-v3-v4-audit')))
const MIRROR = join(WORK, 'v3')
const run = (cmd, args, cwd, env = {}) =>
  execFileSync(cmd, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, ...env } })

// Computed values that default to currentColor: they differ only because `color` does.
const FOLLOWS_COLOR = /^(caret-color|column-rule-color|text-emphasis-color|text-decoration-color|outline-color|-webkit-text-(fill|stroke)-color|border-(top|right|bottom|left)-color)$/
const changedProps = (pa, pb) => {
  const props = [...new Set([...Object.keys(pa), ...Object.keys(pb)])].filter((p) => pa[p] !== pb[p])
  return props.includes('color') ? props.filter((p) => !FOLLOWS_COLOR.test(p)) : props
}
const nums = (v) => (v.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi) ?? []).map(Number)

/** A difference is explained only by an entry here; `why` is the sentence the report prints. */
const KNOWN = [
  // Chromium lists the logical twin of every physical property; the physical one is the signal.
  { why: 'logical twin of a physical property that is reported', test: ({ prop }) => /(^|-)(block|inline)(-|$)|^border-(start|end)-|^inset-(block|inline)/.test(prop) },
  { why: 'rounded-full: 9999px vs an effectively infinite radius', test: ({ prop, a, b }) => /^border-.*radius$/.test(prop) && a === '9999px' && /^3\.\d+e\+?\d+px$|^33554400px$|^3355\d+px$/.test(b) },
  { why: 'transition-colors now also transitions outline-color and the --tw-gradient-* stops', test: ({ prop, a, b }) => prop === 'transition-property' && b.replace(/, (outline-color|--tw-gradient-\w+)/g, '') === a },
  { why: 'sr-only clips with clip-path instead of clip; same rendering', test: ({ prop, a, b }) => (prop === 'clip' && a === 'rect(0px, 0px, 0px, 0px)' && b === 'auto') || (prop === 'clip-path' && a === 'none' && b === 'inset(50%)') },
  { why: 'animation frame timing (sub-0.002 drift in a running transform/opacity/filter/background-position)', test: ({ prop, a, b }) => /^(transform|opacity|filter|background-position)/.test(prop) && nums(a).length > 0 && nums(a).length === nums(b).length && nums(a).every((n, i) => Math.abs(n - nums(b)[i]) < 0.002) },
  { why: 'v4 preflight zeroes td/th padding (v3 left 1px); table sizes follow', test: ({ prop, a, b, tag, example }) => (/^padding-/.test(prop) && /^(td|th)$/.test(tag) && a === '1px' && b === '0px') || (/^(width|height)$/.test(prop) && Math.abs(parseFloat(a) - parseFloat(b)) <= 4 && (/^(table|thead|tbody|tr|td|th)$/.test(tag) || (tag === 'div' && /\[has table\]/.test(example)))) },
  { why: 'box centre moved with the box (option, td/th and table sizes above)', test: ({ prop, a, b, tag, example }) => /^(transform|perspective)-origin$/.test(prop) && nums(a).length === 2 && nums(a).every((n, i) => Math.abs(n - nums(b)[i]) <= 2) && (/^(option|table|thead|tbody|tr|td|th)$/.test(tag) || (tag === 'div' && /\[has table\]/.test(example))) },
  { why: 'v4 preflight zeroes <option> padding (v3 left 0/2px/1px)', test: ({ prop, a, b, tag }) => tag === 'option' && (/^padding-/.test(prop) || prop === 'height' || prop === 'cursor') },
  { why: 'space-y: margin moves from the later sibling top to the earlier sibling bottom', test: ({ prop, a, b, example }) => /<parent class="[^"]*space-y/.test(example) && ((prop === 'margin-top' && b === '0px') || (prop === 'margin-bottom' && a === '0px')) },
  { why: 'shape merges both branches of a ternary (items-end / items-center); only one is ever on the element', test: ({ prop, example }) => prop === 'align-items' && /ConfirmDialog\.tsx:100/.test(example) },
]

function sheetOf(dir) {
  const assets = join(dir, 'dist', 'assets')
  const names = readdirSync(assets).filter((n) => n.startsWith('index-') && n.endsWith('.css'))
  if (names.length !== 1) throw new Error(`${dir}: expected one index-*.css, found ${names.length}; a blind audit is not a pass`)
  return readFileSync(join(assets, names[0]), 'utf8')
}

function shapesOf(srcDir) {
  const out = new Map()
  const strings = (node, acc) => {
    if (ts.isStringLiteralLike(node)) acc.push(node.text)
    else if (ts.isTemplateExpression(node)) {
      acc.push(node.head.text)
      for (const span of node.templateSpans) (strings(span.expression, acc), acc.push(span.literal.text))
    } else ts.forEachChild(node, (child) => strings(child, acc))
  }
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) return name === '__tests__' ? [] : walk(path)
      return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : []
    })
  for (const file of walk(srcDir)) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source)
        if (/^[a-z][a-z0-9]*$/.test(tag)) {
          let cls = ''
          let type = ''
          let disabled = false
          for (const attr of node.attributes.properties) {
            if (!ts.isJsxAttribute(attr)) continue
            const name = attr.name.getText(source)
            if (name === 'className' && attr.initializer) {
              const acc = []
              strings(attr.initializer, acc)
              cls = [...new Set(acc.join(' ').split(/\s+/).filter(Boolean))].join(' ')
            } else if (name === 'type' && attr.initializer && ts.isStringLiteral(attr.initializer)) type = attr.initializer.text
            else if (name === 'disabled') disabled = true
          }
          const site = `${relative(srcDir, file)}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`
          for (const dis of disabled ? [false, true] : [false]) {
            const key = `${tag}|${type}|${dis}|${cls}`
            const entry = out.get(key) ?? { tag, type, cls, disabled: dis, site }
            out.set(key, entry)
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return [...out.values()]
}

const doc = (css, theme) =>
  `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><style>${css.replace(/<\/style/gi, '<\\/style')}</style></head><body><div id="root"></div></body></html>`
const SVG = ['svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'text', 'tspan', 'defs', 'use', 'mask', 'clipPath', 'linearGradient', 'radialGradient', 'stop', 'pattern', 'filter', 'symbol', 'title', 'desc', 'image', 'foreignObject']
const STATES = ['', 'hover', 'focus', 'focus-visible', 'active']
const dumpIn = `(cs) => { const o = {}; for (let i = 0; i < cs.length; i++) if (!cs[i].startsWith('--')) o[cs[i]] = cs.getPropertyValue(cs[i]); return o }`

async function shapeStyles(page, shapes) {
  const client = await page.context().newCDPSession(page)
  await client.send('DOM.enable')
  await client.send('CSS.enable')
  const { root } = await client.send('DOM.getDocument', { depth: 0 })
  const out = []
  for (const shape of shapes) {
    await page.evaluate(({ shape, svg }) => {
      const VOID = ['input', 'img', 'hr', 'br', 'source', 'col', 'wbr', 'area', 'track', 'embed']
      const el = svg.includes(shape.tag) ? document.createElementNS('http://www.w3.org/2000/svg', shape.tag) : document.createElement(shape.tag)
      el.id = 't'
      if (shape.type) el.setAttribute('type', shape.type)
      if (shape.disabled) el.setAttribute('disabled', '')
      if (shape.tag === 'a') el.setAttribute('href', '#')
      if (shape.cls) el.setAttribute('class', shape.cls)
      if (!VOID.includes(shape.tag) && !svg.includes(shape.tag)) el.textContent = 'x'
      document.body.appendChild(el)
    }, { shape, svg: SVG })
    const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#t' })
    const entry = {}
    for (const state of STATES) {
      await client.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: state ? [state] : [] })
      // A forced state starts a transition, and a mid-flight value differs between two sheets by timing alone.
      // The unforced read ('') keeps transitions on, so transition-* is still compared there.
      if (state) await page.addStyleTag({ content: '#t,#t *{transition:none!important}' })
      entry[state] = await page.evaluate(`(() => { const dump = ${dumpIn}; const el = document.getElementById('t'); const r = { '': dump(getComputedStyle(el)) }; for (const p of ['::before', '::after']) { const cs = getComputedStyle(el, p); if (cs.content !== 'none' && cs.content !== 'normal') r[p] = dump(cs) } if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') r['::placeholder'] = dump(getComputedStyle(el, '::placeholder')); if (el.type === 'file') r['::file-selector-button'] = dump(getComputedStyle(el, '::file-selector-button')); return r })()`)
    }
    await page.evaluate(() => {
      document.getElementById('t').remove()
      for (const s of document.querySelectorAll('style:not(:first-of-type)')) s.remove()
    })
    out.push(entry)
  }
  return out
}

const fragmentHash = (html) => {
  const root = document.getElementById('root')
  root.innerHTML = html
  const hash = (cs) => {
    let h = 5381
    for (let i = 0; i < cs.length; i++) {
      const name = cs[i]
      if (name.startsWith('--')) continue
      const s = name + ':' + cs.getPropertyValue(name)
      for (let j = 0; j < s.length; j++) h = ((h << 5) + h + s.charCodeAt(j)) | 0
    }
    return h
  }
  return [...root.querySelectorAll('*')].map((el) => {
    let h = hash(getComputedStyle(el))
    for (const p of ['::before', '::after']) {
      const cs = getComputedStyle(el, p)
      if (cs.content !== 'none' && cs.content !== 'normal') h = (h * 31 + hash(cs)) | 0
    }
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') h = (h * 31 + hash(getComputedStyle(el, '::placeholder'))) | 0
    return h
  })
}
const fragmentDetail = ({ html, indexes }) => {
  const root = document.getElementById('root')
  root.innerHTML = html
  const els = [...root.querySelectorAll('*')]
  const dump = (cs) => {
    const o = {}
    for (let i = 0; i < cs.length; i++) if (!cs[i].startsWith('--')) o[cs[i]] = cs.getPropertyValue(cs[i])
    return o
  }
  return indexes.map((i) => {
    const el = els[i]
    const path = []
    for (let n = el; n && n !== root && path.length < 4; n = n.parentElement) path.unshift(n.tagName.toLowerCase() + (n.getAttribute('class') ? '.' + n.getAttribute('class').trim().split(/\s+/).slice(0, 4).join('.') : ''))
    const r = { tag: el.tagName.toLowerCase(), type: el.getAttribute('type') ?? '', path: path.join(' > ') + (el.querySelector('table') ? ' [has table]' : '') + (el.parentElement ? ` <parent class="${el.parentElement.getAttribute('class') ?? ''}">` : ''), '': dump(getComputedStyle(el)) }
    for (const p of ['::before', '::after', '::placeholder']) r[p] = dump(getComputedStyle(el, p))
    return r
  })
}

/** findings: Map<"prop|a|b|tag", {n, ctx:Set, example}> */
function record(findings, ctx, prop, a, b, tag, type, example) {
  if (a === b) return
  const key = [prop, a, b, tag, type].join('\u0001')
  const entry = findings.get(key) ?? { prop, a, b, tag, type, n: 0, ctx: new Set(), example }
  entry.n++
  entry.ctx.add(ctx)
  findings.set(key, entry)
}

function loadFragments(dir) {
  const seen = new Set()
  const out = []
  for (const name of readdirSync(dir)) {
    for (const line of readFileSync(join(dir, name), 'utf8').split('\n')) {
      if (!line) continue
      const html = JSON.parse(line)
      const key = createHash('sha1').update(html.replace(/>[^<]+</g, '>x<')).digest('base64')
      if (!seen.has(key)) (seen.add(key), out.push(html))
    }
  }
  return out
}

function summarise(title, findings, compared) {
  const unexplained = []
  const explained = new Map()
  for (const f of findings.values()) {
    const known = KNOWN.find((k) => k.test({ ...f, prop: f.prop.replace(/::.*$/, '') }))
    if (known) explained.set(known.why, (explained.get(known.why) ?? 0) + f.n)
    else unexplained.push(f)
  }
  console.log(`\n== ${title}: ${compared} compared, ${findings.size} distinct differences, ${unexplained.length} unexplained`)
  for (const [why, n] of explained) console.log(`   explained x${n}: ${why}`)
  for (const f of unexplained.sort((x, y) => y.n - x.n)) {
    console.log(`   ${String(f.n).padStart(6)}  ${f.prop}  <${f.tag}${f.type ? ` type=${f.type}` : ''}>  ${f.a.slice(0, 70)}  ->  ${f.b.slice(0, 70)}   [${[...f.ctx].join(' ')}]`)
    console.log(`           e.g. ${f.example}`)
  }
  return unexplained.length
}

// ---- 1. the two sheets
if (!existsSync(join(MIRROR, 'frontend', 'dist')) || !argv.includes('--no-build')) {
  mkdirSync(WORK, { recursive: true })
  if (existsSync(MIRROR)) run('git', ['worktree', 'remove', '--force', MIRROR], REPO)
  run('git', ['worktree', 'add', '--detach', MIRROR, REF], REPO)
  run('npm', ['ci', '--ignore-scripts'], join(MIRROR, 'frontend'))
  run('npm', ['run', 'build'], join(MIRROR, 'frontend'))
}
if (!argv.includes('--no-build')) run('npm', ['run', 'build'], FRONTEND)
const sheets = { v3: sheetOf(join(MIRROR, 'frontend')), v4: sheetOf(FRONTEND) }

// ---- 2. rendered markup from the suite
let captured = opt('--captured', '')
if (!captured) {
  captured = join(WORK, 'captured')
  rmSync(captured, { recursive: true, force: true })
  mkdirSync(captured, { recursive: true })
  run('npx', ['vitest', 'run', '--config', 'scripts/v3-v4-audit/vitest.config.ts'], FRONTEND, { WZ_CAPTURE_DIR: captured })
}
const fragments = loadFragments(captured)
const shapes = shapesOf(join(FRONTEND, 'src'))
console.log(`shapes=${shapes.length} fragments=${fragments.length}`)

// ---- 3. diff
const browser = await chromium.launch()
const shapeFindings = new Map()
let shapeCompared = 0
const fragFindings = new Map()
let fragElements = 0
let fragDiffering = 0
try {
  for (const width of [375, 1280]) {
    for (const theme of ['light', 'dark']) {
      const ctx = `${theme}@${width}`
      const pages = []
      for (const css of [sheets.v3, sheets.v4]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } })
        await page.route('**/*', (route) => route.abort())
        await page.setContent(doc(css, theme))
        pages.push(page)
      }
      const [a, b] = [await shapeStyles(pages[0], shapes), await shapeStyles(pages[1], shapes)]
      shapes.forEach((shape, i) => {
        for (const state of STATES) {
          for (const pseudo of Object.keys({ ...a[i][state], ...b[i][state] })) {
            shapeCompared++
            const pa = a[i][state][pseudo] ?? {}
            const pb = b[i][state][pseudo] ?? {}
            for (const prop of changedProps(pa, pb)) {
              record(shapeFindings, `${ctx}${state ? ':' + state : ''}`, prop + pseudo, pa[prop] ?? '(none)', pb[prop] ?? '(none)', shape.tag, shape.type, `${shape.site} class="${shape.cls.slice(0, 90)}"${shape.disabled ? ' disabled' : ''}`)
            }
          }
        }
      })
      if (width === 1280 || theme === 'light') {
        for (const html of fragments) {
          const [ha, hb] = await Promise.all(pages.map((p) => p.evaluate(fragmentHash, html)))
          fragElements += ha.length
          const indexes = ha.flatMap((h, i) => (h === hb[i] ? [] : [i])).slice(0, 200)
          if (!indexes.length) continue
          fragDiffering += indexes.length
          const [da, db] = await Promise.all(pages.map((p) => p.evaluate(fragmentDetail, { html, indexes })))
          da.forEach((ea, k) => {
            for (const pseudo of ['', '::before', '::after', '::placeholder']) {
              for (const prop of changedProps(ea[pseudo], db[k][pseudo])) record(fragFindings, ctx, prop + pseudo, ea[pseudo][prop], db[k][pseudo][prop], ea.tag, ea.type, ea.path)
            }
          })
        }
      }
      await Promise.all(pages.map((p) => p.close()))
    }
  }
} finally {
  await browser.close()
  if (!argv.includes('--keep')) {
    try { run('git', ['worktree', 'remove', '--force', MIRROR], REPO) } catch { /* already gone */ }
  }
}

const bad = summarise('SHAPES (isolated, with forced states)', shapeFindings, shapeCompared) + summarise(`FRAGMENTS (${fragments.length} distinct, ${fragElements} elements compared, ${fragDiffering} differing)`, fragFindings, fragElements)
console.log(bad ? `\n${bad} unexplained difference(s).` : '\nNo unexplained difference.')
writeFileSync(join(WORK, 'last-run.json'), JSON.stringify({ shape: [...shapeFindings.values()].map((f) => ({ ...f, ctx: [...f.ctx] })), frag: [...fragFindings.values()].map((f) => ({ ...f, ctx: [...f.ctx] })) }))
process.exit(bad ? 1 : 0)
