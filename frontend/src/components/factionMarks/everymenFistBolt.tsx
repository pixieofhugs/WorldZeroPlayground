/** Lifted verbatim from `taskCard/EverymenTaskCard` (#3294): the letter mounts the SAME fist-and-bolt, one copy. */

/**
 * The union's fist gripping a bolt, traced from the design's supplied vector:
 * the hand and, as its own subpath, the lightning. Both are drawn in the
 * source's Y-up space, which is why the group flips and scales them.
 */
const FIST = "M3705 3400 c-93 -46 -97 -111 -17 -291 31 -71 60 -129 65 -129 11 0 231 100 241 110 8 8 -83 223 -116 271 -17 26 -82 59 -116 59 -9 0 -35 -9 -57 -20z M3309 3357 c-45 -30 -71 -82 -66 -128 3 -20 58 -153 122 -295 65 -143 124 -272 131 -289 29 -69 85 -115 142 -115 29 0 92 18 92 27 0 2 -12 15 -28 28 -79 67 -103 216 -49 308 l28 47 -82 181 c-46 99 -91 192 -102 205 -44 57 -129 71 -188 31z M3032 3093 c-54 -26 -77 -68 -77 -138 1 -55 10 -81 110 -299 120 -262 137 -284 218 -293 56 -7 107 16 143 62 51 67 43 104 -76 365 -56 124 -113 240 -127 258 -46 61 -122 79 -191 45z M4000 2992 c-253 -115 -257 -117 -276 -154 -21 -40 -14 -120 13 -156 64 -86 118 -88 297 -8 70 31 136 56 145 54 10 -2 16 -13 16 -33 0 -28 -6 -32 -150 -97 -82 -37 -162 -68 -176 -68 -14 0 -43 -13 -63 -29 -60 -48 -116 -64 -194 -59 l-68 5 -32 -49 c-37 -55 -73 -81 -149 -105 -51 -16 -96 -13 -178 11 -15 5 -26 -3 -47 -33 -33 -49 -105 -92 -164 -99 -40 -4 -44 -7 -38 -26 20 -63 160 -336 207 -404 95 -134 244 -265 389 -342 31 -16 52 -36 63 -60 21 -43 181 -391 362 -790 73 -162 137 -298 141 -302 5 -5 270 -7 589 -6 l582 3 -272 475 c-150 261 -341 595 -425 741 -97 170 -152 275 -152 294 0 15 38 130 84 254 145 390 143 459 -28 830 -42 91 -84 174 -94 184 -26 31 -92 57 -142 57 -35 0 -87 -19 -240 -88z M2750 2823 c-47 -24 -80 -76 -80 -126 0 -49 139 -363 177 -402 82 -82 225 -32 240 85 5 32 -6 64 -67 202 -73 164 -105 219 -139 238 -38 20 -95 21 -131 3z";

const BOLT = "M4390 4284 c-420 -315 -766 -577 -768 -583 -2 -6 125 -75 282 -153 157 -79 286 -145 286 -148 0 -3 -45 -29 -99 -58 l-99 -54 40 -86 c22 -48 42 -89 44 -91 2 -2 29 6 60 18 67 25 124 27 192 5 68 -22 121 -76 162 -163 19 -39 35 -71 36 -71 1 0 65 22 141 49 362 129 883 314 1020 362 118 42 150 57 140 66 -11 10 -418 259 -684 417 -56 34 -103 63 -103 66 0 3 187 91 415 196 l415 191 -337 289 c-185 159 -346 296 -357 305 -20 16 -49 -4 -786 -557z M2515 2471 c-66 -37 -302 -168 -525 -291 -672 -372 -886 -492 -865 -487 17 4 342 119 1365 482 135 48 253 90 262 94 16 6 10 22 -44 139 -33 72 -63 132 -67 131 -3 0 -60 -31 -126 -68z";

/**
 * The discharge: jagged arcs thrown off a point. The design generates these
 * rather than drawing them, which is also the cheap way to carry them — a dozen
 * lines of arithmetic instead of two dozen literal paths.
 */
function crackle(ox: number, oy: number, count: number, seed: number) {
  const arcs: { d: string; hot: boolean; delay: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = ((i * (360 / count)) + (i % 3) * 11 + seed) * Math.PI / 180;
    const reach = 34 + (i % 3) * 8;
    const length = 30 + (i % 4) * 16;
    let x = ox + Math.cos(angle) * reach;
    let y = oy + Math.sin(angle) * reach;
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let step = 1; step <= 4; step += 1) {
      const zag = (step % 2 ? 1 : -1) * (7 + (i % 3) * 3);
      x += Math.cos(angle) * (length / 4) - Math.sin(angle) * zag;
      y += Math.sin(angle) * (length / 4) + Math.cos(angle) * zag;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    // The beat this arc strikes on (#2071). The delay is the one per-instance
    // number in the discharge, so it rides inline while `evm-crackle` itself
    // stays in `.evm-arc` where the reduced-motion gate can reach it. Both the
    // index and the group's seed are only in scope here, which is why it is
    // computed with the geometry rather than at the point of render.
    arcs.push({ d, hot: i % 2 === 1, delay: i * 137 + seed * 3 });
  }
  return arcs;
}

