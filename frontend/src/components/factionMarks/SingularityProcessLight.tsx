/**
 * The Singularity terminal's PROCESS LIGHT — the one live thing on the chassis
 * (#2092). A small round tell-tale that breathes: on the composer's window bar
 * it says the session is up, on the task card it stands beside the in-progress
 * count, on the task detail it opens the header row beside the faction's name.
 *
 * ## Why this is a kit component
 *
 * `SingularityLamps` (#1979/#2090) is the same story one device over, and this
 * is the device that pass did not consolidate — a single span rather than a
 * trio, so nothing about it looked like an ARRANGEMENT worth extracting. Three
 * surfaces drew it in three places and the hue drifted exactly the way the
 * lamps' had: the composer painted `-term-bright` (green) while the task card
 * and the task detail painted `-term-blue-bright`. Nothing linked the copies, so
 * each file rendered perfectly on its own and every test stayed green — the
 * defect is invisible to the import graph and invisible to markup, which is the
 * failure #1638/#1654 pinned for the Ephemerists plate and #1979 for the lamps.
 *
 * BLUE, by owner ruling on #2092 ("blue for singularity"). The composer was the
 * outlier, and the ruling is what this file now holds.
 *
 * ## It takes no props, deliberately
 *
 * The lamps' reasoning verbatim: a `ProcessLight({ fill })` that three callers
 * each fill in leaves the drift seam exactly as wide as it was, because the
 * palette would still live at the call sites and a fourth surface could still
 * invent a hue. So the kit owns the whole drawing — hue, bloom, size, motion —
 * and a caller only mounts it. WHERE it sits is still the surface's business:
 * the composer's bar pushes it to the right end with `marginRight: auto` on the
 * process name rather than by handing this mark a margin of its own.
 *
 * ## Colour and bloom
 *
 * `--faction-singularity-term-blue-bright`, blooming in
 * `--faction-singularity-term-halo-blue` — the family's blue glow, declared
 * `none` in the light cascade and lit in dark (see the halo note in index.css),
 * so the bloom arrives only on the black where a glow reads rather than smearing
 * on the lighter one. No `dark ?` branch, because the token is the whole shadow
 * value. The composer's dot carried the GREEN halo, coherent while the dot was
 * green and not now; the card and the detail carried no bloom at all. One
 * drawing, so the pairing is settled here, once.
 *
 * ## Motion — `.sg-pulse`, the faction's own
 *
 * ponytail: the composer's dot ran `.ep-pulse`, re-timed to its design's 1.6s
 * through `--ep-pulse-dur`; consolidating costs that cadence, and besides the
 * hue it is the one visible thing that moved. `.ep-*` is the COMPOSER kit's
 * motion vocabulary and this mark hangs on a task card too, so the faction's own
 * `.sg-pulse` — 2.6s, already two of the three mounts — is the one that can
 * travel. If 1.6s is wanted back it comes back HERE, for all three surfaces at
 * once, and never to a call site. Class-gated on `prefers-reduced-motion` in
 * index.css; stilled, the light stays drawn.
 */
export default function SingularityProcessLight() {
  return (
    <span
      aria-hidden="true"
      className="sg-pulse"
      style={{
        /* Ornament geometry, so raw px (WORLD_ZERO_STYLE §4a). */
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: "var(--faction-singularity-term-blue-bright)",
        boxShadow: "var(--faction-singularity-term-halo-blue)",
        display: "block",
        /* Every mount is a child of a flex row that also carries type — the
           light never shrinks to make room for a title or a count. */
        flex: "none",
      }}
    />
  );
}
