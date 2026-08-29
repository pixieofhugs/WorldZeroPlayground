import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { LevelUnlock } from '../api/gameConfig'
import { useFormFactor } from '../hooks/useFormFactor'

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
 *
 * Both skins make their fixed scrim the scroller so the CTA stays reachable on
 * a short viewport (#1947 — reported at 361x233, where the card is roughly
 * twice the viewport's height). ponytail: the CTA keeps a plain `autoFocus`,
 * so on a viewport too short for the card the popup opens scrolled to the
 * button — the celebration is a scroll up, and the primary control is never
 * off-screen. Suppressing that with `focus({ preventScroll: true })` would
 * need a ref and buys a first paint nobody can act on.
 */

/**
 * The site's one rainbow, as scalars — the na spectrum's seven stops (#1220,
 * ADR-0066). Five surfaces in this file index it: the rank text's per-letter
 * bars, the rule, the seal's hard wedges, the ability-row dingbats and the
 * confetti. A gradient token cannot be indexed, which is why these are stops
 * and not `--faction-default-rainbow`.
 *
 * It cycled `underline-1…6` — a separate six-hue brand palette — until #1219
 * collapsed the two. Two things changed with the move: the cycle is SEVEN long
 * (the seal's wedge is `360 / RAINBOW.length`, not a hardcoded 60deg), and the
 * popup now flips with the theme, where the brand palette had no dark form. The
 * comments below are the hues as declared; the old set's were wrong — it
 * labelled its last stop "red" over `#f97316` orange.
 */
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
 * One wedge of the seal's ring, in degrees. Derived rather than written down:
 * the ring is a hard-wedge conic with one wedge per stop, so a stop added or
 * removed must not leave a gap.
 *
 * The seal composes its wedges here rather than reading a token because there is
 * no wedge token left to read: #1127 deleted the hard-wedge conic and pointed
 * every circular na surface at the smooth `--faction-default-rainbow-conic`,
 * after all seven light stops turned out to sit inside a 0.184 luminance band —
 * hard edges between near-equal values merge, so the wedges read as one band.
 *
 * This seal keeps its edges anyway, and the difference is real rather than a
 * grandfathering. The wedge boundaries here ARE landmarks, which is why the seal
 * can legitimately start at `from -60deg` and place a hue deliberately; a
 * seam-closed smooth ramp has no feature at any angle for an offset to place,
 * which is the same reasoning that retired the Task Crown's `from 90deg`
 * (#1213). A surface that genuinely wants wedges composes them from
 * `--faction-default-stop-*`, as this one does — cheap since #1220 made the
 * stops indexable, and better than the file carrying a second gradient token
 * for a single caller.
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
          // A REAL space, not an empty fixed-width box (#1043) — the same fix
          // PageTitle takes, which slices its heading the same way. LATENT
          // here: every rank in progression.json is a single word, so this
          // branch does not run today. It runs the day one isn't.
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
          {/* The LVL caption and numeral are engraved into the wax seal; both
              sizes draw the stamp rather than set readable text. */}
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
  // ADR-0031: unlock carries a copy key; the progression.json catalog owns the
  // words.
  const { t } = useTranslation('progression')
  const isSense = ability.kind === 'sense'
  const name = tKey(t, `unlocks.${ability.key}.name`)
  const desc = tKey(t, `unlocks.${ability.key}.desc`)
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

// Confetti is deterministic (no RNG): fixed count, spread + timing derived from
// the index so SSR/tests are stable. Colors reuse the RAINBOW tokens. Under
// prefers-reduced-motion the pieces get no animation (they rest above the
// clipped scrim, so nothing falls) — see the scoped <style> below.
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

/**
 * Mobile skin of the Field Stamp popup (#519): full-bleed scrim, rainbow burst
 * seal, confetti, one CTA. Reuses the same props/catalog as the desktop popup —
 * the watcher/queue is untouched. See docs/design/mobile (moments section).
 */
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
        // Short viewports (#1947): the scrim is the scroller. `flex-start` +
        // `margin: auto` on the card, NOT `align-items: center` — a centred
        // flex item that outgrows its scroll container overflows off BOTH
        // ends and the top end is unreachable, because a scroll container
        // cannot scroll to negative offsets. Auto margins centre while there
        // is free space and collapse to 0 when there isn't, so the seal stays
        // reachable above and the CTA below.
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'var(--space-xl)',
        // Was `overflow: hidden` — that clipped the confetti AND pinned the
        // card. The confetti layer clips itself, so only the y-axis changes.
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
          // Centres inside the scrolling scrim; collapses to 0 when the card
          // is taller than the viewport (#1947). See the scrim's note.
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

  // Mobile form factor gets the full-bleed celebration skin (#519); desktop is
  // unchanged. Same props/queue — only the presentation differs.
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
        // §4a asymmetric-inset exception: the tie at 28 rounds DOWN so the card
        // keeps its heavier top inset instead of flattening to a uniform box.
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
        // Same short-viewport contract as the mobile skin (#1947): the scrim
        // scrolls, the card centres with auto margins rather than
        // `align-items: center`, which would put the top of an over-tall card
        // out of scroll range. A laptop window dragged short — or any zoomed
        // desktop — hits this too.
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
