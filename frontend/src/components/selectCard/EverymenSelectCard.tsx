import type { CSSProperties } from "react";
import i18n from "../../i18n";
import { redactableText } from "../../utils/factions";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { EverymenSigil } from "../sigil/EverymenSigil";
import { EverymenCog } from "../factionMarks/everymenCogs";
import { CTA_SELECT_SIZE, EVERYMEN_CARD_CTA } from "../taskCard/cardCta";
import EverymenSelectSeal from "./EverymenSelectSeal";
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
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";

/**
 * The Everymen directory tile (#2327): the HELP WANTED bill at tile scale.
 *
 * The register (ground, inks, rules, faces, ornament) is gathered from
 * `taskCard/EverymenTaskCard` + `cardMasthead/factionBands`' `EverymenBand`;
 * no markup is shared. The tile used to print on the poster FIELD, a fork
 * hidden because `--everymen-field` equals the mast red in light — only the
 * token NAME reveals it. The field keeps a reader (`EverymenFactionHero`).
 *
 *   ground     `--everymen-paper`, the bill's stock
 *   ink        `--everymen-paper-text`, which FLIPS (`--everymen-ink` is a
 *              near-black structure colour that would vanish on a dark bill)
 *   frame      the bill's double frame: 2px rule, `--space-xs` air, 1px rule
 *   masthead   `EverymenBand`'s red mast, `-bill-mast-ink`, 3px double rule
 *   rule       2px dashed `--everymen-red` broken by a cog. Red is a graphic,
 *              never text (4.49:1 on light paper, #651)
 *   status     `--everymen-muted` at full strength: an `opacity: 0.9` on cream
 *              hid a 4.26:1 AA failure in light
 *   CTA        {@link EVERYMEN_CARD_CTA} (#2818), 44px tap floor included
 *   faces      `--faction-everymen-card-font`, a proven synonym for Bebas
 *
 * Every pairing is already pinned by the card's rows in `factionContrast`.
 * Not borrowed: the badge's gold rule (1.88:1, effectively never rendered),
 * the fist/bolt and roundel (task-specific). The burst is the shared
 * `.em-burst` (#2393).
 *
 * Layout from the select-card blocks (#3130): the band's `1fr auto 1fr` grid
 * centres the name; `NAME_TRACKING` repays the trailing letter-spacing. Fluid
 * box to a 360x300 ceiling for the 375px mobile directory (#732).
 */

const POSTER = "var(--ev-select-face)"; /* Bebas Neue */
const TYPED = "var(--faction-everymen-body-font)"; /* Courier Prime */
/** Ornament ahead of the head-count, not copy. */
const POINTER = "▸";
/** Seal size; the band reserves a slot this wide. */
const SEAL_SIZE = 22;

/** The paper's own text colour, which flips with it. */
const INK = "var(--everymen-paper-text)";

/** Letter-spacing on the name; its trailing space is paid back as padding-left. */
const NAME_TRACKING = "0.16em";

/** Poster label voice — condensed caps, the bill's whole chrome. */
const LABEL: CSSProperties = {
  fontFamily: POSTER,
  letterSpacing: NAME_TRACKING,
  textTransform: "uppercase",
};

/** Half the card's cog rule: a dashed red run that stops at the cog. */
const DASH: CSSProperties = {
  flex: 1,
  height: 0,
  borderTop: "2px dashed var(--everymen-red)",
};

export default function EverymenSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  return (
    <SelectCardFrame style={{
      ...factionBodyVars("everymen"), ...factionRoleVars("everymen", "ev-select"),
      background: "var(--everymen-paper)", color: INK, fontFamily: TYPED,
      border: `2px solid ${INK}`, borderRadius: 2, padding: "var(--space-xs)",
      boxShadow: "var(--faction-everymen-bill-shadow)",
    }}>
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
        // A stacking context, so the burst's -1 sits above this box's paper.
        position: "relative", zIndex: 0,
        border: `1px solid ${INK}`, borderRadius: 1,
      }}>
        {/* The shared burst (#2393). */}
        <div aria-hidden="true" className="em-burst" style={{ zIndex: -1 }} />
        {/* The sigil's own red would vanish on the red mast. */}
        <SelectCardBand
          form="row"
          state={state}
          mark={<EverymenSigil size={30} color="var(--faction-everymen-bill-mast-ink)" />}
          seal={<EverymenSelectSeal size={SEAL_SIZE} />}
          sealSize={SEAL_SIZE}
          style={{
            padding: "var(--space-md) var(--space-lg)",
            background: "var(--faction-everymen-bill-mast)", color: "var(--faction-everymen-bill-mast-ink)",
            borderBottom: "3px double var(--faction-everymen-bill-cta-bg)",
            boxShadow: "inset 0 -6px 0 -4px var(--everymen-paper-deep)",
          }}
          nameStyle={{ ...LABEL, fontSize: "var(--text-title)", lineHeight: 1.05, paddingLeft: NAME_TRACKING }}
        >
          {redactableText("factions:names.everymen")}
        </SelectCardBand>

        <SelectCardBody style={{ padding: "0 var(--space-xl)", textAlign: "center" }}>
          <SelectCardMotto style={{
            ...LABEL, letterSpacing: "0.01em", fontSize: "var(--text-display)", lineHeight: 0.96,
            marginTop: "var(--space-lg)",
          }}>
            {i18n.t("feed:factionSelect.everymen.tagline")}
          </SelectCardMotto>
          <SelectCardPitch className="content-text" style={{
            fontFamily: TYPED, lineHeight: 1.55, color: "var(--everymen-muted)", marginTop: "var(--space-md)",
          }}>
            {i18n.t("feed:factionSelect.everymen.blurb")}
          </SelectCardPitch>
          {/* The cog rule; the hub is the paper it sits on. */}
          <SelectCardOrnament style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", margin: "var(--space-md) 0" }}>
            <span style={DASH} />
            <EverymenCog size={15} fill="var(--everymen-red)" hub="var(--everymen-paper)" />
            <span style={DASH} />
          </SelectCardOrnament>
        </SelectCardBody>

        <SelectCardFooter style={{ padding: "0 var(--space-xl) var(--space-lg)", textAlign: "center" }}>
          <SelectCardStanding
            members={members}
            headcount={(count) => <>{count} {i18n.t("feed:factionHero.everymen.stats.members", { count })}</>}
            separator={<span aria-hidden="true">{POINTER} </span>}
            style={{
              display: "flex", justifyContent: "center", alignItems: "baseline", flexWrap: "wrap",
              columnGap: "var(--space-md)", marginBottom: "var(--space-md)",
            }}
            standingStyle={{ fontFamily: TYPED, fontSize: "var(--text-lg)", color: "var(--everymen-muted)" }}
            headcountStyle={{ ...LABEL, fontSize: "var(--text-base)", color: "var(--everymen-muted)" }}
          >
            {i18n.t(`feed:factionSelect.everymen.status.${state}` as const)}
          </SelectCardStanding>
          {/* From the constant (#2818). */}
          <SelectCardCall onClick={onVisit} style={{ ...EVERYMEN_CARD_CTA, ...CTA_SELECT_SIZE }}>
            {i18n.t("feed:factionSelect.everymen.cta")}
          </SelectCardCall>
        </SelectCardFooter>
      </div>
    </SelectCardFrame>
  );
}
