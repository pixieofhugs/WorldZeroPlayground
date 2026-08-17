/**
 * The modal family's scrim and cast are tokens, never a raw rgba (#1609).
 *
 * Seam: the RENDERED MARKUP's inline style strings — the same seam
 * `levelUpPopupScroll.test.tsx` and `sheetsEscapeShell.test.tsx` use, because
 * this repo's harness is renderToStaticMarkup with no jsdom and these popups
 * are inline-styled end to end. A CSS-file assertion would prove the token is
 * DECLARED; only the markup proves it is READ.
 *
 * Two rules, and they are separate decisions:
 *   - the scrim dims at `--color-overlay-strong`, the one answer to "the page
 *     behind is unavailable" that ConfirmDialog, FeedBankFullModal,
 *     CharacterSwitcherSheet and `.filter-factions__scrim` already share. The
 *     popup family had a warm `rgba(26,18,9,…)` vignette instead, at two depths
 *     in this one file.
 *   - the card's lift paints `--color-cast-shadow`, which unlike the scrim HAS
 *     a `[data-theme="dark"]` counterpart, because a black smudge on a
 *     near-black page is nothing at all.
 *
 * LevelUpPopup carries all four in one component (mobile scrim + card, desktop
 * scrim + card), which is why it is the fixture rather than a sixth mock of the
 * composer state the other dialogs need.
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
    // The whole point: a raw rgba has no [data-theme="dark"] counterpart and
    // cannot get one without the `dark ? a : b` ternary the style system bans.
    expect(render(factor)).not.toMatch(/rgba?\(\s*[\d.]/)
  })
})
