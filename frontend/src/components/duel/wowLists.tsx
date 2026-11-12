/**
 * WOW, the lists (#895): token names and ornament for `WowDuelSealConfirm`.
 *
 * The opponent's colour (#310) can be any hue, so it lands only in `Rosette`,
 * never as or behind text (#1115, held by `__tests__/wowSealAccent.test.tsx`;
 * detail page: `duelCardOpponentInk.test.tsx`). Motion lives in index.css behind
 * `prefers-reduced-motion`, never inline.
 */
import type { CSSProperties } from 'react'

import { factionRoleVar } from '../../utils/factionRoles'

export const LISTS_BG = 'var(--faction-wow-duel-lists-bg)'
/** Barrier gold: theme-invariant, never an ink. */
export const HOLD = 'var(--faction-wow-duel-hold)'
export const CHAMPION = 'var(--faction-wow-balloon-5)'
export const SCRIM = 'var(--faction-wow-duel-scrim)'

/** `factionRoleVar`, not a prefix: this module has no root (#2674). */
export const INK = factionRoleVar('wow', 'ink')
export const MUTED = factionRoleVar('wow', 'quiet')
export const PLUM = factionRoleVar('wow', 'accent')
export const EYEBROW_INK = 'var(--faction-wow-accent-deep)'
export const PANEL = 'var(--faction-wow-chronicle-panel)'
/** `MUTED` for text on `PANEL`, where olive is 4.24:1 (#1173). */
export const PANEL_QUIET = 'var(--faction-wow-accent-deep)'
export const PANEL_BORDER = 'var(--faction-wow-border)'
export const SHADOW = 'var(--faction-wow-chronicle-shadow)'
/** Warning ink; `--color-danger` is 4.40:1 on `LISTS_BG` (#1168). */
export const NOTICE = 'var(--faction-wow-card-notice)'

export const DISPLAY_FONT = factionRoleVar('wow', 'face') // MedievalSharp
export const BODY_FONT = 'var(--faction-wow-body-font)' // Lora

/** `WowEditPraxis`'s eyebrow; owns its label-tier size (#769). */
export const listsEyebrow: CSSProperties = {
  display: 'block',
  fontFamily: DISPLAY_FONT,
  fontSize: 'var(--text-md)',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: EYEBROW_INK,
}

/** Gold/plum checker barrier; raw px as ornament (WORLD_ZERO_STYLE §4a). */
export function ListsBand({ height = 9, unit = 11 }: { height?: number; unit?: number }) {
  return (
    <div
      aria-hidden
      style={{
        height,
        background: `repeating-linear-gradient(90deg, ${HOLD} 0 ${unit}px, ${PLUM} ${unit}px ${unit * 2}px)`,
      }}
    />
  )
}

/** The only shape the opponent's hue takes here: a ring, so no contrast floor. */
export function Rosette({
  accent,
  soft,
  size = 26,
}: {
  accent: string
  soft: string
  size?: number
}) {
  return (
    <span
      aria-hidden
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: soft,
        border: `2px solid ${accent}`,
        boxShadow: `0 0 0 2px ${LISTS_BG}, 0 0 0 3.5px ${HOLD}`,
      }}
    />
  )
}

/** Ornament dingbat, so `aria-hidden` (§4a). */
export function ListsSpark({ color = HOLD }: { color?: string }) {
  return (
    <span aria-hidden className="wow-duel-twinkle" style={{ color, lineHeight: 1.3 }}>
      ✦
    </span>
  )
}

/** A constant, not JSX text: `i18next/no-literal-string` allows ✦ but not ❦. */
const RIBBON_GLYPH = '❦'

export function ListsRibbonMark({ color = PLUM }: { color?: string }) {
  return (
    <span aria-hidden className="wow-duel-ribbon-sway" style={{ color, lineHeight: 1.2 }}>
      {RIBBON_GLYPH}
    </span>
  )
}
