import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { LevelUnlock } from '../api/gameConfig'

// Rank / unlock keys are runtime-dynamic (server-supplied), so they aren't the
// typed literals the scoped t() expects. Resolve through a plain-string view of
// t — the catalog still owns the words; only the compile-time key check is
// relaxed for these dynamic lookups.
function tKey(t: TFunction<'progression'>, key: string): string {
  const resolve = t as unknown as (k: string) => string
  return resolve(key)
}

/**
 * LevelUpPopup — World Zero "Field Stamp" level-up popup (design: docs/design/level-up/).
 * Self-contained inline-styled modal, matching EverymenVote / the feed modals.
 */

const RAINBOW = [
  'var(--underline-1)', // amber
  'var(--underline-2)', // magenta
  'var(--underline-3)', // indigo
  'var(--underline-4)', // teal
  'var(--underline-5)', // green
  'var(--underline-6)', // red
]

const INK = 'var(--color-text-primary)'
const PAPER = 'var(--color-bg-page)'
const MUTED = 'var(--color-text-secondary)'
const FAINT = 'var(--color-text-tertiary)'
const BORDER = 'var(--color-border-strong)'
const FONT_DISPLAY = 'var(--font-display)'
const FONT_BODY = 'var(--font-body)'

function RainbowText({ text, fontSize = 34 }: { text: string; fontSize?: number }) {
  let i = 0
  return (
    <h1
      style={{
        fontFamily: FONT_DISPLAY,
        fontStyle: 'italic',
        fontWeight: 500,
        lineHeight: 1.15,
        fontSize,
        color: INK,
        margin: 0,
      }}
    >
      {[...text].map((ch, idx) => {
        if (ch === ' ') {
          return <span key={idx} style={{ display: 'inline-block', width: '0.3em' }} />
        }
        const color = RAINBOW[i++ % RAINBOW.length]
        return (
          <span key={idx} style={{ borderBottom: `4px solid ${color}`, paddingBottom: 2 }}>
            {ch}
          </span>
        )
      })}
    </h1>
  )
}

function RainbowRule({ style }: { style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', width: '100%', height: 4, borderRadius: 2, overflow: 'hidden', ...style }}>
      {RAINBOW.map((c, idx) => (
        <span key={idx} style={{ flex: 1, background: c }} />
      ))}
    </div>
  )
}

function SealStamp({ level, sealRing = 'rainbow' }: { level: number; sealRing?: 'rainbow' | 'ink' }) {
  const ringBg =
    sealRing === 'ink'
      ? INK
      : 'conic-gradient(from -60deg,' +
        RAINBOW.map((c, idx) => `${c} ${idx * 60}deg ${(idx + 1) * 60}deg`).join(',') +
        ')'
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          padding: 6,
          transform: 'rotate(-7deg)',
          background: ringBg,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: PAPER,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `inset 0 0 0 2px ${PAPER}, inset 0 0 0 3px ${INK}`,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 8, letterSpacing: '0.24em', color: INK }}>
              LVL
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontSize: 38, lineHeight: 0.85, color: INK }}>
              {level}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AbilityRow({ ability, color }: { ability: LevelUnlock; color: string }) {
  // ADR-0031: unlock carries a copy key; the progression.json catalog owns the
  // words.
  const { t } = useTranslation('progression')
  const isSense = ability.kind === 'sense'
  const name = tKey(t, `unlocks.${ability.key}.name`)
  const desc = tKey(t, `unlocks.${ability.key}.desc`)
  return (
    <div style={{ display: 'flex', gap: 13, textAlign: 'left', alignItems: 'flex-start', marginBottom: 15 }}>
      <span style={{ fontSize: 15, lineHeight: 1.1, flex: 'none', width: 18, textAlign: 'center', color }}>
        {isSense ? '✦' : '■'}
      </span>
      <div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 7, letterSpacing: '0.18em', textTransform: 'uppercase', color: FAINT, marginBottom: 3 }}>
          {isSense ? 'A curious sense' : 'New ability'}
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontSize: 16, lineHeight: 1.2, color: INK }}>
          {name}
        </div>
        {desc && (
          <div style={{ fontFamily: FONT_BODY, fontSize: 9, lineHeight: 1.55, color: MUTED, marginTop: 3 }}>
            {desc}
          </div>
        )}
      </div>
    </div>
  )
}

export interface LevelUpPopupProps {
  level: number
  /** ADR-0031: a progression.json rank key, resolved to prose here. */
  rankKey: string
  abilities: LevelUnlock[]
  onContinue: () => void
  continueLabel?: string
  sealRing?: 'rainbow' | 'ink'
  dimBackdrop?: boolean
}

export default function LevelUpPopup({
  level,
  rankKey,
  abilities,
  onContinue,
  continueLabel = 'Continue',
  sealRing = 'rainbow',
  dimBackdrop = true,
}: LevelUpPopupProps) {
  const { t } = useTranslation('progression')
  const rank = tKey(t, `ranks.${rankKey}`)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onContinue()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onContinue])

  const card = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        width: 372,
        maxWidth: '100%',
        boxSizing: 'border-box',
        background: PAPER,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: '30px 28px 24px',
        boxShadow: '0 18px 46px -14px rgba(26,18,9,0.5)',
        textAlign: 'center',
        fontFamily: FONT_BODY,
      }}
    >
      <SealStamp level={level} sealRing={sealRing} />

      <p style={{ fontFamily: FONT_BODY, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: FAINT, margin: '0 0 4px' }}>
        Level Reached
      </p>
      <RainbowText text={rank} />

      <RainbowRule style={{ margin: '14px 0 16px' }} />

      <div style={{ fontFamily: FONT_BODY, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: FAINT, marginBottom: 14 }}>
        Now Unlocked
      </div>

      {abilities.map((ab, idx) => (
        <AbilityRow key={idx} ability={ab} color={RAINBOW[idx % RAINBOW.length]} />
      ))}

      <button
        type="button"
        autoFocus
        onClick={onContinue}
        style={{
          marginTop: 20,
          width: '100%',
          fontFamily: FONT_BODY,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontSize: 11,
          padding: '0.6rem 1.4rem',
          border: 'none',
          background: INK,
          color: PAPER,
          cursor: 'pointer',
          transition: 'opacity 150ms',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        {continueLabel}
      </button>
    </div>
  )

  if (!dimBackdrop) return card

  return (
    <div
      onClick={onContinue}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 1000,
        background: 'radial-gradient(ellipse at 50% 42%, rgba(26,18,9,0.30), rgba(26,18,9,0.66))',
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>{card}</div>
    </div>
  )
}
