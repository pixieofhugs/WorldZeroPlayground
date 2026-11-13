import i18n from "../../i18n";
import { redactableText } from "../../utils/factions";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { CovenSigil } from "../sigil/CovenSigil";
import {
  BORDER,
  Braid,
  CAPTION,
  CHROME,
  DEEP,
  HAND,
  INK,
  READING,
  SHADOW,
  SLIP_SHEET,
  SOFT,
} from "../factionMarks/covenSlip";
import CovenSelectSeal from "./CovenSelectSeal";
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
import { COVEN_CARD_CTA, CTA_SELECT_SIZE } from "../taskCard/cardCta";
import { factionBodyVars } from "../../utils/factionBodyFace"

/**
 * Cozy Coven directory tile (#2325): the spell slip at tile scale, in the task
 * card's register (`taskCard/CovenTaskCard`, `factionMarks/covenSlip`,
 * `CovenBand`). Ground `SLIP_SHEET`, slip inks, Caveat + Spectral, slip CTA.
 *
 *   mark      {@link CovenSigil}, not the pentagram badge the card kit stood
 *             down (#2726). Inked {@link DEEP}: `--faction-coven` is only
 *             measured on the band's white ground (2.11:1 on the ramp)
 *   rule      the shared `Braid` rules off the footer, as on the card (#2029)
 *   wordmark  `--text-title`, lower case, weight 400: Caveat ships 400 only,
 *             so a 700 is faux bold
 *   status    straight on the sheet; the ward-paper chip was another
 *             surface's ground
 *
 * All pairings are pinned by the card's `factionContrast` rows; the hat adds
 * `-slip-deep` on `-slip-mid` at the 3:1 graphic floor. No cat (not one of
 * `CovenCat`'s placements) and no Grenze Gotisch (no task title).
 *
 * Seven-slot blocks (#3142): row band, Caveat motto, braid ornament, member
 * seal in {@link CovenSelectSeal}. Fluid to 360x300 for mobile (#732).
 */

/** Seal size; the band reserves a slot this wide. */
const SEAL_SIZE = 26;

export default function CovenSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.coven.status.${state}` as const);
  return (
    <SelectCardFrame
      style={{
        ...factionBodyVars("coven"),
        background: SLIP_SHEET, color: INK, fontFamily: CHROME,
        border: `2px solid ${BORDER}`, borderRadius: 18,
        boxShadow: SHADOW,
      }}
    >
      {/* Masthead: mark hard left, name hand-lettered beside it. */}
      <SelectCardBand
        form="row"
        align="start"
        state={state}
        mark={<CovenSigil size={34} color={DEEP} />}
        seal={<CovenSelectSeal size={SEAL_SIZE} />}
        sealSize={SEAL_SIZE}
        style={{ padding: "var(--space-lg) var(--space-xl) 0" }}
        nameStyle={{ fontFamily: HAND, fontSize: "var(--text-title)", lineHeight: 1, textTransform: "lowercase", color: INK }}
      >
        {redactableText("factions:names.coven")}
      </SelectCardBand>
      <SelectCardBody style={{ padding: "0 var(--space-xl)" }}>
        <SelectCardMotto style={{ marginTop: "var(--space-md)", fontFamily: HAND, fontSize: "var(--text-display)", lineHeight: 1, color: INK }}>
          {i18n.t("feed:factionSelect.coven.tagline")}
        </SelectCardMotto>
        <SelectCardPitch
          className="content-text"
          style={{ marginTop: "var(--space-md)", fontFamily: READING, fontStyle: "italic", lineHeight: 1.5, color: SOFT }}
        >
          {i18n.t("feed:factionSelect.coven.blurb")}
        </SelectCardPitch>
        <SelectCardOrnament style={{ marginTop: "var(--space-lg)" }}>
          <Braid />
        </SelectCardOrnament>
      </SelectCardBody>
      <SelectCardFooter style={{ padding: "var(--space-md) var(--space-xl) var(--space-lg)" }}>
        <SelectCardStanding
          members={members}
          headcount={(count) => (
            <>{count} {i18n.t("feed:factionHero.coven.stats.members", { count })} <span aria-hidden="true">✦</span></>
          )}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-md)", marginBottom: "var(--space-md)" }}
          standingStyle={{ fontFamily: READING, fontStyle: "italic", fontSize: "var(--text-content)", lineHeight: 1.3, color: SOFT }}
          headcountStyle={{ ...CAPTION, flexShrink: 0 }}
        >
          {status}
        </SelectCardStanding>
      {/* From the one place it is written (#2818). */}
        <SelectCardCall onClick={onVisit} style={{ ...COVEN_CARD_CTA, ...CTA_SELECT_SIZE }}>
          {i18n.t("feed:factionSelect.coven.cta")}
        </SelectCardCall>
      </SelectCardFooter>
    </SelectCardFrame>
  );
}
