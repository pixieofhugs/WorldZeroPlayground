import i18n from "../../i18n";
import { redactableText } from "../../utils/factions";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { SnideSigil } from "../sigil/SnideSigil";
import SnideSelectSeal from "./SnideSelectSeal";
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
import { WALL } from "../factionMarks/snideAtoms";
import { CTA_SELECT_SIZE, SNIDE_CARD_CTA } from "../taskCard/cardCta";
import { factionBodyVars } from "../../utils/factionBodyFace"

/**
 * S.N.I.D.E. directory tile (#2322, the pattern for #2321), in the task card's
 * `--faction-snide-note-*` register, which FLIPS. It used the older dark-only
 * family: a forked family every lint and sweep passed.
 *
 *   ground     {@link WALL}, the flyposted wall (`factionMarks/snideAtoms`)
 *   edge/lift  `-note-wall-edge` / `-note-wall-shadow`
 *   inks       `-note-ink` / `-note-muted`; status `-note-pink-ink` (bare
 *              `--faction-snide-pink` is 2.96:1 on the light wall)
 *   rule       `.snd-censor`, the clipping's redaction strip
 *   masthead   acid on `-note-bar` only: acid never touches paper (#2173)
 *   CTA        `SNIDE_CARD_CTA` (#2818); its `-acid-deep` ring keeps the bar
 *              off the black wall by night
 *
 * Every pairing is pinned by the card's `factionContrast` rows. Seven slots
 * (#3143): the bar holds mark, name and seal; tagline is the marker motto.
 * Fluid to 360x300 for mobile (#732).
 */

const IMPACT = "var(--faction-snide-font-black)"; /* Archivo Black */
const TYPE = "var(--faction-snide-font-type)"; /* Special Elite */
const MARKER = "var(--faction-snide-font-marker)"; /* Permanent Marker */

const INK = "var(--faction-snide-note-ink)";
const MUTED = "var(--faction-snide-note-muted)";
const ACID = "var(--faction-snide-acid)";
const BAR = "var(--faction-snide-note-bar)";

const SEAL_SIZE = 32;

export default function SnideSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  return (
    <SelectCardFrame style={{
      ...factionBodyVars("snide"),
      background: WALL, color: INK, fontFamily: TYPE,
      /* Load-bearing (#2065): edge and offset mark where the clipping stops. */
      border: "1px solid var(--faction-snide-note-wall-edge)",
      boxShadow: "var(--faction-snide-note-wall-shadow)",
    }}>
      <SelectCardBand
        form="row"
        align="start"
        state={state}
        mark={<SnideSigil size={40} color={ACID} />}
        seal={<SnideSelectSeal size={SEAL_SIZE} />}
        sealSize={SEAL_SIZE}
        style={{
          background: BAR, color: "var(--faction-snide-note-bar-ink)",
          padding: "var(--space-md) var(--space-xl)",
        }}
        /* eslint-disable-next-line local/no-raw-style-values -- ornament: ransom-dispatch wordmark — Archivo Black slammed at 0.85 leading */
        nameStyle={{ fontFamily: IMPACT, fontSize: 34, lineHeight: 0.85, color: ACID, letterSpacing: "0.02em" }}
      >
        {redactableText("factions:names.snide")}
      </SelectCardBand>

      <SelectCardBody style={{ padding: "0 var(--space-xl)" }}>
        <SelectCardMotto style={{
          fontFamily: MARKER, fontSize: "var(--text-heading)", lineHeight: 1.05,
          color: "var(--faction-snide-note-pink-ink)", transform: "rotate(-1.5deg)",
          marginTop: "var(--space-lg)",
        }}>
          {i18n.t("feed:factionSelect.snide.tagline")}
        </SelectCardMotto>
        <SelectCardPitch className="content-text" style={{ lineHeight: 1.65, color: MUTED, marginTop: "var(--space-md)" }}>
          {i18n.t("feed:factionSelect.snide.blurb")}
        </SelectCardPitch>
        {/* `.snd-censor` owns its pigments; the slot's box is the drawing, so childless. */}
        <SelectCardOrnament className="snd-censor" style={{ marginTop: "var(--space-lg)" }} />
      </SelectCardBody>

      <SelectCardFooter style={{ padding: "var(--space-md) var(--space-xl) var(--space-lg)" }}>
        <SelectCardStanding
          members={members}
          headcount={(count) => `${count} ${i18n.t("feed:factionHero.snide.stats.members", { count })}`}
          style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-md)", marginBottom: "var(--space-md)" }}
          standingStyle={{ fontFamily: MARKER, fontSize: "var(--text-xl)", color: "var(--faction-snide-note-pink-ink)", transform: "rotate(-1deg)" }}
          headcountStyle={{ fontFamily: MARKER, fontSize: "var(--text-md)", letterSpacing: "0.06em", textTransform: "uppercase", color: MUTED }}
        >
          {i18n.t(`feed:factionSelect.snide.status.${state}` as const)}
        </SelectCardStanding>
        {/* The task card's CTA (#2818), label only. */}
        <SelectCardCall onClick={onVisit} style={{ ...SNIDE_CARD_CTA, ...CTA_SELECT_SIZE }}>
          {i18n.t("feed:factionSelect.snide.cta")}
        </SelectCardCall>
      </SelectCardFooter>
    </SelectCardFrame>
  );
}
