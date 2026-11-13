import { useFormFactor } from '../../hooks/useFormFactor'
import { factionRoleVars } from '../../utils/factionRoles'
import { factionBodyVars } from '../../utils/factionBodyFace'
import { FeedRowSkinContext, type FeedRowSkin } from './feedRowSkin'
import type { FeedFrameProps } from './feedFrameProps'

/**
 * WOW feed chassis — the chronicle proclamation (#1204): gold/plum ribbon
 * crown, cream sheet in a 2px gold frame, ✦ + MedievalSharp kicker, Lora date,
 * ribbon repeated as the section rule. The quest decree's chrome
 * (`WowTaskCard`, #1023) folded to a card.
 *
 * Seam (#1194): `FeedItemSlot` owns the archive; this places it (it paints
 * `currentColor`, so the plum head tints it); children are the faction-blind
 * payload. No dialect copy ships (epic #1192): neutral `feed` strings only.
 * The sheet's points plaque isn't drawn yet; a `points` skin (#1252) is the
 * seam for it.
 *
 * AA (#1221), honoured by avoidance: `-card-muted` is cream-only (fails on
 * `-chronicle-panel`), so no parchment head plate; the tag chip uses the
 * `-plum-surface`/`-on-plum` pair (5.16:1 both themes).
 *
 * One responsive component (ADR-0056/0058/0063); date + ✕ wrap together.
 * Roles via `factionRoleVars('wow', 'wow-feed')` (#2674).
 */
const MED = 'var(--wow-feed-face)' /* MedievalSharp */
const LORA = 'var(--faction-wow-body-font)' /* Lora */
const GOLD = 'var(--faction-wow-chronicle-gold)'
const GILT = 'var(--faction-wow-stamp-total)'
const PLUM = 'var(--wow-feed-accent)'
const RIBBON = 'var(--faction-wow-quest-ribbon)'

/** Ribbon stripe heights: ornament geometry, not spacing (§4a). */
const CROWN_HEIGHT = 6
const RULE_HEIGHT = 3
const RULE_OPACITY = 0.75

interface SizeSet {
  head: string
  kicker: string
}

const SIZES: Record<'desktop' | 'mobile', SizeSet> = {
  desktop: { head: 'var(--space-sm) var(--space-lg)', kicker: 'var(--text-lg)' },
  mobile: { head: 'var(--space-xs) var(--space-md)', kicker: 'var(--text-md)' },
}

/**
 * Body ink (#1252): `--faction-wow` gold is 1.96:1 on cream; gold is never
 * type (WORLD_ZERO_STYLE §3). Plum carries text (5.79:1 / 7.94:1).
 */
const ROW_SKIN: FeedRowSkin = { ink: { actor: PLUM } }

export default function WowFeedFrame({
  kicker,
  time,
  tag,
  archive,
  children,
}: FeedFrameProps) {
  const formFactor = useFormFactor()
  const size = SIZES[formFactor]

  return (
    <article
      data-form-factor={formFactor}
      style={{
        ...factionBodyVars("wow"), ...factionRoleVars('wow', 'wow-feed'),
        borderRadius: 'var(--wow-feed-radius)',
        overflow: 'hidden',
        background: 'var(--wow-feed-paper)',
        color: 'var(--wow-feed-ink)',
        border: `2px solid ${GOLD}`,
        boxShadow: 'var(--faction-wow-quest-shadow)',
        fontFamily: LORA,
      }}
    >
      {/* No text on the crown, which is why undimmed gold/plum is allowed (§3, #840). */}
      <div aria-hidden style={{ height: CROWN_HEIGHT, background: RIBBON }} />

      {/* Plum head ink; the archive node inherits it. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
          padding: size.head,
          color: PLUM,
        }}
      >
        <span className="wow-tw" aria-hidden style={{ color: GILT }}>
          ✦
        </span>

        {/* Names the card: `.label-heading` (#1307). */}
        <span
          className="label-heading"
          style={{
            fontFamily: MED,
            fontSize: size.kicker,
            letterSpacing: '0.14em',
            color: 'inherit',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {kicker}
        </span>

        {/* "Still waiting" (ADR-0070), as the plum lozenge. */}
        {tag && (
          <span
            className="label-caption"
            style={{
              fontFamily: MED,
              color: 'var(--faction-wow-on-plum)',
              background: 'var(--faction-wow-plum-surface)',
              borderRadius: 4,
              padding: '0 var(--space-sm)',
              whiteSpace: 'nowrap',
            }}
          >
            {tag}
          </span>
        )}

        {/* Date and ✕ wrap as one cluster. */}
        <span
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}
        >
          <span
            style={{
              fontFamily: LORA,
              fontStyle: 'italic',
              fontSize: 'var(--text-lg)',
              // Cream-only ink, on cream.
              color: 'var(--wow-feed-quiet)',
              whiteSpace: 'nowrap',
            }}
          >
            {time}
          </span>
          {archive}
        </span>
      </div>

      <div
        aria-hidden
        style={{ height: RULE_HEIGHT, background: RIBBON, opacity: RULE_OPACITY }}
      />

      {/* The payload pads itself; the chassis adds none. */}
      <FeedRowSkinContext.Provider value={ROW_SKIN}>{children}</FeedRowSkinContext.Provider>
    </article>
  )
}
