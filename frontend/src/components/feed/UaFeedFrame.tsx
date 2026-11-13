import { useFormFactor } from '../../hooks/useFormFactor'
import { UaSigil } from '../sigil/UaSigil'
import { UA_DISPLAY, UA_EYEBROW, UaInkColumn } from '../factionMarks/uaAtoms'
import { FeedRowSkinContext, type FeedRowSkin } from './feedRowSkin'
import { factionRoleVars } from '../../utils/factionRoles'
import { factionBodyVars } from '../../utils/factionBodyFace'
import type { FeedFrameProps } from './feedFrameProps'

/**
 * UA feed chassis — the day-book leaf (surface #12, kit §12, #1201). Owns the
 * outside; children are the faction-blind body; `archive` arrives finished from
 * `FeedItemSlot` and is only placed.
 *
 * Dress is deliberately just parchment and one ensō: the three-stop
 * `--faction-ua-parchment` stock (dark via the cascade), the `UaInkColumn`
 * edge (no mandala on a dense surface, brief §5), and the ensō as the band's
 * leading seal (brief §4) — leading so the ✕ gets the corner, never under an
 * ornament.
 *
 * The tag/time wear `UA_EYEBROW` (uaAtoms), not yet swept to the #1307 label
 * tiers. Copy is neutral `feed` props only (epic #1192). One responsive
 * component (ADR-0056/0058/0063).
 *
 * ROW_SKIN (#1252): raw `--faction-ua` is 4.04:1 on parchment; the accent
 * clears 5.18:1 / 6.58:1.
 */
const ROW_SKIN: FeedRowSkin = {
  ink: { actor: 'var(--leaf-feed-frame-accent)' },
}

export default function UaFeedFrame({
  kicker,
  time,
  tag,
  archive,
  children,
}: FeedFrameProps) {
  const gutter = useFormFactor() === 'mobile' ? 'var(--space-md)' : 'var(--space-xl)'
  return (
    <div
      style={{
        ...factionBodyVars("ua"), ...factionRoleVars('ua', 'leaf-feed-frame'),
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--faction-ua-parchment)',
        color: 'var(--leaf-feed-frame-ink)',
        border: '1px solid var(--faction-ua-rule)',
        borderRadius: 'var(--radius-md)',
        padding: `var(--space-lg) ${gutter}`,
      }}
    >
      {/* UA's ink column, inside the padding. */}
      <UaInkColumn
        style={{ left: 0, top: 'var(--space-md)', bottom: 'var(--space-md)' }}
      />

      {/* Band placed by hand (the mark leads it, not `FeedChassisBand`). Muted
          ink tints the ✕ (`currentColor`) and clears AA on every stop. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
          minWidth: 0,
          color: 'var(--leaf-feed-frame-quiet)',
          borderBottom: '1px solid var(--faction-ua-hair)',
          paddingBottom: 'var(--space-xs)',
          marginBottom: 'var(--space-sm)',
        }}
      >
        <span
          aria-hidden="true"
          style={{ display: 'inline-flex', flexShrink: 0, opacity: 0.8 }}
        >
          <UaSigil width={15} height={15} />
        </span>
        <span
          style={{
            fontFamily: UA_DISPLAY,
            fontSize: 'var(--text-lg)',
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--leaf-feed-frame-accent)',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {kicker}
        </span>
        {tag && (
          /* Solid chip: the accent / on-accent pair (#924). */
          <span
            style={{
              ...UA_EYEBROW,
              color: 'var(--faction-ua-on-accent)',
              background: 'var(--leaf-feed-frame-accent)',
              borderRadius: 999,
              padding: '0 var(--space-sm)',
              whiteSpace: 'nowrap',
            }}
          >
            {tag}
          </span>
        )}
        <span style={{ ...UA_EYEBROW, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {time}
        </span>
        {archive}
      </div>

      <FeedRowSkinContext.Provider value={ROW_SKIN}>{children}</FeedRowSkinContext.Provider>
    </div>
  )
}
