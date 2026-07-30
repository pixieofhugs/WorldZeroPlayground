import type { CSSProperties } from 'react'
import i18n from '../../i18n'
import type { FeedFrameProps } from './feedFrameProps'

/**
 * Singularity activity-feed CHASSIS — the session window (surface #12,
 * SPEC-faction-ui-profile.md; epic #1192 / #1202, design project 19d52c65,
 * `Singularity Comment + Update Cards.dc.html`).
 *
 * ## What this layer is, and what it is not
 *
 * The middle of the three layers #1194 split apart. `FeedItemSlot` above owns
 * the ARCHIVE — the ✕, the touch swipe, the immediate write, the six-second
 * undo strip — and is faction-blind; the body below (`FeedRowContent` or one of
 * the three companions) is faction-blind too. This file owns the physical
 * chrome and nothing else, and it is the only layer the dress issue rewrote.
 * Nothing here re-implements a behaviour: `archive` arrives as a finished node
 * and is PLACED.
 *
 * ## The window
 *
 * Two tiers, which is how the sheet draws it:
 *
 *   1. the WINDOW BAR — three lamps, the process name, a right-aligned hex
 *      handle. Pure ornament, `aria-hidden` piece by piece.
 *   2. the PROMPT LINE — `>` then the kicker, the tag as a boxed readout, the
 *      time, and the dismiss control. Every functional slot lives here.
 *
 * The split is deliberate and not merely decorative. #1243 §10/§11 record the
 * two mistakes available at this seam: the boot strip used to be `aria-hidden`
 * **in one piece**, which cannot hold the dismiss control (that control is the
 * whole keyboard and screen-reader route to the archive — swipe is touch-only),
 * and a functional control must never land under an ornament. So the ornament
 * tier holds no control and the control tier holds no ornament.
 *
 * ## Why the shared body's ink is repointed for the subtree
 *
 * WORLD_ZERO_STYLE §6: Singularity is dark in BOTH themes. The shared body
 * paints itself from the global `--color-*` set, which was measured against the
 * app's near-white page, so on this chassis its light-theme halves land at
 * roughly 1:1 — the headline, the action clause and every companion's decline
 * button were dark ink on near-black. This is the case the style doc names
 * ("Singularity had to, being near-black in both themes where the shared
 * component assumed light-in-light"), and the same repoint `ON_CHASSIS_INK`
 * makes on `SingularityPraxisDetail`. Every value is an existing Singularity
 * token, so the `[data-theme="dark"]` cascade still flips the phosphor
 * underneath and no `dark ?` branch appears anywhere.
 *
 * A repoint rather than a fork, because the body is shared and faction-blind by
 * contract — and rather than a bag of ink props, because none of the four slots
 * is "the one that was meant": the whole body is on the wrong ground here.
 *
 * ## Copy: none of the sheet's words ship
 *
 * Epic #1192 — the Unaffiliated sheet is the copy spec and the other eight are
 * visual chassis only. `kicker`, `tag` and `time` arrive already resolved from
 * the neutral `feed` catalog and are printed verbatim. The one string this file
 * names is `feed:frame.singularity.masthead`, which F2 authored for exactly this
 * slot. The costume lowercases the tag and letter-spaces the kicker; it
 * mutilates no word, the same call `SingularityPraxisDetail`'s `LABEL` makes in
 * the other direction.
 *
 * ## Always dark, in both themes
 *
 * No `dark ?` branch. `--faction-singularity-term-*` is a two-theme contract
 * whose halves are BOTH near-black — the cascade flips the phosphor, never the
 * chassis (WORLD_ZERO_STYLE §6). The sheet ships no light inversion and none is
 * invented here. Nothing new was declared in `index.css`: every value below is a
 * Singularity token that already shipped with the v2 task card.
 */

const MONO = 'var(--faction-singularity-card-font)' /* Share Tech Mono */

const BG = 'var(--faction-singularity-term-bg)' /* the chassis */
const CHROME = 'var(--faction-singularity-term-chrome)' /* the window bar */
const PANEL = 'var(--faction-singularity-term-panel)'
const READOUT = 'var(--faction-singularity-term-readout)' /* a boxed well */
const INK = 'var(--faction-singularity-term-ink)'
const BRIGHT = 'var(--faction-singularity-term-bright)'
const DIM = 'var(--faction-singularity-term-dim)'
const BLUE = 'var(--faction-singularity-term-blue)'
const BORDER = 'var(--faction-singularity-term-border)'
const HAIR = 'var(--faction-singularity-term-hair)'
const NOTICE = 'var(--faction-singularity-card-notice)'

/**
 * The repoint the shared body gets. See the docblock — the global inks were
 * chosen against a near-white page and this chassis is near-black in both
 * themes, so their light halves are unreadable here.
 *
 * `--color-danger` goes to the sheet-measured NOTICE for the same reason #1168
 * routed the duel seal's forfeit BODY there: `#dc2626` measures 4.02:1 on the
 * terminal, which clears a 3:1 heading floor and fails a 4.5:1 text one, and
 * every danger-inked string in a feed companion (the withdraw affordance, the
 * error line) is text at label tier.
 *
 * `--color-text-on-accent` is deliberately NOT repointed. The companions' accept
 * buttons paint it on `--badge-duel` (#dc2626), where white is 4.83:1 and the
 * near-black `-on-accent` would be 3.92:1 — repointing it to fix one pairing
 * would break the other. The one place it is genuinely wrong on this chassis is
 * `FeedRowContent`'s monogram disc (white on the phosphor fill, 1.74:1), and
 * that needs an ink seam on the shared body, which is outside this footprint.
 */
