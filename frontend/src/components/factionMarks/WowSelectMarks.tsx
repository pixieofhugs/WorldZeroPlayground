import { Balloon } from "./wowOrnament";

/**
 * The Warriors of Whimsy tile's two drawings (#3144), kept out of the tile so
 * either can be swapped without touching it. Both are decorative: the tile
 * hides them from assistive tech.
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

const DIAMONDS = 9;

/**
 * PROVISIONAL (#3130 owner ruling, 2026-10-12): the mock's row of harlequin
 * diamonds, gold and plum in turn, between two rules. The design-pass child
 * replaces it.
 */
export function WowHarlequinOrnament() {
  const rule = <span style={{ flex: 1, borderTop: "1px solid currentColor" }} />;
  return (
    <>
      {rule}
      <svg width={DIAMONDS * 12} height={12} viewBox={`0 0 ${DIAMONDS * 12} 12`} style={{ display: "block" }}>
        {Array.from({ length: DIAMONDS }, (_, i) => (
          <path
            key={i}
            d={`M${i * 12} 6l6-6 6 6-6 6z`}
            fill={i % 2 ? "var(--faction-wow-chronicle-gold)" : "var(--faction-wow-plum-surface)"}
          />
        ))}
      </svg>
      {rule}
    </>
  );
}
