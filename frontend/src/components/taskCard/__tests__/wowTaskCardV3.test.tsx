/**
 * WOW task card ornament pass (#2032): static markup plus token contrast read
 * from `index.css`. `--faction-wow-stamp-total` on the plum band is 1.08:1 in
 * light, so the mark takes the wordmark's gilt.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// Imported after the mock is registered.
import WowTaskCard from '../WowTaskCard'
import { aTask } from '../../../test/fixtures'
import { AA_LARGE, contrastRatio, formatRatio, parseColor } from '../../../utils/contrast'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'

const THEMES = readThemes(readIndexCss())
const BOTH: Theme[] = ['light', 'dark']

const TASK = aTask({
  description: 'Leave something small and honest where a stranger will find it.',
  in_progress_count: 4,
})

function render(formFactor: 'desktop' | 'mobile' = 'desktop'): string {
  mocks.formFactor = formFactor
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <WowTaskCard
        task={TASK}
        basePoints={TASK.point_value}
        multiplier={1}
        inProgressCount={TASK.in_progress_count}
        onSignup={() => {}}
      />
    </MemoryRouter>,
  )
  mocks.formFactor = 'desktop'
  return html
}

/** The one ink the banner uses for both its lettering and its mark. */
const GILT = '--faction-wow-gilt-mid'
/** The band's ground. Theme-invariant on purpose (index.css, WOW page note 1). */
const PLUM = '--faction-wow-plum-surface'

function band(html: string): string {
  const at = html.indexOf('data-card-masthead="wow"')
  expect(at, 'the shared band from #2029').toBeGreaterThan(-1)
  return html.slice(at, html.indexOf('</div>', at))
}

describe('the WOW banner is legible in the gold it is lettered in (#2032)', () => {
  it.each(BOTH)('clears AA-large on the plum in %s', (theme) => {
    const ink = parseColor(resolveVar(GILT, theme, THEMES) ?? '')
    const ground = parseColor(resolveVar(PLUM, theme, THEMES) ?? '')
    expect(ink, `${GILT} resolves`).not.toBeNull()
    expect(ground, `${PLUM} resolves`).not.toBeNull()
    const ratio = contrastRatio(ink!, ground!)
    expect(
      ratio,
      // 24px wordmark is WCAG large text; the mark's 1.4.11 floor is also 3:1.
      `${GILT} on ${PLUM} in ${theme} — ${formatRatio(ratio)}`,
    ).toBeGreaterThanOrEqual(AA_LARGE)
  })

  it('paints the mark, the wordmark and the rule with that one token', () => {
    const head = band(render())
    expect(
      head.match(new RegExp(`var\\(${GILT}\\)`, 'g')) ?? [],
      'mark + wordmark + rule',
    ).toHaveLength(3)
    expect(head, 'the burnt stamp gold is not a banner ink').not.toContain('--faction-wow-stamp-total')
  })

  it.each(['desktop', 'mobile'] as const)('insets the band SYMMETRICALLY on %s', (formFactor) => {
    // The title centres on the band's content box, so the inset must be equal
    // on both sides: assert a two-value shorthand, not the rung (#2070).
    const head = band(render(formFactor))
    const padding = /padding:([^;"]+)/.exec(head)?.[1]?.trim()
    expect(padding, 'the band declares its own inset').toBeDefined()
    // Each rung is one space-free `var(--space-*)`, so split works.
    const parts = padding!.split(' ')
    expect(parts, `two values, so left === right — got "${padding}"`).toHaveLength(2)
    expect(parts[1], 'the horizontal inset is no longer zero').not.toBe('0')
  })
})

describe('the crowned plaque prints the numeral and nothing beside it (#2070)', () => {
  it('drops the ✦ that trailed the points figure', () => {
    // Ruled out by the owner.
    expect(render(), 'the dingbat beside the points numeral').not.toContain('✦')
  })
})

describe('the bunting replaces the barber ribbon (#2032)', () => {
  it('strings pennants under the band', () => {
    const html = render()
    // The shared `Bunting` primitive (WORLD_ZERO_STYLE §6). It measures its
    // container (#2728), so it renders empty here; flags are checked in
    // `wowBunting.test.tsx`.
    expect(html, 'the shared primitive hangs here').toContain('data-wow-bunting')
  })
})

describe('the balloon knights flank the sign-up (#2032)', () => {
  it.each(['desktop', 'mobile'] as const)('mounts exactly two bunches on %s', (formFactor) => {
    const html = render(formFactor)
    // `viewBox="0 0 44 56"` is `BalloonBunch`'s canvas.
    expect((html.match(/viewBox="0 0 44 56"/g) ?? []).length, formFactor).toBe(2)
  })

  it('keeps them out of every hit box on the card', () => {
    const html = render()
    // 44x44 targets may not overlap (design-fidelity.md): flex siblings,
    // outside the card-wide <Link>.
    const row = html.slice(html.lastIndexOf('</a>'))
    expect((row.match(/viewBox="0 0 44 56"/g) ?? []).length, 'both are below the link').toBe(2)
    expect(row, 'a flex row, so a knight cannot sit on the button').toContain('display:flex')
    expect(row.slice(row.indexOf('<button')), 'nothing absolute over the CTA').not.toContain('position:absolute')
  })
})
