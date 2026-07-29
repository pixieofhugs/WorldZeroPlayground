/**
 * Everymen feed frame — the "printed union dispatch slip" chrome.
 *
 * A thin presentational wrapper (surface #12, SPEC-faction-ui-profile.md): it
 * skins the neutral feed card (`children`) in the Everymen physical archetype —
 * a red masthead spine on the left edge, manila paper stock with a screen-print
 * halftone wash, and an inked border with gold trim. It does NOT reimplement the
 * card internals (avatar/actor/badge/task-ref) — those arrive via `{children}`
 * and render untouched in the content area.
 *
 * #1194: the slip gains a CHASSIS BAND at the head of the content area — a ruled
 * dispatch line carrying the kicker, the tag, the time and the dismiss control in
 * paper ink. The stock is otherwise unchanged; Everymen's dress issue restyles it.
 *
 * Theme-aware via everymen.css tokens (light + dark both defined); no document
 * theme mutation. Visual intent from design-system/templates/everymen.
 */
import FeedChassisBand from './FeedChassisBand'
import type { FeedFrameProps } from './feedFrameProps'

export default function EverymenFeedFrame({
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
        display: 'flex',
        overflow: 'hidden',
        background: 'var(--everymen-paper)',
        color: 'var(--everymen-paper-text)',
        border:
          '1px solid color-mix(in srgb, var(--everymen-paper-text) 26%, transparent)',
        borderLeft: 'none',
        boxShadow:
          '0 1px 0 rgba(0,0,0,0.04), 0 6px 16px -12px rgba(0,0,0,0.5)',
      }}
    >
      {/* red masthead spine with cream notches (union ribbon) */}
      <div
        aria-hidden
        style={{
          flexShrink: 0,
          width: 8,
          background: 'var(--everymen-red)',
          backgroundImage:
            'repeating-linear-gradient(180deg, transparent 0 13px, color-mix(in srgb, var(--everymen-cream) 55%, transparent) 13px 15px)',
          boxShadow:
            'inset -1px 0 0 color-mix(in srgb, var(--everymen-red-deep) 70%, transparent)',
        }}
      />

      {/* content area: paper texture + halftone wash behind the card body */}
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        {/* gold trim rule hugging the spine */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            insetBlock: 0,
            left: 0,
            width: 2,
            background: 'var(--everymen-gold)',
            opacity: 0.55,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* woven paper texture (burlap crosshatch + warm mottle) */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
            backgroundImage: [
              'repeating-linear-gradient(45deg, color-mix(in srgb, var(--everymen-paper-text) 7%, transparent) 0 1px, transparent 1px 4px)',
              'repeating-linear-gradient(-45deg, color-mix(in srgb, var(--everymen-paper-text) 5%, transparent) 0 1px, transparent 1px 4px)',
              'radial-gradient(130% 90% at 5% 0%, color-mix(in srgb, var(--everymen-cream) 18%, transparent), transparent 55%)',
              'radial-gradient(120% 85% at 100% 100%, color-mix(in srgb, var(--everymen-paper-deep) 65%, transparent), transparent 52%)',
            ].join(', '),
          }}
        />

        {/* screen-print halftone wash */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
            opacity: 0.06,
            backgroundImage:
              'radial-gradient(color-mix(in srgb, var(--everymen-ink) 100%, transparent) 0.7px, transparent 0.9px)',
            backgroundSize: '5px 5px',
          }}
        />

        {/* chassis band — the dispatch line at the head of the slip */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            color: 'var(--everymen-paper-text)',
            padding: 'var(--space-xs) var(--space-md) var(--space-xs) var(--space-lg)',
            borderBottom:
              '1px solid color-mix(in srgb, var(--everymen-paper-text) 22%, transparent)',
          }}
        >
          <FeedChassisBand kicker={kicker} time={time} tag={tag} archive={archive} />
        </div>

        {/* the neutral feed card, rendered above the chrome */}
        <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
      </div>
    </article>
  )
}
