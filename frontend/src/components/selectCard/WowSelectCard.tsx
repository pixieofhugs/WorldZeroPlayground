import i18n from "../../i18n";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { WowSigil } from "../sigil/WowSigil";

/**
 * WOW pledge card — the Court's recruiting placard (kit §13, #900).
 *
 * A gilt-framed cream card under a checker rail of gold and plum: the crest, the
 * name in MedievalSharp, the Pig-Latin tagline in Lora italic, three tag chips,
 * and the gilt lozenge CTA.
 *
 * One file per faction, mirroring `components/taskCard/` (#2328, a child of
 * #2321, following the pattern #2322 set). `FactionSelectCard` keeps only the
 * dispatcher, the shared types and `LEGACY_SLUG`.
 *
 * THE `CHOSEN` BANNER + GOLD RING are bound to `state === "member"`, not to a
 * click. The kit's card owns a local `selDone` toggle and flips itself when you
 * press Pledge; on this tile joining is not available at all — the CTA VISITS
 * the faction page, which owns the Join block and its eligibility flags. So the
 * selected dress renders when the viewer already IS one, which is the same
 * information the kit's toggle was standing in for.
 *
 * NO MUSTER FIGURES. The kit's three-up tally (Knights / in Rainbow / Modifier)
 * has no data behind it here — `members` is the only count the tile is handed,
 * and the other two are mock. The member count keeps its social-proof slot on
 * the status line, where every other tile in this file puts it.
 */
export default function WowSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.wow.status.${state}` as const);
  const chosen = state === "member";
  const tags = i18n.t("feed:factionSelect.wow.tags", { returnObjects: true }) as string[];
  return (
    <div style={{
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--faction-wow-card-bg)", color: "var(--faction-wow-card-text)", fontFamily: "var(--faction-wow-body-font)",
      border: "2px solid var(--faction-wow-chronicle-border)", borderRadius: "var(--radius-xl)",
      boxShadow: chosen
        ? "0 0 0 3px var(--faction-wow-chronicle-gold), 0 20px 46px -22px var(--faction-wow-chronicle-shadow)"
        : "0 20px 46px -22px var(--faction-wow-chronicle-shadow)",
      display: "flex", flexDirection: "column",
    }}>
      {chosen && (
        <div style={{
          position: "absolute", zIndex: 2, top: 14, right: -32, transform: "rotate(38deg)",
          background: "var(--faction-wow-plum-surface)", color: "var(--faction-wow-on-plum)",
          fontFamily: "var(--faction-wow-card-font)", letterSpacing: "0.1em",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the CHOSEN sash is a drawn banner; its lettering is struck to the ribbon, and its inset IS the ribbon's width (rounding reflows the sash off the corner).
          fontSize: 11, padding: "3px 36px",
          boxShadow: "0 2px 5px var(--faction-wow-stamp-shadow)",
        }}>{i18n.t("feed:factionSelect.wow.chosen")}</div>
      )}
      {/* the gilt checker rail */}
      <div aria-hidden="true" style={{
        height: 9,
        background: "repeating-linear-gradient(90deg, var(--faction-wow-chronicle-gold) 0 11px, var(--faction-wow-plum-surface) 11px 22px)",
      }} />
      <div style={{ flex: 1, padding: "var(--space-xl) var(--space-xl) 0", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-sm)", filter: "drop-shadow(0 5px 6px var(--faction-wow-stamp-shadow))" }}>
          {/* above the 56px motto floor, so the seal keeps its Pig-Latin band */}
          <WowSigil size={88} />
        </div>
        <div style={{ fontFamily: "var(--faction-wow-card-font)", fontSize: "var(--text-title)", lineHeight: 1.1, color: "var(--faction-wow-card-text)" }}>
          {i18n.t("feed:factionSelect.wow.name")}
        </div>
        <p className="content-text" style={{ fontStyle: "italic", color: "var(--faction-wow-card-accent)", margin: "var(--space-xs) 0 var(--space-md)", lineHeight: 1.4 }}>
          {i18n.t("feed:factionSelect.wow.tagline")}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "var(--space-xs)" }}>
          {tags.map((tag) => (
            <span key={tag} style={{
              fontSize: "var(--text-md)", color: "var(--faction-wow-card-accent)",
              background: "var(--faction-wow-chip-bg)", border: "1px solid var(--faction-wow-chip-border)",
              borderRadius: 20, padding: "var(--space-xs) var(--space-md)",
            }}>{tag}</span>
          ))}
        </div>
      </div>
      <div style={{ padding: "var(--space-lg) var(--space-xl)", textAlign: "center" }}>
        <div style={{ fontSize: "var(--text-content)", color: "var(--faction-wow-card-muted)", marginBottom: "var(--space-md)" }}>
          {status}{members != null && <> · {i18n.t("feed:factionSelect.wow.members", { count: members })}</>}
        </div>
        <button onClick={onVisit} style={{
          width: "100%", cursor: "pointer",
          fontFamily: "var(--faction-wow-card-font)", letterSpacing: "0.05em",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the CTA is struck on a gilt lozenge in MedievalSharp; a label token would flatten the placard into house chrome (§270)
          fontSize: 16,
          color: "var(--faction-wow-avatar-pill-text)",
          background: "linear-gradient(180deg, var(--faction-wow-avatar-pill-from) 0%, var(--faction-wow-gilt-mid) 45%, var(--faction-wow-avatar-pill-to) 100%)",
          border: "2px solid var(--faction-wow-gilt-border)", borderRadius: "var(--radius-md)",
          padding: "var(--space-md) var(--space-lg)",
        }}>{i18n.t("feed:factionSelect.wow.cta")}</button>
      </div>
    </div>
  );
}
