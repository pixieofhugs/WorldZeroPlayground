/**
 * WOW — THE LISTS (#895). The vocabulary the duel surfaces share.
 *
 * WOW's duel conceit is a tourney joust: a gold-framed enclosure (the *lists*),
 * a checkered barrier rail, a rosette for the rider who comes from elsewhere,
 * and a ribbon that goes home with the loser. This module holds the pieces that
 * would otherwise be drawn twice — the token names, the barrier band, the
 * rosette, and (until #1909) the seal's voice resolver. Its one consumer is
 * `WowDuelSealConfirm` — one responsive component, both form factors.
 *
 * WHY THE ROSETTE IS THE ONLY PLACE THE OPPONENT'S COLOUR LANDS
 * -------------------------------------------------------------
 * `accent`/`soft` are the OPPONENT's faction tokens (#310) and can be ANY hue —
 * S.N.I.D.E.'s near-black, Singularity's petrol blue, Everymen's red. Inside
 * cream-and-gold chrome most of those are illegible as a text ground and several
 * are illegible as an ink. The kit's answer, and the load-bearing decision of
 * its rail: hold the foreign colour as a RING and a BAR — never behind or as
 * text. `Rosette` is that ring, drawn once. Nothing in these two seal frames
 * paints text in `accent` or on `accent`, and `__tests__/wowSealAccent.test.tsx`
 * holds them to it (#1115). The same rule at the praxis-detail call site is
 * `pages/praxisDetail/__tests__/duelCardOpponentInk.test.tsx` (#1308).
 *
 * MOTION lives in index.css behind `prefers-reduced-motion: no-preference`
 * (`.wow-duel-twinkle`, `.wow-duel-ribbon-sway`), never inline. Both marks reuse
 * keyframes the crest already declares.
 */
import type { CSSProperties } from 'react'

import { factionRoleVar } from '../../utils/factionRoles'

/* -------------------------------------------------------------------------- */
/* Tokens                                                                     */
/* -------------------------------------------------------------------------- */

/** The lists ground — the page the seal and the rail are struck on. */
export const LISTS_BG = 'var(--faction-wow-duel-lists-bg)'
/** The barrier gold: frame, rules and band. Theme-invariant, and never an ink. */
export const HOLD = 'var(--faction-wow-duel-hold)'
/** The winning tile's gold. */
export const CHAMPION = 'var(--faction-wow-duel-champion)'
/** The losing tile's plum — the ribbon. */
export const RIBBON = 'var(--faction-wow-duel-ribbon)'
/** The modal wash behind the seal. */
export const SCRIM = 'var(--faction-wow-duel-scrim)'

/**
 * The chronicle's own inks, reused so the lists read as the same faction.
 *
 * THE ROLES, ASKED FOR DIRECTLY, BECAUSE THIS MODULE HAS NO ROOT (#2674). Lane
 * 04's surfaces spread `factionRoleVars(slug, '<their own prefix>')` on a root
 * and read `var(--<prefix>-ink, …)` below it. This file is the tourney
 * vocabulary, mounted under `WowDuelSealConfirm` and its two form factors —
 * consumers outside this lane — so there is no one root here to declare a
 * prefix on, and a prefix shared between the vocabulary and every host would BE
 * the `--kit-*` namespace the law declines. `factionRoleVar` answers one role
 * with no all-or-nothing seam to protect, and returns the identical strings
 * these constants held before.
 */
export const INK = factionRoleVar('wow', 'ink')
export const MUTED = factionRoleVar('wow', 'quiet')
export const PLUM = factionRoleVar('wow', 'accent')
export const EYEBROW_INK = 'var(--faction-wow-accent-deep)'
export const PANEL = 'var(--faction-wow-chronicle-panel)'
/**
 * `MUTED`, walked down for `PANEL` (#1173). The metadata olive is measured on
 * the CREAM — 4.76:1 on `LISTS_BG`, which is why it stays the ink for the seal's
 * kicker and the rail's metadata — but the parchment plate inset into it is a
 * second sheet, and the same olive reads **4.24:1** there, under the 4.5:1 the
 * 18px stakes copy owes (WORLD_ZERO_STYLE §3, the `-plate-quiet` shape). This is
 * 4.86 / 5.94. Anything the skins mount ON the plate takes it; anything on the
 * lists ground keeps `MUTED`.
 */
