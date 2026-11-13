/**
 * SingularitySigil — a terminal prompt (`>`) and cursor block, in the
 * caller's colour. The single canonical Singularity emblem.
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
