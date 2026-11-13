import i18n from "../../i18n";
import { redactableText } from "../../utils/factions";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import {
  SelectCardBand,
  SelectCardBody,
  SelectCardCall,
  SelectCardFooter,
  SelectCardFrame,
  SelectCardMotto,
  SelectCardOrnament,
  SelectCardPitch,
  SelectCardStanding,
} from "./selectCardBlocks";
import { Glider, ProcessLamps } from "./SingularityProcessLamps";
import { SingularitySigil } from "../sigil/SingularitySigil";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";
import { CTA_SELECT_SIZE, SINGULARITY_CARD_CTA } from "../taskCard/cardCta";

/**
 * Singularity directory tile (#2326), in the task card's two-theme
 * `--faction-singularity-term-*` register. It used theme-invariant `-card-*`
 * tokens (legible, but frozen at the dark chassis while the card lifts by day).
 *
 *   ground  `-term-bg`; edge `-term-border`; lift `-term-shadow`
 *   rule    `-term-hair`, every rule on this chassis
 *   inks    name/sigil `-term-bright`, brief `-term-dim`, status `-term-blue`
 *   CTA     `SINGULARITY_CARD_CTA` (#2818), lit at rest like the card's key
 *   face    the `face` role (`--faction-singularity-card-font` alias)
 *
 * Every pairing is one the card already measures (`factionContrast`). Not the
 * card's: the chrome strip (nine unlit squares, a different drawing), the
 * travelling sweep (no motion added), the 8px radius (tiles are square).
 * Fluid to 360x300 for mobile (#732).
 */

const MONO = "var(--sg-select-face)"; /* Share Tech Mono */

const CHASSIS = "var(--faction-singularity-term-bg)";
const BRIGHT = "var(--faction-singularity-term-bright)";
const DIM = "var(--faction-singularity-term-dim)";
const BLUE = "var(--faction-singularity-term-blue)";
/** The chrome dots. */
const DOT = `color-mix(in srgb, ${BLUE} 50%, transparent)`;

export default function SingularitySelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.singularity.status.${state}` as const);
  // The raster is out of flow, so zones are positioned to paint over it.
  const above = { position: "relative" } as const;
  return (
    <SelectCardFrame style={{
      ...factionBodyVars("singularity"), ...factionRoleVars("singularity", "sg-select"),
      background: CHASSIS, color: BRIGHT, fontFamily: MONO,
      border: "1px solid var(--faction-singularity-term-border)",
      boxShadow: "var(--faction-singularity-term-shadow)",
    }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)" }} />
      <div aria-hidden="true" style={{ ...above, display: "flex", justifyContent: "space-between", padding: "var(--space-sm) var(--space-md)", borderBottom: "1px solid var(--faction-singularity-term-hair)" }}>
        {Array.from({ length: 9 }).map((_, i) => <i key={i} style={{ width: 6, height: 6, borderRadius: 1, background: DOT }} />)}
      </div>
      <SelectCardBand
        form="row"
        align="start"
        state={state}
        mark={<SingularitySigil size={30} color={BRIGHT} />}
        seal={<Glider />}
        sealSize={22}
        style={{ ...above, padding: "var(--space-lg) var(--space-lg) 0" }}
        // eslint-disable-next-line local/no-raw-style-values -- ornament: terminal-printout faction name — display-size mono, the archetype's banner
        nameStyle={{ fontSize: 30, color: BRIGHT, letterSpacing: "0.02em" }}
      >
        {redactableText("factions:names.singularity")}
      </SelectCardBand>
      <SelectCardBody style={{ ...above, padding: "0 var(--space-lg)" }}>
        {/* The cursor is `.sg-select-motto::after`, drawn by the card. */}
        <SelectCardMotto className="sg-select-motto" style={{ fontSize: "var(--text-xl)", color: BRIGHT, marginTop: "var(--space-sm)" }}>
          {i18n.t("feed:factionSelect.singularity.tagline")}
        </SelectCardMotto>
        {/* The card brief's ink; the prompt mark is CSS, never catalog text. */}
        <SelectCardPitch className="content-text sg-select-pitch" style={{ margin: "var(--space-lg) 0 0", lineHeight: 1.65, color: DIM }}>
          {i18n.t("feed:factionSelect.singularity.blurb")}
        </SelectCardPitch>
        <SelectCardOrnament style={{ margin: "var(--space-lg) 0" }}>
          <ProcessLamps />
        </SelectCardOrnament>
      </SelectCardBody>
      <SelectCardFooter style={{ ...above, padding: "0 var(--space-lg) var(--space-lg)" }}>
        <SelectCardStanding
          members={members}
          headcount={(count) => `${count} ${i18n.t("feed:factionHero.singularity.stats.members", { count })}`}
          style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-md)", fontSize: "var(--text-md)", marginBottom: "var(--space-md)" }}
          standingStyle={{ color: BLUE }}
          headcountStyle={{ color: BRIGHT }}
        >
          {status}
        </SelectCardStanding>
        {/* Lit at rest (#2818); the `$` prompt is CSS. */}
        <SelectCardCall
          onClick={onVisit}
          className="sg-select-call"
          style={{ ...SINGULARITY_CARD_CTA, ...CTA_SELECT_SIZE }}
        >
          {i18n.t("feed:factionSelect.singularity.cta")}
        </SelectCardCall>
      </SelectCardFooter>
    </SelectCardFrame>
  );
}
