import { Balloon, Bunting } from "./wowOrnament";

/** WoW tile marks (#3144), decorative; the tile aria-hides them. */

/** Member seal (#3130): one googly balloon on a string, 4:3 tall. */
export function WowBalloonSeal({ size }: { size: number }) {
  return (
    <svg width={size} height={size * (4 / 3)} viewBox="0 0 24 32" style={{ display: "block" }}>
      <path d="M12,26.3 Q10,29 12,31" fill="none" stroke="var(--faction-wow-balloon-string)" strokeWidth={1} />
      <Balloon cx={12} cy={13} fill="var(--faction-wow-balloon-5)" delay={0} />
    </svg>
  );
}

/** The decree's `Bunting` (#3146); self-measuring, hence the `flex: 1` wrapper. */
export function WowBuntingOrnament() {
  return (
    <div style={{ flex: 1 }}>
      <Bunting />
    </div>
  );
}
