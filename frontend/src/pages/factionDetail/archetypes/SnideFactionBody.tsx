import { type CSSProperties, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { TaskCrown } from "../../../components/factionMarks/TaskCrown";
import { factionName, factionDescription } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import type { CharacterOut } from "../../../api/auth";
import { JoinControl, type JoinControlSkin } from "../../../components/JoinControl";
import {
  FACTION_SECTIONS,
  SectionPanel,
  SectionToggle,
  useSectionDisclosures,
} from "../sectionDisclosure";
import type { FactionDetailState } from "../useFactionDetail";
import { factionBodyVars } from "../../../utils/factionBodyFace"

/**
 * S.N.I.D.E. faction-body — ransom-dispatch skin of the six-section spine
 * (② About … ⑥ Members; ① is SnideFactionHero). Tasks/Praxis reuse the shared
 * per-faction cards; this file owns only the cut-and-paste chrome.
 *
 * THE PAGE FLIPS (#2343): the wall is xerox by day, black by night, so panels
 * stand on the wall and take inks that flip. Two families must NOT flip: the
 * black card slabs (`--faction-snide-card-*`, #2066) and the press pigments
 * (acid, pink, `-ink`, `-paper`). Never mutates data-theme.
 */

const ACID = "var(--faction-snide-acid)";
// ponytail: design's #16a34a marker-green has no token; -acid-deep is the nearest
// namespaced green. Mint a token if the design insists.
const GREEN = "var(--faction-snide-acid-deep)";
const INK = "var(--faction-snide-ink)";
const PAPER = "var(--faction-snide-paper)";
const PINK = "var(--faction-snide-pink)";
/* The wall's own ink (flips). The card tier `-card-muted` is 1.24:1 on the
   light wall (#2173); anything straight on `.snide-backdrop` takes this. */
const WALL_TEXT = "var(--faction-snide-wall-text)";

/* Panel inks that flip with the wall (#2343, reverses #2227 on owner ruling).
   Measured by `SNIDE_WALL_PAIRS` in `factionContrast.test.ts`. */
const WALL = "var(--faction-snide-wall)";
const NOTE_INK = "var(--faction-snide-note-ink)";
const NOTE_MUTED = "var(--faction-snide-note-muted)";
/* `PINK` is the pigment: fine as a FILL, 2.98:1 as type on the light wall.
   Pink that carries a WORD takes this one. `GREEN` likewise never carries a
   word (2.30:1 on the light wall). */
const NOTE_PINK = "var(--faction-snide-note-pink-ink)";
/* Not `--color-danger` (4.08:1 on this wall): the wall's alarm rung,
   6.68:1 / 7.41:1. */
const WALL_ALARM = "var(--faction-snide-wall-alarm)";

const IMPACT = "var(--faction-snide-font-black)";
const COND = "var(--faction-snide-font-marker)";
const BLACK = "var(--faction-snide-font-black)";
const TYPE = "var(--faction-snide-font-type)";
const MARKER = "var(--faction-snide-font-marker)";

/**
 * A flyposted panel: the wall's own stock pasted onto the wall (#2343).
 * Grounds on `-wall` (flips), not `-paper`, which stays an ink (#2227).
 *
 * The edge and shadow are load-bearing (§6, #2065): the page ground is the
 * same wall, so they are all that separates panel from page. Offset strength
 * stays per call site (#1609).
 */
const WALL_PANEL: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: WALL,
  color: NOTE_INK,
  border: "1px solid var(--faction-snide-note-wall-edge)",
  // ornament (#1609): flat offset print register, not elevation, so not
  // `--color-cast-shadow`. Uniform 40% (#2302).
  boxShadow: "6px 8px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)",
};

/** Faint halftone dot wash — the wall's own raster, at this panel's density. */
function Halftone() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        // Wall-text ink (not acid, invisible on xerox) so the raster flips with
        // the ground; 8% / 5px pitch is the drawing.
        backgroundImage: `radial-gradient(color-mix(in srgb, ${WALL_TEXT} 8%, transparent) 32%, transparent 34%)`,
        backgroundSize: "5px 5px",
      }}
    />
  );
}

/**
 * Acid never touches paper (#2173, #2343): acid type carries the black plate,
 * a censor bar by day that dissolves into the wall by night. 15.55:1 both
 * themes. Colour only; padding/geometry stay at the call site.
 */
