/**
 * Field Stamp reachability on a short viewport (#1947), via inline styles. The
 * scrim scrolls on y and the card centres with `margin: auto`: a flex-centred
 * item that outgrows its scroller cannot be scrolled to its top.
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

import LevelUpPopup from '../LevelUpPopup'

// Level 1 / trailhead is the reported state.
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
    expect(scrim).not.toMatch(/(^|;)overflow:hidden/)
  })

  it('centres the card with auto margins, not align-items:center', () => {
    mocks.formFactor = factor
    const styles = styleAttrs(render())
    const scrim = styles.find((s) => s.includes('position:fixed'))
    expect(scrim).toContain('align-items:flex-start')
    expect(scrim).not.toContain('align-items:center')
    expect(styles.some((s) => /(^|;)margin:auto/.test(s))).toBe(true)
  })

  it('keeps the continue button focusable at open so keyboard users reach it', () => {
    mocks.formFactor = factor
    const html = render()
    // The browser scrolls a focused element into view.
    expect(html).toMatch(/<button[^>]*autofocus/i)
  })
})
