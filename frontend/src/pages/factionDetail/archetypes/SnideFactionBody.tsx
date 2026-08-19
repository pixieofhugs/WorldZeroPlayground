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
import type { FactionDetailState } from "../useFactionDetail";

/**
 * S.N.I.D.E. faction-body — the ransom-dispatch skin of the standardized
 * six-section spine (② About, ③ Re: You, ④ Tasks, ⑤ Praxis, ⑥ Members).
 * Section ① (hero + side stat chits) is SnideFactionHero, rendered above.
 *
 * Same shape as Everymen/UaFactionBody — Tasks/Praxis reuse the app-wide
 * per-faction cards (TaskCard/PraxisCard already dispatch to the SNIDE
 * archetypes); this file only owns the cut-and-paste chrome the design adds:
 * the two-column layout, tilted photocopier frames, halftone dots, the fixed
 * "Tasks"/"Praxis" titles with marker kickers, the join/gate "re: you"
 * dispatch, the "WANTED" spotlight + dashed "rap sheet", and the FDL laurel on
 * the single top-scoring praxis.
 *
 * SNIDE is ALWAYS DARK and self-contained — all colour comes from the
 * --faction-snide-* tokens (never mutates data-theme).
 */

const ACID = "var(--faction-snide-acid)";
// ponytail: design's #16a34a marker-green has no dedicated token; --faction-snide-acid-deep
// (#6fae00) is the nearest namespaced green and reads correctly on the always-dark ink.
const GREEN = "var(--faction-snide-acid-deep)";
const INK = "var(--faction-snide-ink)";
const PAPER = "var(--faction-snide-paper)";
const PINK = "var(--faction-snide-pink)";
const MUTED = "var(--faction-snide-card-muted)";
/* The WALL's own ink, which flips with the wall (#14110b / #e9e6da). `MUTED`
   above is the CARD's — a tier that is only ever correct on the photocopier
   slab, and 1.24:1 on the light wall (#2173). Anything standing straight on
   `.snide-backdrop` takes this one. */
const WALL_TEXT = "var(--faction-snide-wall-text)";

const IMPACT = "var(--faction-snide-font-impact)";
const COND = "var(--faction-snide-font-cond)";
const BLACK = "var(--faction-snide-font-black)";
const TYPE = "var(--faction-snide-font-type)";
const MARKER = "var(--faction-snide-font-marker)";
const MONO = "var(--font-body)";

/** Photocopier-ink panel (dark card on the wall). */
const INK_PANEL: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: INK,
  color: PAPER,
  border: "1px solid color-mix(in srgb, var(--faction-snide-acid) 18%, transparent)",
  // ornament (#1609): flat offset print register — the flyposter metaphor, not
  // elevation, so it does not take `--color-cast-shadow`. Ink tokenized,
  // strength left here: how hard this panel is printed is the drawing.
  boxShadow: "6px 8px 0 color-mix(in srgb, var(--color-print-offset) 45%, transparent)",
};

/* The warm xerox-paper panel stood here. #2227 retired it: S.N.I.D.E. is always
   dark, `--faction-snide-paper` has exactly one value in `index.css`, and a
   cream slab on the wall is a headlight the wall metaphor does not defend. Both
   sites it dressed — the About flyer and the rap sheet — now take `INK_PANEL`,
   which the "RE: YOU" dispatch on this same page already wears, keeping only
   their own lighter offset register. The paper stays what its six other readers
   make it: an INK, not a ground. */

/** Faint halftone dot wash — acid on the photocopier ink. */
function Halftone() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage:
          "radial-gradient(color-mix(in srgb, var(--faction-snide-acid) 8%, transparent) 32%, transparent 34%)",
        backgroundSize: "5px 5px",
      }}
    />
  );
}

const SECTION_HEADING_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-md)",
  marginBottom: "var(--space-sm)",
  flexWrap: "wrap",
};

