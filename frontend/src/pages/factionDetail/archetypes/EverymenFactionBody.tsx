import { useState, type CSSProperties, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { TaskCrown } from "../../../components/factionMarks/TaskCrown";
import { computeFactionMultiplier } from "../../../utils/points";
import { factionName, factionDescription } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import type { CharacterOut } from "../../../api/auth";
import { SectionPanel, SectionToggle, useFactionSections } from "../sectionDisclosure";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * Everymen faction-body — the union / victory-poster skin of the standardized
 * six-section spine (② Charter, ③ The Roll, ④ Tasks, ⑤ Praxis, ⑥ Members).
 * Section ① (hero + side-ledger stats) is EverymenFactionHero, rendered above.
 *
 * Tasks and Praxis reuse the app-wide per-faction cards (TaskCard / PraxisCard
 * already dispatch to the Everymen archetypes) so this file only owns the poster
 * chrome the design adds around them: the two-column layout, the fixed section
 * titles ("Tasks" / "Praxis") with union kickers, the join/gate "Roll" block,
 * the spotlight + roster, and the FDL laurel on the single top-scoring praxis.
 *
 * All colour comes from --everymen-* tokens (dark-mode-aware via the cascade).
 */

const CREAM = "var(--everymen-cream)";
const GOLD = "var(--everymen-gold)";
const INK = "var(--everymen-ink)";
/**
 * Text on the PAPER — which since #2227 is every frame on this page, not just
 * the page under them.
 *
 * `INK` is a near-black in both themes. That was right while the frames were
 * struck on `--everymen-cream`, a stock that barely moves; it was wrong on the
 * page, which ramps `--everymen-paper` to `--everymen-paper-deep` and flips.
 * #2133 moved the two section headings for that reason and left the eight ink
 * sites inside the frames alone, correctly, because their stock was frozen.
 *
 * #2227 unfroze it: the cream slab was a mistake and the frames now take the
 * paper, so `--everymen-paper-text` is the ink for ALL of them. It is
 * byte-identical to `INK` in light (#221a12), so nothing moves by day; in dark
 * it flips with the stock — 13.19 / 13.96 on the paper, 11.02 / 15.26 on the
 * deep — where the frozen ink would have read 1.16:1.
 */
const PAPER_TEXT = "var(--everymen-paper-text)";
const PAPER = "var(--everymen-paper)";
const RED = "var(--everymen-red)";
/**
 * Red as TEXT on the paper (#1341). `--everymen-red` is 4.49:1 here by day and
 * 4.16:1 by night — a near-miss and a real one — so index.css mints this
 * sibling for the ink job and leaves every FILL (the masthead band, the join
 * button, the woven rule) on `RED`. 5.09 / 6.09.
 */
const PAPER_ACCENT = "var(--everymen-paper-accent)";
const MUTED = "var(--everymen-muted)";

const BEBAS = "var(--font-accent)";
const MONO = "var(--font-body)";

/**
 * Paper frame with the design's double-rule (paper halo + frame hairline).
 *
 * THE STOCK IS THE PAPER, NOT THE CREAM (#2227). `--everymen-cream` is an
 * ornament ink — a badge ring, a halftone dot — and it is theme-invariant, so
 * grounding a whole panel on it left a cream slab burning on a dark page. The
 * paper flips, and it is the ground every Everymen card on this page already
 * stands on (`--faction-everymen-card-bg` aliases it), so the frames now agree
 * with the cards instead of contradicting them.
 *
 * THE DOUBLE RULE IS THE PANEL. Panel and page were never far apart even in
 * light — cream on paper is 1.06:1 — so what has always drawn the frame is this
 * rule, at 14.55:1. It therefore has to flip with the stock or the panel simply
 * stops existing at night: `--everymen-ink` reads 1.16:1 on the dark paper, and
 * even `--everymen-frame`, the token minted to lift off near-black, only gets
 * to 1.38:1 here — a dim rule is still no rule. `--everymen-paper-text` is
 * byte-identical to the ink in light (#221a12), so the drawing is unmoved by
 * day, and inverts to a cream rule at 13.96:1 by night.
 */
const PAPER_FRAME: CSSProperties = {
  position: "relative",
  background: PAPER,
  color: PAPER_TEXT,
  border: `1.5px solid ${PAPER_TEXT}`,
  boxShadow: `0 0 0 3px ${PAPER}, 0 0 0 4px ${PAPER_TEXT}`,
  overflow: "hidden",
};

/** Faint halftone dot wash for the paper frames. */
function Halftone({ opacity = 0.05 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        // The flipping ink, not `INK`: the wash is a texture ON the stock, so it
        // has to darken a light paper and lighten a dark one. `.em-backdrop`
        // draws its own dots off `--everymen-paper-text` for the same reason.
        backgroundImage: `radial-gradient(${PAPER_TEXT} 0.6px, transparent 0.7px)`,
        backgroundSize: "4px 4px",
      }}
    />
  );
}

