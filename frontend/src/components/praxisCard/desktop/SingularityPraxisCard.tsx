import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/** Punch-card sprocket strip — the row and one hole. Static (#586). */
const holeRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-xs) 0",
};

const holeStyle: CSSProperties = {
  width: 6,
  height: 4,
  background: "rgba(10,26,14)",
  border:
    "1px solid var(--faction-singularity-card-accent, var(--faction-singularity-border-hard))",
  borderRadius: 1,
};

function SingularityHoles() {
  return (
    <div style={holeRowStyle}>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} style={holeStyle} />
      ))}
    </div>
  );
}

/** Terminal scanline wash + the four corner brackets. Static (#586). */
const scanlineStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.015) 2px, rgba(74,222,128,0.015) 4px)",
  pointerEvents: "none",
  zIndex: 1,
};

const cornerRule = "1px solid var(--faction-singularity-card-text)";
const cornerBase: CSSProperties = { position: "absolute", width: 10, height: 10 };
const cornerTopLeft: CSSProperties = {
  ...cornerBase,
  top: 3,
  left: 3,
  borderTop: cornerRule,
  borderLeft: cornerRule,
};
const cornerTopRight: CSSProperties = {
  ...cornerBase,
  top: 3,
  right: 3,
  borderTop: cornerRule,
  borderRight: cornerRule,
};
const cornerBottomLeft: CSSProperties = {
  ...cornerBase,
  bottom: 3,
  left: 3,
  borderBottom: cornerRule,
  borderLeft: cornerRule,
};
const cornerBottomRight: CSSProperties = {
  ...cornerBase,
  bottom: 3,
  right: 3,
  borderBottom: cornerRule,
  borderRight: cornerRule,
};

export function SingularityPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    <div
      style={{
        ...frameBase,
        borderRadius: 8, // terminal slab
        background: "var(--faction-singularity-card-bg)",
        border: "2px solid var(--faction-singularity-border-hard)",
        position: "relative",
        fontFamily: "'Share Tech Mono', monospace",
        color: "var(--faction-singularity-card-text)",
        overflow: "hidden",
      }}
    >
      <div style={scanlineStyle} />
      <div style={cornerTopLeft} />
      <div style={cornerTopRight} />
      <div style={cornerBottomLeft} />
      <div style={cornerBottomRight} />
      <SingularityHoles />
      <div
        style={{
          padding: "var(--space-sm) var(--space-xl) var(--space-md)",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--faction-singularity-card-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            marginBottom: "var(--space-sm)",
          }}
        >
          {t("card.masthead.singularity")}
          <span
            style={{
              display: "inline-block",
              width: 5,
              height: 9,
              background: "var(--faction-singularity-card-text)",
              marginLeft: "var(--space-xs)",
              verticalAlign: "middle",
              animation: "blink 1s step-end infinite",
            }}
          />
        </div>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--faction-singularity-card-text)"
          muted="var(--faction-singularity-card-muted)"
          paper="var(--faction-singularity-card-bg)"
          showCrown={showCrown}
        />
      </div>
      <SingularityHoles />
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}

export default SingularityPraxisCard;
