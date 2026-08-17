#!/usr/bin/env node
/**
 * Regenerates the self-hosted font kit: `src/assets/fonts/*.woff2`,
 * `src/fonts.css` and `src/assets/fonts/licences/*` (#1977).
 *
 * WHY THIS IS A SCRIPT AND NOT A HAND-WRITTEN STYLESHEET
 * -----------------------------------------------------
 * `src/fonts.css` is ~80 `@font-face` blocks carrying opaque `unicode-range`
 * strings and content-addressed file names. Hand-editing it is how a `src:`
 * path drifts one character from the file on disk, and a wrong `src:` does not
 * throw — the family silently resolves to generic serif, which is exactly the
 * failure `docs/agents/design-fidelity.md` records from the #821 wave. So the
 * stylesheet is generated from FACES below, and `fontsLoaded.test.ts` asserts
 * the generated file agrees with what the app's CSS actually asks for.
 *
 * FACES IS THE SOURCE OF TRUTH FOR WHAT WE SHIP.
 * It is the axis spec that used to live in the Google Fonts `<link>` in
 * index.html, moved here verbatim. Do NOT edit it by eye: the two guards in
 * `fontsLoaded.test.ts` derive the needed set from the stylesheets and will
 * tell you what to add or drop. Re-run this script after changing it.
 *
 * Usage: node scripts/fetch-fonts.mjs
 * Needs network access to fonts.googleapis.com, fonts.gstatic.com and
 * raw.githubusercontent.com. It is a maintenance script, never part of `build`.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FRONTEND = join(dirname(fileURLToPath(import.meta.url)), '..')
const FONT_DIR = join(FRONTEND, 'src', 'assets', 'fonts')
const LICENCE_DIR = join(FONT_DIR, 'licences')
const CSS_PATH = join(FRONTEND, 'src', 'fonts.css')

/**
 * The 18 families and their axis specs, exactly as the retired Google Fonts
 * `<link>` requested them — 41 faces. That set was already minimal in both
 * directions when this landed: #1230's guard had removed every face nothing
 * renders in, and #1294's had added every weight a stylesheet sets. So this is
 * a DELIVERY change, not a type change; the face list is unchanged on purpose.
 */
const FACES = [
  'Anton',
  'Archivo+Black',
  'Lora:ital,wght@0,400;0,600;0,700;1,400;1,500;1,600;1,700',
  'Courier+Prime:wght@400;700',
  'Special+Elite',
  'Share+Tech+Mono',
  'Bebas+Neue',
  'Permanent+Marker',
  'Caveat:wght@400;700',
  'MedievalSharp',
  'IM+Fell+English:ital@1',
  'Cinzel:wght@400;500;600;700;800',
  'EB+Garamond:ital,wght@0,400;0,600;1,400',
  'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600',
  'Quicksand:wght@400;700',
  'Grenze+Gotisch:wght@400;600',
  'Poiret+One',
  'Spectral:ital,wght@0,400;1,400',
]

/**
 * Which of Google's per-subset cuts we keep.
 *
 * Google slices every face into up to nine subsets (cyrillic, greek, math,
 * symbols, vietnamese…) each behind a `unicode-range`, and a browser downloads
 * only the ones a page's glyphs fall in. Keeping the ranges means self-hosting
 * inherits that laziness: an English page still fetches only `latin`.
 *
 * ponytail: latin + latin-ext is the ceiling here. The catalogue is `en` only
 * and user copy is Latin-script, so the dropped subsets were never fetched in
 * practice — but a name in Cyrillic would now fall back to the generic stack
 * for those glyphs rather than render in the faction face. Upgrade path is one
 * more entry in this array plus a re-run; nothing else changes.
 */
const KEEP_SUBSETS = new Set(['latin', 'latin-ext'])

/** A desktop UA, or Google serves the ttf/woff cuts instead of woff2. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Licence file per family. Every one of these is OFL 1.1 except Archivo Black,
 * Poiret One and Quicksand, which google/fonts keeps under `apache/` — the
 * script asserts it found a real licence rather than assuming the directory.
 */
const LICENCE_ROOTS = ['ofl', 'apache', 'ufl']
const LICENCE_NAMES = ['OFL.txt', 'LICENSE.txt', 'UFL.txt']

const slug = (family) => family.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const catalogueDir = (family) => family.toLowerCase().replace(/[^a-z0-9]+/g, '')

async function text(url) {
  const response = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return response.text()
}

