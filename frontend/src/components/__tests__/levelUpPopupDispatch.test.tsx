/**
 * LevelUpPopup form-factor dispatch (#519). The watcher/queue and the diff
 * logic are unchanged (see levelUpWatcher.test.ts) — this pins that the SAME
 * props render the desktop popup on desktop and the full-bleed celebration skin
 * on mobile. useFormFactor is mocked; rendered via renderToStaticMarkup (this
 * repo has no jsdom — see vite.config.ts).
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

const abilities: LevelUnlock[] = [
  { key: 'duels', kind: 'ability' },
  { key: 'shortcut_sense', kind: 'sense' },
]

function render(): string {
  return renderToStaticMarkup(
    <LevelUpPopup level={4} rankKey="warden" abilities={abilities} onContinue={() => {}} />,
  )
}

describe('LevelUpPopup form-factor dispatch', () => {
  it('renders the mobile celebration skin on mobile (full-bleed scrim + confetti + one CTA)', () => {
    mocks.formFactor = 'mobile'
    const html = render()
    expect(html).toContain('data-form-factor="mobile"')
    // Confetti pieces are present as the whimsical burst layer.
    expect(html).toContain('wz-lu-confetti')
    // Reused catalog copy, not a raw string.
    expect(html).toContain('Continue')
  })

  it('renders the unchanged desktop popup on desktop', () => {
    mocks.formFactor = 'desktop'
    const html = render()
    expect(html).not.toContain('data-form-factor="mobile"')
    expect(html).not.toContain('wz-lu-confetti')
    // Desktop keeps the fixed 372px card width marker.
    expect(html).toContain('width:372px')
  })
})
