import React from "react";

/**
 * LevelUpPopup — World Zero "Field Stamp" level-up popup.
 *
 * A stamped field-journal certificate announcing a new level and the
 * abilities it unlocks. Self-contained: all colours fall back to literals,
 * so it renders without the World Zero token stylesheets loaded — but if
 * they ARE loaded (tokens/colors.css, typography.css, fonts.css) it inherits
 * the live theme through the var() references.
 *
 * Fonts used: "Lora" (italic display) + "Courier Prime" (mono body).
 * Load them however you like, e.g.:
 *   <link href="https://fonts.googleapis.com/css2?family=Lora:ital@1&family=Courier+Prime&display=swap" rel="stylesheet">
 *
 * Usage:
 *   <LevelUpPopup
 *     level={7}
 *     rank="Cartographer"
 *     abilities={[
 *       { kind: "ability", name: "Challenge a player to a Duel",
 *         desc: "Stake reputation against any quester nearby and settle it in the field." },
 *       { kind: "sense", name: "Understand the moon's whispers",
 *         desc: "On clear nights the moon offers one quiet suggestion. You may ignore it." },
 *     ]}
 *     onContinue={() => closeModal()}
 *   />
 */

/* The World Zero six-colour title rainbow (tokens/colors.css → --underline-1..6) */
const RAINBOW = [
  "var(--underline-1, #fbbf24)", // amber
  "var(--underline-2, #be185d)", // magenta
  "var(--underline-3, #4f46e5)", // indigo
  "var(--underline-4, #1d6e72)", // teal
  "var(--underline-5, #16a34a)", // green
  "var(--underline-6, #c1272d)", // red
];

const INK = "var(--color-text-primary, #1a1209)";
const PAPER = "var(--color-bg-page, #f7f4ee)";
const MUTED = "var(--color-text-secondary, #6b6050)";
const FAINT = "var(--color-text-tertiary, #9b8e7d)";
const BORDER = "var(--color-border-strong, rgba(0,0,0,0.15))";
const FONT_DISPLAY = 'var(--font-display, "Lora", Georgia, serif)';
const FONT_BODY = 'var(--font-body, "Courier Prime", "Courier New", monospace)';

/* Rank rendered with a per-letter cycling rainbow underline — the WZ signature. */
function RainbowText({ text, fontSize = 34 }) {
  let i = 0;
  return (
    <h1
      style={{
        fontFamily: FONT_DISPLAY,
        fontStyle: "italic",
        fontWeight: 500,
        lineHeight: 1.15,
        fontSize,
        color: INK,
        margin: 0,
      }}
    >
      {[...text].map((ch, idx) => {
        if (ch === " ") {
          return <span key={idx} style={{ display: "inline-block", width: "0.3em" }} />;
        }
        const color = RAINBOW[i++ % RAINBOW.length];
        return (
          <span key={idx} style={{ borderBottom: `4px solid ${color}`, paddingBottom: 2 }}>
            {ch}
          </span>
        );
      })}
    </h1>
  );
}

/* Thin six-segment rainbow rule. */
function RainbowRule({ width = "100%", height = 4, style }) {
  return (
    <div style={{ display: "flex", width, height, borderRadius: height / 2, overflow: "hidden", ...style }}>
      {RAINBOW.map((c, idx) => (
        <span key={idx} style={{ flex: 1, background: c }} />
      ))}
    </div>
  );
}

