import i18n from "../../i18n";
import { redactableText } from "../../utils/factions";
import type { FactionSelectCardProps } from "./FactionSelectCard";
import { SingularitySigil } from "../sigil/SingularitySigil";
import { factionRoleVars } from "../../utils/factionRoles";
import { CTA_SELECT_SIZE, SINGULARITY_CARD_CTA } from "../taskCard/cardCta";

/**
 * Singularity — the faction-DIRECTORY tile (#2326, a child of #2321).
 *
 * One file per faction, mirroring `components/taskCard/`. `FactionSelectCard`
 * keeps only the dispatcher, the shared types and `LEGACY_SLUG`.
 *
 * THE TILES ARE NOT ALL DARK, whatever the dispatcher's docstring used to say.
 * Coven's is pink and UA's is cream, and that false premise is what let
 * dark-only registers look correct on a surface that flips. This one IS dark in
 * both cascades — but that is a fact about the Singularity metaphor, not about
 * the grid, and it is exactly why the drift below could hide for so long.
 *
 * ── THE REGISTER IS THE TASK CARD'S, NOT A NEW ONE ─────────────────────────
 *
 * `SingularityTaskCard` paints in `--faction-singularity-term-*`, "a real
 * two-theme contract" whose light half is a slightly LIGHTER chassis with inks
 * walked up to pay for it. This tile was painting in `--faction-singularity-
 * card-*` plus `-border-hard` and `-phosphor-dim`, every one of which is
 * theme-INVARIANT. A forked family: both halves are real, declared tokens, so
 * no lint, census or contrast sweep could see the two drift apart.
 *
 * IT IS NOT THE SAME FORK S.N.I.D.E. AND THE EPHEMERISTS HAD, and the PR says
 * so rather than manufacturing a failure. Their tiles were painted on grounds
 * that were never meant to carry them, and S.N.I.D.E.'s status line measured
 * 2.96:1 by day. Nothing here was ever illegible: the old invariant tile
 * measured 11.18 / 7.31 / 7.66 in both cascades. What was wrong is narrower and
 * still worth fixing — a card whose chassis is frozen at the DARK half's value
 * while the card it is a pitch for lifts to `#07130c` by day, and whose inks
 * therefore never take the walk the light chassis was tuned around.
 *
 * What was gathered, role for role:
 *
 *   ground     `-card-bg` (#050f08 in both) -> `-term-bg`, the chassis: #07130c
 *                                by day, #050f08 by night.
 *   edge       `-border-hard`, a SOLID #2563eb -> `-term-border`, the rgba
 *                                blue the chassis is drawn with in each theme.
 *   lift       `0 8px 26px --color-cast-shadow` -> `-term-shadow`, which is the
 *                                same role (what the chassis throws onto the
 *                                page behind it) plus the inset phosphor ring
 *                                the task card leans on for its edge.
 *   rule       `color-mix(-card-muted 40%)` -> `-term-hair`, the one name every
 *                                rule on this chassis reads — the window band's
 *                                border and the task card's dashed `Rule` both.
 *   name/sigil `-card-text` -> `-term-bright`, the task card's title ink.
 *   brief      `-phosphor-dim` -> `-term-dim`, "captions + brief".
 *   status     `-card-muted` (#60a5fa flat) -> `-term-blue`, which IS that blue
 *                                walked up for the lighter chassis (#4c7fef by
 *                                day, #60a5fa by night) — the two-theme twin of
 *                                the token this line was already reading.
 *   CTA        a wash, an edge and a hover flood, each gathered separately ->
 *                                `SINGULARITY_CARD_CTA` entire (#2818). The key
 *                                is LIT AT REST now, which is what the task
 *                                card and the task detail both draw; the 14%
 *                                wash and the two handlers that lit it were the
 *                                last thing making the tile's hover state, not
 *                                its resting one, the match for the sign-up it
 *                                leads to.
 *   face       `--font-faction-terminal` -> `--faction-singularity-card-font`,
 *                                the ROLE name the task card, the band, the
 *                                readout and the comment voice all read. Same
 *                                face; the family token stays, because the role
 *                                token is an alias to it.
 *
 * EVERY PAIRING IS MEASURED IN BOTH CASCADES, and almost all of them were
 * measured already — the payoff of gathering a register instead of minting one.
 * `singularity terminal chassis, title / brief / boot line` and `singularity
 * CTA, prompt` in `utils/__tests__/factionContrast.test.ts` cover the name, the
 * brief, the status line and the key. Two rows were new when this tile was
 * gathered, both of them the unlit wash the CTA drew at rest (1.16:1 against
 * the chassis, so the control's affordance was its `-term-bright` edge rather
 * than its fill). #2818 lit the key at rest and the rows went with the wash:
 * every pairing here is now one the task card already measures.
 *
 * WHERE THE TASK CARD HAS NO ANSWER, and nothing is invented for it:
 *   • THE CHROME STRIP. The task card's is `SingularityBand` — a window bar in
 *     `-term-chrome` carrying three LEDs and the faction's name. This tile's is
 *     nine unlit indicator squares and no ground, which is a different drawing
 *     for a different surface (#2321: a task card and a faction pitch share a
 *     register, not markup). So the strip takes the register's answer for each
 *     ROLE it has — `-term-hair` for its rule — and the squares stay a wash of
 *     `-term-blue`, which is the nearest thing the family has to "an unlit
 *     chrome dot". Mounting the band here instead is a DESIGN call, not a token
 *     one, and nobody in this batch has a browser.
 *   • THE TRAVELLING SWEEP. `-term-sweep` and `.sg-scan` are in the register
 *     and are deliberately NOT taken: the tile keeps the standing raster
 *     (`-term-scan`, which it already read) and gains no motion. A 300px pitch
 *     tile is not a session, and adding an animation is a look change this PR
 *     has no eyes to check.
 *   • THE CORNER RADIUS. The task card rounds to 8; the tile is square, as
 *     every other tile in the directory is. Geometry, not register (§4a).
 *
 * The sigil is the shared canonical `SingularitySigil` and is never re-drawn
 * inline. The box is FLUID at a uniform 360x300 ceiling — `width: 100%` to a
 * 360 max and `minHeight` rather than a fixed height — so the 375px
 * single-column mobile directory still works (#732). Nothing here changes the
 * grid.
 */

