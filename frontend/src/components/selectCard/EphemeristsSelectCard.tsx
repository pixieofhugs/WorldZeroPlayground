import i18n from "../../i18n";
import { redactableText } from "../../utils/factions";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { EphemeristsSigil } from "../sigil/EphemeristsSigil";
import EphemerisNet from "../factionMarks/EphemerisNet";
import * as eph from "../factionMarks/ephemeristsPlate";
import EphemeristsGloss from "../factionMarks/EphemeristsGloss";
import { CTA_SELECT_SIZE, EPHEMERISTS_CARD_CTA } from "../taskCard/cardCta";
import { factionBodyVars } from "../../utils/factionBodyFace";
import { SelectCardBand, SelectCardBody, SelectCardCall, SelectCardFooter, SelectCardFrame, SelectCardMotto, SelectCardOrnament, SelectCardPitch, SelectCardStanding } from "./selectCardBlocks";

/**
 * The Ephemerists directory tile (#2323), in the task card's PLATE register,
 * measured in both cascades. It used to wear the BAND (`-plate-band`, dark on
 * purpose in both themes) as its sheet: same token family, so only "the sheet
 * flips" catches it, not a family check.
 *
 *   sheet      {@link eph.PLATE}, the vellum (flips)
 *   frame      `BRASS`; inner rule {@link eph.LINE}
 *   inks       {@link eph.INK} / {@link eph.QUIET} / {@link eph.CAPTION}
 *   rule       the plate's double brass rule, {@link eph.BRASS_RULE}
 *   sigil      `GOLD` on the {@link eph.DISC} chip: `-plate-gold` has no light
 *              value; on bare vellum it reads 1.02:1
 *   CTA        `.eph-cta` (#2146): the enclosure changes width per theme, so
 *              nothing here sets background/color/border inline; no hover
 *   ground     {@link EphemerisNet} at the card weight, 0.10
 *
 * Every text pairing is already pinned by the card's `factionContrast` rows.
 * No cornice: it would land on the coordinate block at the top edge.
 *
 * Seven-slot blocks (#3141). The ornament is {@link EphemeristsGloss} on
 * `members` (no catalog key for the faction name, and #3141 forbids a new
 * one); English label empty since it is aria-hidden.
 */

const SEAL_SIZE = 30;

/** Member seal: the squared circle in gold on the dark chip. */
const seal = (
  <span style={{ width: SEAL_SIZE, height: SEAL_SIZE, borderRadius: "50%", background: eph.DISC, border: `1px solid ${eph.BRASS_RULE}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width={SEAL_SIZE - 8} height={SEAL_SIZE - 8} viewBox="0 0 24 24" fill="none" stroke={eph.GOLD} strokeLinecap="round" strokeLinejoin="round">
      {/* Squared circle: a circle in a square in a triangle in a circle. */}
      <circle cx="12" cy="12" r="10" strokeWidth="1.1" />
      <path d="M12 2 L20.66 17 L3.34 17 Z" strokeWidth="1.1" />
      <rect x="7.98" y="8.96" width="8.04" height="8.04" strokeWidth="1" />
      <circle cx="12" cy="12.98" r="4.02" strokeWidth="1" />
    </svg>
  </span>
);

export default function EphemeristsSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.ephemerists.status.${state}` as const);
  return (
    <SelectCardFrame className="eph-turn-scope" style={{ ...factionBodyVars("ephemerists"),
      /* Isolate: the net's `z-index: -1` paints above the sheet's fill. */
      isolation: "isolate",
      background: eph.PLATE, color: eph.INK, fontFamily: eph.READING,
      border: `1px solid ${eph.BRASS}`, boxShadow: eph.SHADOW,
    }}>
      {/* 0.10 — the card/plate weight. */}
      <EphemerisNet opacity={0.1} />
      <div style={{ position: "absolute", inset: 9, border: `1px solid ${eph.LINE}`, pointerEvents: "none" }} />
      <SelectCardBand
        form="row"
        align="start"
        state={state}
        sealSize={SEAL_SIZE}
        seal={seal}
        /* The plate's closing `3px double` rule. */
        style={{ position: "relative", margin: "var(--space-xl) var(--space-xl) 0", paddingBottom: "var(--space-lg)", borderBottom: `3px double ${eph.BRASS_RULE}` }}
        /* Fluid: 9.055em name on a 100vw - 182px phone track; /9.33 adds 3% slack. Capped at 20px. */
        nameStyle={{ fontFamily: eph.DECO, fontSize: "min(20px, calc((100vw - 182px) / 9.33))", lineHeight: 1.1, letterSpacing: "0.22em", textTransform: "uppercase", color: eph.INK }}
        /* Filled dark chip keeps the gilt legible on vellum. */
        mark={
          <span style={{ width: 46, height: 46, borderRadius: "50%", background: eph.DISC, border: `1.5px solid ${eph.BRASS_RULE}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <EphemeristsSigil size={26} color={eph.GOLD} />
          </span>
        }
      >
        {redactableText("factions:names.ephemerists")}
      </SelectCardBand>
      <SelectCardBody style={{ position: "relative", padding: "var(--space-lg) var(--space-xl) 0" }}>
        <SelectCardMotto style={{ fontFamily: eph.DECO, fontSize: "var(--text-lg)", letterSpacing: "0.08em", color: eph.INK, marginBottom: "var(--space-md)" }}>
          {i18n.t("feed:factionSelect.ephemerists.tagline")}
        </SelectCardMotto>
        <SelectCardPitch className="content-text" style={{ fontFamily: eph.READING, lineHeight: 1.45, color: eph.QUIET }}>
          {i18n.t("feed:factionSelect.ephemerists.blurb")}
        </SelectCardPitch>
        {/* The gloss is laid OVER the empty slot: the contract test holds the
            ornament to "no text", and the gloss's casts are text. */}
        <div style={{ position: "relative", margin: "var(--space-md) 0" }}>
          <SelectCardOrnament style={{ minHeight: "2em", fontSize: "var(--text-lg)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-lg)", color: eph.CAPTION }}>
            <EphemeristsGloss word="members" english="" ordinal={2} />
          </div>
        </div>
      </SelectCardBody>
      <SelectCardFooter style={{ position: "relative", padding: "0 var(--space-xl) var(--space-lg)" }}>
        <SelectCardStanding
          members={members}
          headcount={(count) => `${count} ${i18n.t("feed:factionHero.ephemerists.stats.members", { count })}`}
          separator=" · "
          style={{ ...eph.SMALL_CAPS, fontSize: "var(--text-md)", letterSpacing: "0.14em", color: eph.CAPTION, marginBottom: "var(--space-md)" }}
        >
          {status}
        </SelectCardStanding>
        {/* `.eph-cta` owns ground, ink and enclosure (#2146/#2818). */}
        <SelectCardCall onClick={onVisit} className="eph-cta" style={{ ...EPHEMERISTS_CARD_CTA, ...CTA_SELECT_SIZE }}>
          {i18n.t("feed:factionSelect.ephemerists.cta")}
        </SelectCardCall>
      </SelectCardFooter>
    </SelectCardFrame>
  );
}
