/**
 * The Singularity window bar's three LAMPS — the traffic-light cluster in the
 * top-left corner of every terminal chrome bar this faction draws (#1979).
 *
 * ## Why this is a kit component and not a prop
 *
 * WORLD_ZERO_STYLE §6 draws a device ONCE, and `EphemeristsMasthead` is the
 * same rule one level up: what repeats here is not a mark but an ARRANGEMENT of
 * marks. Five surfaces drew this arrangement in five places — the praxis card,
 * the task card, the praxis detail, the task detail and the feed frame — and
 * four of them declared a private `Lamp` to do it. Five copies is how the
 * palettes drifted apart: the feed frame's cluster was
 * `-term-dim` / `-term-blue` / `-term-bright` (green, blue, green) while the
 * other four were `-led-red` / `-led-amber` / `-led-green`, and nothing linked
 * them. A second declaration is invisible to the import graph and invisible to
 * rendered markup, which comes out perfectly either way — the exact failure
 * #1638/#1654 pinned for the Ephemerists plate.
 *
 * ## The cluster takes no props, deliberately
 *
 * The obvious consolidation is one exported `Lamp({ fill })` that five callers
 * each mount three times. That leaves the drift seam exactly as wide as it was:
 * the palette would still live at the call sites, and a sixth surface could
 * still invent a trio. So the KIT owns the whole cluster — the three hues, the
 * wrapper, the pitch — and a caller mounts it. There is nothing to pass and so
 * nothing to disagree about.
 *
 * ## Colour
 *
 * `--faction-singularity-led-*` (index.css). Theme-invariant, like the rest of
 * the always-dark terminal ornament families (§6) — no `[data-theme]` half and
 * no `dark ?` branch. The trio is a hybrid: `-led-red` is exactly the macOS
 * red `#ff5f56` and the amber and green are the kit's own. Whether the borrowed
 * hue stays is a design call, raised on #1979 and deliberately not taken here.
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

/**
 * The three lamps and their pitch. `flex: none` because every mount is a child
 * of a chrome bar that also holds type — the lamps never shrink to make room
 * for a title.
 */
export default function SingularityLamps() {
  return (
    <span
      aria-hidden="true"
      style={{ display: "flex", gap: "var(--space-xs)", flex: "none" }}
    >
      <Lamp fill="var(--faction-singularity-led-red)" />
      <Lamp fill="var(--faction-singularity-led-amber)" />
      <Lamp fill="var(--faction-singularity-led-green)" />
    </span>
  );
}
