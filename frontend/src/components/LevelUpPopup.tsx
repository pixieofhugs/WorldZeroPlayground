import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { LevelUnlock } from '../api/gameConfig'
import { useFormFactor } from '../hooks/useFormFactor'

// Rank/unlock keys are server-supplied, so relax t()'s compile-time key check.
function tKey(t: TFunction<'progression'>, key: string): string {
  const resolve = t as unknown as (k: string) => string
  return resolve(key)
}

/**
 * "Field Stamp" level-up popup (docs/design/level-up/). Both skins scroll the
 * scrim so the CTA stays reachable on short viewports (#1947).
 * ponytail: plain `autoFocus` opens a too-short viewport scrolled to the CTA;
 * `focus({ preventScroll: true })` + a ref if the top must show first.
 */

/** The na spectrum's seven stops (#1220, ADR-0066), as scalars so they can be indexed. */
const RAINBOW = [
  'var(--faction-default-stop-1)', // red
  'var(--faction-default-stop-2)', // orange
  'var(--faction-default-stop-3)', // yellow
  'var(--faction-default-stop-4)', // green
  'var(--faction-default-stop-5)', // teal
  'var(--faction-default-stop-6)', // blue
  'var(--faction-default-stop-7)', // magenta
]

/**
 * One seal wedge, in degrees, derived so stops can change without a gap. The seal
 * deliberately keeps hard wedges (composed from the stops; no wedge token since
 * #1127) because its edges are landmarks the `from -60deg` offset places (#1213).
 */
const SEAL_WEDGE_DEGREES = 360 / RAINBOW.length

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
          // A REAL space, not a fixed-width box (#1043), as PageTitle.
          return <span key={idx}>{' '}</span>
        }
        const color = RAINBOW[i++ % RAINBOW.length]
        return (
          <span key={idx} style={{
            borderBottom: `4px solid ${color}`,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: lead between the glyph and its drawn 4px underline bar; a rung detaches the bar
            paddingBottom: 2,
          }}>
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
        RAINBOW.map(
          (c, idx) =>
            `${c} ${(idx * SEAL_WEDGE_DEGREES).toFixed(2)}deg ${((idx + 1) * SEAL_WEDGE_DEGREES).toFixed(2)}deg`,
        ).join(',') +
        ')'
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-lg)' }}>
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: this inset *is* the seal's drawn ring band, not spacing
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
            {/* eslint-disable-next-line local/no-raw-style-values -- ornament: engraved LVL caption on the wax seal */}
            <div style={{ fontFamily: FONT_BODY, fontSize: 8, letterSpacing: '0.24em', color: INK }}>
              LVL
            </div>
            {/* eslint-disable-next-line local/no-raw-style-values -- ornament: engraved numeral on the wax seal */}
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
  // ADR-0031: the catalog owns the words.
  const { t, i18n } = useTranslation('progression')
  const isSense = ability.kind === 'sense'
  const name = tKey(t, `unlocks.${ability.key}.name`)
  // Some unlocks are name-only (#2770); a missing key would throw in dev.
  const descKey = `unlocks.${ability.key}.desc`
  const desc = i18n.exists(`progression:${descKey}`) ? tKey(t, descKey) : ''
  return (
    <div style={{ display: 'flex', gap: 'var(--space-md)', textAlign: 'left', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
      {/* eslint-disable-next-line local/no-raw-style-values -- ornament: sense/ability dingbat used as a bullet */}
      <span style={{ fontSize: 15, lineHeight: 1.1, flex: 'none', width: 18, textAlign: 'center', color }}>
        {isSense ? '✦' : '■'}
      </span>
      <div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 'var(--text-md)', letterSpacing: '0.18em', textTransform: 'uppercase', color: FAINT, marginBottom: 'var(--space-xs)' }}>
          {isSense ? t('popup.senseEyebrow') : t('popup.abilityEyebrow')}
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontSize: 'var(--text-content)', lineHeight: 1.2, color: INK }}>
          {name}
        </div>
        {desc && (
          <div style={{ fontFamily: FONT_BODY, fontSize: 'var(--text-content)', lineHeight: 1.55, color: MUTED, marginTop: 'var(--space-xs)' }}>
            {desc}
          </div>
        )}
      </div>
    </div>
  )
}

// Deterministic confetti (no RNG) for stable tests. Reduced-motion: no animation, pieces rest off-screen.
const CONFETTI_COUNT = 16

