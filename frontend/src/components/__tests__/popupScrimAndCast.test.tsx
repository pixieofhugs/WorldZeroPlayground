/**
 * The modal family's scrim and cast are tokens, never a raw rgba (#1609), read
 * off the markup. Scrim: `--color-overlay-strong`, shared by every modal. Cast:
 * `--color-cast-shadow`, which has a dark-theme counterpart. LevelUpPopup has
 * both scrims and cards in one component.
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

const abilities: LevelUnlock[] = [{ key: 'duels', kind: 'ability' }]

function render(factor: 'mobile' | 'desktop'): string {
  mocks.formFactor = factor
  return renderToStaticMarkup(
    <LevelUpPopup level={1} rankKey="trailhead" abilities={abilities} onContinue={() => {}} />,
  )
}

/** Inline `style="..."` bodies, in document order. */
function styleAttrs(html: string): string[] {
  return [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1].replace(/&quot;/g, '"'))
}

describe.each(['mobile', 'desktop'] as const)('level-up popup paint (%s)', (factor) => {
  it('dims the page behind at --color-overlay-strong', () => {
    const scrim = styleAttrs(render(factor)).find((s) => s.includes('position:fixed'))
    expect(scrim).toBeDefined()
    expect(scrim).toContain('var(--color-overlay-strong)')
  })

  it('casts the card lift from --color-cast-shadow', () => {
    const cast = styleAttrs(render(factor)).find((s) => s.includes('box-shadow'))
    expect(cast).toBeDefined()
    expect(cast).toContain('var(--color-cast-shadow)')
  })

  it('writes no raw colour anywhere in the popup', () => {
    // A raw rgba cannot follow the dark theme without a banned ternary.
    expect(render(factor)).not.toMatch(/rgba?\(\s*[\d.]/)
  })
})