/** Red/gold woven rule that trails the section headings. */
function WovenRule({ height = 3 }: { height?: number }) {
  return (
    <span
      style={{
        flex: 1,
        height,
        minWidth: 30,
        background: `repeating-linear-gradient(90deg, ${RED} 0 16px, ${GOLD} 16px 26px)`,
      }}
    />
  );
}

const SECTION_HEADING_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-lg)",
  marginBottom: "var(--space-sm)",
  flexWrap: "wrap",
};

const SECTION_HEADING_TEXT: CSSProperties = {
  fontFamily: BEBAS,
  // eslint-disable-next-line local/no-raw-style-values -- ornament: victory-poster display cut in condensed Bebas — poster type, not a read heading.
  fontSize: 34,
  letterSpacing: "0.04em",
  margin: 0,
  // The heading stands on the page, not in a frame — see `PAPER_TEXT` (#2133).
  color: PAPER_TEXT,
  whiteSpace: "nowrap",
};

function SectionHeading({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={SECTION_HEADING_ROW}>
      <h2 style={SECTION_HEADING_TEXT}>{children}</h2>
      <WovenRule />
      {right}
    </div>
  );
}

/* The union `Kicker` under each section title lived here. #1909 cut its two
   strings (`everymen.tasks.kicker` / `.praxis.kicker`): the audit ruled the line
   restated its own heading, and no faction outside the seven bespoke bodies ever
   had one. The style went with the only component that used it. */

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

/** A portrait filling a medallion's field, cropped square-to-circle. */
const PORTRAIT: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  objectFit: "cover",
};

/** The spotlight's inset red band, as a width the padding box holds open. */
const SPOTLIGHT_BAND = 5;

/**
 * Circular initials medallion — cream ring / red face (or inverted for the
 * spotlight).
 *
 * THE MONOGRAM IS THE FALLBACK, NOT THE DEFAULT (#2226). The disc keeps every
 * ring it wears, but the spotlight's is an INSET shadow, and an inset shadow
 * paints under content — a photo at 100% would swallow it. So when a portrait
 * is drawn the band is held open by padding on the border box instead, which
 * is the same 5px in the same place with the shadow still doing the drawing.
 */
function Medallion({
  name,
  size,
  invert = false,
  avatarUrl,
}: {
  name: string;
  size: number;
  invert?: boolean;
  /** The member's portrait. Empty/absent falls back to the monogram. */
  avatarUrl?: string | null;
}) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        boxSizing: "border-box",
        padding: avatarUrl && invert ? SPOTLIGHT_BAND : 0,
        borderRadius: "50%",
        background: invert ? CREAM : RED,
        color: invert ? RED : CREAM,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: BEBAS,
        fontSize: size * 0.46,
        boxShadow: invert
          ? `0 0 0 4px ${INK}, inset 0 0 0 ${SPOTLIGHT_BAND}px ${RED}`
          : `0 0 0 2px ${INK}`,
      }}
    >
      {avatarUrl ? <img alt="" aria-hidden="true" src={mediaUrl(avatarUrl)} style={PORTRAIT} /> : initial(name)}
    </span>
  );
}