const ON_CHASSIS_INK = {
  '--color-text-primary': BRIGHT,
  '--color-text-secondary': INK,
  '--color-text-tertiary': DIM,
  '--color-border': HAIR,
  '--color-danger': NOTICE,
  '--color-bg-surface': PANEL,
  '--color-bg-surface-alt': READOUT,
} as CSSProperties

/** Terminal label voice — every small mark on the chrome speaks in it. */
const LABEL: CSSProperties = {
  fontFamily: MONO,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}

/** One of the window bar's three lamps. Ornament geometry, so raw px. */
function Lamp({ fill }: { fill: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: 8, height: 8, borderRadius: '50%', background: fill, display: 'block' }}
    />
  )
}

/**
 * The card KIND's process handle, drawn right-aligned on the window bar as the
 * sheet draws it. Ornament, never copy and never an item identifier: it is a
 * stable hash of the kind label, so every "Task completed" card prints the same
 * handle — which is what a terminal would do, one process per kind.
 *
 * It is NOT derived from the timestamp, on purpose. A relative time ticks over
 * ("2h ago" → "3h ago"), so a handle mixed with it would mutate under the
 * reader — an identifier that changes while identifying nothing is a lie the
 * sheet never told.
 */
function processHandle(kicker: string): string {
  let hash = 0x9e37
  for (let index = 0; index < kicker.length; index += 1) {
    hash = (hash * 31 + kicker.charCodeAt(index)) & 0xffff
  }
  return `0x${hash.toString(16).toUpperCase().padStart(4, '0')}`
}

export default function SingularityFeedFrame({
  kicker,
  time,
  tag,
  archive,
  children,
}: FeedFrameProps) {
  return (
    <article
      style={{
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        borderRadius: 8,
        border: `1px solid ${BORDER}`,
        background: BG,
        color: INK,
        fontFamily: MONO,
        boxShadow: 'var(--faction-singularity-term-shadow)',
      }}
    >
      {/*
        The standing raster — a fixed scrim, no motion. The travelling `.sg-scan`
        sweep the task card and the detail page carry is deliberately ABSENT
        here: it animates `top`, a layout property, and a feed is a long list
        where twenty simultaneous copies is a per-frame cost a single card never
        pays. The sheet draws one card; the feed draws a page of them.
      */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 3,
          background:
            'repeating-linear-gradient(0deg, var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)',
        }}
      />

      {/* TIER 1 — the window bar. Ornament only; it holds no control. */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-xs) var(--space-md)',
          background: CHROME,
          borderBottom: `1px solid ${HAIR}`,
        }}
      >
        <span aria-hidden="true" style={{ display: 'flex', gap: 'var(--space-xs)', flexShrink: 0 }}>
          <Lamp fill={DIM} />
          <Lamp fill={BLUE} />
          <Lamp fill={BRIGHT} />
        </span>
        <span
          aria-hidden="true"
          style={{
            ...LABEL,
            fontSize: 'var(--text-base)',
            color: DIM,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {i18n.t('feed:frame.singularity.masthead')}
        </span>
        <span
          aria-hidden="true"
          style={{ ...LABEL, fontSize: 'var(--text-base)', color: BLUE, marginLeft: 'auto' }}
        >
          {processHandle(kicker)}
        </span>
      </div>

      {/*
        TIER 2 — the prompt line. All four chrome slots the contract names live
        here (`kicker`, `tag`, `time`, `archive`); `color: BRIGHT` on the row is
        what tints the archive node, which paints in `currentColor`.
      */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          flexWrap: 'wrap',
          padding: 'var(--space-xs) var(--space-md)',
          borderBottom: `1px dashed ${HAIR}`,
          color: BRIGHT,
        }}
      >
        <span aria-hidden="true" style={{ color: BLUE, flexShrink: 0 }}>
          {'>'}
        </span>
        <span
          style={{
            ...LABEL,
            fontSize: 'var(--text-md)',
            color: BRIGHT,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {kicker}
        </span>
        {tag && (
          /*
            The sheet draws its status marks as boxed lowercase readouts on the
            blue well. The catalog's word is printed unchanged — `lowercase` is
            CSS costume, not a rewrite — and the only tag that exists today is
            "Still waiting": an archived invite or challenge stays unanswered
            (ADR-0066).
          */
          <span
            style={{
              ...LABEL,
              fontSize: 'var(--text-base)',
              textTransform: 'lowercase',
              letterSpacing: '0.08em',
              color: BLUE,
              background: READOUT,
              border: `1px solid ${BORDER}`,
              padding: '0 var(--space-xs)',
              flexShrink: 0,
            }}
          >
            {tag}
          </span>
        )}
        <span style={{ ...LABEL, fontSize: 'var(--text-base)', color: DIM, marginLeft: 'auto' }}>
          {time}
        </span>
        {archive}
      </div>

      {/* The printout — the shared body, unchanged, on repointed ink. */}
      <div style={{ position: 'relative', zIndex: 2, ...ON_CHASSIS_INK }}>{children}</div>
    </article>
  )
}
