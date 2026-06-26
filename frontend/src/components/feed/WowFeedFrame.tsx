import type { ReactNode } from 'react'

/**
 * Warriors of Whimsy feed frame — the neutral feed card dressed as a tiny
 * "whimsy.exe" desktop window. A pink title bar (traffic-light dots + a script
 * window name + a sparkle charm) sits above a notepad/paper body that holds the
 * untouched card `{children}`. Frame-level chrome only: this is a thin wrapper,
 * not a reimplementation of the card. Flips with the theme via the WoW tokens.
 */

const WIN_BORDER = 'var(--faction-wow-win-border)'
const TITLE_FROM = 'var(--faction-wow-title-from)'
const TITLE_TO = 'var(--faction-wow-title-to)'
const TITLE_TEXT = 'var(--faction-wow-title-text)'
const NOTEPAD_BG = 'var(--faction-wow-notepad-bg)'
const NOTEPAD_BORDER = 'var(--faction-wow-notepad-border)'
const SCRIPT = 'var(--faction-wow-card-font)'
const PINK = 'var(--faction-wow)'

/** The four-point sparkle charm — WoW's signature window flourish. */
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

export default function WowFeedFrame({ children }: { children: ReactNode }) {
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
          gap: 7,
          padding: '7px 12px',
          background: `linear-gradient(180deg, ${TITLE_FROM}, ${TITLE_TO})`,
          borderBottom: `2px solid ${WIN_BORDER}`,
        }}
      >
        {[
          'var(--faction-wow-scrap-deep)',
          'var(--faction-wow-tape)',
          'var(--faction-wow-ivy-leaf)',
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
            gap: 6,
            fontFamily: SCRIPT,
            fontSize: 17,
            color: TITLE_TEXT,
          }}
        >
          whimsy.exe
          <Sparkle size={12} />
        </span>
      </div>

      {/* notepad/paper body — holds the neutral card, untouched */}
      <div
        style={{
          background: NOTEPAD_BG,
          borderTop: `1px solid ${NOTEPAD_BORDER}`,
          padding: 12,
        }}
      >
        {children}
      </div>
    </div>
  )
}