/** `@font-face { … }` blocks, each tagged with the `/* subset *\/` above it. */
function parseBlocks(css) {
  const blocks = []
  let subset = 'latin'
  for (const chunk of css.split('@font-face')) {
    const comment = [...chunk.matchAll(/\/\*\s*([a-z-]+)\s*\*\//g)].pop()
    const body = chunk.match(/\{([\s\S]*?)\}/)
    if (body) blocks.push({ subset, body: body[1] })
    if (comment) subset = comment[1]
  }
  return blocks
}

const field = (body, name) => body.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim()

async function main() {
  rmSync(FONT_DIR, { recursive: true, force: true })
  mkdirSync(LICENCE_DIR, { recursive: true })

  const rules = []
  let bytes = 0

  for (const spec of FACES) {
    const family = decodeURIComponent(spec.split(':')[0]).replace(/\+/g, ' ')
    const css = await text(
      `https://fonts.googleapis.com/css2?family=${spec}&display=swap`,
    )
    const kept = parseBlocks(css).filter((block) => KEEP_SUBSETS.has(block.subset))
    if (kept.length === 0) throw new Error(`no latin cut for ${family}`)

    for (const { subset, body } of kept) {
      const weight = field(body, 'font-weight') ?? '400'
      const style = field(body, 'font-style') ?? 'normal'
      const range = field(body, 'unicode-range')
      const source = field(body, 'src')?.match(/url\(([^)]+)\)/)?.[1]
      if (!source) throw new Error(`no src for ${family} ${weight} ${style}`)

      const file = `${slug(family)}-${weight}${style === 'italic' ? 'i' : ''}-${subset}.woff2`
      const woff2 = Buffer.from(
        await (await fetch(source, { headers: { 'User-Agent': UA } })).arrayBuffer(),
      )
      if (woff2.length < 1000) throw new Error(`suspiciously small ${file}`)
      writeFileSync(join(FONT_DIR, file), woff2)
      bytes += woff2.length

      rules.push(
        `/* ${family} ${weight}${style === 'italic' ? ' italic' : ''} — ${subset} */\n` +
          `@font-face {\n` +
          `  font-family: '${family}';\n` +
          `  font-style: ${style};\n` +
          `  font-weight: ${weight};\n` +
          `  font-display: swap;\n` +
          `  src: url('./assets/fonts/${file}') format('woff2');\n` +
          (range ? `  unicode-range: ${range};\n` : '') +
          `}`,
      )
    }

    // The licence ships with the font — see the header of src/fonts.css.
    let licence
    for (const root of LICENCE_ROOTS) {
      for (const name of LICENCE_NAMES) {
        if (licence) continue
        licence = await text(
          `https://raw.githubusercontent.com/google/fonts/main/${root}/${catalogueDir(family)}/${name}`,
        ).catch(() => undefined)
        if (licence) {
          writeFileSync(join(LICENCE_DIR, `${slug(family)}-${name}`), licence)
        }
      }
    }
    if (!licence) throw new Error(`no licence found for ${family}`)
    console.log(`${family.padEnd(20)} ${kept.length} cut(s)`)
  }

  writeFileSync(
    CSS_PATH,
    `/* GENERATED by scripts/fetch-fonts.mjs — do not edit by hand (#1977).
 *
 * The 18 families the faction kits are built on, self-hosted. They used to come
 * from a render-blocking third-party <link> in index.html, which cost a DNS +
 * TCP + TLS handshake to two Google origins before first paint, sent every
 * viewer's IP to that third party, and could not be given immutable cache
 * headers. These are content-hashed into /assets by Vite, which render.yaml
 * serves 'immutable'.
 *
 * font-display: swap is carried over verbatim from the old '&display=swap'
 * URL. It is the only value that keeps rendering identical: text paints in the
 * fallback immediately and swaps when the face arrives. 'optional' would let a
 * first-time visitor keep the fallback for the whole page load, which on a site
 * where the face IS the faction's identity is a visible change, not a tuning.
 *
 * Every family also keeps Google's own 'unicode-range', so a browser still
 * downloads only the cuts a page's glyphs actually need.
 *
 * Licences ship alongside the fonts in src/assets/fonts/licences/ and are
 * credited on the Attributions page. Do not strip them.
 *
 * Regenerate: node scripts/fetch-fonts.mjs
 */

${rules.join('\n\n')}\n`,
  )

  const files = readdirSync(FONT_DIR).filter((name) => name.endsWith('.woff2'))
  console.log(`\n${files.length} woff2 files, ${(bytes / 1024).toFixed(1)} KB on disk`)
  console.log(`${rules.length} @font-face rules -> src/fonts.css`)
}

await main()
