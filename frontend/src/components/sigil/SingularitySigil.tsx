/**
 * SingularitySigil — the Singularity terminal caret: a prompt (`>`) trailed by a
 * blinking-cursor block, the faction's pervasive boot-line motif at badge scale.
 *
 * The single canonical Singularity emblem, reused across every surface that
 * carries the mark (avatar badge, faction hero, faction-select tile). Drawn in
 * the color the caller passes so the surface can recolor it.
 */
export function SingularitySigil({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* terminal prompt caret ">" */}
      <polyline
        points="2,3 5,6 2,9"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {/* cursor block */}
      <rect x="7" y="7.5" width="3" height="1.6" fill={color} />
    </svg>
  );
}
