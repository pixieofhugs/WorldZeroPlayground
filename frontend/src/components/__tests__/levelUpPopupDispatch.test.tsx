/** LevelUpPopup form-factor dispatch (#519): same props, desktop vs mobile skin. */
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
    expect(html).toContain('wz-lu-confetti')
    expect(html).toContain('Continue')
  })

  it('renders the unchanged desktop popup on desktop', () => {
    mocks.formFactor = 'desktop'
    const html = render()
    expect(html).not.toContain('data-form-factor="mobile"')
    expect(html).not.toContain('wz-lu-confetti')
    expect(html).toContain('width:372px')
  })
})
