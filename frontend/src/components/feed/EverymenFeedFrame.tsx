/**
 * THE EVERYMEN DISPATCH SLIP — the faction's feed-card CHASSIS (surface #12,
 * SPEC-faction-ui-profile.md; epic #1192, dress issue #1200).
 *
 * A press slip run off in the union shop. Two things make it that slip and
 * nothing else on the site is either of them:
 *
 *   1. A DOUBLE FRAME. Not one border — a 2px rule in the faction's ink, a 4px
 *      pad, then a 1px hairline inside it. That is how a printed form is ruled:
 *      the outer rule is the plate edge and the inner one is the form itself.
 *   2. A CENTRED RED MASTHEAD BAND at the head, whose bottom edge is a `3px
 *      double` rule the paper shows through. The band is the KICKER'S HOME — the
 *      card's kind is the slip's masthead, not a label sitting above it — and it
 *      carries the whole of the chassis chrome: the status tag on the left, the
 *      kind centred, the dateline and the dismiss control on the right.
 *
 * WHAT THIS FILE OWNS, AND WHAT IT DOES NOT (the three-layer seam, #1194):
 * `FeedItemSlot` above owns the ARCHIVE — the swipe, the write, the six-second
 * undo strip — and hands the finished control down as `archive`. The body arrives
 * as `children` and is faction-blind (`FeedRowContent` or one of the three
 * interactive companions: `invitation_letter`, `duel_challenge`, `collab_invite`,
 * whose accept/decline handlers live in the bodies and did not move). This frame
 * is dress. It reimplements none of that, and it carries all fifteen backend feed
 * types because it never looks at the type — only at the four chrome slots.
 *
 * `archive` is `null` on `awaiting_submission`, which is state rather than an
 * event, so that card simply has nothing in the band's right slot past the
 * dateline. The frame does not need to know why, and must not draw a stand-in.
 *
 * COPY: every word on this card comes from the neutral `feed` catalog (epic
 * decision 7). The design sheet is written in a gorgeous union dialect and NONE
 * of it ships; the skin is the identification, and there is no faction name
 * anywhere on the slip (decision 5).
 *
 * INK. The band is `--everymen-red` as a FILL, inked in
 * `--everymen-masthead-text` — the pairing the broadsheet chrome already
 * measured (5.24:1 light / 4.59:1 dark). #1223 established that red is only
 * 4.49:1 as TYPE on `--everymen-paper`, so no red label is set on the stock BY
 * THIS FRAME: on the paper red is a fill, and the ink on it is the masthead's.
 * The dateline and the tag chip therefore print at FULL masthead ink and
 * separate themselves by face and size — the shared band's 0.7 opacity would
 * have walked the dark pairing down to roughly 3.2:1.
 *
 * The SHARED BODY did set one, and nothing here could see it (#1341): the
 * actor's name paints `factionCssVar(slug)` — `--faction-everymen`, the same
 * #c1272d — at 18px/700, which owes 4.5:1 because 700 weight only reaches the
 * large-text 3:1 exemption at 18.66px. So that 4.49:1 near-miss was a live
 * pairing on this card and not a hypothetical, and #1223's "never set there" had
 * quietly stopped being true one layer down. This is the only chassis of the
 * four where no existing token could take the job: `--everymen-red` misses in
 * light, `-red-deep` is 2.67:1 in dark, and `-sheet-accent` is the same red
 * measured on the lighter sheet PANEL, so it misses in light too. Hence
 * `--everymen-paper-accent`, the red walked down for this stock — a mint, and
 * the only one this issue makes (5.09:1 light / 6.09:1 dark).
 *
 * One responsive component, no mobile twin (ADR-0056 / 0058 / 0063): the slip
 * tightens its band and drops the masthead a size on a phone.
 */
import { useFormFactor } from '../../hooks/useFormFactor'
import type { FeedFrameProps } from './feedFrameProps'
import { FeedRowSkinContext, type FeedRowSkin } from './feedRowSkin'

const ROW_SKIN: FeedRowSkin = { ink: { actor: 'var(--everymen-paper-accent)' } }

