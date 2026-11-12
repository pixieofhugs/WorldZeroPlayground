/**
 * The Singularity terminal's process light (#2092): a breathing tell-tale on
 * the composer bar, task card and task detail. Kit-owned and propless, like
 * `SingularityLamps`, because the copies' hue drifted. Blue by owner ruling.
 * Placement is the caller's business.
 *
 * Bloom: `-term-halo-blue` is `none` in light and lit in dark, so no branch.
 *
 * ponytail: unified on `.sg-pulse` (2.6s), dropping the composer's 1.6s
 * `.ep-pulse`. Restore a cadence here, never at a call site. Reduced-motion
 * gated in index.css; stilled, the light stays drawn.
 */
export default function SingularityProcessLight() {
  return (
    <span
      aria-hidden="true"
      className="sg-pulse"
      style={{
        /* Ornament, raw px (§4a). */
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: "var(--faction-singularity-term-blue-bright)",
        boxShadow: "var(--faction-singularity-term-halo-blue)",
        display: "block",
        /* Never shrink for neighbouring type. */
        flex: "none",
      }}
    />
  );
}
