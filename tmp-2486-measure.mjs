// Throwaway measurement probe for #2486. Deleted before the PR lands.
import { readFileSync } from 'node:fs'

const css = readFileSync('frontend/src/index.css', 'utf8')
const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
const CUSTOM = /(--[\w-]+)\s*:\s*([^;]+);/g

function matchRules(src, selector) {
  const out = []
  let cursor = 0
  while (cursor < src.length) {
    const start = src.indexOf(selector, cursor)
    if (start === -1) break
    const open = src.indexOf('{', start)
    if (open === -1) break
    const between = src.slice(start + selector.length, open).trim()
    const before = start === 0 ? '\n' : src[start - 1]
    if (between !== '' || !/[\s;{}]/.test(before)) { cursor = start + selector.length; continue }
    let depth = 1, i = open + 1
    while (i < src.length && depth > 0) { if (src[i] === '{') depth++; else if (src[i] === '}') depth--; i++ }
    out.push({ at: start, body: src.slice(open + 1, i - 1) })
    cursor = i
  }
  return out
}
function decls(bodies) {
  const m = new Map()
  for (const b of bodies) for (const d of b.matchAll(CUSTOM)) m.set(d[1], d[2].trim())
  return m
}
const light = decls([...matchRules(clean, ':root'), ...matchRules(clean, ':root, [data-theme]')].sort((a, b) => a.at - b.at).map(r => r.body))
const dark = decls(matchRules(clean, '[data-theme="dark"]').map(r => r.body))
const themes = { light, dark }

function resolve(name, theme, seen = new Set()) {
  if (seen.has(name)) return null
  seen.add(name)
  const d = theme === 'dark' ? (dark.get(name) ?? light.get(name)) : light.get(name)
  if (d === undefined) return null
  return resolveValue(d, theme, seen)
}
function resolveValue(value, theme, seen) {
  let cur = value.trim()
  const RE = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/
  let m = RE.exec(cur), guard = 0
  while (m) {
    if (guard++ > 32) return null
    const inner = resolve(m[1], theme, new Set(seen))
    const rep = inner ?? (m[2] !== undefined ? m[2].trim() : null)
    if (rep === null) return null
    cur = cur.slice(0, m.index) + rep + cur.slice(m.index + m[0].length)
    m = RE.exec(cur)
  }
  return cur
}
function parse(v) {
  if (!v) return null
  v = v.trim().toLowerCase()
  let m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v)
  if (m) return { r: parseInt(m[1] + m[1], 16), g: parseInt(m[2] + m[2], 16), b: parseInt(m[3] + m[3], 16), a: 1 }
  m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(v)
  if (m) return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16), a: 1 }
  m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(v)
  if (m) return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16), a: parseInt(m[4], 16) / 255 }
  m = /^rgba?\(([^)]+)\)$/.exec(v)
  if (m) {
    const p = m[1].replace(/\//g, ' ').split(/[\s,]+/).filter(Boolean).map(Number)
    return { r: p[0], g: p[1], b: p[2], a: p.length === 4 ? p[3] : 1 }
  }
  return null
}
const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 })
const lum = c => { const [r, g, b] = [c.r, c.g, c.b].map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const ratio = (t, s) => { const c = over(t, s); const a = lum(c), b = lum(s); return ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) }
const fmt = n => n.toFixed(2).padStart(6)

// archetype -> [sheet, band fill, band ink]
const SITES = {
  wow: ['--faction-wow-card-bg', '--faction-wow-chronicle-gold', '--faction-wow-on-gold'],
  ua: ['--faction-ua-card-bg', '--faction-ua', '--faction-ua-on-fill'],
  everymen: ['--everymen-paper', '--faction-everymen-bill-cta-bg', '--faction-everymen-bill-cta-ink'],
  snide: ['--faction-snide-composer-paper', '--faction-snide-acid', '--faction-snide-ink'],
  singularity: ['--faction-singularity-term-bg', '--faction-singularity-term-cta-bg', '--faction-singularity-term-cta-ink'],
  coven: ['--faction-coven-ward-card', '--faction-coven-cta-from', '--faction-coven-cta-ink'],
  ephemerists: ['--faction-ephemerists-plate-bg', '--faction-ephemerists-plate-cta-bg', '--faction-ephemerists-plate-cta-ink'],
  na: ['--color-bg-page', '--color-text-primary', '--color-bg-page'],
}

for (const theme of ['light', 'dark']) {
  console.log(`\n──────── ${theme.toUpperCase()}`)
  for (const [name, [sheetT, fillT, inkT]] of Object.entries(SITES)) {
    const sheetRaw = resolve(sheetT, theme), fillRaw = resolve(fillT, theme), inkRaw = resolve(inkT, theme)
    const sheet = parse(sheetRaw), fill = parse(fillRaw), ink = parse(inkRaw)
    if (!sheet || !fill || !ink) {
      console.log(`${name.padEnd(13)} UNRESOLVED  sheet=${sheetRaw} fill=${fillRaw} ink=${inkRaw}`)
      continue
    }
    const page = parse(resolve('--color-bg-page', theme))
    const sheetOpaque = sheet.a === 1 ? sheet : over(sheet, page)
    const fillOn = over(fill, sheetOpaque)
    const enabled = ratio(ink, fillOn)
    // today: opacity 0.5 folds both
    const fillHalf = over({ ...fill, a: fill.a * 0.5 }, sheetOpaque)
    const today = ratio({ ...ink, a: ink.a * 0.5 }, fillHalf)
    // "dim the fill only" at 50%
    const inkKept = ratio(ink, fillHalf)
    console.log(
      `${name.padEnd(13)} sheetL=${lum(sheetOpaque).toFixed(3)} enabled=${fmt(enabled)}  today(0.5 both)=${fmt(today)}  fill-only-0.5=${fmt(inkKept)}`,
    )
  }
}
