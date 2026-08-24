import { useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import CharacterBadge from "../../../components/CharacterBadge";
import { factionCssVar, factionName, factionDescription } from "../../../utils/factions";
import { computeFactionMultiplier } from "../../../utils/points";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { MobileStickyBar } from "../MobileStickyBar";
import { SectionPanel, SectionToggle, useFactionSections } from "../sectionDisclosure";
import type { CharacterOut } from "../../../api/auth";
import type { FactionDetailState } from "../useFactionDetail";

const NA_SLUG = "na";

/**
 * The plate's hairline — the na spectrum, running out from the kicker to the
 * plate's far edge (#2497).
 *
 * A constant rather than a component: it takes no props and holds no state, so a
 * component would be a function call around one inert span. Both classes are
 * index.css's — `.spectrum-rule` is the ramp (shared with the sheet-head bands
 * and the section heads, so Albescent's kit moves all of them at once) and
 * `.faction-plate-rule` is this cut's geometry.
 */
const PLATE_RULE = <span aria-hidden className="spectrum-rule faction-plate-rule" />;

/** Flex-wrap card grid — varied card sizes are intentional, not a CSS grid.
 *  The recently-completed PRAXIS gallery only, since #1945: the task row above
 *  wears `.task-card-row`, which keeps the widths ragged and levels the bottom
 *  edge. */
const CARD_GRID: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-lg)",
  alignItems: "flex-start",
};

/**
 * Default faction-body archetype — the members / tasks / recently-completed
 * sections lifted verbatim from the original FactionDetail page, now consuming
 * the shared {@link FactionDetailState}. Any faction without a bespoke body
 * falls through to this, so it must stay visually identical to before.
 *
 * IT HAS A PLATE NOW (#2497). Its three regions were bare `<h2>` + grid under a
 * `mb-8`, which is what the note below used to call PLACEHOLDER: every other
 * body draws a kicker over a sheet with a rule under it, and this one drew a
 * heading on the page. They wear `.faction-plate` — sheet, frame and padding —
 * with `.faction-plate-kicker` for the header row and `.spectrum-rule` for the
 * hairline, so the na spectrum here is the same ornament it is on the cards and
 * Albescent's kit dresses all of them with one rule.
 *
 * THE DISCLOSURE DID NOT MOVE. `SectionPanel` still wraps each gallery and still
 * hides it with `hidden`; the plate is the section's dress and sits OUTSIDE it,
 * so the kicker and its rule stay visible when a region is folded. Putting the
 * sheet on `SectionPanel` would have painted a second plate inside all seven
 * sibling archetypes that mount it.
 *
 * IT HAS FIVE REGIONS NOW, NOT THREE (#2504). About and Champion arrived with
 * the na frontispiece, and both are moves rather than inventions. ABOUT was the
 * page's own bordered blurb card in `FactionDetail.tsx` — the branch the hero
 * replaced — and it comes down here because the description belongs to the body
 * (#2137) and because the seven bespoke bodies have always drawn it here.
 * CHAMPION is the spotlight those same seven draw, ranked the same way, off the
 * `members` list the page has already fetched: no field was added to the wire
 * for it, because none was missing.
 *
 * NOTE: the member TILES are still deliberately plain — real per-faction visual
 * design is deferred to Claude design. Data wiring + structure are final.
 *
 * THE JOIN BLOCK (#1314). This archetype used to carry only the burn notice,
 * because the factions falling through to it were waiting on #951's join/gate
 * design. WOW got a body of its own in #1611 and Albescent is the only faction
 * left here, so that note was stale — and worse, it described a real asymmetry:
 * the phone twin `mobileArchetypes/DefaultFactionPage` DID carry a join block,
 * so you could join from a phone and not from a laptop. Collapsing the pair
 * without acting would have taken the phone's away too. What follows is that
 * skin's block moved across — sticky Join with a confirm step, confirm-switch
 * copy, the soft gate and the burn, all ADR-0019-gated to a viewer who can
 * actually act. It keeps the `mobile.*` catalog keys it arrived with; renaming
 * them is a catalog change and this PR makes none.
 *
 * ITS PAINT DID NOT MOVE ACROSS UNCHANGED, because #1819 landed between the cut
 * and the merge and the block's four global-ink sites came with it. Migrating
 * them rather than re-listing the debt under its new filename is the whole of
 * that difference; the two button blocks below carry the measurements, and one
 * of the four turned out to be a live dark-mode defect rather than debt.
 */
