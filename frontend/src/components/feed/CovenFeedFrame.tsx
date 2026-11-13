import type { CSSProperties } from 'react'
import { CovenSigil } from '../sigil/CovenSigil'
import { useFormFactor } from '../../hooks/useFormFactor'
import type { FeedFrameProps } from './feedFrameProps'
import { FeedRowSkinContext, type FeedRowSkin } from './feedRowSkin'
import { factionBodyVars } from '../../utils/factionBodyFace'

/**
 * Cozy Coven — the candlelit slip as a feed card (#1197): a pink→lavender head
 * under a gold twinkle field, a braided seam, and the near-white slip carrying the
 * shared payload. Grenze Gotisch for the kind, Caveat for the chrome.
 *
 * Chassis only (#1194): `FeedItemSlot` owns the archive; `children` is the
 * faction-blind body and pads itself (hence no padding here). Slots are placed by
 * hand, not `FeedChassisBand`, so the kicker can take the display face; the head is
 * tinted slip-ink so the currentColor archive control inherits it. No faction-name
 * label (#1192 decision 5).
 *
 * One responsive component (ADR-0056 / 0058 / 0063). Colours are slip/ward tokens
 * already measured against the gradient's worst stop (index.css, #1023 / #1031).
 */

/**
 * The actor's name takes `-slip-deep` (#1341): raw `--faction-coven` is 2.98:1 on
 * the ward stock; deep is 4.70 / 9.77:1. The bright `-slip-pk` is ornament only.
 */
const DEEP = 'var(--faction-coven-slip-deep)'
const ROW_SKIN: FeedRowSkin = { ink: { actor: DEEP } }

const CHROME = 'var(--font-faction-script)' /* Caveat */
const DISPLAY = 'var(--font-faction-witch)' /* Grenze Gotisch */

interface SizeSet {
  headPad: string
  kickerSize: string
  /** The head's faction mark, raw px (§4a). */
  charm: number
}

const SIZES: Record<'desktop' | 'mobile', SizeSet> = {
  desktop: {
    headPad: 'var(--space-sm) var(--space-lg)',
    kickerSize: 'var(--text-xl)',
    charm: 20,
  },
  mobile: {
    headPad: 'var(--space-sm) var(--space-md)',
    kickerSize: 'var(--text-lg)',
    charm: 18,
  },
}

/** Small-caps chrome voice — every small mark on the head speaks in it. */
const CAPTION: CSSProperties = {
  fontFamily: CHROME,
  fontWeight: 700,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  flexShrink: 0,
}

/**
 * A four-point twinkle, arms `r` wide and 2.6r long; `(x, y)` is the TOP point
 * (same construction as the spell slip's stars).
 */
function twinkle(x: number, y: number, r: number): string {
  const arm = r * 2.6
  return `M${x} ${y - arm} l${r} ${arm} ${arm} ${r} -${arm} ${r} -${r} ${arm} -${r} -${arm} -${arm} -${r} ${arm} -${r} z`
}

/**
 * Three gold sparks confined to the head band (fewer than the task card's six:
 * dozens of these per scroll). Each is its own square svg placed by percentage —
 * a stretched sheet would flatten the stars on a fluid-width card.
 */
const SPARKS: { left: string; top: number; size: number; opacity: number }[] = [
  { left: '7%', top: 5, size: 9, opacity: 0.85 },
  { left: '58%', top: 19, size: 6, opacity: 0.7 },
  { left: '86%', top: 8, size: 10, opacity: 0.8 },
]

function SparkField() {
  return (
    <span
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {SPARKS.map((spark) => (
        <svg
          key={spark.left}
          width={spark.size}
          height={spark.size}
          viewBox="0 0 20 20"
          style={{ position: 'absolute', left: spark.left, top: spark.top, opacity: spark.opacity }}
        >
          {/* top point at y = 10 − arm, so the star is centred */}
          <path d={twinkle(10, 8.4, 1.6)} fill="var(--faction-coven-slip-gold)" />
        </svg>
      ))}
    </span>
  )
}


export default function CovenFeedFrame({ kicker, time, tag, archive, children }: FeedFrameProps) {
  const formFactor = useFormFactor()
  const size = SIZES[formFactor]

  return (
    <article
      data-form-factor={formFactor}
      style={{ ...factionBodyVars("coven"),
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        borderRadius: 16,
        border: '1.5px solid var(--faction-coven-slip-border)',
        background: 'var(--faction-coven-ward-card)',
        boxShadow: 'var(--faction-coven-slip-shadow)',
      }}
    >
      {/* The head: gradient band and all four chrome slots. */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          minWidth: 0,
          padding: size.headPad,
          background:
            'linear-gradient(112deg, var(--faction-coven-slip-from), var(--faction-coven-slip-mid) 38%, var(--faction-coven-slip-lav) 78%, var(--faction-coven-slip-vio))',
          color: 'var(--faction-coven-slip-ink)',
        }}
      >
        <SparkField />

        <span style={{ position: 'relative', zIndex: 1, display: 'flex', flexShrink: 0 }}>
          <CovenSigil size={size.charm} color={DEEP} />
        </span>

        {/* kicker — the card's only kind label, in the coven's display face */}
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: DISPLAY,
            fontSize: size.kickerSize,
            lineHeight: 1.1,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'inherit',
          }}
        >
          {kicker}
        </span>

        {/* tag — nullable, pinned in a gold hairline */}
        {tag && (
          <span
            style={{
              ...CAPTION,
              position: 'relative',
              zIndex: 1,
              fontSize: 'var(--text-base)',
              padding: '0 var(--space-xs)',
              borderRadius: 999,
              border: '1px solid var(--faction-coven-slip-gold)',
              color: 'inherit',
            }}
          >
            {tag}
          </span>
        )}

        {/* time — the card's only timestamp (#1194) */}
        <span
          style={{
            ...CAPTION,
            position: 'relative',
            zIndex: 1,
            marginLeft: 'auto',
            color: 'var(--faction-coven-slip-label)',
          }}
        >
          {time}
        </span>

        {/* archive — placed, never rebuilt; `null` means no stand-in. */}
        <span style={{ position: 'relative', zIndex: 1, display: 'flex', flexShrink: 0 }}>
          {archive}
        </span>
      </div>

      {/* `.cvn-braid` owns its pigments and dark override (a data-URI SVG can't
          resolve `var(--…)`). */}
      <span
        className="cvn-braid"
        aria-hidden="true"
        style={{ display: 'block', width: '100%' }}
      />

      {/* The slip: faction-blind body, no padding or ink of ours. */}
      <div style={{ position: 'relative' }}>
        <FeedRowSkinContext.Provider value={ROW_SKIN}>{children}</FeedRowSkinContext.Provider>
      </div>
    </article>
  )
}