const ACID_PLATE: CSSProperties = { color: ACID, background: INK };

const SECTION_HEADING_ROW: CSSProperties = {
  /* Load-bearing (#2807): inside a WALL_PANEL the absolute Halftone covers
     every sibling without its own `position`, dulling the heading. */
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-md)",
  marginBottom: "var(--space-sm)",
  flexWrap: "wrap",
};

/**
 * The heading carries its own plate (#2173): bare acid on the light wall is
 * 1.03:1. The censor bar is light-mode-only by design (owner, 2026-08-18): in
 * dark the plate dissolves into the wall. Don't lighten the plate; the 16.33:1
 * rests on it. Tight `lineHeight` keeps the bar a strip over the word.
 */
const SECTION_HEADING_TEXT: CSSProperties = {
  ...ACID_PLATE,
  fontFamily: IMPACT,
  // eslint-disable-next-line local/no-raw-style-values -- ornament: skewed Impact stencil — the ransom-dispatch masthead cut, not a heading you read.
  fontSize: 30,
  lineHeight: 1.1,
  letterSpacing: "0.02em",
  padding: "var(--space-xs) var(--space-md)",
  textTransform: "uppercase",
  transform: "skewX(-5deg)",
  whiteSpace: "nowrap",
};

/* The barcode keeps the pigments on purpose (#2173): no information, no ratio
   owed; fainter by day is the ruling. */
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
 * Mugshot: portrait, monogram as fallback (#2226); tilted on purpose. Paints
 * its own ground (INK/PAPER), so it doesn't flip with the wall.
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
    onSignup,
    membership,
  } = state;
  const sections = useSectionDisclosures(FACTION_SECTIONS);

  if (!faction) return null;

  // The burn (#1305): left this era, can't rejoin. Gate chassis, neutral
  // platform copy (ADR-0061).
  const burned = membership.state === "burned";

  const paragraphs = factionDescription(faction.slug).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  // ⑥ spotlight = highest all-time score; rap sheet = the rest.
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const rapSheet = ranked.slice(1);

  return (
    <div className="wz-faction-grid" style={{ ...factionBodyVars("snide") }}>
      {/* ② ABOUT — tilted xerox flyer */}
      <div style={{ position: "relative", transform: "rotate(-0.6deg)" }}>
        {/* Offset register (#1609), uniform 40% (#2302). */}
        <div style={{ ...WALL_PANEL, boxShadow: "4px 6px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)", padding: "var(--space-xl)" }}>
          <Halftone />
          <SectionHeading>{t("detail.aboutHeading")}</SectionHeading>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            {paragraphs.length ? (
              paragraphs.map((para, i) => (
                <p key={i} className="content-text" style={{ fontFamily: TYPE, lineHeight: 1.75, color: NOTE_INK, margin: 0 }}>
                  {para}
                </p>
              ))
            ) : (
              <p className="content-text" style={{ fontFamily: TYPE, lineHeight: 1.75, color: NOTE_MUTED, margin: 0 }}>
                {t("detail.descriptionEmpty")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* STANDING + CHAMPION (#3182): wrapping row, stacks when narrow. */}
      <div className="wz-faction-band">
        {/* ③ RE: YOU */}
        {membership.state !== "none" && (
          <div style={{ position: "relative", transform: "rotate(-1deg)" }}>
            {/* #2621: 16px top, the rhythm every join panel shares. */}
            <div style={{ ...WALL_PANEL, padding: "var(--space-lg) var(--space-xl)" }}>
              <Halftone />
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "baseline",
                  // Pigment: a drawn line, no words; reads by chroma on cream.
                  borderBottom: `2px solid ${ACID}`,
                  paddingBottom: "var(--space-sm)",
                  marginBottom: "var(--space-lg)",
                }}
              >
                <span
                  style={{
                    ...ACID_PLATE,
                    fontFamily: COND,
                    // eslint-disable-next-line local/no-raw-style-values -- ornament: condensed letterhead rule of the dispatch — printed furniture, not copy.
                    fontSize: 14,
                    letterSpacing: "0.22em",
                    // Tight: a strip along the line, not a block.
                    padding: "0 var(--space-xs)",
                  }}
                >
                  {t("snide.join.heading")}
                </span>
              </div>
              <div style={{ position: "relative" }}>
                {membership.state === "member" && (
                  <div>
                    <div
                      style={{
                        ...ACID_PLATE,
                        display: "inline-block",
                        fontFamily: IMPACT,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Impact stencil headline set tight (lineHeight 0.9) — poster type.
                        fontSize: 26,
                        lineHeight: 0.9,
                        padding: "var(--space-xs) var(--space-sm)",
                        textTransform: "uppercase",
                      }}
                    >
                      {t("snide.join.memberTitle")}
                    </div>
                    <div style={{ fontFamily: TYPE, fontSize: "var(--text-md)", color: NOTE_MUTED, margin: "var(--space-sm) 0 0" }}>
                      <Trans t={t} i18nKey="snide.join.memberStanding">
                        Standing · <b style={{ color: NOTE_PINK }}>accomplice</b>
                      </Trans>
                    </div>
                  </div>
                )}

                {membership.state === "eligible" && (
                  <JoinControl
                    membership={membership}
                    name={factionName(faction.slug)}
                    skin={JOIN_SKIN}
                    openLabel={t("snide.join.joinButton")}
                    joiningLabel={t("snide.join.joining")}
                    intro={
                      <>
                        <div
                          style={{
                            ...ACID_PLATE,
                            display: "inline-block",
                            fontFamily: IMPACT,
                            // eslint-disable-next-line local/no-raw-style-values -- ornament: Impact stencil headline set tight (lineHeight 0.9) — poster type.
                            fontSize: 24,
                            lineHeight: 0.9,
                            padding: "var(--space-xs) var(--space-sm)",
                            textTransform: "uppercase",
                            marginBottom: "var(--space-sm)",
                          }}
                        >
                          {t("snide.join.eligibleTitle")}
                        </div>
                        <div className="content-text" style={{ fontFamily: TYPE, lineHeight: 1.5, color: NOTE_MUTED, marginBottom: "var(--space-lg)" }}>
                          {t("snide.join.eligibleBody")}
                        </div>
                      </>
                    }
                  />
                )}

                {(membership.state === "gate" || burned) && (
                  <div>
                    {burned && (
                      <div
                        style={{
                          fontFamily: MARKER,
                          // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-scrawled marker aside on the dispatch.
                          fontSize: 16,
                          color: NOTE_PINK,
                          transform: "rotate(-1.5deg)",
                          marginBottom: "var(--space-sm)",
                        }}
                      >
                        {t("detail.burned.kicker")}
                      </div>
                    )}
                    <div
                      style={{
                        ...ACID_PLATE,
                        display: "inline-block",
                        fontFamily: IMPACT,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Impact stencil headline set tight (lineHeight 0.9) — poster type.
                        fontSize: 24,
                        lineHeight: 0.9,
                        padding: "var(--space-xs) var(--space-sm)",
                        textTransform: "uppercase",
                        marginBottom: "var(--space-md)",
                      }}
                    >
                      {burned
                        ? t("detail.burned.title", { faction: factionName(faction.slug) })
                        : t("snide.join.gateTitle")}
                    </div>
                    <div className="content-text" style={{ fontFamily: TYPE, lineHeight: 1.6, color: NOTE_MUTED }}>
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

          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              <div style={{ position: "relative", transform: "rotate(1.2deg)" }}>
                {/* 2px acid frame overrides the hairline: a drawn mark,
                    reads by chroma (#2173). */}
                <div style={{ ...WALL_PANEL, border: `2px solid ${ACID}`, boxShadow: "5px 6px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)", padding: "var(--space-lg)", textAlign: "center" }}>
                  <Halftone />
                  <div
                    style={{
                      ...ACID_PLATE,
                      position: "relative",
                      display: "inline-block",
                      fontFamily: MARKER,
                      // eslint-disable-next-line local/no-raw-style-values -- ornament: marker scrawl under the WANTED rule.
                      fontSize: 13,
                      // A chip, not a strip: a stuck-on label.
                      padding: "0 var(--space-sm)",
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
                      ...ACID_PLATE,
                      position: "relative",
                      display: "inline-block",
                      fontFamily: IMPACT,
                      // eslint-disable-next-line local/no-raw-style-values -- ornament: the mugshot's stencilled name plate.
                      fontSize: 30,
                      lineHeight: 0.9,
                      padding: "var(--space-xs) var(--space-sm)",
                      textTransform: "uppercase",
                    }}
                  >
                    {spot.display_name}
                  </div>
                  <div style={{ position: "relative", fontFamily: TYPE, fontSize: "var(--text-md)", letterSpacing: "0.08em", textTransform: "uppercase", color: NOTE_MUTED, marginTop: "var(--space-xs)" }}>
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
            <p className="content-text" style={{ fontFamily: TYPE, color: WALL_TEXT }}>{t("detail.default.tasksEmpty")}</p>
          ) : (
            <div className="task-card-row" style={{ gap: "var(--space-xl)" }}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  basePoints={task.point_value}
                  multiplier={task.viewer_faction_multiplier}
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
            <p className="content-text" style={{ fontFamily: TYPE, color: WALL_TEXT }}>{t("detail.default.recentEmpty")}</p>
          ) : (
            <div className="wz-faction-praxis-row" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", alignItems: "flex-start" }}>
              {recentPraxis.map((praxis) => (
                <div key={praxis.id} style={{ position: "relative", flex: "0 1 var(--praxis-card-basis, 394px)", minWidth: 280 }}>
                  {/* Task Crown (ADR-0028); card's own stamp suppressed. */}
                  {praxis.is_top_for_task && (
                    <TaskCrown
                      size={48}
                      rotate="-8deg"
                      // Offset register (#1609), applied as a `filter`.
                      shadow="drop-shadow(2px 2px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent))"
                      style={{ position: "absolute", top: -12, right: -8, zIndex: 5 }}
                    />
                  )}
                  <PraxisCard praxis={praxis} showCrown={false} />
                </div>
              ))}
            </div>
          )}
        </SectionPanel>
      </div>

      {/* ⑥ MEMBERS — last, because the roll is uncapped (#3182) */}
        <div style={{ position: "relative", transform: "rotate(-0.6deg)" }}>
          <div style={{ ...WALL_PANEL, boxShadow: "4px 5px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)", padding: "var(--space-lg) var(--space-lg) var(--space-md)" }}>
            <Halftone />
            <SectionHeading>
              {t("detail.default.membersHeading", { total: members.length })}
            </SectionHeading>
            {rapSheet.length === 0 ? (
              <p className="content-text" style={{ position: "relative", fontFamily: TYPE, color: NOTE_MUTED }}>
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
                    borderBottom: `1px dashed color-mix(in srgb, ${NOTE_INK} 22%, transparent)`,
                    textDecoration: "none",
                  }}
                >
                  <Mugshot name={m.display_name} size={30} avatarUrl={m.avatar_url} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="content-text" style={{ fontFamily: MARKER, color: NOTE_INK, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.display_name}
                    </div>
                  </div>
                  <span style={{ fontFamily: COND, fontSize: "var(--text-xl)", letterSpacing: "0.06em", color: NOTE_PINK }}>
                    {t("detail.memberLevel", { level: m.level })}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
    </div>
  );
}

/**
 * Join trio paint (#2651). White on pink is 3.50:1; `-on-accent` is 5.38:1
 * (#1609). Error uses WALL_ALARM (#2343).
 */
const JOIN_SKIN: JoinControlSkin = {
  openStyle: {
    width: "100%",
    background: PINK,
    color: "var(--faction-snide-on-accent)",
    fontFamily: BLACK,
    fontSize: "var(--text-xl)",
    padding: "var(--space-md)",
    border: "none",
    transform: "rotate(-1deg)",
    // Offset register (#1609), not lift.
    boxShadow: "3px 4px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)",
    cursor: "pointer",
  },
  confirmStyle: {
    background: PINK,
    color: "var(--faction-snide-on-accent)",
    fontFamily: BLACK,
    fontSize: "var(--text-xl)",
    padding: "var(--space-md)",
    border: "none",
  },
  cancelStyle: {
    fontFamily: COND,
    fontSize: "var(--text-xl)",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: NOTE_MUTED,
    background: "transparent",
    border: `2px dashed color-mix(in srgb, ${NOTE_MUTED} 45%, transparent)`,
    padding: "var(--space-md) var(--space-lg)",
  },
  proseStyle: { fontFamily: TYPE, lineHeight: 1.6, color: NOTE_MUTED, marginBottom: "var(--space-lg)" },
  errorStyle: { fontFamily: TYPE, color: WALL_ALARM, marginBottom: "var(--space-sm)" },
};
