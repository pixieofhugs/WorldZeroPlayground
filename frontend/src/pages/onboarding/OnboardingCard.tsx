import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 * The shell every onboarding card wears: THE SPECTRUM SHEET, in the shape a
 * one-at-a-time stop needs rather than the shape a task card needs.
 *
 * This is the UNAFFILIATED / `na` kit, not generic paper — the player has no
 * faction yet and every path is still open, which is the whole reason the
 * spectrum is apt here (`docs/spec/SPEC-onboarding.md` § Visual language). The
 * language is lifted from `components/taskCard/DefaultTaskCard.tsx`, not
 * reinvented: a `Default*` that invents its own metaphor is *stale* by the
 * glossary's definition — the wrong identity, not a neutral one.
 *
 * RAINBOW IN EXACTLY TWO PLACES, and the shell is what guarantees it. The
 * restraint IS the design, so the budget is spent here once rather than trusted
 * to four call sites:
 *
 *   1. the 3px band that IS the border — a transparent frame with the gradient
 *      painted into the border box, never a decorative stripe;
 *   2. the conic ring the step numeral sits inside.
 *
 * THERE IS NO TICK (#3098, owner ruling 2026-10-12). The task card's sheet
 * spends a third rainbow on a tick beside its in-progress count, and this shell
 * used to carry one too, beside a `note` caption. #2766 cut the caption and
 * kept the tick; with nothing beside it, a 7px mark alone in a full-width row
 * read to a player as a stray pixel rather than as kit furniture, so the tick
 * and its row are gone. The controls row brings its own gap instead: one
 * `--space-2xl`, the two `--space-lg` steps that used to flank the tick.
 *
 * A card therefore cannot add a third by accident; it supplies words and a
 * control, and the sheet is not negotiable from outside.
 *
 * THE LOOK-AROUND ESCAPE IS THE SHELL'S TOO. "A door, not a wall": tasks,
 * praxis, factions, the leaderboard and profiles are all already public, so
 * every stop keeps "let me just look around" available. Rendering it here is
 * what makes "every stop" true by construction instead of by review.
 *
 * Lora italic carries the title, Courier Prime everything else — with the step
 * numeral and the control labels in Lora exactly as `DefaultTaskCard` sets its
 * numerals and its CTA. All colour through `--faction-default-*` tokens, so
 * both themes come from the `[data-theme="dark"]` cascade and no hex appears
 * here.
 */

const MONO = 'var(--font-body)'
const LORA = 'var(--font-display)'

/** Outer diameter of the conic step ring. Geometry, so a raw px number (WORLD_ZERO_STYLE §4a). */
const RING_SIZE = 84
/** The sheet stays one column at every width; no form-factor branch to drift. */
const SHEET_WIDTH = 560

/**
 * How long `card.stepCaption` may be. GEOMETRY, NOT PREFERENCE (#2765) — the
 * ring is drawn to hold a numeral and one short word, and the number is
 * derivable rather than a taste:
 *
 *   84px outer, less `--space-xs` of conic band on each side  = 76px usable
 *   `--text-md` is 11px, `--font-body` is a monospace at 0.6em = 6.6px advance
 *   plus `letterSpacing: '0.2em'`                             = 2.2px tracking
 *   76 / 8.8                                                  = 8.6 characters
 *
 * So eight fit and the ninth clips. `PLACEHOLDER` measured ~105px and spilled
 * out of the circle on both sides, which is what filed the bug; the caption
 * below now also degrades rather than overflowing, but a caption that needs the
 * degradation is a copy problem and this constant is where that is written
 * down. `pages/__tests__/onboardingCards.test.tsx` holds the catalog to it.
 */
export const RING_CAPTION_MAX_CHARS = 8

/** Label-tier caption voice, shared by every small mark on the sheet. */
const caption: CSSProperties = {
  fontFamily: MONO,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--faction-default-card-muted)',
}

/**
 * A CONTROL MUST BE ABLE TO BREAK ITS LINE (#2764). This carried
 * `white-space: nowrap`, so a label wider than the sheet had nowhere to go and
 * ran out past the rainbow border — and the sheet is only 560px, so on a phone
 * that bit at much shorter labels. The actions row already wraps; it was the
 * button that could not.
 *
 * `text-align` and not `justify-content` is what centres the wrapped line.
 * `justify-content: center` centres the anonymous flex ITEM inside the control,
 * but a wrapping item fills the available width, so its short second line still
 * rags left. Both declarations are load-bearing and neither replaces the other.
 *
 * The control keeps its intrinsic width. Stretching it to the sheet would also
 * end the overflow, and that is a design change rather than this fix.
 */
