import i18n from "../../i18n";
import { redactableText } from "../../utils/factions";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { WowSigil } from "../sigil/WowSigil";
import { WowBalloonSeal, WowBuntingOrnament } from "../factionMarks/WowSelectMarks";
// One line on purpose: the register test's import scan reads single-line imports.
import { SelectCardBand, SelectCardBody, SelectCardCall, SelectCardFooter, SelectCardFrame, SelectCardMotto, SelectCardOrnament, SelectCardPitch, SelectCardStanding } from "./selectCardBlocks";
import { CTA_SELECT_SIZE, WOW_CARD_CTA } from "../taskCard/cardCta";

/**
 * WOW pledge card — the Court's recruiting placard (kit §13, #900). CREAM, not
 * dark: don't assume dark tiles.
 *
 * The balloon seal (#3144) marks `state === "member"`; the CTA only visits the
 * faction page, which owns joining. No muster figures: `members` is the only
 * real count.
 *
 * Register is the quest decree's (#2328, held by `wowWearsTheDecreeRegister`):
 * frame `-chronicle-gold`, lift `-quest-shadow`, plum CTA (5.16:1, not the gilt
 * lozenge WowTaskCard rules out). The checker rail stays because `WowBand` would
 * repeat the wordmark. Plate-on-sheet 1.12:1 is the accepted pairing (#2042
 * owner ruling). Contrast is pinned in `factionContrast.test.ts`.
 */
const HEADCOUNT_SEPARATOR = " · ";

export default function WowSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  return (
    <SelectCardFrame style={{
      // Role map (#2674); a surface-owned prefix, since tiles sit side by side.
      ...factionBodyVars("wow"), ...factionRoleVars("wow", "wow-select-card"),
      background: "var(--wow-select-card-paper)", color: "var(--wow-select-card-ink)", fontFamily: "var(--faction-wow-body-font)",
      border: "2px solid var(--faction-wow-chronicle-gold)", borderRadius: "var(--radius-xl)",
      boxShadow: "var(--faction-wow-quest-shadow)",
      textAlign: "center",
    }}>
      {/* The checker rail (see header). */}
      <div aria-hidden="true" style={{
        height: 9,
        background: "repeating-linear-gradient(90deg, var(--faction-wow-chronicle-gold) 0 11px, var(--faction-wow-plum-surface) 11px 22px)",
      }} />
      <SelectCardBand
        form="crest"
        state={state}
        sealSize={30}
        style={{ padding: "var(--space-xl) var(--space-xl) 0" }}
        nameStyle={{ fontFamily: "var(--wow-select-card-face)", fontSize: "var(--text-title)", lineHeight: 1.1, color: "var(--wow-select-card-ink)" }}
        mark={
          <span style={{ display: "inline-flex", filter: "drop-shadow(0 5px 6px var(--faction-wow-stamp-shadow))" }}>
            {/* above the 56px motto floor, so the sigil keeps its Pig-Latin band */}
            <WowSigil size={88} />
          </span>
        }
        seal={<WowBalloonSeal size={30} />}
      >
        {redactableText("factions:names.wow")}
      </SelectCardBand>
      <SelectCardBody style={{ padding: "var(--space-sm) var(--space-xl) 0" }}>
        <SelectCardMotto style={{ fontStyle: "italic", fontSize: "var(--text-title)", lineHeight: 1.2, color: "var(--wow-select-card-accent)" }}>
          {i18n.t("feed:factionSelect.wow.tagline")}
        </SelectCardMotto>
        <SelectCardPitch className="content-text" style={{ marginTop: "var(--space-md)", lineHeight: 1.5, color: "var(--wow-select-card-quiet)" }}>
          {i18n.t("feed:factionSelect.wow.blurb")}
        </SelectCardPitch>
        <SelectCardOrnament style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginTop: "var(--space-md)", color: "var(--faction-wow-chronicle-gold)" }}>
          <WowBuntingOrnament />
        </SelectCardOrnament>
      </SelectCardBody>
      <SelectCardFooter style={{ padding: "var(--space-lg) var(--space-xl)" }}>
        <SelectCardStanding
          members={members}
          separator={HEADCOUNT_SEPARATOR}
          headcount={(count) => `${count} ${i18n.t("feed:factionHero.wow.stats.members", { count })}`}
          style={{ fontSize: "var(--text-content)", color: "var(--wow-select-card-quiet)", marginBottom: "var(--space-md)" }}
        >
          {i18n.t(`feed:factionSelect.wow.status.${state}` as const)}
        </SelectCardStanding>
        {/* #2818 */}
        <SelectCardCall onClick={onVisit} style={{ ...WOW_CARD_CTA, ...CTA_SELECT_SIZE }}>
          {i18n.t("feed:factionSelect.wow.cta")}
        </SelectCardCall>
      </SelectCardFooter>
    </SelectCardFrame>
  );
}