export default function EverymenFeedFrame({
  kicker,
  time,
  tag,
  archive,
  children,
}: FeedFrameProps) {
  const mobile = useFormFactor() === 'mobile'

  return (
    <article
      style={{
        position: 'relative',
        background: 'var(--everymen-paper)',
        color: 'var(--everymen-paper-text)',
        // The double frame, half one: the plate edge, in the faction's ink
        // rather than --color-border (a printed rule is part of the printing).
        border: '2px solid var(--everymen-frame)',
        // …and the 4px pad the second rule sits inside. --space-xs IS 4px, so
        // the design's gutter comes off the scale rather than beside it.
        padding: 'var(--space-xs)',
        boxShadow: 'var(--faction-everymen-slip-shadow)',
      }}
    >
      {/* Half two: the form's own rule, inside the pad. */}
      <div
        style={{
          position: 'relative',
          border: '1px solid var(--faction-everymen-sheet-hair)',
          overflow: 'hidden',
        }}
      >
        {/* THE STOCK IS BARE (#2195). The slip carried a burlap crosshatch, a
            warm mottle and a screen-print halftone — a THIRD Everymen texture,
            neither the faction's burst nor nothing. The owner ruled "either
            burst, or plain": where a kit's ornament is not worn the ground is
            bare, not a different pattern. The slip is not a task or praxis card
            and does not wear the burst, so it is plain newsprint. The double
            frame and the red masthead band below are chrome and are untouched —
            they are what make this the union's slip. */}

        {/* ── The masthead band ──────────────────────────────────────────────
            Three tracks so the kind stays optically CENTRED on the slip rather
            than centred in whatever the dateline leaves over: `1fr auto 1fr`
            with equal flanks. The middle item carries minWidth 0, which is what
            lets an auto track shrink past its content and ellipsise instead of
            shoving the flanks to nothing. */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            background: 'var(--everymen-red)',
            color: 'var(--everymen-masthead-text)',
            // The band's bottom edge: two thin rules with the slip's own ground
            // between them. It flips with the paper, because it IS the paper.
            borderBottom: '3px double var(--everymen-paper)',
            padding: mobile
              ? 'var(--space-xs) var(--space-sm)'
              : 'var(--space-xs) var(--space-md)',
          }}
        >
          {/* Left flank — the status tag ("Still waiting"), or nothing. Drawn as
              an overprinted chip: a currentColor hairline box, so it reads as a
              stamp struck onto the band rather than a second colour on it.
              A status and a dateline are both small FACTS about the slip, so
              both flanks are `.label-caption` (#1307); the masthead between
              them is the kicker and already carries its own poster face. */}
          <span style={{ justifySelf: 'start', minWidth: 0, display: 'inline-flex' }}>
            {tag && (
              <span
                className="label-caption"
                style={{
                  color: 'inherit',
                  border: '1px solid currentColor',
                  padding: '0 var(--space-xs)',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {tag}
              </span>
            )}
          </span>

          {/* The masthead itself — the card's kind, in the poster face. */}
          <span
            style={{
              justifySelf: 'center',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--faction-everymen-card-font)',
              fontSize: mobile ? 'var(--text-lg)' : 'var(--text-xl)',
              letterSpacing: mobile ? '0.12em' : '0.18em',
              textTransform: 'uppercase',
              lineHeight: 1.15,
              color: 'inherit',
            }}
          >
            {kicker}
          </span>

          {/* Right flank — the dateline, then the spike. `color: inherit` is
              load-bearing: the archive control paints in currentColor, so this
              is what tints it to the masthead's ink. */}
          <span
            style={{
              justifySelf: 'end',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              minWidth: 0,
              color: 'inherit',
            }}
          >
            <span
              className="label-caption"
              style={{ color: 'inherit', whiteSpace: 'nowrap', minWidth: 0 }}
            >
              {time}
            </span>
            {archive}
          </span>
        </div>

        {/* The shared payload body, printed on the stock. */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <FeedRowSkinContext.Provider value={ROW_SKIN}>{children}</FeedRowSkinContext.Provider>
        </div>
      </div>
    </article>
  )
}