export const PANEL_QUIET = 'var(--faction-wow-chronicle-quiet)'
export const PANEL_BORDER = 'var(--faction-wow-border)'
export const SHADOW = 'var(--faction-wow-chronicle-shadow)'
/**
 * Parchment that stays parchment in BOTH themes (light: the panel; dark: the
 * card ink) — what the plum ribbon band carries. 6.34:1 light, 7.39:1 dark.
 */
export const ON_RIBBON = 'var(--faction-wow-stamp-chip-text)'
/**
 * The sheet-measured warning ink (#694), which `--color-danger` is not: the
 * global red reads 4.40:1 on `LISTS_BG` in light, under the 4.5:1 an 18px
 * forfeit body owes, while this reads 6.45 / 10.30 (#1168). The red survives on
 * these surfaces only as a RULE beside the paragraph, carrying no text.
 */
export const NOTICE = 'var(--faction-wow-card-notice)'

export const DISPLAY_FONT = factionRoleVar('wow', 'face') // MedievalSharp
export const BODY_FONT = 'var(--faction-wow-body-font)' // Lora

/**
 * The section eyebrow WOW's composer already uses (`WowEditPraxis`) — one
 * archetype, one label voice. Label tier by role, so it keeps its own token
 * rather than inheriting anything from a wrapper (#769).
 */
export const listsEyebrow: CSSProperties = {
  display: 'block',
  fontFamily: DISPLAY_FONT,
  fontSize: 'var(--text-md)',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: EYEBROW_INK,
}

/* -------------------------------------------------------------------------- */
/* Ornament                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The barrier: the gold/plum checker rail that fences the lists. Every WOW
 * surface in the kit wears it as its top edge, so both duel frames do too.
 * `height` is ornament geometry, hence raw pixels (WORLD_ZERO_STYLE §4a).
 */
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

/**
 * The opponent's rosette — a gilt ring with the foreign faction's colour laid
 * inside it as a band, on a cream field. This is the ONLY shape the opponent's
 * hue takes on a WOW duel surface, and the reason a hostile hue never has to
 * clear a contrast floor here: it is a ring, not a ground and not an ink.
 *
 * All geometry is raw pixels on purpose — a drawn mark, not layout (§4a).
 */
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

/**
 * The ✦ the kit twinkles beside every heading, and the ❦ that sways on the
 * ribbon line. Both are dingbats used as icons — ornament, so `aria-hidden`, and
 * their size is illustration rather than text (§4a's ornament hatch).
 */
export function ListsSpark({ color = HOLD }: { color?: string }) {
  return (
    <span aria-hidden className="wow-duel-twinkle" style={{ color, lineHeight: 1.3 }}>
      ✦
    </span>
  )
}

/**
 * U+2766 FLORAL HEART — WOW's ribbon glyph, the mark its composer and its
 * chronicle already use. Held in a constant rather than written as JSX text
 * because `i18next/no-literal-string`'s ornament allowlist covers the kit's
 * other glyph (U+2726) but not this one, and widening a shared lint config from
 * a faction slice is the wrong trade. An expression child is not JSX text, so
 * the rule never fires — the same dodge `EphemeristsDuelSealConfirm` makes by
 * passing its ❦ as a prop.
 */
const RIBBON_GLYPH = '❦'

export function ListsRibbonMark({ color = PLUM }: { color?: string }) {
  return (
    <span aria-hidden className="wow-duel-ribbon-sway" style={{ color, lineHeight: 1.2 }}>
      {RIBBON_GLYPH}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* Voice — RETIRED (#1909)                                                    */
/* -------------------------------------------------------------------------- */

/*
 * `useWowSealVoice` and its `WowSealVoice` shape lived here. It supplied nine
 * strings on top of the shared, faction-neutral seal copy: a KICKER above the
 * heading ("Enter the lists · submitting proof" / "Leave the lists · yielding
 * the joust"), the two section headings ("The Roster", "The Stakes"), the ribbon
 * line, and the two button labels per mode.
 *
 * ALL NINE ARE ON THE COPY AUDIT'S CUT LIST. WOW was the only faction with a
 * voiced duel seal — the other eight skins already rendered `useDuelSealCopy`'s
 * neutral strings alone — and the audit ruled the surface generic. The buttons
 * are the interesting case: dropping the override is the whole fix, because
 * `SealActions` already falls back to `duelSeal.confirm` / `duelSeal.cancel`,
 * and `useDuelSealCopy` already carries the forfeit-mode label.
 *
 * What the hook DELIBERATELY did not own — `heading`, `body`, `note`, `danger` —
 * was never WOW's, and `duelSkinSlots.test.tsx` still enforces that. Nothing
 * about that contract changes here; there is simply nothing left on top of it.
 */
