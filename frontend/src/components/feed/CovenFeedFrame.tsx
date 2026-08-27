import type { CSSProperties } from 'react'
import { CovenSigil } from '../sigil/CovenSigil'
import { useFormFactor } from '../../hooks/useFormFactor'
import type { FeedFrameProps } from './feedFrameProps'
import { FeedRowSkinContext, type FeedRowSkin } from './feedRowSkin'

/**
 * Cozy Coven — THE CANDLELIT SLIP, as a feed card (dress issue #1197, epic
 * #1192).
 *
 * The chassis is a leaf torn off the same stock as the v2 task card (#1023) and
 * the candlelit ward (#1031): a pink→lavender gradient head under a gold twinkle
 * field, a braided thread seam, and a near-white slip below it carrying the
 * shared payload. Grenze Gotisch names the card's kind, Quicksand speaks the
 * chrome, gold is the only non-pink note.
 *
 * THIS REPLACES the lo-fi `coven.exe` window this frame used to draw. That
 * metaphor was retired for Coven wholesale by ADR-0055 / ADR-0056 (task cards)
 * and again by #1031 (task detail); the feed card was the last surface still
 * wearing it. Two things follow, and both are deliberate:
 *   - the `--faction-coven-win-*` / `-notepad-*` tokens are NOT deleted — other
 *     surfaces still paint with them (index.css says so at the family's head);
 *   - `feed:identity.coven.windowTitle` ("coven.exe") is no longer read here —
 *     nor anywhere else: #1909's copy audit ruled the slot generic and deleted
 *     the key, and #2024 took the last surface that had held a copy of it. Epic
 *     #1192 decision 5 forbids a faction-name label on this surface anyway. The
 *     skin is the identification.
 *
 * WHAT THIS OWNS, AND ONLY THIS (the three-layer seam, #1194):
 *   FeedItemSlot      the archive — the ✕, the swipe, the write, the 6s undo
 *                     strip. Inherited whole; nothing here touches it.
 *   → this file       the CHASSIS: the four chrome slots and the stock they sit
 *                     on. It PLACES `archive`; it does not rebuild it.
 *   → children        the shared payload body (a row or one of the three
 *                     companions). Faction-blind, pads itself, and is NOT
 *                     re-inked here — hence no padding on the body wrapper.
 *
 * The four slots are placed by hand rather than through `FeedChassisBand`,
 * because the band's `.label-heading` sets the kicker in the shared label face
 * and this sheet wants it in the display face. Nothing is dropped: kicker · tag ·
 * time · archive all ride the head, and the head is tinted `--faction-coven-
 * slip-ink` so the archive control — which paints in `currentColor` — comes out
 * in the slip's own ink.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0056 / 0058 / 0063): `useFormFactor` picks a
 * size set, never a second file, and the card takes the width it is given.
 *
 * Colour is entirely `--faction-coven-slip-*` / `-ward-*`, which both themes
 * already declare; light/dark flips through the `[data-theme="dark"]` cascade,
 * never a ternary. Every ink on the head is already measured against the
 * gradient's worst stop — see the slip block in index.css (#1023) and the ward
 * block (#1031).
 */

/**
 * The one ink on the SLIP the head's measurements never covered (#1341). The
 * shared body paints the actor's name in the raw `--faction-coven` — a hue
 * measured against the app's neutral page — and on this near-white ward stock
 * that is 2.98:1, where 18px/700 owes 4.5:1 (700 weight only reaches the
 * large-text 3:1 exemption at 18.66px).
 *
 * `-slip-deep` is the same pink taken down for exactly this: it is already what
 * this card's points numeral and braid strands are struck in, and it is already
 * measured on this ground — 4.70:1 light / 9.77:1 dark. A repoint, not a mint.
 * The bright `-slip-pk` is ornament only and stays so; it is 3.25:1 as type.
 */
const DEEP = 'var(--faction-coven-slip-deep)'
const ROW_SKIN: FeedRowSkin = { ink: { actor: DEEP } }

