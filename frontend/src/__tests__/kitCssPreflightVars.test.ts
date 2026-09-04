/**
 * #1318 — the design-system export must not publish Tailwind's preflight
 * `--tw-*` internals as if they were design tokens.
 *
 * The pollution does not live in `index.css` (which declares no `--tw-` name at
 * all). It enters one step later: `.design-sync/gen-kit-css.mjs` compiles the
 * stylesheet through the repo's Tailwind CLI, and preflight emits ~51 `--tw-*`
 * defaults into `*,:after,:before` and `::backdrop`. The design-sync converter
 * copies that file verbatim, so every one of them is published.
 *
 * The seam under test is `stripTailwindPreflightVars` — the pure string→string
 * filter the generator runs over the compiled CSS before writing `kit.css`.
 * Testing the filter rather than the generated artefact keeps this runnable in
 * CI: `.ds-kit/` is derived and gitignored, and regenerating it costs a full
 * Tailwind compile.
 *
 * The load-bearing case is `--tw-delay`, a REAL app variable (set from JS in
 * `CovenVote.tsx` / `WowVote.tsx`) that staggers `coven-moon-sparkle` and the
 * Wow fleck animations. Today it only ever appears as `var(--tw-delay, 0s)` —
 * a reference, never a declaration — so a declaration filter cannot reach it.
 * It is pinned both ways here anyway: strip its declaration and the two vote
 * widgets animate in unison instead of staggering.
 *
 * The other load-bearing case is a Tailwind UTILITY that declares a `--tw-*`
 * of its own and consumes it in the same rule (`.text-red-600`, `.border-red-300`,
 * `.space-y-*`). Those are utility internals, not tokens, and stripping them
 * silently drops the colour or the margin — a rendered-output change.
 */
import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeAll } from 'vitest'

type Filter = (css: string) => string

let stripTailwindPreflightVars: Filter

beforeAll(async () => {
  // Computed specifier: the generator is a plain `.mjs` at the repo root, and
  // this package compiles with `allowJs: false`, so a static import would not
  // type-check. Importing it is safe — the generator only shells out to
  // Tailwind when run as the entry module.
  const generator = fileURLToPath(
    new URL('../../../.design-sync/gen-kit-css.mjs', import.meta.url),
  )
  const module = (await import(/* @vite-ignore */ generator)) as {
    stripTailwindPreflightVars: Filter
  }
  stripTailwindPreflightVars = module.stripTailwindPreflightVars
})

// A miniature of the real compiled output: both preflight blocks, real design
// tokens, a `--tw-delay` reference, a self-consuming utility, and a plain
// utility class.
const SAMPLE = [
  '*,:after,:before{--tw-translate-x:0;--tw-rotate:0;--tw-pan-x: ;--tw-ring-offset-shadow:0 0 #0000}',
  '::backdrop{--tw-translate-x:0;--tw-rotate:0;--tw-pan-x: ;--tw-ring-offset-shadow:0 0 #0000}',
  // v4's second shape (#2918): the name is in the at-rule PRELUDE and the body
  // contains no `--tw-` at all, so the declaration filter never sees it.
  '@property --tw-rotate-x{syntax:"*";inherits:false}',
  '@property --tw-space-y-reverse{syntax:"*";inherits:false;initial-value:0}',
  // ...and its declaration block, nested two deep the way v4 nests it.
  '@layer properties{@supports ((-webkit-hyphens:none)){*,:before,:after,::backdrop{--tw-rotate-x:initial;--tw-border-style:solid}}}',
  ':root{--faction-wow-sweep:linear-gradient(red,blue);--color-ink:#111;--radius-card:8px}',
  '@media (prefers-reduced-motion:no-preference){.coven-moon-sparkle{animation:coven-twinkle 1.2s infinite;animation-delay:var(--tw-delay,0s)}}',
  '.text-red-600{--tw-text-opacity:1;color:rgb(220 38 38/var(--tw-text-opacity))}',
  '.rounded-full{border-radius:9999px}',
].join('')

describe('stripTailwindPreflightVars', () => {
  it('drops every preflight --tw-* default declaration', () => {
    const out = stripTailwindPreflightVars(SAMPLE)
    for (const name of [
      '--tw-translate-x',
      '--tw-rotate',
      '--tw-pan-x',
      '--tw-ring-offset-shadow',
    ]) {
      expect(out, `${name} should no longer be declared`).not.toMatch(
        new RegExp(`${name}\\s*:`),
      )
    }
  })

  it('drops v4 `@property --tw-*` registrations, prelude-named and all (#2918)', () => {
    const out = stripTailwindPreflightVars(SAMPLE)
    // The name lives in the at-rule prelude, so the declaration filter cannot
    // reach it — v3 had no such rule and this went unnoticed through the whole
    // v4 migration until the export was inspected.
    expect(out).not.toMatch(/@property\s+--tw-/)
    expect(out).not.toContain('--tw-border-style:solid')
  })

  it('leaves the emptied `@layer`/`@supports` wrapper out of the export', () => {
    // Stripping the block two deep leaves `@layer properties{@supports (…){}}`
    // behind. A browser ignores it; an exported design system should not carry it.
    const out = stripTailwindPreflightVars(SAMPLE)
    expect(out).not.toMatch(/@layer\s+properties/)
    expect(out).not.toMatch(/@(?:layer|supports|media)[^{}]*\{\s*\}/)
  })

  it('keeps a non-Tailwind @property rule, which is not our plumbing', () => {
    const mine = '@property --faction-sweep{syntax:"<color>";inherits:false;initial-value:red}'
    expect(stripTailwindPreflightVars(mine)).toBe(mine)
  })

  it('leaves real design tokens untouched', () => {
    const out = stripTailwindPreflightVars(SAMPLE)
    expect(out).toContain('--faction-wow-sweep:linear-gradient(red,blue)')
    expect(out).toContain('--color-ink:#111')
    expect(out).toContain('--radius-card:8px')
  })

  it('leaves Tailwind utility classes untouched', () => {
    const out = stripTailwindPreflightVars(SAMPLE)
    expect(out).toContain('.rounded-full{border-radius:9999px}')
  })

  it('keeps a --tw-* that its own rule consumes, so the utility still renders', () => {
    const out = stripTailwindPreflightVars(SAMPLE)
    expect(out).toContain(
      '.text-red-600{--tw-text-opacity:1;color:rgb(220 38 38/var(--tw-text-opacity))}',
    )
  })

  it('preserves var(--tw-delay) references — the vote stagger', () => {
    const out = stripTailwindPreflightVars(SAMPLE)
    expect(out).toContain('animation-delay:var(--tw-delay,0s)')
  })

  it('never strips a --tw-delay DECLARATION, wherever it appears', () => {
    // Today `--tw-delay` is only ever set from JS, so no stylesheet declares
    // it. If one ever does, the filter must still let it through.
    const out = stripTailwindPreflightVars(
      '.coven-moon-sparkle:nth-child(2){--tw-delay:.3s}',
    )
    expect(out).toContain('--tw-delay:.3s')
  })

  it('is a no-op on CSS that declares no --tw-* property', () => {
    const clean = ':root{--color-ink:#111}.card{border-radius:8px}'
    expect(stripTailwindPreflightVars(clean)).toBe(clean)
  })
})