export default function DefaultFactionBody({
  state,
  plateOrnament,
}: {
  state: FactionDetailState;
  /**
   * One inert node, mounted inside every plate that HOLDS TEXT (#2504, narrowed
   * by #2519). This is the `ornament` SLOT the epic's pattern names:
   * `AlbescentFactionBody` hands the plates a spectrum ring that must clip to
   * the SHEET rather than to the page, and a sibling span wrapped around this
   * whole component cannot do that. na hands nothing, and a plate then renders
   * no ornament markup at all.
   *
   * THE TWO CARD PLATES DO NOT TAKE IT, and that is the design canvas's own cut
   * of its "one carrier per object" rule: *"the edge is for plates that hold
   * text, the rule is for plates that hold cards with edges of their own."*
   * Tasks and Recently-completed hold task and praxis cards, each already
   * wearing a 3px spectrum border, so an edge on the plate around them is a
   * frame enclosing frames — WORLD_ZERO_STYLE §5's "a bordered panel may not sit
   * directly inside another bordered panel", with the spectrum making it loud.
   * Those two keep the plate's `.spectrum-rule` hairline, which is what the
   * board leaves them; the ornament is simply not mounted there.
   */
  plateOrnament?: ReactNode;
}) {
  const { t } = useTranslation("factions");
  const {
    faction,
    members,
    tasks,
    recentPraxis,
    viewerFactionSlug,
    gameFactions,
    onSignup,
    membership,
  } = state;
  const [confirming, setConfirming] = useState(false);
  const phone = useFormFactor() === "mobile";
  const sections = useFactionSections();

  // Guarded non-null by the dispatcher.
  if (!faction) return null;

  const accent = factionCssVar(faction.slug, "border");
  const name = factionName(faction.slug);

  /**
   * The champion, and the roll below them — DERIVED, with no server field added
   * (#2504). The seven bespoke bodies already rank this list exactly this way,
   * so a `champion` on the wire would be the eighth answer to a question the
   * page can already answer from data it has fetched. `all_time_score` rather
   * than the era `score` for the same reason they use it: the two agree inside
   * an era and only this one survives a reset, so the plate does not blank
   * itself on day one of an era.
   */
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const champion: CharacterOut | undefined = ranked[0];
  const roll = ranked.slice(1);

  /** The blurb, as paragraphs — the shape every sibling body reads it in. */
  const paragraphs = factionDescription(faction.slug)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const currentSlug = membership.currentFactionSlug;
  const switching = currentSlug && currentSlug !== NA_SLUG;

  /**
   * The primary verb. Rendered ONCE — inline under the standing line on a
   * laptop, pinned above the tab bar on a phone (#495 / #1566). Only an
   * "eligible" viewer can act (ADR-0019), and a control nobody can use is
   * hidden rather than disabled.
   */
  const joinAction = membership.state === "eligible" && (
    <>
      {membership.joinError && (
        // The phone skin this came from wrote `text-red-600`, and its legacy
        // exemption died with the file. The token says the same thing and is
        // what every other body's join error already uses (#1853).
        <p className="font-body content-text" style={{ color: "var(--color-danger)" }}>
          {membership.joinError}
        </p>
      )}
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)} style={joinButtonStyle(faction.slug)}>
          {t("mobile.join", { faction: name })}
        </button>
      ) : (
        <>
          {/* No `color:` — `body` is `text-ink`, i.e. --color-text-primary, so
              this prose INHERITS exactly what it used to restate. The inline
              copy was the defect (#1819): a faction frame that repoints ink on
              its own root cannot reach past it, and this archetype is the
              fall-through every unbespoke faction lands on. */}
          <p className="font-body content-text">
            {switching
              ? t("detail.join.confirmSwitch", { faction: name, current: factionName(currentSlug) })
              : t("detail.join.confirm", { faction: name })}
          </p>
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <button
              type="button"
              onClick={() => void membership.join()}
              disabled={membership.joining}
              style={{ ...joinButtonStyle(faction.slug), flex: 1, opacity: membership.joining ? 0.6 : 1 }}
            >
              {membership.joining ? t("mobile.joining") : t("mobile.confirm")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={membership.joining}
              style={CANCEL_BUTTON_STYLE}
            >
              {t("detail.join.cancel")}
            </button>
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {/* THE HOUSE SHAPE, FINALLY (#2546). `.wz-faction-grid` in index.css is the
          shared main+rail seam -- `1fr 322px`, 34px gap, one column at
          `max-width: 860px` -- and seven of the eight bodies root on it. This one
          never did, so every region stacked full width and the join verb sat in a
          bare 420px column above them all. `AlbescentFactionBody` renders this
          file whole through a six-line wrapper, which made it the one live
          faction page with no rail on a laptop; on a phone it looked right only
          because a one-column page is what the other seven collapse to anyway.

          The six regions and their columns, the same everywhere: (1) hero, above
          and full width, drawn by the page not by this file; (2) About, (4) Tasks
          and (5) Recently-completed in MAIN; (3) join / gate / standing and
          (6) Champion + Members in the RAIL.

          A re-parenting and nothing more. Every plate keeps its dress --
          `.faction-plate`, `.faction-plate-kicker`, `PLATE_RULE` and the
          `plateOrnament` slot are untouched. ── */}
      <div className="wz-faction-grid">
        {/* ── MAIN COLUMN ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2xl)",
          }}
        >
        {/* ── About ── the region #2497 deliberately left undressed, because the
            blurb was still the PAGE's card in `FactionDetail.tsx` and that card
            had no heading, so plating it meant minting a heading string. It needed
            neither: the shared `detail.aboutHeading` has existed all along — every
            one of the seven bespoke bodies draws its About under it, and
            `factionCopyCollapse.test.ts` names it as the one key the family
            collapsed onto. So no string is minted here; the region simply moves
            from the page to the body, where the other seven have always kept it,
            and #2137's "the body owns the description" finally holds on this
            branch too. Split on blank lines like every sibling does. ── */}
        <section className="faction-plate">
          {plateOrnament}
          <div className="faction-plate-kicker">
            <h2 className="label-heading">{t("detail.aboutHeading")}</h2>
            {PLATE_RULE}
          </div>
          {paragraphs.length === 0 ? (
            <p className="font-body text-muted content-text">{t("detail.descriptionEmpty")}</p>
          ) : (
            paragraphs.map((paragraph) => (
              <p key={paragraph} className="font-body content-text mb-2 last:mb-0">
                {paragraph}
              </p>
            ))
          )}
        </section>
        {/* ── Tasks ── reuses the per-faction TaskCard archetype ──
            This body has no `SectionHeading` of its own — it draws the bare
            `.label-heading` the other seven replaced with a house component — so
            the disclosure goes straight inside the `<h2>` here (#2311). */}
        <section className="faction-plate">
          {/* No `plateOrnament` — see its docstring. This plate holds cards that
              carry their own edge, so it carries the RULE instead. */}
          <div className="faction-plate-kicker">
            <h2 className="label-heading">
              <SectionToggle
                section={sections.tasks}
                label={t("detail.default.tasksHeading", { total: tasks.length })}
              />
            </h2>
            {PLATE_RULE}
          </div>
          <SectionPanel section={sections.tasks}>
            {tasks.length === 0 ? (
              <p className="font-body text-muted content-text">{t("detail.default.tasksEmpty")}</p>
            ) : (
              <div className="task-card-row" style={{ gap: "var(--space-lg)" }}>
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    basePoints={task.point_value}
                    multiplier={computeFactionMultiplier(
                      viewerFactionSlug,
                      task.primary_faction_slug,
                      gameFactions,
                    )}
                    onSignup={onSignup}
                  />
                ))}
              </div>
            )}
          </SectionPanel>
        </section>
        {/* ── Recently completed ── */}
        <section className="faction-plate">
          {/* No `plateOrnament` — the other card-holding plate. */}
          <div className="faction-plate-kicker">
            <h2 className="label-heading">
              <SectionToggle section={sections.praxis} label={t("detail.default.recentHeading")} />
            </h2>
            {PLATE_RULE}
          </div>
          <SectionPanel section={sections.praxis}>
            {recentPraxis.length === 0 ? (
              <p className="font-body text-muted content-text">
                {t("detail.default.recentEmpty")}
              </p>
            ) : (
              <div style={CARD_GRID}>
                {recentPraxis.map((p) => (
                  <PraxisCard key={p.id} praxis={p} />
                ))}
              </div>
            )}
          </SectionPanel>
        </section>
        </div>

        {/* ── RIGHT RAIL ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2xl)",
          }}
        >
        {/* ── The burn (#1305) ── this viewer left this faction this era, so
            joining is refused for the rest of it. The phone twin said this in its
            own words (`mobile.burnedHint`); that delta was cosmetic, so it
            collapses to the neutral platform wording every other body uses
            (ADR-0057: the dress is ours, the words are not). ── */}
        {membership.state === "burned" && (
          <div
            className="sidebar-card"
            style={{ padding: "var(--space-md) var(--space-lg)" }}
          >
            <p className="label-heading mb-1">{t("detail.burned.kicker")}</p>
            <p className="font-body content-text text-ink">
              {t("detail.burned.body", { faction: factionName(faction.slug) })}
            </p>
          </div>
        )}
        {/* ── Standing / the soft gate ── the two states a viewer cannot act on.
            "gate" is "not invited YET" (#454), which is why its copy tells you to
            keep going; the burn above is a closed door and must stay a different
            sentence. ── */}
        {membership.state === "member" && (
          <p className="label-caption" style={{ color: accent }}>
            {t("mobile.memberBadge")}
          </p>
        )}
        {membership.state === "gate" && (
          <p className="font-body text-muted content-text">
            {t("mobile.gateHint", { faction: name })}
          </p>
        )}
        {/* ③ THE JOIN VERB — in the rail, where the other seven bodies have
            always put it. It used to sit in a bare 420px column with a `ponytail:`
            note saying it was there "because this archetype has no rail to put it
            in", pending #951's join/gate design. #951 closed without placing it and
            Albescent is the only live faction still landing here, so the note had
            stopped describing a deferral and started describing a shipped bug
            (#2546). The rail is 322px, so the 420 cap and the bottom margin both
            come off — the rail's own gap parts it from the Champion below. On a
            phone the grid is one column and the verb still pins instead. ── */}
        {!phone && joinAction && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-sm)",
            }}
          >
            {joinAction}
          </div>
        )}
        {/* ── Champion ── the highest all-time score on the roll, and NO backend.
            The list it ranks is the one the page has already fetched, so an
            endpoint here would be a second, slower answer to a question already
            answered. Drawn only when there is a member to name; the roll below
            then drops them, which is what `membersEmptyWithSpotlight` is for. ── */}
        {champion && (
          <section className="faction-plate">
            {plateOrnament}
            <div className="faction-plate-kicker">
              <h2 className="label-heading">{t("detail.spotlightLabel")}</h2>
              {PLATE_RULE}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <CharacterBadge character={champion} />
              <span className="font-body text-muted content-text">
                {t("detail.spotlightStat", {
                  level: champion.level,
                  score: champion.all_time_score.toLocaleString(),
                  count: champion.all_time_score,
                })}
              </span>
            </div>
          </section>
        )}
        {/* ── Members ── no disclosure, by `sectionDisclosure`'s own ruling: the
            Roll is how a player joins and how the gate explains itself, so it is
            not foldable. It wears the plate all the same — the plate is the
            region's dress and the disclosure is a separate job on a separate
            element. ── */}
        <section className="faction-plate">
          {plateOrnament}
          <div className="faction-plate-kicker">
            <h2 className="label-heading">
              {t("detail.default.membersHeading", { total: members.length })}
            </h2>
            {PLATE_RULE}
          </div>
          {roll.length === 0 ? (
            <p className="font-body text-muted content-text">
              {champion ? t("detail.membersEmptyWithSpotlight") : t("detail.membersEmpty")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {roll.map((m) => (
                <div
                  key={m.id}
                  style={{
                    border: `1px solid ${accent}`,
                    padding: "var(--space-sm) var(--space-md)",
                    background: "var(--color-bg-surface)",
                  }}
                >
                  <CharacterBadge character={m} size="sm" />
                </div>
              ))}
            </div>
          )}
        </section>
        </div>
      </div>

      {/* ── The pinned action band ── phone only, and the LAST child of the
          page's tall box so `position: sticky` has something to pin against
          (#495, #1566). ── */}
      {phone && joinAction && <MobileStickyBar>{joinAction}</MobileStickyBar>}
    </>
  );
}

