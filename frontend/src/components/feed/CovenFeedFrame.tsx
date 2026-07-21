import type { ReactNode } from 'react'

import i18n from '../../i18n'

/**
 * Cozy Coven feed frame — the neutral feed card dressed as a tiny
 * "whimsy.exe" desktop window. A pink title bar (traffic-light dots + a script
 * window name + a sparkle charm) sits above a notepad/paper body that holds the
 * untouched card `{children}`. Frame-level chrome only: this is a thin wrapper,
 * not a reimplementation of the card. Flips with the theme via the Coven tokens.
 */

const WIN_BORDER = 'var(--faction-coven-win-border)'
const TITLE_FROM = 'var(--faction-coven-title-from)'
const TITLE_TO = 'var(--faction-coven-title-to)'
const TITLE_TEXT = 'var(--faction-coven-title-text)'
const NOTEPAD_BG = 'var(--faction-coven-notepad-bg)'
const NOTEPAD_BORDER = 'var(--faction-coven-notepad-border)'
const SCRIPT = 'var(--faction-coven-card-font)'
const PINK = 'var(--faction-coven)'

/** The four-point sparkle charm — Coven's signature window flourish. */
function Sparkle({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z"
        fill={PINK}
      />
    </svg>
  )
}

export default function CovenFeedFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 13,
        overflow: 'hidden',
        border: `2px solid ${WIN_BORDER}`,
        boxShadow: `0 6px 18px color-mix(in srgb, ${PINK} 22%, transparent)`,
      }}
    >
      {/* title bar — traffic-light dots + window name + sparkle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: window title bar, sized around its 9px traffic-light dots and raw script type.
          gap: 7,
          // eslint-disable-next-line local/no-raw-style-values -- ornament: window title bar, sized around its 9px traffic-light dots and raw script type.
          padding: '7px 12px',
          background: `linear-gradient(180deg, ${TITLE_FROM}, ${TITLE_TO})`,
          borderBottom: `2px solid ${WIN_BORDER}`,
        }}
      >
        {[
          'var(--faction-coven-scrap-deep)',
          'var(--faction-coven-tape)',
          'var(--faction-coven-ivy-leaf)',
        ].map((lightColor) => (
          <span
            key={lightColor}
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: lightColor,
              border: '1.2px solid rgba(255,255,255,0.7)',
            }}
          />
        ))}
        <span
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            // eslint-disable-next-line local/no-raw-style-values -- ornament: lead between the hand-lettered window title and its sparkle.
            gap: 6,
            fontFamily: SCRIPT,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered window title on the frame chrome
            fontSize: 17,
            color: TITLE_TEXT,
          }}
        >
          {i18n.t('feed:identity.coven.windowTitle')}
          <Sparkle size={12} />
        </span>
      </div>

      {/* notepad/paper body — holds the neutral card, untouched */}
      <div
        style={{
          background: NOTEPAD_BG,
          borderTop: `1px solid ${NOTEPAD_BORDER}`,
          padding: 'var(--space-md)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