function MobileConfetti() {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes wz-lu-confetti-fall { to { transform: translateY(680px) rotate(420deg); } }
        .wz-lu-confetti { top: -14px; }
        @media (prefers-reduced-motion: no-preference) {
          .wz-lu-confetti {
            animation-name: wz-lu-confetti-fall;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }
        }
      `}</style>
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
        const left = (i * 6.3 + 4) % 96
        const duration = (2.4 + (i % 5) * 0.5).toFixed(1)
        const delay = ((i % 7) * 0.35).toFixed(2)
        return (
          <i
            key={i}
            className="wz-lu-confetti"
            style={{
              position: 'absolute',
              left: `${left}%`,
              width: 8,
              height: 9,
              borderRadius: 2,
              background: RAINBOW[i % RAINBOW.length],
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          />
        )
      })}
    </div>
  )
}

/** Mobile skin of the Field Stamp popup (#519). See docs/design/mobile. */
function MobileLevelUpCard({
  level,
  rank,
  abilities,
  continueText,
  onContinue,
  sealRing,
}: {
  level: number
  rank: string
  abilities: LevelUnlock[]
  continueText: string
  onContinue: () => void
  sealRing: 'rainbow' | 'ink'
}) {
  const { t } = useTranslation('progression')
  return (
    <div
      onClick={onContinue}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        // Short viewports (#1947): scrim scrolls; card centres with `margin: auto`,
        // NOT `align-items: center`, whose overflow off the top is unreachable.
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'var(--space-xl)',
        // The confetti layer clips itself.
        overflowX: 'hidden',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        background: 'var(--color-overlay-strong)',
      }}
    >
      <MobileConfetti />
      <div
        role="dialog"
        aria-modal="true"
        data-form-factor="mobile"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 340,
          // See the scrim's note (#1947).
          margin: 'auto',
          boxSizing: 'border-box',
          background: PAPER,
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          padding: 'var(--space-xl)',
          textAlign: 'center',
          fontFamily: FONT_BODY,
          boxShadow: '0 20px 50px -12px var(--color-cast-shadow)',
        }}
      >
        <SealStamp level={level} sealRing={sealRing} />

        <p style={{ fontFamily: FONT_BODY, fontSize: 'var(--text-md)', textTransform: 'uppercase', letterSpacing: '0.15em', color: FAINT, margin: '0 0 var(--space-xs)' }}>
          {t('popup.levelReached')}
        </p>
        <RainbowText text={rank} fontSize={28} />

        <RainbowRule style={{ margin: 'var(--space-lg) 0' }} />

        <div style={{ fontFamily: FONT_BODY, fontSize: 'var(--text-md)', letterSpacing: '0.2em', textTransform: 'uppercase', color: FAINT, marginBottom: 'var(--space-lg)' }}>
          {t('popup.nowUnlocked')}
        </div>

        {abilities.map((ab, idx) => (
          <AbilityRow key={idx} ability={ab} color={RAINBOW[idx % RAINBOW.length]} />
        ))}

        <button
          type="button"
          autoFocus
          onClick={onContinue}
          style={{
            marginTop: 'var(--space-xl)',
            width: '100%',
            fontFamily: FONT_BODY,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontSize: 'var(--text-lg)',
            padding: 'var(--space-md) var(--space-xl)',
            border: 'none',
            borderRadius: 10,
            background: INK,
            color: PAPER,
            cursor: 'pointer',
          }}
        >
          {continueText}
        </button>
      </div>
    </div>
  )
}

interface LevelUpPopupProps {
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
  continueLabel,
  sealRing = 'rainbow',
  dimBackdrop = true,
}: LevelUpPopupProps) {
  const { t } = useTranslation('progression')
  const formFactor = useFormFactor()
  const continueText = continueLabel ?? t('popup.continue')
  const rank = tKey(t, `ranks.${rankKey}`)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onContinue()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onContinue])

  if (formFactor === 'mobile') {
    return (
      <MobileLevelUpCard
        level={level}
        rank={rank}
        abilities={abilities}
        continueText={continueText}
        onContinue={onContinue}
        sealRing={sealRing}
      />
    )
  }

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
        // §4a asymmetric-inset exception: keeps the heavier top inset.
        padding: 'var(--space-2xl) var(--space-xl) var(--space-xl)',
        boxShadow: '0 18px 46px -14px var(--color-cast-shadow)',
        textAlign: 'center',
        fontFamily: FONT_BODY,
      }}
    >
      <SealStamp level={level} sealRing={sealRing} />

      <p style={{ fontFamily: FONT_BODY, fontSize: 'var(--text-md)', textTransform: 'uppercase', letterSpacing: '0.15em', color: FAINT, margin: '0 0 var(--space-xs)' }}>
        {t('popup.levelReached')}
      </p>
      <RainbowText text={rank} />

      <RainbowRule style={{ margin: 'var(--space-lg) 0' }} />

      <div style={{ fontFamily: FONT_BODY, fontSize: 'var(--text-md)', letterSpacing: '0.2em', textTransform: 'uppercase', color: FAINT, marginBottom: 'var(--space-lg)' }}>
        {t('popup.nowUnlocked')}
      </div>

      {abilities.map((ab, idx) => (
        <AbilityRow key={idx} ability={ab} color={RAINBOW[idx % RAINBOW.length]} />
      ))}

      <button
        type="button"
        autoFocus
        onClick={onContinue}
        style={{
          marginTop: 'var(--space-xl)',
          width: '100%',
          fontFamily: FONT_BODY,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontSize: 'var(--text-md)',
          padding: 'var(--space-sm) var(--space-xl)',
          border: 'none',
          background: INK,
          color: PAPER,
          cursor: 'pointer',
          transition: 'opacity 150ms',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        {continueText}
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
        // Same short-viewport contract as the mobile skin (#1947).
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'var(--space-xl)',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        zIndex: 1000,
        background: 'var(--color-overlay-strong)',
      }}
    >
      <div style={{ margin: 'auto' }} onClick={(e) => e.stopPropagation()}>{card}</div>
    </div>
  )
}