/**
 * The primary verb's pill, in the mounted faction's own accent pair (#1819).
 *
 * IT ARRIVED WITH A REAL DARK-MODE DEFECT, and the tier was how it hid. The
 * phone skin this moved from (#1314) filled with `--color-text-primary` and
 * inked with `--color-text-on-accent`, which reads as "near-black pill, white
 * label" — true in LIGHT and only there. `--color-text-primary` flips to a warm
 * cream (`#f0e6d0`) in dark while `--color-text-on-accent` is declared in
 * `:root` alone and stays `#ffffff`, so the dark pill was white-on-cream at
 * **1.24:1** — the label all but gone. That is #1169's shape exactly: a
 * *neutral* is a statement about the page ground, never about legibility on a
 * fill, and the pairing it makes is unmeasured by construction.
 *
 * The faction accent pair is the same two values in light and a designed pair in
 * dark: `-card-accent` is `#1a1209` / `#f0e6d0` — byte-identical to the primary
 * neutral in BOTH cascades, so nothing moves — and `-on-accent` is `#ffffff` /
 * `#14110b`, i.e. 18.51:1 light (unchanged) and 15.19:1 dark (the fix). Both are
 * gated by ACCENT_PAIRS in `factionContrast.test.ts`, in both themes, which the
 * neutral pairing never could be.
 *
 * A function rather than a const because it now reads the mounted slug, the same
 * way `accent` above does. Seven of the eight keys declare `-on-accent`;
 * `ephemerists` deleted its in #1232 and never lands here, because it has a
 * bespoke body of its own (ADR-0078) — as do the other six. Only `albescent`
 * falls through today, and it resolves to `default`.
 */
