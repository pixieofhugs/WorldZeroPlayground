/**
 * SnideSigil — the S.N.I.D.E. circled-A anarchy mark, the faction's only sigil.
 *
 * Extracted from the inline `CircledAGlyph` in SnideAvatar (#659) so it's
 * reachable as a standalone component like the other six faction sigils.
 * Colors come from the --faction-snide-acid token by default — never hardcode
 * hex.
 */
export function SnideSigil({
  size = 22,
  color = "var(--faction-snide-acid)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="19" stroke={color} strokeWidth="3.5" />
      <path
        d="M14 34 L24 12 L34 34 M18 27 H30"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