/**
 * THE HEADING CARRIES ITS OWN PLATE (#2173) — acid never touches paper.
 *
 * `--faction-snide-acid` is theme-INVARIANT and this heading stands straight on
 * `.snide-backdrop`, which FLIPS: 1.03:1 by day, 16.33:1 by night. Every other
 * acid-as-type site in this faction already sits on a photocopier-black ground
 * (`INK_PANEL` here, `-note-bar` on the task card and both detail mastheads,
 * `-slip-bar` on the feed slip, `-stamp-bg` on the score stamp), which is why
 * this was the only one that ever failed. So the fix is §3's own doctrine —
 * change the GROUND, not the ink — and the ground it takes is the same
 * `--faction-snide-ink` all those other sites already print on: 16.33:1 in BOTH
 * cascades. The owner's ruling (2026-08-18) turns that repair into an ornament:
 * on the light wall the plate reads as a CENSOR BAR, which is on-voice for a
 * flyposted zine.
 *
 * THE BAR IS A LIGHT-MODE-ONLY ORNAMENT, AND THAT ASYMMETRY IS INTENDED. In
 * dark the plate (#14110b) and the wall (#0a0a0b) are both near-black, so the
 * bar dissolves and the heading reads as plain acid — identical to today. Not
 * a bug; do not "fix" it by lightening the plate, which would spend the 16.33:1
 * the whole ruling rests on.
 *
 * Geometry stays here, not in index.css: the padding is how hard the redaction
 * is struck, and the tight `lineHeight` is what keeps the bar a strip over the
 * word rather than a block behind a line. The barcode rule beside it keeps the
 * bare wall — a censor bar is drawn over the WORD, and plating the whole row
 * would make it a masthead band instead.
 */
const SECTION_HEADING_TEXT: CSSProperties = {
  fontFamily: IMPACT,
  // eslint-disable-next-line local/no-raw-style-values -- ornament: skewed Impact stencil — the ransom-dispatch masthead cut, not a heading you read.
  fontSize: 30,
  lineHeight: 1.1,
  letterSpacing: "0.02em",
  color: ACID,
  background: INK,
  padding: "var(--space-xs) var(--space-md)",
  textTransform: "uppercase",
  transform: "skewX(-5deg)",
  whiteSpace: "nowrap",
};

const SECTION_HEADING_RULE: CSSProperties = {
  flex: 1,
  height: 4,
  minWidth: 40,
  background: `repeating-linear-gradient(90deg, ${GREEN} 0 14px, ${PINK} 14px 22px, transparent 22px 30px)`,
};

/** Acid section title (skewed) trailing a green/pink barcode rule. */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div style={SECTION_HEADING_ROW}>
      <span style={SECTION_HEADING_TEXT}>{children}</span>
      <span style={SECTION_HEADING_RULE} />
    </div>
  );
}

/* The scrawled marker `Kicker` under each section title lived here. #1909 cut
   its two strings (`snide.tasks.kicker` / `.praxis.kicker`): the audit ruled the
   line restated its own heading, and no faction outside the seven bespoke bodies
   ever had one. The style went with the only component that used it. */

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

/** A portrait filling a mugshot's field, cropped square-to-circle. */
const PORTRAIT: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  objectFit: "cover",
};

/**
 * Struck initials chip — ink face, acid glyph (or inverted for the spotlight).
 *
 * THE MONOGRAM IS THE FALLBACK, NOT THE DEFAULT (#2226). The green rule and the
 * ink halo are this span's own border and shadow, and the -3deg tilt is its
 * transform — so a real portrait comes out crooked, which is the point of
 * calling the thing a mugshot.
 */
function Mugshot({
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
        borderRadius: "50%",
        background: invert ? PAPER : INK,
        color: invert ? INK : ACID,
        border: `${invert ? 2 : 1.5}px solid ${GREEN}`,
        boxShadow: invert ? `0 0 0 3px ${INK}` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: IMPACT,
        fontSize: size * 0.46,
        transform: "rotate(-3deg)",
      }}
    >
      {avatarUrl ? <img alt="" aria-hidden="true" src={mediaUrl(avatarUrl)} style={PORTRAIT} /> : initial(name)}
    </span>
  );
}

