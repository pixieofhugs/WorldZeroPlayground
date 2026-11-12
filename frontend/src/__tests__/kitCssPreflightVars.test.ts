/**
 * #1318 — the design-system export must not publish Tailwind's preflight
 * `--tw-*` internals as if they were design tokens.
 * Preflight emits them when `.design-sync/gen-kit-css.mjs` compiles through
 * Tailwind. Tests the pure filter, not the (gitignored) artefact.
 *
 * Must keep: `--tw-delay`, a real app variable set from JS (`CovenVote`/`WowVote`
 * stagger), and a `--tw-*` a utility declares and consumes in the same rule.
 */
import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeAll } from 'vitest'

type Filter = (css: string) => string

let stripTailwindPreflightVars: Filter

beforeAll(async () => {
  // Computed specifier: `allowJs: false`. Safe — the generator only runs Tailwind as entry module.
  const generator = fileURLToPath(
    new URL('../../../.design-sync/gen-kit-css.mjs', import.meta.url),
  )
  const module = (await import(/* @vite-ignore */ generator)) as {
    stripTailwindPreflightVars: Filter
  }
  stripTailwindPreflightVars = module.stripTailwindPreflightVars
})

// A miniature of the real compiled output.
const SAMPLE = [
  '*,:after,:before{--tw-translate-x:0;--tw-rotate:0;--tw-pan-x: ;--tw-ring-offset-shadow:0 0 #0000}',
  '::backdrop{--tw-translate-x:0;--tw-rotate:0;--tw-pan-x: ;--tw-ring-offset-shadow:0 0 #0000}',
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
