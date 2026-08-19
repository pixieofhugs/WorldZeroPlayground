import i18n from "../../i18n";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { UaSigil } from "../sigil/UaSigil";
import UaMandala from "../factionMarks/UaMandala";
import { UA_DISPLAY, UA_EYEBROW, UA_TEXT, uaShade } from "../factionMarks/uaAtoms";

/**
 * UA join card — a quiet invitation, not a sales pitch (kit §4, #851).
 *
 * One file per faction, mirroring `components/taskCard/` (#2324, a child of
 * #2321, following the pattern #2322 set). `FactionSelectCard` keeps only the
 * dispatcher, the shared types and `LEGACY_SLUG`.
 *
 * THIS TILE IS CREAM, not dark. The dispatcher's old docstring asserted "the
 * tiles are dark" as a property of the grid; UA is the counter-example that
 * proves it false, and that premise is what let dark-only registers look
 * correct on a surface that flips. It is not carried into this file.
 *
 * The crest band carries the ensō over the mandala at TEXTURE strength — one of
 * the three surfaces the pattern is allowed on (brief §5). Everything below is
 * centred, sentence-case and hairline-ruled. The gilt double border, the gold
 * rule and the ghost-outline CTA went with the salon.
 *
 * The wordmark is `feed:factionSelect.ua.wordmark` ("UA"), NOT `names.ua` —
 * #2332 renamed the faction to "Unwavering Artisans" and deliberately left this
 * key alone, because the letterspaced two-glyph mark is the tile's display type.
 * Do not repoint it.
 */
export default function UaSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.ua.status.${state}` as const);
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "linear-gradient(160deg, var(--faction-ua-lift), var(--faction-ua-card-bg) 60%)",
      color: "var(--faction-ua-card-text)", fontFamily: UA_TEXT,
      border: "1px solid var(--faction-ua-rule)", borderRadius: "var(--radius-md)",
      boxShadow: `0 12px 34px -20px ${uaShade(55)}`,
      display: "flex", flexDirection: "column",
    }}>
      {/* crest band — the mark over the pattern */}
      <div style={{
        position: "relative", height: 132, display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--faction-ua-panel)", borderBottom: "1px solid var(--faction-ua-hair)", overflow: "hidden",
      }}>
        <UaMandala
          size={300}
          strength="texture"
          opacity={0.16}
          rings={4}
          petalsPerRing={14}
          style={{ position: "absolute", left: "50%", top: "52%", transform: "translate(-50%, -50%)" }}
        />
        <span style={{ position: "relative" }}><UaSigil width={96} height={96} /></span>
      </div>

      <div style={{ position: "relative", flex: 1, padding: "var(--space-xl) var(--space-xl) 0", textAlign: "center" }}>
        <div style={{ ...UA_EYEBROW, letterSpacing: "0.24em" }}>{i18n.t("feed:factionSelect.ua.masthead")}</div>
        <div style={{ fontFamily: UA_DISPLAY, fontWeight: 600, fontSize: "var(--text-display)", lineHeight: 1, letterSpacing: "-0.01em", marginTop: "var(--space-sm)" }}>{i18n.t("feed:factionSelect.ua.wordmark")}</div>
        {/* #850 made the subtitle a full sentence. A sentence cannot be set in
            0.24em all-caps, so it takes the display cut here rather than the
            kicker treatment it inherited. */}
        <div style={{ fontFamily: UA_DISPLAY, fontWeight: 600, fontSize: "var(--text-title)", lineHeight: 1.1, marginTop: "var(--space-sm)" }}>{i18n.t("feed:factionSelect.ua.subtitle")}</div>
        <p className="content-text" style={{ margin: "var(--space-md) 0 0", fontFamily: UA_TEXT, lineHeight: 1.55, color: "var(--faction-ua-card-body)" }}>
          {i18n.t("feed:factionSelect.ua.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "var(--space-lg) var(--space-xl)", textAlign: "center" }}>
        <div style={{ fontFamily: UA_TEXT, fontSize: "var(--text-content)", color: "var(--faction-ua-card-muted)", marginBottom: "var(--space-md)" }}>
          {status}{members != null && <> · <span>{i18n.t("feed:factionSelect.ua.members", { count: members })}</span></>}
        </div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer", border: "none", borderRadius: "var(--radius-sm)",
          background: "var(--faction-ua)", color: "var(--faction-ua-on-fill)",
          fontFamily: UA_TEXT, fontSize: "var(--text-xl)", letterSpacing: "0.14em",
          textTransform: "uppercase", padding: "var(--space-md)", transition: "background 140ms",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--faction-ua-card-accent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--faction-ua)"; }}
        >{i18n.t("feed:factionSelect.ua.cta")}</button>
      </div>
    </div>
  );
}
