/**
 * The Singularity window bar's three lamps (#1979). The kit owns the whole
 * cluster (hues, pitch) and takes no props: six surfaces once drew private
 * copies and their palettes drifted. `singularityLamps.test.tsx` names them.
 *
 * `--faction-singularity-led-*` are theme-invariant (§6). `-led-red` is the
 * macOS red; whether to keep it is open on #1979.
 */

/** One lamp. Ornament geometry, so raw px (§4a). */
function Lamp({ fill }: { fill: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: 8, height: 8, borderRadius: "50%", background: fill, display: "block" }}
    />
  );
}

/** `flex: none`: never shrink for the bar's title. */
export default function SingularityLamps() {
  return (
    <span
      aria-hidden="true"
      style={{ display: "flex", gap: "var(--space-xs)", flex: "none" }}
    >
      <Lamp fill="var(--faction-singularity-led-red)" />
      <Lamp fill="var(--faction-singularity-led-amber)" />
      <Lamp fill="var(--faction-singularity-term-cta-bg)" />
    </span>
  );
}
