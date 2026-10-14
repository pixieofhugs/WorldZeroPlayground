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
 * The Everymen — the faction-DIRECTORY tile (#2327, a child of #2321). The HELP
 * WANTED BILL at tile scale.
 *
 * One file per faction, mirroring `components/taskCard/`. `FactionSelectCard`
 * keeps only the dispatcher, the shared types and `LEGACY_SLUG`.
 *
 * THE TILES ARE NOT ALL DARK, whatever the dispatcher's docstring used to say.
 * Coven's is pink and UA's is cream. That false premise is what let dark-only
 * registers look correct on a surface that flips, so it is not restated here in
 * any form.
 *
 * ── THE REGISTER IS THE TASK CARD'S, NOT A NEW ONE ─────────────────────────
 *
 * Gathered from `taskCard/EverymenTaskCard` AS RENDERED — the card, plus the
 * `EverymenBand` in `cardMasthead/factionBands`, because the whole masthead
 * register is spelt there and not in the card file. This is the REGISTER
 * (ground, inks, rules, faces, ornament), not the markup: a task card holds a
 * task and this holds a pitch, so there is nothing structural to share and none
 * is shared.
 *
 * ── THE FORK, AND WHY IT WAS INVISIBLE ─────────────────────────────────────
 *
 * The tile printed on the POSTER FIELD — `--everymen-field` ground,
 * `--everymen-field-deep` rays, `--everymen-cream` ink, `--everymen-ink`
 * furniture. The bill prints on the PAPER. Two registers, one faction.
 *
 * And this instance hides better than S.N.I.D.E.'s, because IN LIGHT THE TWO
 * GROUNDS ARE THE SAME VALUE. `--everymen-field` is `#c1272d` by day, which is
 * exactly `--everymen-red` and exactly `--faction-everymen-bill-mast`; at night
 * it is `#3c1416`, where those two are `#e2433f` and `#c1272d`. So a check that
 * compared VALUES in one cascade would have reported the tile's ground as "the
 * faction red" and waved it through, and a contrast sweep measured the field
 * pairing happily in both themes (`everymen poster field, cream`, 4.95 / 13.14)
 * because both halves are real, declared, measured tokens. Only the NAME finds
 * it: does the tile name a token its task card does not?
 *
 * `--everymen-field` / `-field-deep` keep a reader — `EverymenFactionHero` —
 * so nothing is retired here. Deleting tokens is a consequence, not the rule.
 *
 * ── THE LIGHT HALF, WHICH HAD NEVER BEEN MEASURED ──────────────────────────
 *
 * One real failure, and an inline `opacity` is what hid it: the status line was
 * `--everymen-cream` at `opacity: 0.9` on the field, which folds to **4.26:1 by
 * day** at `--text-base` — normal text, so AA wants 4.5. At night it is
 * 10.83:1, which is why nothing ever complained. No lint, census or contrast
 * sweep can see an opacity multiplied into an ink. The status line now sets on
 * the paper in `--everymen-muted` at full strength: 5.09 / 6.76.
 *
 * ── ROLE FOR ROLE ──────────────────────────────────────────────────────────
 *
 *   ground     `--everymen-field`      -> `--everymen-paper`, the bill's stock.
 *   ink        `--everymen-cream`      -> `--everymen-paper-text`. The card's
 *                                        own head names this trap: the paper's
 *                                        ink FLIPS, and `--everymen-ink` is a
 *                                        near-black STRUCTURE colour that would
 *                                        vanish on a dark bill. The tile had
 *                                        `--everymen-ink` on four jobs.
 *   frame      3px ink + a 3px paper   -> the bill's double frame: a 2px rule in
 *              ring                      the paper's ink, `--space-xs` of air,
 *                                        then a 1px inner rule. Same two lines
 *                                        the card draws, same ink.
 *   lift       `--color-cast-shadow`   -> `--faction-everymen-bill-shadow`.
 *   masthead   ink bar, gold lettering -> the union's red mast, exactly as
 *              under a 3px gold strip    `EverymenBand` paints it:
 *                                        `-bill-mast` ground, `-bill-mast-ink`
 *                                        lettering AND mark, a 3px double rule
 *                                        in `-bill-cta-bg`, and the
 *                                        `--everymen-paper-deep` inset that
 *                                        stands the bar off the sheet.
 *   rule       a 3px gold strip        -> the card's signature device: a 2px
 *                                        dashed `--everymen-red` rule broken by
 *                                        a cog on the centreline. Red is a RULE
 *                                        and a MARK here and never text — it is
 *                                        4.49:1 on the light paper, which
 *                                        clears 1.4.11's 3:1 for a graphic and
 *                                        is a known near-miss as an ink (#651).
 *   status ink cream at `opacity: 0.9` -> `--everymen-muted` at full strength,
 *                                        in the typed face, at the card's own
 *                                        `--text-lg` — the in-progress line's
 *                                        setting, which is the same kind of
 *                                        line.
 *   plaque     RETIRED with its key and the headline's (#3130 / #3138): the
 *                                        select card's seven slots have none
 *                                        for either. The motto takes the poster
 *                                        setting when this tile is rebuilt.
 *   CTA        gold fill, ink type     -> the report-for-duty bar: `-bill-cta-bg`
 *                                        under `-bill-cta-ink` inside a 2px rule
 *                                        in the paper's ink. Gathered here as a
 *                                        transcription over the shared `CARD_CTA`
 *                                        chassis; since #2818 it is
 *                                        {@link EVERYMEN_CARD_CTA} entire, which
 *                                        spreads that chassis itself, so the
 *                                        44px tap floor still arrives with the
 *                                        kit rather than as a number re-typed.
 *   faces      `--font-faction-poster` -> `--faction-everymen-card-font`. A
 *                                        PROVEN synonym, not a waived one: both
 *                                        resolve to `"Bebas Neue", Impact,
 *                                        sans-serif` in both cascades, so this
 *                                        repaints nothing — it stops the tile
 *                                        naming the global family where the card
 *                                        names the faction's role. This tile was
 *                                        that alias's LAST reader, so
 *                                        `fontsLoaded.test.ts` required its
 *                                        deletion — index.css records why at the
 *                                        hole it left, beside the identical one
 *                                        #2322 left. Bebas itself stays. The
 *                                        typed face was already `--font-body`,
 *                                        which is the card's, and does not move.
 *
 * EVERY PAIRING HERE WAS ALREADY PINNED in both themes by the task card's own
 * rows in `utils/__tests__/factionContrast.test.ts` — `everymen paper`,
 * `everymen paper, muted`, `everymen paper, olive label`, `everymen bill
 * masthead` and `everymen bill CTA bar`. That is the payoff of gathering a
 * register rather than minting one: this tile adds no colour to the repo.
 *
 * ── WHERE THE TASK CARD HAS NO ANSWER, and nothing is invented ─────────────
 *
 *   • THE BURST. The tile fanned its own conic from 50% 34% in
 *     `--everymen-field-deep`, which was one of the geometries #2195 ruled into
 *     ONE shared drawing. This tile went plain in the gap rather than
 *     transcribe the card's copy into another place. #2393 built the shared
 *     class, so the tile mounts `.em-burst` and draws nothing: the answer this
 *     entry was waiting for arrived, and it is a class name.
 *   • THE PLAQUE'S PLATE. The card's only bordered block on the paper is the
 *     x-modifier badge, and its gold rule pays 1.88:1 on the light stock — a
 *     price the card never has to defend, because the badge is hidden at x1.00
 *     and era_1's neutralized multipliers mean it has effectively never
 *     rendered. Borrowing an unrendered block's edge is not gathering. (The
 *     plaque itself has since gone — see the table above.)
 *   • THE FIST AND BOLT, and the rubber-stamp roundel. Both are the card's, and
 *     both say something about a TASK — a sign-up flanked, a points value
 *     struck. A directory tile has neither, so it wears neither.
 *   • `--everymen-gold`. Its two card jobs are the badge rule above and the
 *     bolt's fill; with neither on the tile, the tile wears four of the
 *     register's inks and not five.
 *
 * ── THE SEVEN SLOTS (#3130, #3106) ─────────────────────────────────────────
 *
 * Built from the select-card layout blocks. The mast is the blocks' band on its
 * `1fr auto 1fr` grid, so the NAME SITS ON THE TILE'S CENTRELINE whatever the
 * sigil's width: two equal gutters, the mark in one and the seal's slot in the
 * other. The trailing space `letter-spacing` adds after the last glyph is paid
 * back as an equal `padding-left` (`NAME_TRACKING`), so the glyphs and not just
 * the box are centred. The motto takes the poster setting the retired headline
 * had; the headcount takes the plaque's small caps. The member seal is
 * PROVISIONAL, in `EverymenSelectSeal`.
 *
 * The sigil is the shared canonical `EverymenSigil` and is never re-drawn
 * inline; the cog is the shared `EverymenCog` (#2121), mounted with the card's
 * own `fill` and `hub`. The box is FLUID at a uniform 360x300 ceiling —
 * `width: 100%` to a 360 max and `minHeight` rather than a fixed height — so the
 * 375px single-column mobile directory still works (#732). Nothing here changes
 * the grid.
 */

const POSTER = "var(--ev-select-face)"; /* Bebas Neue */
const TYPED = "var(--faction-everymen-body-font)"; /* Courier Prime */
/** The bill's pointer ahead of the head-count — ornament, not copy. */
const POINTER = "▸";
/** The member seal's size, said once: the band reserves a slot this wide. */
const SEAL_SIZE = 22;

/** The sheet's ink — the paper's own text colour, which FLIPS with the paper. */
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
        // `zIndex: 0` makes this a stacking context, which is what lets the
        // burst below sit at -1: above this box, under every static block in
        // it. Without it a -1 layer escapes to the root and paints behind the
        // tile's own paper, i.e. nowhere.
        position: "relative", zIndex: 0,
        border: `1px solid ${INK}`, borderRadius: 1,
      }}>
        {/* The shared burst (#2393): the tile mounts the class and draws nothing. */}
        <div aria-hidden="true" className="em-burst" style={{ zIndex: -1 }} />
        {/* On the red mast the sigil's own `--everymen-red` is invisible — the
            band's note, and the same answer. */}
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
          {/* The card's signature device: the dashed red rule broken by a cog on
              the sheet's centreline. Same shared drawing, same fill, and the hub
              is the ground it sits on — the paper. */}
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
          {/* The struck block, from the constant (#2818): the 44px tap floor
              arrives with the kit. The label and nothing else. */}
          <SelectCardCall onClick={onVisit} style={{ ...EVERYMEN_CARD_CTA, ...CTA_SELECT_SIZE }}>
            {i18n.t("feed:factionSelect.everymen.cta")}
          </SelectCardCall>
        </SelectCardFooter>
      </div>
    </SelectCardFrame>
  );
}