const MONO = "var(--sg-select-face)"; /* Share Tech Mono */

const CHASSIS = "var(--faction-singularity-term-bg)";
const BRIGHT = "var(--faction-singularity-term-bright)";
const DIM = "var(--faction-singularity-term-dim)";
const BLUE = "var(--faction-singularity-term-blue)";
/** The chrome dots. The CTA's unlit 14% twin retired with the hover (#2818). */
const DOT = `color-mix(in srgb, ${BLUE} 50%, transparent)`;

export default function SingularitySelectCard({ state = "locked", members, onVisit }: Omit<FactionSelectCardProps, "faction">) {
  const status = i18n.t(`feed:factionSelect.singularity.status.${state}` as const);
  return (
    <div style={{
      ...factionRoleVars("singularity", "sg-select"),
      width: "100%", maxWidth: 360, minHeight: 300, boxSizing: "border-box", position: "relative", overflow: "hidden",
      background: CHASSIS, color: BRIGHT, fontFamily: MONO,
      border: "1px solid var(--faction-singularity-term-border)",
      boxShadow: "var(--faction-singularity-term-shadow)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-sm) var(--space-md)", borderBottom: "1px solid var(--faction-singularity-term-hair)" }}>
        {Array.from({ length: 9 }).map((_, i) => <i key={i} style={{ width: 6, height: 6, borderRadius: 1, background: DOT }} />)}
      </div>
      <div style={{ position: "relative", flex: 1, padding: "var(--space-lg) var(--space-lg) 0" }}>
        {/* The card opened on "singularity protocol" with the blinking cursor
            after it (`feed:identity.singularity.protocol`). That key is on
            #1864's CUT list, so #1909 removed it here too — the surface KEPT by
            the audit is `feed:factionSelect.*`, every one of which this card
            still reads; the `identity.*` overline was a different, single-faction
            slot on top of it. */}
        <div style={{ fontSize: "var(--text-md)", color: BLUE, letterSpacing: "0.04em" }}>{i18n.t("feed:factionSelect.singularity.banner")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginTop: "var(--space-md)" }}>
          <SingularitySigil size={30} color={BRIGHT} />
          {/* eslint-disable-next-line local/no-raw-style-values -- ornament: terminal-printout faction name — display-size mono, the archetype's banner */}
          <span style={{ fontSize: 30, color: BRIGHT, letterSpacing: "0.02em" }}>{redactableText("factions:names.singularity")}</span>
        </div>
        <div style={{ fontSize: "var(--text-content)", color: DIM, marginTop: "var(--space-sm)" }}>{i18n.t("feed:factionSelect.singularity.tagline")}</div>
        {/* `--faction-singularity-phosphor-dim` stood here — a fourth green, and
            a theme-invariant one, minted in #1609 so prose could sit below the
            accent without sitting below AA on a frozen ground. The chassis is
            not frozen; `-term-dim` is the SAME decision made per theme, and it
            is the ink the task card's own brief is set in. */}
        <p className="content-text" style={{ margin: "var(--space-lg) 0 0", lineHeight: 1.65, color: DIM }}>
          &gt; {i18n.t("feed:factionSelect.singularity.blurb")}
        </p>
      </div>
      <div style={{ position: "relative", padding: "0 var(--space-lg) var(--space-lg)" }}>
        <div style={{ fontSize: "var(--text-md)", color: BLUE, marginBottom: "var(--space-md)" }}>{status}{members != null && <span style={{ float: "right", color: BRIGHT }}>{i18n.t("feed:factionSelect.singularity.members", { count: members })}</span>}</div>
        {/* The prompt's `$` carried `opacity: 0.7`, which is a contrast cut no
            guard can see — an alpha on an ink has no fixed ratio against
            anything. It is punctuation on the prompt, not an indicator, so it
            is drawn at full strength: the call the task card's block cursor
            already makes with `currentColor`. */}
        {/* THE LIT KEY, LIT AT REST (#2818). This mount drew the same key UNLIT
            — a 14% wash of `-term-blue` over the chassis — and lit it to the
            card's own `-term-cta-bg` on `onMouseEnter`, which made the hover
            state, not the resting one, the thing that matched the sign-up it
            leads to. The two handlers go with the wash: no task-card CTA carries
            one, `index.css` declares no `:hover` on any CTA class, and a hover
            reachable only by mouse was never the affordance here. Focus is a
            stylesheet state and is untouched.

            The prompt's `$` is a plain text node now rather than a span beside a
            `gap`: the constant centres one flex item, and one text run is one
            item. */}
        <button onClick={onVisit} style={{
          cursor: "pointer", ...SINGULARITY_CARD_CTA, ...CTA_SELECT_SIZE,
        }}
        >{`$ ${i18n.t("feed:factionSelect.singularity.cta")}`}</button>
      </div>
    </div>
  );
}
