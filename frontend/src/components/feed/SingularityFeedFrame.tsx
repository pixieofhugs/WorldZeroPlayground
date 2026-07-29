import i18n from '../../i18n'
import FeedChassisBand from './FeedChassisBand'
import type { FeedFrameProps } from './feedFrameProps'

/**
 * Singularity per-faction feed frame (surface #12, SPEC-faction-ui-profile.md).
 *
 * A thin presentational WRAPPER: it skins the neutral feed card (`children`) as a
 * terminal dispatch/printout. The frame supplies only the OUTER chrome — a
 * terminal-black slab with a signal-blue inset border, scanline overlay, and a
 * `>` boot/prompt strip header — and renders the unchanged card as the printout
 * body. It must NOT reimplement the card internals; those arrive via `children`.
 *
 * #1194: the boot strip is now also the CHASSIS BAND. It used to be
 * `aria-hidden` in one piece, which cannot hold the dismiss control — the
 * keyboard and screen-reader route to the archive is the whole reason that
 * control exists (swipe alone would not provide one). The two ornamental spans
 * carry `aria-hidden` individually instead, so the strip's chrome stays silent
 * while the kicker, the time and the ✕ are announced.
 *
 * Singularity is ALWAYS DARK: its --faction-singularity-* tokens are identical in
 * both themes, so the container styles itself with them and reads as a terminal
 * regardless of the global theme — it never mutates data-theme.
 */

// Token shorthands — every color resolves to a --faction-singularity-* var.
const VOID = 'var(--faction-singularity-card-bg)' // terminal black
const PHOSPHOR = 'var(--faction-singularity-card-accent)' // green
const SIGNAL = 'var(--faction-singularity-card-muted)' // blue chrome
const BORDER_HARD = 'var(--faction-singularity-border-hard)'
const FONT = 'var(--font-faction-terminal)'

// color-mix helper for the blue chrome at reduced opacity.
const signal = (pct: number): string =>
  `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`

export default function SingularityFeedFrame({
  kicker,
  time,
  tag,
  archive,
  children,
}: FeedFrameProps) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${BORDER_HARD}`,
        background: VOID,
        color: PHOSPHOR,
        fontFamily: FONT,
      }}
    >
      {/* inset signal border */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 4,
          border: `1px solid ${signal(18)}`,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />
      {/* scanline overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 3,
          background:
            'repeating-linear-gradient(to bottom,transparent,transparent 2px,rgba(255,255,255,0.018) 2px,rgba(255,255,255,0.018) 4px)',
        }}
      />

      {/* boot/prompt strip header — also the chassis band */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: boot/prompt chrome strip, sized around its raw 7px terminal type.
          padding: '6px 12px',
          borderBottom: `1px solid ${signal(20)}`,
          // eslint-disable-next-line local/no-raw-style-values -- ornament: terminal chrome strip, part of the frame illustration
          fontSize: 7,
          letterSpacing: '0.18em',
          color: signal(55),
          textTransform: 'uppercase',
        }}
      >
        <span aria-hidden="true" style={{ color: PHOSPHOR, flexShrink: 0 }}>
          {'>'}
        </span>
        <span aria-hidden="true" style={{ flexShrink: 0 }}>
          {i18n.t('feed:frame.singularity.masthead')}
        </span>
        <div style={{ flex: 1, minWidth: 0, color: signal(75) }}>
          <FeedChassisBand kicker={kicker} time={time} tag={tag} archive={archive} />
        </div>
      </div>

      {/* printout body — the neutral card, unchanged */}
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </div>
  )
}
