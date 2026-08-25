import type { CSSProperties } from "react";
import i18n from "../../i18n";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { EverymenSigil } from "../sigil/EverymenSigil";
import { EverymenCog } from "../factionMarks/everymenCogs";
import { CARD_CTA } from "../taskCard/cardCta";
import { factionRoleVars } from "../../utils/factionRoles";

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
 *   plaque     ink plate, gold caps    -> the poster LABEL voice in
 *                                        `--everymen-olive`, the card's own
 *                                        small-caption ink (4.97 / 5.32).
 *   CTA        gold fill, ink type     -> the report-for-duty bar: `-bill-cta-bg`
 *                                        under `-bill-cta-ink` inside a 2px rule
 *                                        in the paper's ink, on the shared
 *                                        {@link CARD_CTA} chassis so the 44px
 *                                        tap floor is the kit's and not a number
 *                                        re-typed here.
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
 *     rendered. Borrowing an unrendered block's edge is not gathering. The
 *     plaque keeps its lettering and loses its plate.
 *   • THE FIST AND BOLT, and the rubber-stamp roundel. Both are the card's, and
 *     both say something about a TASK — a sign-up flanked, a points value
 *     struck. A directory tile has neither, so it wears neither.
 *   • `--everymen-gold`. Its two card jobs are the badge rule above and the
 *     bolt's fill; with neither on the tile, the tile wears four of the
 *     register's inks and not five.
 *
 * The sigil is the shared canonical `EverymenSigil` and is never re-drawn
 * inline; the cog is the shared `EverymenCog` (#2121), mounted with the card's
 * own `fill` and `hub`. The box is FLUID at a uniform 360x300 ceiling —
 * `width: 100%` to a 360 max and `minHeight` rather than a fixed height — so the
 * 375px single-column mobile directory still works (#732). Nothing here changes
 * the grid.
 */

const POSTER = "var(--ev-select-face)"; /* Bebas Neue */
const TYPED = "var(--font-body)"; /* Courier Prime */

/** The sheet's ink — the paper's own text colour, which FLIPS with the paper. */
const INK = "var(--everymen-paper-text)";

/** Poster label voice — condensed caps, the bill's whole chrome. */
const LABEL: CSSProperties = {
  fontFamily: POSTER,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

/** Half the card's cog rule: a dashed red run that stops at the cog. */
const DASH: CSSProperties = {
  flex: 1,
  height: 0,
  borderTop: "2px dashed var(--everymen-red)",
};

export default function EverymenSelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.everymen.status.${state}` as const);
  return (
    <div style={{
      ...factionRoleVars("everymen", "ev-select"),
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: "var(--everymen-paper)", color: INK, fontFamily: TYPED,
      border: `2px solid ${INK}`, borderRadius: 2, padding: "var(--space-xs)",
      boxShadow: "var(--faction-everymen-bill-shadow)",
      display: "flex", flexDirection: "column",
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
        {/* THE SHARED DRAWING LANDED (#2393). This tile went plain rather than
            transcribe the card's burst into an eighth place; `.em-burst` now
            exists, so it mounts it and transcribes nothing. It is a directory
            tile, not a task or praxis card, so the alternation does not reach
            it — the law the owner wrote governs the two card families. */}
        <div aria-hidden="true" className="em-burst" style={{ zIndex: -1 }} />
        {/* The mast, in the band's anatomy rather than the band itself: the
            faction's mark hard left, the bill's shout centred on the bar. The
            band names the faction; this names what the bill is for, which is
            why the copy is the tile's and the paint is the band's. */}
        <div style={{
          display: "flex", alignItems: "center", gap: "var(--space-md)",
          padding: "var(--space-md) var(--space-lg)",
          background: "var(--faction-everymen-bill-mast)", color: "var(--faction-everymen-bill-mast-ink)",
          borderBottom: "3px double var(--faction-everymen-bill-cta-bg)",
          boxShadow: "inset 0 -6px 0 -4px var(--everymen-paper-deep)",
        }}>
          {/* On the red mast the sigil's own `--everymen-red` is invisible —
              the band's note, and the same answer. */}
          <EverymenSigil size={30} color="var(--faction-everymen-bill-mast-ink)" />
          <span style={{ ...LABEL, flex: 1, fontSize: "var(--text-title)", lineHeight: 1.05, textAlign: "center" }}>
            {i18n.t("feed:factionSelect.everymen.banner")}
          </span>
        </div>

        <div style={{ flex: 1, padding: "var(--space-lg) var(--space-xl) 0", textAlign: "center" }}>
          <div style={{ ...LABEL, fontSize: "var(--text-display)", letterSpacing: "0.01em", lineHeight: 0.96 }}>
            {i18n.t("feed:factionSelect.everymen.headline")}
          </div>
          {/* The card's signature device: the dashed red rule broken by a cog on
              the sheet's centreline. Same shared drawing, same fill, and the hub
              is the ground it sits on — which on this tile, as on the card, is
              the paper. */}
          <div aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", margin: "var(--space-md) 0" }}>
            <span style={DASH} />
            <EverymenCog size={15} fill="var(--everymen-red)" hub="var(--everymen-paper)" />
            <span style={DASH} />
          </div>
          <div style={{ ...LABEL, fontSize: "var(--text-base)", color: "var(--everymen-olive)" }}>
            {i18n.t("feed:factionSelect.everymen.plaque")}
          </div>
        </div>

        <div style={{ padding: "var(--space-md) var(--space-xl) var(--space-lg)", textAlign: "center" }}>
          <div style={{ fontFamily: TYPED, fontSize: "var(--text-lg)", color: "var(--everymen-muted)", marginBottom: "var(--space-md)" }}>
            {status}
          </div>
          <button onClick={onVisit} style={{
            ...CARD_CTA,
            width: "100%", cursor: "pointer",
            background: "var(--faction-everymen-bill-cta-bg)", color: "var(--faction-everymen-bill-cta-ink)",
            border: `2px solid ${INK}`, borderRadius: 2,
            fontFamily: POSTER, fontSize: "var(--text-xl)", letterSpacing: "0.22em", textTransform: "uppercase",
            padding: "var(--space-sm) var(--space-2xl)",
          }}>{i18n.t("feed:factionSelect.everymen.cta")}{members != null ? ` ${i18n.t("feed:factionSelect.everymen.members", { count: members })}` : ""}</button>
        </div>
      </div>
    </div>
  );
}
