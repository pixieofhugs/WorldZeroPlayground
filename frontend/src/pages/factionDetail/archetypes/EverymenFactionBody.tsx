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
 * Everymen faction body: the victory-poster skin of the shared spine. The hero
 * is EverymenFactionHero; all colour comes from `--everymen-*` tokens.
 */

const CREAM = "var(--everymen-cream)";
const GOLD = "var(--everymen-gold)";
const INK = "var(--everymen-ink)";
/**
 * Text on the paper (every frame here, #2227). `INK` stays near-black in dark
 * (1.16:1 on the paper); this flips with the stock and equals `INK` in light (#2133).
 */
const PAPER_TEXT = "var(--everymen-paper-text)";
const PAPER = "var(--everymen-paper)";
const RED = "var(--everymen-red)";
/** Red as TEXT on the paper (#1341): `RED` misses AA as ink; fills stay on `RED`. */
const PAPER_ACCENT = "var(--everymen-paper-accent)";
const MUTED = "var(--everymen-muted)";

const BEBAS = "var(--font-accent)";
const MONO = "var(--faction-everymen-body-font)";

/**
 * Paper frame with the double rule. Stock is the paper, never the theme-invariant
 * cream (#2227). The rule is what draws the panel (panel vs page is ~1:1), so it
 * must flip with the stock: `PAPER_TEXT`, not `INK`.
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
        // Flipping ink: the wash must darken light paper and lighten dark.
        backgroundImage: `radial-gradient(${PAPER_TEXT} 0.6px, transparent 0.7px)`,
        backgroundSize: "4px 4px",
      }}
    />
  );
}

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

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

const PORTRAIT: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  objectFit: "cover",
};

/** The spotlight's inset red band width, px. */
const SPOTLIGHT_BAND = 5;

/**
 * Circular medallion: portrait, or monogram fallback (#2226). An inset shadow
 * paints under content, so with a photo the spotlight band is held open by padding.
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
    onSignup,
    membership,
  } = state;
  const sections = useSectionDisclosures(FACTION_SECTIONS);

  if (!faction) return null;

  // The burn (#1305) reuses the gate's chassis with neutral platform copy (ADR-0061).
  const burned = membership.state === "burned";

  const paragraphs = factionDescription(faction.slug).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const roster = ranked.slice(1);

  return (
    <div className="wz-faction-grid" style={{ ...factionBodyVars("everymen") }}>
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

      {/* Standing + champion band (#3182) */}
      <div className="wz-faction-band">
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
            {/* #2621: every join panel opens at 16px. */}
            <div style={{ position: "relative", padding: "var(--space-lg) var(--space-xl)" }}>
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

                {membership.state === "eligible" && (
                  <JoinControl
                    membership={membership}
                    name={factionName(faction.slug)}
                    skin={JOIN_SKIN}
                    openLabel={t("everymen.join.joinButton")}
                    joiningLabel={t("everymen.join.joining")}
                    intro={
                      <>
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
                      </>
                    }
                  />
                )}

                {(membership.state === "gate" || burned) && (
                  <div>
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

          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              <div style={{ position: "relative", overflow: "hidden", background: INK, color: CREAM, border: `3px solid ${INK}`, boxShadow: `0 0 0 3px ${GOLD}`, textAlign: "center" }}>
                {/* The faction's one shared burst (#2195); `knockout` on an ink slab. */}
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
                      // Poster drop shadow, shared with sibling surfaces (#1609).
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
      </div>

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
                  multiplier={task.viewer_faction_multiplier}
                  onSignup={onSignup}
                />
              ))}
            </div>
          )}
        </SectionPanel>
      </div>

      <div>
        <SectionHeading>
          <SectionToggle section={sections.praxis} label={t("detail.default.recentHeading")} />
        </SectionHeading>
        <SectionPanel section={sections.praxis}>
          {recentPraxis.length === 0 ? (
            <p className="content-text" style={{ fontFamily: MONO, color: MUTED }}>{t("detail.default.recentEmpty")}</p>
          ) : (
            <div className="wz-faction-praxis-row" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", alignItems: "flex-start" }}>
              {recentPraxis.map((praxis) => (
                <div key={praxis.id} style={{ position: "relative", flex: "0 1 var(--praxis-card-basis, 394px)", minWidth: 280 }}>
                  {/* Task Crown (ADR-0028) replaces the card's built-in stamp. */}
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

      {/* Members last: the roll is uncapped (#3182) */}
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
  );
}

/** The join trio's paint (#2651); the offset shadow is the open verb's alone. */
const JOIN_SKIN: JoinControlSkin = {
  openStyle: {
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
  },
  confirmStyle: {
    fontFamily: BEBAS,
    // eslint-disable-next-line local/no-raw-style-values -- ornament: Bebas is a condensed poster face — its optical size is not the text scale.
    fontSize: 16,
    letterSpacing: "0.1em",
    color: CREAM,
    background: RED,
    border: "none",
    padding: "var(--space-md)",
  },
  cancelStyle: { fontFamily: MONO, fontSize: "var(--text-md)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, background: "transparent", border: `1.5px solid color-mix(in srgb, ${PAPER_TEXT} 30%, transparent)`, padding: "var(--space-md) var(--space-lg)" },
  proseStyle: { fontFamily: MONO, lineHeight: 1.6, color: PAPER_TEXT, marginBottom: "var(--space-lg)" },
  errorStyle: { fontFamily: MONO, color: "var(--color-danger)", marginBottom: "var(--space-sm)" },
};
