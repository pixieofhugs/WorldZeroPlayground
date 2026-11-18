/**
 * The Everymen dispatch slip — the feed-card chassis (#1200).
 *
 * A double frame (2px plate-edge rule, 4px pad, 1px form hairline) and a centred
 * red masthead band carrying all the chrome: tag left, kind centred, dateline and
 * dismiss right. Dress only: `FeedItemSlot` owns the archive (#1194) and the body is
 * faction-blind. `archive` is `null` on `awaiting_submission`; draw no stand-in.
 * All copy is the neutral `feed` catalog; no faction name on the slip.
 *
 * Ink: the band is red as a FILL with `--everymen-masthead-text` (5.24 / 4.59:1);
 * red as type on the paper is 4.49:1, so the tag and dateline print at full
 * masthead ink (no 0.7 opacity). The actor's name gets the minted
 * `--everymen-paper-accent` (#1341; 5.09 / 6.09:1) — no existing red cleared both.
 *
 * One responsive component (ADR-0056 / 0058 / 0063).
 */
import type { FeedFrameProps } from './feedFrameProps'
import { FeedRowSkinContext, type FeedRowSkin } from './feedRowSkin'
import { factionRoleVars } from '../../utils/factionRoles'
import { factionBodyVars } from '../../utils/factionBodyFace'

const ROW_SKIN: FeedRowSkin = { ink: { actor: 'var(--everymen-paper-accent)' } }

export default function EverymenFeedFrame({
  kicker,
  time,
  tag,
  archive,
  children,
}: FeedFrameProps) {
  return (
    <article
      style={{
        ...factionBodyVars("everymen"), ...factionRoleVars('everymen', 'ev-feed'),
        position: 'relative',
        background: 'var(--everymen-paper)',
        color: 'var(--everymen-paper-text)',
        // The double frame's outer rule, in the faction's ink…
        border: '2px solid var(--everymen-frame)',
        // …and the 4px pad (--space-xs).
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
        {/* Bare stock (#2195): "either burst, or plain" — no third texture. */}

        {/* ── The masthead band: `1fr auto 1fr` keeps the kind optically centred;
            its minWidth 0 lets it ellipsise instead of crushing the flanks. ── */}
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
            // Two rules with the paper between; flips because it IS the paper.
            borderBottom: '3px double var(--everymen-paper)',
            padding: 'var(--feed-bar-pad)',
          }}
        >
          {/* Left flank: the status tag as an overprinted currentColor chip.
              Both flanks are `.label-caption` (#1307). */}
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

          <span
            style={{
              justifySelf: 'center',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--ev-feed-face)',
              fontSize: 'var(--ev-kicker-size)',
              letterSpacing: 'var(--ev-kicker-tracking)',
              textTransform: 'uppercase',
              lineHeight: 1.15,
              color: 'inherit',
            }}
          >
            {kicker}
          </span>

          {/* `color: inherit` tints the currentColor archive control. */}
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

        <div style={{ position: 'relative', zIndex: 2 }}>
          <FeedRowSkinContext.Provider value={ROW_SKIN}>{children}</FeedRowSkinContext.Provider>
        </div>
      </div>
    </article>
  )
}
