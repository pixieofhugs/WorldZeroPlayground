/**
 * Task cards v3, Phase 2 — WOW's ornament pass (#2032, epic #2027).
 *
 * The seam is the kit's usual one (`taskCardsV3.test.tsx`): the rendered markup
 * of the skin via `renderToStaticMarkup`, plus — for the one claim a render
 * cannot settle — the declared token values read straight out of `index.css`,
 * the way `factionContrast.test.ts` and `wowBalloonPlate.test.ts` do. This repo
 * has no jsdom, so effects never run and geometry is out of reach; what is
 * checkable is which elements exist and which inline declarations they carry.
 *
 * THE DEFECT THIS OPENED ON. Phase 1 (#2029) gave WOW a masthead and painted
 * its mark `--faction-wow-stamp-total` — a token that is #8a5a16 in LIGHT while
 * the band it stands on is the theme-INVARIANT `--faction-wow-plum-surface`
 * (#7a4a9e). That pairing measures **1.08:1**: on a light-theme card the mark
 * was, to the eye, not there. #2032's "the header sigil takes the gold of the
 * wordmark" is the fix, and the first test below is the one that was red.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
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

const CSS_PATH = fileURLToPath(new URL('../../../index.css', import.meta.url))
const THEMES = readThemes(readFileSync(CSS_PATH, 'utf8'))
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
      // The wordmark is `--text-title` (24px) MedievalSharp, which is WCAG
      // large text; the mark is a graphical object, whose 1.4.11 floor is the
      // same 3:1. So one number covers both.
      `${GILT} on ${PLUM} in ${theme} — ${formatRatio(ratio)}`,
    ).toBeGreaterThanOrEqual(AA_LARGE)
  })

  it('paints the mark, the wordmark and the rule with that one token', () => {
    const head = band(render())
    // Three, not one: #2032 says the sigil takes the gold OF THE WORDMARK, and
    // a card that gilded only the lettering would leave the mark at the 1.08:1
    // `--faction-wow-stamp-total` Phase 1 shipped. The third is the band's
    // restored bottom rule, which is the same gold for the same reason.
    expect(
      head.match(new RegExp(`var\\(${GILT}\\)`, 'g')) ?? [],
      'mark + wordmark + rule',
    ).toHaveLength(3)
    expect(head, 'the burnt stamp gold is not a banner ink').not.toContain('--faction-wow-stamp-total')
  })

  it.each(['desktop', 'mobile'] as const)('insets the band SYMMETRICALLY on %s', (formFactor) => {
    // #2070 walks #2032's edge-breaking sigil back one step: zero horizontal
    // inset read as touching the card's 2px frame, so the mark moves inboard
    // with visible clearance. What survives unchanged is the reason #2032 gave
    // for zeroing BOTH sides — #2029 centres the title on the band's CONTENT
    // box, so an inset on the left alone walks the wordmark off the card's
    // centreline by half of it.
    //
    // So this asserts the SHAPE, not the rung: a two-value `padding` shorthand,
    // whose second value is the horizontal one and applies to both sides. A
    // future re-tune of the rung keeps the test green; an asymmetric
    // three-or-four-value shorthand does not.
    const head = band(render(formFactor))
    const padding = /padding:([^;"]+)/.exec(head)?.[1]?.trim()
    expect(padding, 'the band declares its own inset').toBeDefined()
    // Every rung is a single `var(--space-*)` with no internal spaces, so a
    // plain split is enough to count the shorthand's values.
    const parts = padding!.split(' ')
    expect(parts, `two values, so left === right — got "${padding}"`).toHaveLength(2)
    expect(parts[1], 'the horizontal inset is no longer zero').not.toBe('0')
  })
})

describe('the crowned plaque prints the numeral and nothing beside it (#2070)', () => {
  it('drops the ✦ that trailed the points figure', () => {
    // Not in the design and ruled out by the owner. The glyph was this card's
    // only `no-raw-style-values` suppression, so the disable comment goes with
    // it — a suppression that outlives its line is how the ratchet leaks. (That
    // half is not assertable here: a lint directive is source, not markup.)
    expect(render(), 'the dingbat beside the points numeral').not.toContain('✦')
  })
})

describe('the bunting replaces the barber ribbon (#2032)', () => {
  it('strings pennants under the band and retires the 6px stripe', () => {
    const html = render()
    expect(html, 'the strip the flags replace').not.toContain('--faction-wow-quest-ribbon')
    // Derived, not redrawn: WORLD_ZERO_STYLE §6 says a faction's device is one
    // primitive, and `wowOrnament`'s `Bunting` is it.
    //
    // This used to count the pennants' mitred borders. Since #2728 the strip
    // MEASURES its container and draws as many whole flags as fit, so under this
    // harness — `renderToStaticMarkup`, no DOM, effects never run — a rendered
    // strip is an EMPTY strip by construction and there are no borders to count.
    // `data-wow-bunting` is the primitive's handle, which a hand-rolled twin
    // would not carry; the flags themselves are checked at their own seam in
    // `factionMarks/__tests__/wowBunting.test.tsx`.
    expect(html, 'the shared primitive hangs here').toContain('data-wow-bunting')
  })
})

describe('the balloon knights flank the sign-up (#2032)', () => {
  it.each(['desktop', 'mobile'] as const)('mounts exactly two bunches on %s', (formFactor) => {
    const html = render(formFactor)
    // `viewBox="0 0 44 56"` is `BalloonBunch`'s own canvas — two of them is the
    // pair, and any other count is either the retired corner bunch still hanging
    // on or a redraw. The pair ships on BOTH form factors now: the corner a
    // 340px card does not have was the old reason to drop them, and the CTA row
    // is not that corner.
    expect((html.match(/viewBox="0 0 44 56"/g) ?? []).length, formFactor).toBe(2)
  })

  it('keeps them out of every hit box on the card', () => {
    const html = render()
    // 44x44 targets may not overlap (design-fidelity.md). The knights are flex
    // SIBLINGS of the button — never absolutely positioned over it — and they
    // sit outside the card-wide <Link>, so there is nothing to overlap and
    // nothing for a screen reader to read.
    const row = html.slice(html.lastIndexOf('</a>'))
    expect((row.match(/viewBox="0 0 44 56"/g) ?? []).length, 'both are below the link').toBe(2)
    expect(row, 'a flex row, so a knight cannot sit on the button').toContain('display:flex')
    expect(row.slice(row.indexOf('<button')), 'nothing absolute over the CTA').not.toContain('position:absolute')
  })
})
