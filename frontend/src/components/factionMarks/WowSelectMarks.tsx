import { Balloon, Bunting } from "./wowOrnament";

/**
 * The Warriors of Whimsy tile's member seal (#3144), kept out of the tile so it
 * can be swapped without touching it. Decorative: the tile hides it from
 * assistive tech.
 */

/**
 * The member seal (#3130): ONE of the faction's own googly balloons, on a
 * string. Decided, not provisional. Drawn at `size` wide, 4:3 tall.
 */
export function WowBalloonSeal({ size }: { size: number }) {
  return (
    <svg width={size} height={size * (4 / 3)} viewBox="0 0 24 32" style={{ display: "block" }}>
      <path d="M12,26.3 Q10,29 12,31" fill="none" stroke="var(--faction-wow-balloon-string)" strokeWidth={1} />
      <Balloon cx={12} cy={13} fill="var(--faction-wow-balloon-5)" delay={0} />
    </svg>
  );
}

/** The ornament (#3146): the decree's own `Bunting`. It measures its own width, so it gets a `flex: 1` wrapper. */
export function WowBuntingOrnament() {
  return (
    <div style={{ flex: 1 }}>
      <Bunting />
    </div>
  );
}