export default function SnideFactionBody({ state }: { state: FactionDetailState }) {
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

  if (!faction) return null;

  // The burn (#1305) — this viewer left this faction this era, so
  // `can_join_faction` refuses the join for the rest of it. It reuses the
  // gate's chassis below: only the words change, and they are neutral
  // platform copy (ADR-0061) because this is the platform speaking.
  const burned = membership.state === "burned";

  // ② about paragraphs — split the single description on blank lines.
  const paragraphs = factionDescription(faction.slug).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  // ⑥ spotlight = highest all-time score; rap sheet = the rest.
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const rapSheet = ranked.slice(1);

  return (
    <div className="wz-faction-grid">
      {/* ── MAIN COLUMN ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        {/* ② ABOUT — tilted xerox flyer */}
        <div style={{ position: "relative", transform: "rotate(-0.6deg)" }}>
          {/* Offset register (#1609) at this flyer's own 22% — the register the
              paper panel carried, kept as-is so only the stock moved (#2227). */}
          <div style={{ ...INK_PANEL, boxShadow: "4px 6px 0 color-mix(in srgb, var(--color-print-offset) 22%, transparent)", padding: "var(--space-xl)" }}>
            <Halftone />
            <div
              style={{
                position: "relative",
                fontFamily: MARKER,
                // eslint-disable-next-line local/no-raw-style-values -- ornament: marker scrawl heading on the xerox flyer.
                fontSize: 26,
                color: GREEN,
                transform: "rotate(-1deg)",
                marginBottom: "var(--space-md)",
              }}
            >
              {t("detail.aboutHeading")}
            </div>
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              {paragraphs.length ? (
                paragraphs.map((para, i) => (
                  <p key={i} className="content-text" style={{ fontFamily: TYPE, lineHeight: 1.75, color: PAPER, margin: 0 }}>
                    {para}
                  </p>
                ))
              ) : (
                <p className="content-text" style={{ fontFamily: TYPE, lineHeight: 1.75, color: MUTED, margin: 0 }}>
                  {t("detail.descriptionEmpty")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ④ TASKS */}
        <div>
          <SectionHeading>{t("detail.default.tasksHeading", { total: tasks.length })}</SectionHeading>
          {tasks.length === 0 ? (
            <p className="content-text" style={{ fontFamily: TYPE, color: WALL_TEXT }}>{t("detail.default.tasksEmpty")}</p>
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
        </div>

        {/* ⑤ PRAXIS */}
        <div>
          <SectionHeading>{t("detail.default.recentHeading")}</SectionHeading>
          {recentPraxis.length === 0 ? (
            <p className="content-text" style={{ fontFamily: TYPE, color: WALL_TEXT }}>{t("detail.default.recentEmpty")}</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", alignItems: "flex-start" }}>
              {recentPraxis.map((praxis) => (
                <div key={praxis.id} style={{ position: "relative", flex: "1 1 280px", minWidth: 280 }}>
                  {/* ⑤ Task Crown (ADR-0028) — the skin's own corner medallion,
                      so the card's built-in stamp is suppressed. */}
                  {praxis.is_top_for_task && (
                    <TaskCrown
                      size={48}
                      rotate="-8deg"
                      // The crown's own offset register (#1609). `TaskCrown`
                      // applies this as a `filter`, and `filter` is not a
                      // COLOUR_PROP — so the ratchet never reported it. It was a
                      // blind spot, not a keep-raw ruling.
                      shadow="drop-shadow(2px 2px 0 color-mix(in srgb, var(--color-print-offset) 35%, transparent))"
                      style={{ position: "absolute", top: -12, right: -8, zIndex: 5 }}
                    />
                  )}
                  <PraxisCard praxis={praxis} showCrown={false} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT RAIL ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        {/* ③ RE: YOU — join / gate / standing (tilted dispatch) */}
        {membership.state !== "none" && (
          <div style={{ position: "relative", transform: "rotate(-1deg)" }}>
            <div style={{ ...INK_PANEL, padding: "var(--space-xl)" }}>
              <Halftone />
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  borderBottom: `2px solid ${ACID}`,
                  paddingBottom: "var(--space-sm)",
                  marginBottom: "var(--space-lg)",
                }}
              >
                <span
                  style={{
                    fontFamily: COND,
                    // eslint-disable-next-line local/no-raw-style-values -- ornament: condensed letterhead rule of the dispatch — printed furniture, not copy.
                    fontSize: 14,
                    letterSpacing: "0.22em",
                    color: ACID,
                  }}
                >
                  {t("snide.dispatch.letterhead")}
                </span>
                <span style={{ fontFamily: MONO, fontSize: "var(--text-md)", letterSpacing: "0.16em", textTransform: "uppercase", color: MUTED }}>
                  {t("snide.dispatch.reLabel")}
                </span>
              </div>
              <div style={{ position: "relative" }}>
                {membership.state === "member" && (
                  <div>
                    <div
                      style={{
                        fontFamily: IMPACT,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Impact stencil headline set tight (lineHeight 0.9) — poster type.
                        fontSize: 26,
                        lineHeight: 0.9,
                        color: ACID,
                        textTransform: "uppercase",
                      }}
                    >
                      {t("snide.dispatch.memberTitle")}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: "var(--text-md)", color: MUTED, margin: "var(--space-sm) 0 0" }}>
                      <Trans t={t} i18nKey="snide.dispatch.memberStanding">
                        Standing · <b style={{ color: PINK }}>accomplice</b>
                      </Trans>
                    </div>
                  </div>
                )}

                {membership.state === "eligible" && !confirming && (
                  <div>
                    <div
                      style={{
                        fontFamily: MARKER,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-scrawled marker aside on the dispatch.
                        fontSize: 16,
                        color: PINK,
                        transform: "rotate(-1.5deg)",
                        marginBottom: "var(--space-sm)",
                      }}
                    >
                      {t("snide.dispatch.eligibleKicker")}
                    </div>
                    <div
                      style={{
                        fontFamily: IMPACT,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Impact stencil headline set tight (lineHeight 0.9) — poster type.
                        fontSize: 24,
                        lineHeight: 0.9,
                        color: ACID,
                        textTransform: "uppercase",
                        marginBottom: "var(--space-sm)",
                      }}
                    >
                      {t("snide.dispatch.eligibleTitle")}
                    </div>
                    <div className="content-text" style={{ fontFamily: TYPE, lineHeight: 1.5, color: "var(--faction-snide-card-muted)", marginBottom: "var(--space-lg)" }}>
                      {t("snide.dispatch.eligibleBody")}
                    </div>
                    <button
                      onClick={() => setConfirming(true)}
                      style={{
                        width: "100%",
                        background: PINK,
                        // #1609: white on `--faction-snide-pink` measures
                        // 3.50:1 — below AA. The ink that clears it is already
                        // declared and already measured: 5.38:1.
                        color: "var(--faction-snide-on-accent)",
                        fontFamily: BLACK,
                        fontSize: "var(--text-xl)",
                        padding: "var(--space-md)",
                        border: "none",
                        transform: "rotate(-1deg)",
                        // The CTA's offset register (#1609) — not lift.
                        boxShadow: "3px 4px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)",
                        cursor: "pointer",
                      }}
                    >
                      {t("snide.dispatch.joinButton")}
                    </button>
                  </div>
                )}

                {membership.state === "eligible" && confirming && (
                  <div>
                    <div className="content-text" style={{ fontFamily: TYPE, lineHeight: 1.6, color: "var(--faction-snide-card-muted)", marginBottom: "var(--space-lg)" }}>
                      {membership.currentFactionSlug &&
                      membership.currentFactionSlug !== "na"
                        ? t("detail.join.confirmSwitch", {
                            faction: factionName(faction.slug),
                            current: factionName(membership.currentFactionSlug),
                          })
                        : t("detail.join.confirm", { faction: factionName(faction.slug) })}
                    </div>
                    {membership.joinError && (
                      <div className="content-text" style={{ fontFamily: MONO, color: "var(--color-danger)", marginBottom: "var(--space-sm)" }}>
                        {membership.joinError}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                      <button
                        onClick={() => void membership.join()}
                        disabled={membership.joining}
                        style={{
                          flex: 1,
                          background: PINK,
                          // #1609: white on `--faction-snide-pink` is 3.50:1,
                          // below AA; `-on-accent` is the measured 5.38:1 ink.
                          color: "var(--faction-snide-on-accent)",
                          fontFamily: BLACK,
                          fontSize: "var(--text-xl)",
                          padding: "var(--space-md)",
                          border: "none",
                          cursor: membership.joining ? "not-allowed" : "pointer",
                        }}
                      >
                        {membership.joining
                          ? t("snide.dispatch.joining")
                          : t("mobile.confirm")}
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        disabled={membership.joining}
                        style={{
                          fontFamily: COND,
                          fontSize: "var(--text-xl)",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: MUTED,
                          background: "transparent",
                          border: "2px dashed color-mix(in srgb, var(--faction-snide-card-muted) 45%, transparent)",
                          padding: "var(--space-md) var(--space-lg)",
                          cursor: membership.joining ? "not-allowed" : "pointer",
                        }}
                      >
                        {t("detail.join.cancel")}
                      </button>
                    </div>
                  </div>
                )}

                {(membership.state === "gate" || burned) && (
                  <div>
                    <div
                      style={{
                        fontFamily: MARKER,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-scrawled marker aside on the dispatch.
                        fontSize: 16,
                        color: PINK,
                        transform: "rotate(-1.5deg)",
                        marginBottom: "var(--space-sm)",
                      }}
                    >
                      {burned
                        ? t("detail.burned.kicker")
                        : t("snide.dispatch.gateKicker")}
                    </div>
                    <div
                      style={{
                        fontFamily: IMPACT,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Impact stencil headline set tight (lineHeight 0.9) — poster type.
                        fontSize: 24,
                        lineHeight: 0.9,
                        color: ACID,
                        textTransform: "uppercase",
                        marginBottom: "var(--space-md)",
                      }}
                    >
                      {burned
                        ? t("detail.burned.title", { faction: factionName(faction.slug) })
                        : t("snide.dispatch.gateTitle")}
                    </div>
                    <div className="content-text" style={{ fontFamily: TYPE, lineHeight: 1.6, color: "var(--faction-snide-card-muted)" }}>
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

        {/* ⑥ MEMBERS — WANTED spotlight + dashed rap sheet */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              <div style={{ position: "relative", transform: "rotate(1.2deg)" }}>
                {/* Offset register (#1609) at this panel's own 30%, overriding INK_PANEL's 45%. */}
                <div style={{ ...INK_PANEL, border: `2px solid ${ACID}`, boxShadow: "5px 6px 0 color-mix(in srgb, var(--color-print-offset) 30%, transparent)", padding: "var(--space-lg)", textAlign: "center" }}>
                  <Halftone />
                  {/* The poster's "★ WANTED ★" rule stood here. #1909 cut
                      `snide.spotlight.wanted`: Snide was the only faction with
                      the slot, on a surface the audit ruled generic. The
                      spotlight LABEL below it stays — that one keeps its voice. */}
                  <div
                    style={{
                      position: "relative",
                      fontFamily: MARKER,
                      // eslint-disable-next-line local/no-raw-style-values -- ornament: marker scrawl under the WANTED rule.
                      fontSize: 13,
                      color: ACID,
                      transform: "rotate(-2deg)",
                      marginBottom: "var(--space-md)",
                    }}
                  >
                    {t("snide.spotlight.label")}
                  </div>
                  <div style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: "var(--space-md)" }}>
                    <Mugshot name={spot.display_name} size={70} invert avatarUrl={spot.avatar_url} />
                  </div>
                  <div
                    style={{
                      position: "relative",
                      fontFamily: IMPACT,
                      // eslint-disable-next-line local/no-raw-style-values -- ornament: the mugshot's stencilled name plate.
                      fontSize: 30,
                      lineHeight: 0.9,
                      color: ACID,
                      textTransform: "uppercase",
                    }}
                  >
                    {spot.display_name}
                  </div>
                  <div style={{ position: "relative", fontFamily: MONO, fontSize: "var(--text-md)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--faction-snide-card-muted)", marginTop: "var(--space-xs)" }}>
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

          <div style={{ position: "relative", transform: "rotate(-0.6deg)" }}>
            {/* Offset register (#1609) at this panel's own 20% — the lightest impression on the wall. */}
            <div style={{ ...INK_PANEL, boxShadow: "4px 5px 0 color-mix(in srgb, var(--color-print-offset) 20%, transparent)", padding: "var(--space-lg) var(--space-lg) var(--space-md)" }}>
              <Halftone />
              <div
                style={{
                  position: "relative",
                  fontFamily: MARKER,
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: marker scrawl heading on the rap sheet.
                  fontSize: 22,
                  color: GREEN,
                  transform: "rotate(-1deg)",
                  marginBottom: "var(--space-md)",
                }}
              >
                {t("detail.default.membersHeading", { total: members.length })}
              </div>
              {rapSheet.length === 0 ? (
                <p className="content-text" style={{ position: "relative", fontFamily: TYPE, color: MUTED }}>
                  {spot
                    ? t("detail.membersEmptyWithSpotlight")
                    : t("detail.membersEmpty")}
                </p>
              ) : (
                rapSheet.map((m) => (
                  <Link
                    key={m.id}
                    to={`/characters/${m.id}`}
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-md)",
                      padding: "var(--space-sm) 0",
                      borderBottom: "1px dashed color-mix(in srgb, var(--faction-snide-paper) 22%, transparent)",
                      textDecoration: "none",
                    }}
                  >
                    <Mugshot name={m.display_name} size={30} avatarUrl={m.avatar_url} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="content-text" style={{ fontFamily: MARKER, color: PAPER, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.display_name}
                      </div>
                    </div>
                    <span style={{ fontFamily: COND, fontSize: "var(--text-xl)", letterSpacing: "0.06em", color: PINK }}>
                      {t("detail.memberLevel", { level: m.level })}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