const CHROME = 'var(--font-faction-rounded)' /* Quicksand */
const DISPLAY = 'var(--font-faction-witch)' /* Grenze Gotisch */

interface SizeSet {
  headPad: string
  kickerSize: string
  /** The head's faction mark. Ornament geometry, so a raw px number (§4a). */
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
 * A four-point twinkle, arms `r` wide and 2.6r long. `(x, y)` is the TOP point,
 * not the centre — the same construction the spell slip's stars use, so the two
 * marks are the same shape.
 */
function twinkle(x: number, y: number, r: number): string {
  const arm = r * 2.6
  return `M${x} ${y - arm} l${r} ${arm} ${arm} ${r} -${arm} ${r} -${r} ${arm} -${r} -${arm} -${arm} -${r} ${arm} -${r} z`
}

/**
 * The gold candle-spark field, confined to the head band so no spark ever lands
 * in copy. Three sparks, not the task card's six: this card is drawn dozens of
 * times down one scroll, and the slip's masthead field is a once-per-page mark.
 *
 * Each spark is its OWN square-viewBox svg placed by percentage, rather than one
 * stretched sheet across the band. The task card can afford
 * `preserveAspectRatio="none"` because its viewBox matches its fixed 340px width;
 * a feed card takes whatever width the column gives it, and a stretched
 * four-point star flattens into a dash.
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
          {/* top point at y = 20/2 − arm, so the star sits centred in its box */}
          <path d={twinkle(10, 8.4, 1.6)} fill="var(--faction-coven-slip-gold)" />
        </svg>
      ))}
    </span>
  )
}

/* THE HEAD'S CHARM WAS A PENTACLE, PRIVATELY DRAWN (#2746). A pink disc under a
   dashed gold ring with a five-point star — near byte-identical to `SigilMark`,
   the badge #2726 retired, but drawn here rather than imported, so that issue's
   mount list never saw it and the retirement did not reach it. It draws
   `CovenSigil` now, like the other six: a player meets ONE symbol for this
   faction, and a copy that never went through `covenSlip`'s export is exactly
   how a faction acquires a second identity again (#1209).

   The disc and the ring go with the star rather than being kept around it. That
   is the same cost the faction hero took knowingly at 74px — the badge was a
   struck object where the hat is a shape — and the head already sets the mark
   off: it sits on the slip's gradient band under a gold twinkle field. */

export default function CovenFeedFrame({ kicker, time, tag, archive, children }: FeedFrameProps) {
  const formFactor = useFormFactor()
  const size = SIZES[formFactor]

  return (
    <article
      data-form-factor={formFactor}
      style={{
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        borderRadius: 16,
        border: '1.5px solid var(--faction-coven-slip-border)',
        background: 'var(--faction-coven-ward-card)',
        boxShadow: 'var(--faction-coven-slip-shadow)',
      }}
    >
      {/* THE HEAD — the slip's gradient band, and all four chrome slots. Tinted
          slip-ink so the archive node (currentColor) inks itself from here. */}
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

        {/* tag — nullable; today only "Still waiting", pinned in a gold hairline */}
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

        {/* time — the card's only timestamp since #1194 (the row stopped drawing one) */}
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

        {/* archive — a finished node; placed, never rebuilt. `null` on
            awaiting_submission, which is why nothing here draws a stand-in. */}
        <span style={{ position: 'relative', zIndex: 1, display: 'flex', flexShrink: 0 }}>
          {archive}
        </span>
      </div>

      {/* the braided thread seam. `.cvn-braid` owns both its pigments and its
          dark override — a data-URI SVG is a separate document, so `var(--…)`
          inside one never resolves (index.css says so at the class). */}
      <span
        className="cvn-braid"
        aria-hidden="true"
        style={{ display: 'block', width: '100%' }}
      />

      {/* THE SLIP — the shared payload body. No padding and no ink of ours: every
          body already pads itself, and the body is faction-blind by contract. */}
      <div style={{ position: 'relative' }}>
        <FeedRowSkinContext.Provider value={ROW_SKIN}>{children}</FeedRowSkinContext.Provider>
      </div>
    </article>
  )
}
