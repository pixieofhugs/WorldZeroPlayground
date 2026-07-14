import { FactionBackdrop } from "worldzero-frontend";

// FactionBackdrop renders a full-page `position:fixed; inset:0` atmosphere that would
// attach to the viewport (invisible in an element screenshot). The stylesheet
// rule below (!important beats the component's inline style) re-scopes it to
// `absolute` so the atmosphere fills THIS card. Preview-only; the real app uses
// it as the page background unchanged.
function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div style={{ position: "relative", width: "100%", height: 300, overflow: "hidden", borderRadius: 8 }}>
      <style>{`.bd-scope > div { position: absolute !important; inset: 0 !important; z-index: 0 !important; }`}</style>
      <div className="bd-scope" style={{ position: "absolute", inset: 0 }}>{children}</div>
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", alignItems: "flex-end", padding: 16 }}>
        <span style={{ fontFamily: "Lora, serif", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.85 }}>Neutral (global watercolor)</span>
      </div>
    </div>
  );
}

export function NeutralWatercolor() {
  return (
    <Frame label="Neutral (global watercolor)">
      <FactionBackdrop />
    </Frame>
  );
}