/** Off the bolt's head, then off each flank of the fist — the design's three. */
const SPARKS = [
  ...crackle(400, 230, 10, 0),
  ...crackle(430, 360, 7, 47),
  ...crackle(250, 400, 7, 113),
];

/**
 * Fists-and-lightning, the mark that flanks the bill's sign-up (#2034).
 *
 * ORNAMENT ONLY, AND THAT IS LOAD-BEARING: it is `aria-hidden`, it takes no
 * pointer events and it is not focusable, so the CTA row's only hit box stays
 * the button's. `docs/agents/design-fidelity.md` names the failure this avoids —
 * 44px boxes drawn for smaller marks overlapping each other — and the answer
 * here is that there is only ever one box in the row.
 *
 * IT DISCHARGES SINCE #2071 — and only that. `evm-crackle` strikes each arc on
 * its own beat and `evm-flicker` runs down the bolt; both are classes in
 * `src/motion.ornament.css`, which is delivered past first paint, so the motion
 * costs the blocking stylesheet nothing. That deferred sheet is what retired the
 * budget ceiling this ornament was drawn-not-played for.
 *
 * The design's two SHAKE keyframes are dropped by owner ruling: a 0.32s stepped
 * jitter on a mark that appears twice per card, in a flex-wrap grid of up to
 * forty cards, is the arithmetic that stood WOW's balloon bobbing down. The
 * newer hammer-strike set in the same design is not being built either.
 *
 * Two things the CSS holds that this file must not take back. The animation
 * belongs to the CLASS — an inline `animation:` bypasses the reduced-motion
 * gate, and only the per-arc `animation-delay` is inline, because a beat is a
 * per-instance number. And `.evm-arc` carries a resting opacity in `index.css`,
 * because `evm-crackle` opens at 0: stilled, or with the deferred sheet never
 * received, the arcs are still drawn, and the mark keeps the thing it is a
 * picture of.
 */
export function FistAndBolt({ width, mirrored }: { width: number; mirrored?: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-evm-bolt=""
      style={{
        // Shrinkable, so the pair yields to the button rather than the reverse:
        // grow 0 caps it at the design's width, shrink 1 + minWidth 0 lets a
        // narrow card squeeze it, and the svg scales inside because it has a
        // viewBox and no fixed height.
        flex: `0 1 ${width}px`,
        minWidth: 0,
        lineHeight: 0,
        pointerEvents: "none",
      }}
    >
      <svg
        viewBox="96 74 505 491"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          // The sparks are thrown clear of the box on purpose; the card's own
          // `overflow:hidden` is what stops them leaving the sheet.
          overflow: "visible",
          transform: mirrored ? "scaleX(-1)" : undefined,
        }}
      >
        <g>
          {SPARKS.map((arc) => (
            <path
              key={arc.d}
              className="evm-arc"
              style={{ animationDelay: `${arc.delay}ms` }}
              d={arc.d}
              fill="none"
              /* The hot core is a cream that must NOT flip with the paper — a
                 spark stays bright on a dark bill — so it mixes toward the
                 masthead's ink, which is the one warm near-white this faction
                 holds steady across both themes. */
              stroke={arc.hot
                ? "var(--everymen-gold)"
                : "color-mix(in srgb, var(--everymen-gold) 25%, var(--faction-everymen-bill-mast-ink))"}
              strokeWidth={arc.hot ? 5 : 3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
        <g
          transform="translate(0,575) scale(0.1,-0.1)"
          stroke="var(--everymen-red)"
          strokeWidth={70}
          strokeLinejoin="round"
        >
          {/* The hand is the red knocked back toward the sheet, so it reads as
              printed ink rather than a second solid — and it follows the paper
              into dark, where the mix darkens instead of lightening. */}
          <path d={FIST} fill="color-mix(in srgb, var(--everymen-red) 68%, var(--everymen-paper))" />
          {/* The flicker is on the BOLT only, never the fist: the hand is the
              mark's anchor, and the design's own jitter on it is dropped. */}
          <path className="evm-bolt" d={BOLT} fill="var(--everymen-gold)" />
        </g>
      </svg>
    </span>
  );
}
