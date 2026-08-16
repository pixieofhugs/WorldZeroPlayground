/**
 * Field Stamp reachability on a short viewport (#1947).
 *
 * Seam: the RENDERED MARKUP's inline style strings. This repo's harness is
 * renderToStaticMarkup with no jsdom, so there is no layout and an overflow
 * cannot be measured — what can be pinned is the rule that makes the overflow
 * scrollable, which the popup carries inline (the whole file is inline-styled;
 * nothing here lives in index.css).
 *
 * Two properties per skin, and they only work as a pair:
 *   - the fixed scrim scrolls on the y-axis, so an over-tall card is reachable;
 *   - the card centres with `margin: auto`, NOT `align-items: center`. A
 *     centred flex item that outgrows its scroll container overflows off both
 *     ends and the start end cannot be scrolled to, so `align-items: center`
 *     on a scrolling scrim would leave the top of the stamp unreachable.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'
import type { LevelUnlock } from '../../api/gameConfig'

const mocks = vi.hoisted(() => ({
  formFactor: 'desktop' as 'mobile' | 'desktop',
}))

vi.mock('../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// Imported after the mock is registered.
import LevelUpPopup from '../LevelUpPopup'

// Level 1 / trailhead is the reported state: the onboarding arc's first win.
const abilities: LevelUnlock[] = [
  { key: 'duels', kind: 'ability' },
  { key: 'shortcut_sense', kind: 'sense' },
]

function render(): string {
  return renderToStaticMarkup(
    <LevelUpPopup level={1} rankKey="trailhead" abilities={abilities} onContinue={() => {}} />,
  )
}

/** Inline `style="..."` bodies, in document order. */
function styleAttrs(html: string): string[] {
  return [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1].replace(/&quot;/g, '"'))
}

describe.each(['mobile', 'desktop'] as const)('Field Stamp on a short viewport (%s)', (factor) => {
  it('gives the scrim a y-axis scroller so the CTA is reachable', () => {
    mocks.formFactor = factor
    const scrim = styleAttrs(render()).find((s) => s.includes('position:fixed'))
    expect(scrim).toBeDefined()
    expect(scrim).toContain('overflow-y:auto')
    // The bug was the scrim pinning its content: no scroller at all on
    // desktop, and a hard `overflow:hidden` on mobile.
    expect(scrim).not.toMatch(/(^|;)overflow:hidden/)
  })

  it('centres the card with auto margins, not align-items:center', () => {
    mocks.formFactor = factor
    const styles = styleAttrs(render())
    const scrim = styles.find((s) => s.includes('position:fixed'))
    expect(scrim).toContain('align-items:flex-start')
    expect(scrim).not.toContain('align-items:center')
    // Some element between the scrim and the stamp takes the auto margins.
    expect(styles.some((s) => /(^|;)margin:auto/.test(s))).toBe(true)
  })

  it('keeps the continue button focusable at open so keyboard users reach it', () => {
    mocks.formFactor = factor
    const html = render()
    // autoFocus lands on the CTA; in a scroll container the browser scrolls a
    // focused element into view, which is what makes it reachable at 233px.
    expect(html).toMatch(/<button[^>]*autofocus/i)
  })
})
