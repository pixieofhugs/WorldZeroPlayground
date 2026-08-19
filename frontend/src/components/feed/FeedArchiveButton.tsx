import { useState } from 'react'
import i18n from '../../i18n'

/**
 * The chassis's dismiss / restore control (Unaffiliated sheet §2a).
 *
 * "Dismissing is a one-tap, no-confirm action" — so this is a plain button with
 * no dialog behind it.
 *
 * Built once, centrally, and handed to every faction frame as a ready node
 * (`FeedFrameProps.archive`) so eight skins share one accessible control instead
 * of writing eight. It paints in `currentColor`; a frame tints it by setting
 * `color` on whatever it places the node inside. That indirection is what makes
 * this ONE file the fix for #2091 rather than eight — every frame publishes its
 * band ink here and none of them overrides the control's own colour.
 *
 * ── THE DORMANCY WAS THE DEFECT (#2091) ──────────────────────────────────────
 *
 * It used to sit at `opacity: 0.4` and come up to full on hover or focus. An
 * alpha on the ink is a contrast cut, and this is a non-text UI control, so
 * WCAG 1.4.11 gives it a 3:1 floor against its band. Measured on the ink every
 * frame publishes here, over that frame's own band ground, in both themes
 * (`__tests__/feedArchiveControl.test.tsx` re-measures all fourteen pairings —
 * the numbers below are its output, not a hand tally):
 *
 *   at 40%   nine of fourteen pairings FAIL, and the two the bug was reported
 *            on are the worst of them — the default/Albescent chassis at
 *            **2.33:1** in dark (the screenshot on #2091) and 1.99:1 in light,
 *            UA at 1.74–2.01:1, WOW 1.83 / 2.29, Coven 1.86–2.99, Everymen
 *            1.92 / 1.95. Only S.N.I.D.E., Singularity, Ephemerists and the era
 *            announcement scraped over, at 3.03–3.59:1.
 *   at 100%  every pairing clears, and clears the 4.5:1 TEXT floor as well:
 *            worst is UA's darkest parchment stop at 4.55:1 and Everymen's night
 *            red at 4.59:1, best is S.N.I.D.E. at 17.82:1.
 *
 * So the fix is not a colour. Each frame's band ink was already measured for
 * type on that band; spending it at full strength is what the ✕ needed, and it
 * mints no token — #1609's rule is "does index.css already own this colour", and
 * every one of these already did. It also brings the control in line with the
 * Ephemerists band's own principle (see that frame's docblock): a quiet tier is
 * a MEASURED ink, never one ink at two opacities.
 *
 * HOVER / FOCUS STILL ANSWERS, and the focus half is not decoration — it is the
 * keyboard and screen-reader route to the archive, which swipe alone would not
 * provide. It now lifts a 12% wash of the control's own ink instead of
 * un-dimming the glyph, which leaves the glyph itself at full strength: the
 * tightest pairing on that wash is 3.78:1 (UA, dark), so the lit state clears
 * 1.4.11 too.
 *
 * THE BOX is the reporter's own suggestion and it is free — a `currentColor`
 * hairline, the same figure `FeedChassisBand` already strikes around the status
 * tag. It is what makes the ✕ read as a control rather than as punctuation after
 * the timestamp, and it needs no colour of its own.
 *
 * THE HIT TARGET IS §6's 44px on all nine chassis, and one code path gets it
 * there (#2100). It shipped at 24 — WCAG 2.5.8's AA minimum, short of the house
 * rule — for exactly one reason: `EphemeristsFeedFrame` was the only frame of
 * the nine that gave its masthead a fixed numeric height, and under
 * `overflow: hidden` that clipped anything taller for hit-testing as well as
 * visually. That band now sizes to its contents like the other eight, so one
 * faction's dress no longer sets the target size of a control shared across
 * all of them, and raising the two numbers below was the whole of the change
 * here. The band grows to fit them.
 */
/**
 * The hover / focus wash, as a percentage of the control's own ink.
 *
 * Exported for one reason: `__tests__/feedArchiveControl.test.tsx` measures the
 * LIT state, which no render can reach (the harness fires no events), and a
 * percentage restated in the test would be a second place for it to drift.
 */
export const LIT_WASH_PCT = 12

export default function FeedArchiveButton({
  onAct,
  variant = 'archive',
}: {
  onAct: () => void
  /** `archive` draws the ✕; `restore` draws the archive's take-it-back arrow. */
  variant?: 'archive' | 'restore'
}) {
  const [lit, setLit] = useState(false)
  const label = i18n.t(
    variant === 'restore' ? 'feed:archive.restoreLabel' : 'feed:archive.dismissLabel',
  )

  return (
    <button
      type="button"
      onClick={onAct}
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      onFocus={() => setLit(true)}
      onBlur={() => setLit(false)}
      aria-label={label}
      title={label}
      data-feed-archive={variant}
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Ornament geometry — the drawn square's own box, not layout spacing, so
        // it is a raw number and deliberately off the --space-* ramp (§4a), the
        // same call `identityActionStyle` makes for its 44.
        boxSizing: 'border-box',
        minWidth: 44,
        minHeight: 44,
        background: lit
          ? `color-mix(in srgb, currentColor ${LIT_WASH_PCT}%, transparent)`
          : 'transparent',
        border: '1px solid currentColor',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-xs)',
        cursor: 'pointer',
        color: 'currentColor',
        fontFamily: "'Courier Prime', monospace",
        // The tier the timestamp beside it already reads at (.label-caption,
        // --text-lg): the ✕ was a rung under the fact it sits next to, which is
        // the "small font" half of #2091.
        fontSize: 'var(--text-lg)',
        lineHeight: 1,
        transition: 'background-color 120ms',
      }}
    >
      <span aria-hidden>{variant === 'restore' ? '↺' : '✕'}</span>
    </button>
  )
}