/* The circular stamp: rainbow (segmented) or solid-ink ring around an ink LVL/n core. */
function SealStamp({ level, sealRing = "rainbow" }) {
  const ringBg =
    sealRing === "ink"
      ? INK
      : "conic-gradient(from -60deg," +
        RAINBOW.map((c, idx) => `${c} ${idx * 60}deg ${(idx + 1) * 60}deg`).join(",") +
        ")";
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          padding: 6,
          transform: "rotate(-7deg)",
          background: ringBg,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: PAPER,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `inset 0 0 0 2px ${PAPER}, inset 0 0 0 3px ${INK}`,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 8, letterSpacing: "0.24em", color: INK }}>
              LVL
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 38, lineHeight: 0.85, color: INK }}>
              {level}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AbilityRow({ ability, color }) {
  const isSense = ability.kind === "sense";
  return (
    <div style={{ display: "flex", gap: 13, textAlign: "left", alignItems: "flex-start", marginBottom: 15 }}>
      <span style={{ fontSize: 15, lineHeight: 1.1, flex: "none", width: 18, textAlign: "center", color }}>
        {isSense ? "✦" : "■"}
      </span>
      <div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 7, letterSpacing: "0.18em", textTransform: "uppercase", color: FAINT, marginBottom: 3 }}>
          {isSense ? "A curious sense" : "New ability"}
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 16, lineHeight: 1.2, color: INK }}>
          {ability.name}
        </div>
        {ability.desc && (
          <div style={{ fontFamily: FONT_BODY, fontSize: 9, lineHeight: 1.55, color: MUTED, marginTop: 3 }}>
            {ability.desc}
          </div>
        )}
      </div>
    </div>
  );
}

export function LevelUpPopup({
  level,
  rank,
  abilities = [],
  onContinue,
  continueLabel = "Continue",
  sealRing = "rainbow",
  dimBackdrop = true,
}) {
  const card = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        width: 372,
        maxWidth: "100%",
        boxSizing: "border-box",
        background: PAPER,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: "30px 28px 24px",
        boxShadow: "0 18px 46px -14px rgba(26,18,9,0.5)",
        textAlign: "center",
        fontFamily: FONT_BODY,
      }}
    >
      <SealStamp level={level} sealRing={sealRing} />

      <p style={{ fontFamily: FONT_BODY, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: FAINT, margin: "0 0 4px" }}>
        Level Reached
      </p>
      <RainbowText text={rank} />

      <RainbowRule style={{ margin: "14px 0 16px" }} />

      <div style={{ fontFamily: FONT_BODY, fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: FAINT, marginBottom: 14 }}>
        Now Unlocked
      </div>

      {abilities.map((ab, idx) => (
        <AbilityRow key={idx} ability={ab} color={RAINBOW[idx % RAINBOW.length]} />
      ))}

      <button
        type="button"
        onClick={onContinue}
        style={{
          marginTop: 20,
          width: "100%",
          fontFamily: FONT_BODY,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontSize: 11,
          padding: "0.6rem 1.4rem",
          border: "none",
          background: INK,
          color: PAPER,
          cursor: "pointer",
          transition: "opacity 150ms",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        {continueLabel}
      </button>
    </div>
  );

  if (!dimBackdrop) return card;

  return (
    <div
      onClick={onContinue}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 1000,
        background: "radial-gradient(ellipse at 50% 42%, rgba(26,18,9,0.30), rgba(26,18,9,0.66))",
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>{card}</div>
    </div>
  );
}

export default LevelUpPopup;

/* ----------------------------------------------------------------------------
 * Example data shape (one grounded ability + one whimsical sense per level):
 *
 * const LEVELS = {
 *   3:  { rank: "Wayfarer", abilities: [
 *          { kind: "ability", name: "Carry two quests at once",
 *            desc: "Pin a second active quest to your journal and switch between them at will." },
 *          { kind: "sense",   name: "Taste the colour of morning light",
 *            desc: "Dawn now arrives with a faint flavour — copper on cold days, honey on warm." } ] },
 *   7:  { rank: "Cartographer", abilities: [
 *          { kind: "ability", name: "Challenge a player to a Duel",
 *            desc: "Stake reputation against any quester nearby and settle it in the field." },
 *          { kind: "sense",   name: "Understand the moon's whispers",
 *            desc: "On clear nights the moon offers one quiet suggestion. You may ignore it." } ] },
 *   12: { rank: "Pathwarden", abilities: [
 *          { kind: "ability", name: "Found a faction chapter",
 *            desc: "Raise your own banner and gather up to five questers beneath it." },
 *          { kind: "sense",   name: "Read the intentions of crows",
 *            desc: "Crows will tilt their heads toward what you've lost. Usually." } ] },
 * };
 *
 * <LevelUpPopup level={7} {...LEVELS[7]} onContinue={dismiss} />
 * -------------------------------------------------------------------------- */
