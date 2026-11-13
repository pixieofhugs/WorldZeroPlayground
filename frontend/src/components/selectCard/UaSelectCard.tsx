import i18n from "../../i18n";
import { redactableText } from "../../utils/factions";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { UaSigil } from "../sigil/UaSigil";
import UaMandala from "../factionMarks/UaMandala";
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
import { UA_DISPLAY, UA_TEXT } from "../factionMarks/uaAtoms";
import { CTA_SELECT_SIZE, UA_CARD_CTA } from "../taskCard/cardCta";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";

/**
 * UA join card — a quiet invitation, not a sales pitch (kit §4, #851; #2324).
 * Cream, not dark. The crest carries `UaMandala` at texture strength (one of
 * its three allowed surfaces); everything else is centred and hairline-ruled.
 *
 * Gathered from the vellum leaf (`taskCard/UaTaskCard.tsx`):
 *   ground    `--faction-ua-parchment`, the public twin of
 *             `-card-parchment` (index.css asks that exception block not be
 *             widened; `uaWearsTheLeafRegister.test.ts` pins them equal)
 *   edge      2px `--faction-ua-card-frame`, "bound in sienna"
 *   band      `UaBand`'s paint, not the component (it would repeat the name)
 *   blurb     `-card-muted`, the leaf's description ink (5.13:1)
 *   CTA       `UA_CARD_CTA` (#2818): the leaf's chip, in UA_DISPLAY
 *   lift      `--color-cast-shadow` (the card casts nothing; house token)
 *
 * Measured in both cascades between `-card-bg` and `-panel` (the band covers
 * the ramp's top 44%); all pinned by the leaf's `factionContrast` rows.
 *
 * Seven slots (#3140): the crest holds only the name (the mandala is a sibling
 * behind it); the ensō is the ornament; the seal is a reduced mandala.
 */
const SEAL_SIZE = 34;

export default function UaSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  return (
    <SelectCardFrame
      style={{
        /* Roles under this surface's prefix (#2659/#2673). */
        ...factionBodyVars("ua"), ...factionRoleVars("ua", "leaf-faction-select-card"),
        background: "var(--faction-ua-parchment)",
        color: "var(--leaf-faction-select-card-ink)", fontFamily: UA_TEXT,
        border: "2px solid var(--faction-ua-card-frame)", borderRadius: "var(--radius-md)",
        boxShadow: "0 12px 34px -20px var(--color-cast-shadow)",
        textAlign: "center",
      }}
    >
      {/* crest band — the leaf masthead's paint, the pattern behind the name */}
      <div style={{
        position: "relative", display: "flex", flexDirection: "column", overflow: "hidden",
        background: "var(--faction-ua-hair)", borderBottom: "1px solid var(--leaf-faction-select-card-accent)",
      }}>
        <UaMandala
          size={300}
          strength="texture"
          rings={4}
          petalsPerRing={14}
          style={{ position: "absolute", left: "50%", top: "52%", transform: "translate(-50%, -50%)" }}
        />
        <SelectCardBand
          form="crest"
          state={state}
          seal={<UaMandala size={SEAL_SIZE} strength="full" rings={2} petalsPerRing={8} color="var(--leaf-faction-select-card-accent)" />}
          sealSize={SEAL_SIZE}
          style={{ minHeight: 132, justifyContent: "center", padding: "var(--space-lg) var(--space-xl)" }}
          nameStyle={{ fontFamily: UA_DISPLAY, fontWeight: 600, fontSize: "var(--text-title)", lineHeight: 1.1 }}
        >
          {redactableText("factions:names.ua")}
        </SelectCardBand>
      </div>

      <SelectCardBody style={{ padding: "var(--space-xl) var(--space-xl) 0" }}>
        <SelectCardMotto style={{ fontFamily: UA_DISPLAY, fontStyle: "italic", fontWeight: 500, fontSize: "var(--text-display)", lineHeight: 1.05 }}>
          {i18n.t("feed:factionSelect.ua.tagline")}
        </SelectCardMotto>
        <SelectCardPitch className="content-text" style={{ marginTop: "var(--space-md)", lineHeight: 1.55, color: "var(--leaf-faction-select-card-quiet)" }}>
          {i18n.t("feed:factionSelect.ua.blurb")}
        </SelectCardPitch>
        {/* The ensō, moved down from the band to replace the rule (#3140). */}
        <SelectCardOrnament style={{ display: "flex", justifyContent: "center", marginTop: "var(--space-lg)" }}>
          <UaSigil width={56} height={56} />
        </SelectCardOrnament>
      </SelectCardBody>

      <SelectCardFooter style={{ padding: "var(--space-md) var(--space-xl) var(--space-xl)" }}>
        <SelectCardStanding
          members={members}
          headcount={(count) => `${count} ${i18n.t("feed:factionHero.ua.stats.members", { count })}`}
          separator=" · "
          style={{ fontFamily: UA_TEXT, fontSize: "var(--text-content)", color: "var(--leaf-faction-select-card-quiet)", marginBottom: "var(--space-md)" }}
        >
          {i18n.t(`feed:factionSelect.ua.status.${state}` as const)}
        </SelectCardStanding>
        {/* The leaf's chip (#2818); geometry is `CTA_SELECT_SIZE`. */}
        <SelectCardCall onClick={onVisit} style={{ ...UA_CARD_CTA, ...CTA_SELECT_SIZE }}>
          {i18n.t("feed:factionSelect.ua.cta")}
        </SelectCardCall>
      </SelectCardFooter>
    </SelectCardFrame>
  );
}