export default function EverymenFactionBody({ state }: { state: FactionDetailState }) {
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
  const sections = useFactionSections();
  const [confirming, setConfirming] = useState(false);

  if (!faction) return null;

  // The burn (#1305) — this viewer left this faction this era, so
  // `can_join_faction` refuses the join for the rest of it. It reuses the
  // gate's chassis below: only the words change, and they are neutral
  // platform copy (ADR-0061) because this is the platform speaking.
  const burned = membership.state === "burned";

  // ② manifesto paragraphs — split the single description on blank lines.
  const paragraphs = factionDescription(faction.slug).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  // ⑥ spotlight = highest all-time score; roster = the rest.
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const roster = ranked.slice(1);

  return (
    <div className="wz-faction-grid">
      {/* ── MAIN COLUMN ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        {/* ② THE CHARTER */}
        <div style={{ ...PAPER_FRAME, padding: "var(--space-xl) var(--space-2xl)" }}>
          <Halftone />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
            <span style={{ fontFamily: MONO, fontSize: "var(--text-md)", letterSpacing: "0.24em", textTransform: "uppercase", color: MUTED }}>
              {t("detail.aboutHeading")}
            </span>
            <span style={{ flex: 1, height: 2, background: `repeating-linear-gradient(90deg, ${RED} 0 12px, ${GOLD} 12px 20px)` }} />
          </div>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            {paragraphs.length ? (
              paragraphs.map((para, i) => (
                <p key={i} className="content-text" style={{ fontFamily: MONO, lineHeight: 1.75, color: PAPER_TEXT, margin: 0 }}>
                  {para}
                </p>
              ))
            ) : (
              <p className="content-text" style={{ fontFamily: MONO, lineHeight: 1.75, color: MUTED, margin: 0 }}>
                {t("detail.descriptionEmpty")}
              </p>
            )}
          </div>
        </div>

        {/* ④ TASKS */}
        <div>
          <SectionHeading>
            <SectionToggle
              section={sections.tasks}
              label={t("detail.default.tasksHeading", { total: tasks.length })}
            />
          </SectionHeading>
          <SectionPanel section={sections.tasks}>
            {tasks.length === 0 ? (
              <p className="content-text" style={{ fontFamily: MONO, color: MUTED }}>{t("detail.default.tasksEmpty")}</p>
            ) : (
              <div className="task-card-row" style={{ gap: "var(--space-xl)" }}>
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
        </div>

        {/* ⑤ PRAXIS */}
        <div>
          <SectionHeading>
            <SectionToggle section={sections.praxis} label={t("detail.default.recentHeading")} />
          </SectionHeading>
          <SectionPanel section={sections.praxis}>
            {recentPraxis.length === 0 ? (
              <p className="content-text" style={{ fontFamily: MONO, color: MUTED }}>{t("detail.default.recentEmpty")}</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", alignItems: "flex-start" }}>
                {recentPraxis.map((praxis) => (
                  <div key={praxis.id} style={{ position: "relative", flex: "1 1 var(--praxis-card-basis, 394px)", minWidth: 280 }}>
                    {/* ⑤ Task Crown (ADR-0028) — the skin's own corner medallion,
                        so the card's built-in stamp is suppressed. */}
                    {praxis.is_top_for_task && (
                      <TaskCrown
                        size={44}
                        rotate="-8deg"
                        shadow="drop-shadow(1.5px 2px 0 color-mix(in srgb, var(--everymen-ink) 30%, transparent))"
                        style={{ position: "absolute", top: -14, right: -10, zIndex: 5 }}
                      />
                    )}
                    <PraxisCard praxis={praxis} showCrown={false} />
                  </div>
                ))}
              </div>
            )}
          </SectionPanel>
        </div>
      </div>

      {/* ── RIGHT RAIL ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        {/* ③ THE ROLL — join / gate / standing */}
        {membership.state !== "none" && (
          <div style={{ ...PAPER_FRAME, padding: 0 }}>
            <div
              style={{
                background: RED,
                color: CREAM,
                textAlign: "center",
                padding: "var(--space-sm) 0",
                fontFamily: BEBAS,
                // eslint-disable-next-line local/no-raw-style-values -- ornament: printed banner across the top of the roll — Bebas poster furniture.
                fontSize: 16,
                letterSpacing: "0.16em",
                borderBottom: `2px solid ${GOLD}`,
              }}
            >
              {t("everymen.join.heading")}
            </div>
            <div style={{ position: "relative", padding: "var(--space-xl)" }}>
              <Halftone />
              <div style={{ position: "relative" }}>
                {membership.state === "member" && (
                  <div>
                    <div
                      style={{
                        fontFamily: BEBAS,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Bebas poster headline set tight (lineHeight 0.9).
                        fontSize: 30,
                        lineHeight: 0.9,
                        color: PAPER_TEXT,
                      }}
                    >
                      {t("everymen.join.memberTitle")}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: "var(--text-md)", color: MUTED, margin: "var(--space-sm) 0 0" }}>
                      <Trans t={t} i18nKey="everymen.join.memberStanding">
                        Standing · <b style={{ color: PAPER_ACCENT }}>card-carrying</b>
                      </Trans>
                    </div>
                  </div>
                )}

                {membership.state === "eligible" && !confirming && (
                  <div>
                    <div
                      style={{
                        fontFamily: BEBAS,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Bebas poster headline set tight (lineHeight 0.9).
                        fontSize: 32,
                        lineHeight: 0.9,
                        color: PAPER_TEXT,
                        marginBottom: "var(--space-sm)",
                      }}
                    >
                      {t("everymen.join.eligibleTitle")}
                    </div>
                    <div className="content-text" style={{ fontFamily: MONO, lineHeight: 1.6, color: PAPER_TEXT, marginBottom: "var(--space-lg)" }}>
                      {t("everymen.join.eligibleBody")}
                    </div>
                    <button
                      onClick={() => setConfirming(true)}
                      style={{
                        width: "100%",
                        fontFamily: BEBAS,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Bebas is a condensed poster face — its optical size is not the text scale.
                        fontSize: 18,
                        letterSpacing: "0.12em",
                        color: CREAM,
                        background: RED,
                        border: "none",
                        padding: "var(--space-md)",
                        boxShadow: `3px 4px 0 ${INK}`,
                        cursor: "pointer",
                      }}
                    >
                      {t("everymen.join.joinButton")}
                    </button>
                  </div>
                )}

                {membership.state === "eligible" && confirming && (
                  <div>
                    <div className="content-text" style={{ fontFamily: MONO, lineHeight: 1.6, color: PAPER_TEXT, marginBottom: "var(--space-lg)" }}>
                      {membership.currentFactionSlug &&
                      membership.currentFactionSlug !== "na"
                        ? t("detail.join.confirmSwitch", {
                            faction: factionName(faction.slug),
                            current: factionName(membership.currentFactionSlug),
                          })
                        : t("detail.join.confirm", { faction: factionName(faction.slug) })}
                    </div>
                    {membership.joinError && (
                      <div className="content-text" style={{ fontFamily: MONO, color: "var(--color-danger)", marginBottom: "var(--space-sm)" }}>{membership.joinError}</div>
                    )}
                    <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                      <button
                        onClick={() => void membership.join()}
                        disabled={membership.joining}
                        style={{
                          flex: 1,
                          fontFamily: BEBAS,
                          // eslint-disable-next-line local/no-raw-style-values -- ornament: Bebas is a condensed poster face — its optical size is not the text scale.
                          fontSize: 16,
                          letterSpacing: "0.1em",
                          color: CREAM,
                          background: RED,
                          border: "none",
                          padding: "var(--space-md)",
                          cursor: membership.joining ? "not-allowed" : "pointer",
                        }}
                      >
                        {membership.joining
                          ? t("everymen.join.joining")
                          : t("mobile.confirm")}
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        disabled={membership.joining}
                        style={{ fontFamily: MONO, fontSize: "var(--text-md)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, background: "transparent", border: `1.5px solid color-mix(in srgb, ${PAPER_TEXT} 30%, transparent)`, padding: "var(--space-md) var(--space-lg)", cursor: membership.joining ? "not-allowed" : "pointer" }}
                      >
                        {t("detail.join.cancel")}
                      </button>
                    </div>
                  </div>
                )}

                {(membership.state === "gate" || burned) && (
                  <div>
                    {/* #2299 cut the faction's own gate kicker; the shared
                        burned notice keeps its own overline. */}
                    {burned && (
                      <div style={{ fontFamily: MONO, fontSize: "var(--text-md)", letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD, marginBottom: "var(--space-xs)" }}>
                        {t("detail.burned.kicker")}
                      </div>
                    )}
                    <div
                      style={{
                        fontFamily: BEBAS,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Bebas poster headline set tight (lineHeight 0.92).
                        fontSize: 30,
                        lineHeight: 0.92,
                        color: PAPER_TEXT,
                        marginBottom: "var(--space-md)",
                      }}
                    >
                      {burned
                        ? t("detail.burned.title", { faction: factionName(faction.slug) })
                        : t("everymen.join.gateTitle")}
                    </div>
                    <div className="content-text" style={{ fontFamily: MONO, lineHeight: 1.65, color: PAPER_TEXT }}>
                      {burned
                        ? t("detail.burned.body", { faction: factionName(faction.slug) })
                        : t("mobile.gateHint", { faction: factionName(faction.slug) })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ⑥ MEMBERS — spotlight + roster */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              <div style={{ position: "relative", overflow: "hidden", background: INK, color: CREAM, border: `3px solid ${INK}`, boxShadow: `0 0 0 3px ${GOLD}`, textAlign: "center" }}>
                {/* The faction's ONE ornament (#2195). The spotlight fanned its
                    own rays from 50% 30% in a red-deep mix — one of the nine
                    Everymen geometries, and one of the two the epic's survey
                    missed — and mounts the shared drawing now. `knockout`
                    because the tile is an ink slab, not paper. */}
                <div aria-hidden="true" className="em-burst em-burst-knockout" />
                <div style={{ position: "relative", zIndex: 2, padding: "var(--space-xl) var(--space-lg) var(--space-lg)" }}>
                  <div style={{ fontFamily: MONO, fontSize: "var(--text-md)", letterSpacing: "0.3em", textTransform: "uppercase", color: GOLD, marginBottom: "var(--space-md)" }}>
                    {t("everymen.spotlight.label")}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-md)" }}>
                    <Medallion name={spot.display_name} size={74} invert avatarUrl={spot.avatar_url} />
                  </div>
                  <div
                    style={{
                      fontFamily: BEBAS,
                      // eslint-disable-next-line local/no-raw-style-values -- ornament: the spotlight's printed name plate, Bebas on the sunburst.
                      fontSize: 32,
                      lineHeight: 0.9,
                      color: CREAM,
                      // The Everymen poster drop shadow, struck from the ink
                      // its four sibling surfaces already use (#1609).
                      textShadow: `2px 2px 0 color-mix(in srgb, ${INK} 40%, transparent)`,
                    }}
                  >
                    {spot.display_name}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: "var(--text-md)", letterSpacing: "0.08em", textTransform: "uppercase", color: GOLD, marginTop: "var(--space-sm)" }}>
                    {t("detail.spotlightStat", {
                      level: spot.level,
                      score: spot.all_time_score.toLocaleString(),
                      count: spot.all_time_score,
                    })}
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div style={{ ...PAPER_FRAME, padding: "var(--space-lg) var(--space-lg) var(--space-md)" }}>
            <Halftone />
            <div style={{ position: "relative", fontFamily: MONO, fontSize: "var(--text-md)", letterSpacing: "0.22em", textTransform: "uppercase", color: MUTED, marginBottom: "var(--space-md)" }}>
              {t("detail.default.membersHeading", { total: members.length })}
            </div>
            {roster.length === 0 ? (
              <p className="content-text" style={{ position: "relative", fontFamily: MONO, color: MUTED }}>
                {spot
                  ? t("detail.membersEmptyWithSpotlight")
                  : t("detail.membersEmpty")}
              </p>
            ) : (
              roster.map((m) => (
                <Link
                  key={m.id}
                  to={`/characters/${m.id}`}
                  style={{ position: "relative", display: "flex", alignItems: "center", gap: "var(--space-md)", padding: "var(--space-sm) 0", borderBottom: `1px solid color-mix(in srgb, ${PAPER_TEXT} 16%, transparent)`, textDecoration: "none" }}
                >
                  <Medallion name={m.display_name} size={32} avatarUrl={m.avatar_url} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: BEBAS,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: roster set in condensed Bebas — its optical size is not the text scale.
                        fontSize: 19,
                        lineHeight: 1,
                        color: PAPER_TEXT,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.display_name}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: BEBAS,
                      // eslint-disable-next-line local/no-raw-style-values -- ornament: roster set in condensed Bebas — its optical size is not the text scale.
                      fontSize: 16,
                      letterSpacing: "0.04em",
                      color: PAPER_ACCENT,
                    }}
                  >
                    {t("detail.memberLevel", { level: m.level })}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