function joinButtonStyle(slug: string): CSSProperties {
  return {
    width: "100%",
    fontFamily: "var(--font-body)",
    fontSize: "var(--text-xl)",
    fontWeight: 700,
    letterSpacing: "0.04em",
    color: factionCssVar(slug, "on-accent"),
    background: factionCssVar(slug, "card-accent"),
    border: "none",
    borderRadius: 999,
    padding: "var(--space-md) var(--space-lg)",
    cursor: "pointer",
  };
}

/**
 * The quiet half of the pair. Uppercase, letter-spaced, `--text-md` — this is
 * label register, not prose, so it reads the label SEAM rather than restating a
 * global neutral (#1819). The swap spends no contrast in either cascade: on the
 * page (and on the sticky bar, whose `--color-nav-bg` is the page at 0.9/0.92
 * alpha over itself) `--color-text-secondary` read 7.78 light / 8.33 dark and
 * `--label-ink` reads 7.83 / 8.94. What changes is hue — warm grey to the
 * lavender the third tier is (#1549) — which is the "this is chrome, not
 * content" signal a cancel beside a primary verb is asking for, and it now
 * follows any frame that repoints the seam on its own root.
 */
const CANCEL_BUTTON_STYLE: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-md)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--label-ink)",
  background: "transparent",
  border: "1px solid var(--color-border-strong)",
  borderRadius: 999,
  padding: "var(--space-md) var(--space-lg)",
  cursor: "pointer",
};