const controlBase: CSSProperties = {
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  fontFamily: LORA,
  fontWeight: 600,
  fontSize: 'var(--text-xl)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  padding: 'var(--space-md) var(--space-2xl)',
  borderRadius: 11,
  textDecoration: 'none',
}

/**
 * The primary control on any onboarding card, exported because the auth card's
 * primary control is `SignInOptions` and it has to wear the same ink.
 *
 * NA'S CARD INK, filled — deliberately not a rainbow stop. A single stop used
 * alone reads as a single-hue accent, which is precisely what `na` is not, and
 * it would also be a third rainbow. `--faction-default-on-accent` is the
 * measured ink for this fill in both themes.
 */
export const primaryControl: CSSProperties = {
  ...controlBase,
  border: 'none',
  background: 'var(--faction-default-card-accent)',
  color: 'var(--faction-default-on-accent)',
}

/** The way out: same weight as the task card's outlined CTA, never louder than the ask. */
const secondaryControl: CSSProperties = {
  ...controlBase,
  background: 'transparent',
  color: 'var(--faction-default-card-text)',
  border: '1px solid color-mix(in srgb, var(--faction-default-card-accent) 35%, transparent)',
}

export default function OnboardingCard({
  step,
  title,
  actions,
  children,
}: {
  /** Which stop this is. Renders as the numeral inside the conic ring. */
  step: number
  title: string
  /** The card's own control(s). The look-around escape is not one of these. */
  actions: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation('onboarding')

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: 'var(--space-4xl) var(--space-sm)',
      }}
    >
      <article
        style={{
          boxSizing: 'border-box',
          width: SHEET_WIDTH,
          maxWidth: '100%',
          // 1 of 2 — the spectrum IS the border: a transparent 3px frame with
          // the rainbow painted into the border box behind it, and the sheet
          // painted into the padding box on top.
          border: '3px solid transparent',
          borderRadius: 14,
          backgroundImage:
            'linear-gradient(var(--faction-default-card-bg), var(--faction-default-card-bg)), var(--faction-default-rainbow)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          // Geometry raw, colour tokenised — the colour half is the half that
          // would drift between themes (`SignInOptions`, `ConfirmDialog`).
          boxShadow: '0 12px 32px -14px var(--color-cast-shadow)',
          color: 'var(--faction-default-card-text)',
          fontFamily: MONO,
          padding: 'var(--space-xl)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          {/* 2 of 2 — the conic ring, holding the stop's numeral exactly as the
              task card's ring holds its points. */}
          <div
            style={{
              flex: '0 0 auto',
              boxSizing: 'border-box',
              width: RING_SIZE,
              height: RING_SIZE,
              borderRadius: '50%',
              padding: 'var(--space-xs)',
              background: 'var(--faction-default-rainbow-conic)',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'var(--faction-default-card-bg)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 0.9,
              }}
            >
              <span style={{ fontFamily: LORA, fontWeight: 600, fontSize: 'var(--text-title)' }}>
                {step}
              </span>
              {/* #2765: the caption has to DEGRADE inside the circle. Without
                  these two it wrapped to two lines that were each wider than
                  the ring, and the second hung left. `overflow-wrap` is what
                  lets a too-long word break at all; `text-align` is what
                  centres the lines it breaks into — the <h1> below has carried
                  the same pair for the same reason. Neither replaces
                  RING_CAPTION_MAX_CHARS: this is the failure being legible
                  rather than the failure being prevented. */}
              <span
                style={{
                  ...caption,
                  marginTop: 'var(--space-xs)',
                  textAlign: 'center',
                  overflowWrap: 'anywhere',
                }}
              >
                {t('card.stepCaption')}
              </span>
            </div>
          </div>

          <div style={{ flex: 1, height: 1, background: 'var(--faction-default-border)' }} />
        </div>

        <h1
          style={{
            fontFamily: LORA,
            fontWeight: 600,
            fontStyle: 'italic',
            fontSize: 'var(--text-title)',
            lineHeight: 1.14,
            margin: '0 0 var(--space-lg)',
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </h1>

        {children}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--space-md)',
            // The whole body-to-controls distance, since every body ends on a
            // zero bottom margin (#3098).
            marginTop: 'var(--space-2xl)',
          }}
        >
          {actions}
          {/* Public surfaces need no session (ADR-0041's boundary is not a wall
              here), so this is a plain link out of the flow rather than a
              dismissal of it. `/tasks` and not `/`: `/` logged out is Home,
              which explains the game a second time. */}
          <Link to="/tasks" style={secondaryControl} data-testid="onboarding-look-around">
            {t('card.lookAround')}
          </Link>
        </div>
      </article>
    </div>
  )
}
