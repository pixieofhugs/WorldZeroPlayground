import { useFormFactor } from '../../hooks/useFormFactor'
import { UaSigil } from '../sigil/UaSigil'
import { UA_DISPLAY, UA_EYEBROW, UaInkColumn } from '../factionMarks/uaAtoms'
import { FeedRowSkinContext, type FeedRowSkin } from './feedRowSkin'
import { factionRoleVars } from '../../utils/factionRoles'
import type { FeedFrameProps } from './feedFrameProps'

/**
 * UA feed CHASSIS — the practice's day-book leaf (surface #12, kit §12, #1201).
 *
 * Not a row wrapper any more (#1194): the frame owns the outside of the card and
 * the body arrives as `children`, faction-blind. See {@link FeedFrameProps} for
 * the four chrome slots this must draw, and `FeedItemSlot` for the archive
 * interaction it must NOT reimplement — the ✕ handed in as `archive` is already
 * hover/focus-gated, keyboard reachable, labelled, and `null` on the one type
 * that cannot be archived (`awaiting_submission`). This file places it and adds
 * nothing to it.
 *
 * THE DRESS is parchment and one ensō, and that is deliberately the whole of it:
 *
 *  - The ground is UA's three-stop paper stock (`--faction-ua-parchment`), the
 *    design sheet's `--cardGrad`, rather than a flat fill. It is composed from
 *    the surface primitives, so both themes come from the `[data-theme="dark"]`
 *    cascade with no second declaration and no ternary.
 *  - The ink column down the left edge (`UaInkColumn`) is the faction's declared
 *    chrome for a surface too dense for the mandala. It replaces the old flat
 *    3px border: same reading, drawn with the kit's own primitive. The mandala is
 *    ABSENT here — a strength, not an omission (brief §5).
 *  - ONE ensō, at the head of the kicker band. This is the faction-mark half of
 *    the mark's reservation (brief §4); it is never a container border.
 *
 * WHY THE MARK MOVED INTO THE BAND. It used to sit in the card's top-right
 * corner, which is exactly where the dismiss control has to go; #1194 answered
 * that by insetting the band's right edge to clear the ornament. Making the mark
 * the band's leading glyph removes the collision instead of routing around it —
 * the ✕ gets the corner it wants, the mark reads as the leaf's seal, and no
 * functional control sits under an ornament.
 *
 * TYPE. Kicker in Cormorant Garamond (the display cut), uppercase and widely
 * tracked; the tag and the time in the EB Garamond label face, the pairing the
 * sheet draws. Both are label tier, but #1307 split that tier in two and this
 * band has NOT been swept: the kicker is heading work (it names the card) while
 * the tag and the time are captions (small facts, genuinely read), and both of
 * the latter wear `UA_EYEBROW` — a hand-rolled label style in
 * `components/factionMarks/uaAtoms.ts`, outside this directory. Moving it is
 * that atom's sweep, not this file's; until then the old "scanned, not read"
 * reading still describes what renders here, and it is no longer the doctrine.
 *
 * NO COPY. Every string on this card arrives as a prop from the neutral `feed`
 * catalog; the sheet's own dialect is discarded (epic #1192), and there is no
 * faction-name label anywhere.
 *
 * One responsive component, no mobile twin (ADR-0056 / 0058 / 0063): the layout
 * is fluid, and `useFormFactor` only trims the gutter where a phone column has
 * none to spare.
 */
/**
 * The shared body's one ink that is wrong on this leaf (#1252). The row paints
 * the actor's name in the faction's raw hue, which was measured against the
 * app's neutral page: `--faction-ua` is 4.04:1 on this parchment in light, and
 * the name is 18px/700, so it owes 4.5:1. The practice's own accent — the ink
 * this card already sets on its band — clears both halves (5.18:1 light,
 * 6.58:1 dark). A repoint, not a new token.
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
        /* The nine roles under this surface's prefix (#2659/#2673). ROW_SKIN
           above is module-level but travels by context to `children`, which
           render inside this root, so the cascade reaches it. */
        ...factionRoleVars('ua', 'leaf-feed-frame'),
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--faction-ua-parchment)',
        color: 'var(--leaf-feed-frame-ink)',
        border: '1px solid var(--faction-ua-rule)',
        borderRadius: 'var(--radius-md)',
        padding: `var(--space-lg) ${gutter}`,
      }}
    >
      {/* The ink column — UA's signature on a dense surface. Absolutely
          positioned, so the padding above is what it sits inside. */}
      <UaInkColumn
        style={{ left: 0, top: 'var(--space-md)', bottom: 'var(--space-md)' }}
      />

      {/* The chassis band, placed by hand rather than via `FeedChassisBand`: the
          mark leads it. Its `color` is the muted ink, and that is what tints the
          archive control, which paints in `currentColor` (#1194). Muted clears AA
          on all three stops of the stock, in both themes. */}
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
        {/* the faction mark — the band's seal (brief §4) */}
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
          /* The status tag, filled: the sheet's chip is solid with warm-white
             lettering, which is the accent / on-accent pair exactly (#924). */
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
