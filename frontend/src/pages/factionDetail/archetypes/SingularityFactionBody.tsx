import { type CSSProperties, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { TaskCrown } from "../../../components/factionMarks/TaskCrown";
import { factionName, factionDescription } from "../../../utils/factions";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";
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

/**
 * Singularity faction body: the terminal-printout skin of the shared spine.
 * Always dark: every colour is a theme-invariant `--faction-singularity-*` token;
 * it never mutates data-theme. The hero is SingularityFactionHero.
 */

// Four are roles (#2675) declared as `--sg-body-*` on the grid root;
// `-border-hard` and `-amber` are surface-local extras.
const VOID = "var(--sg-body-paper)"; // terminal black
const PHOSPHOR = "var(--sg-body-accent)"; // green
const SIGNAL = "var(--sg-body-quiet)"; // blue
const BORDER_HARD = "var(--faction-singularity-border-hard)"; // blue brand
const SIGNAL_FILL = "var(--sg-body-fill)"; // blue brand fill
// Credits accent, a gold scalar (ADR-0066, #1766). Its own token because na's
// gold is tuned for a white plate and this ground is near-black in both themes.
const AMBER = "var(--faction-singularity-amber)";
const FONT = "var(--font-faction-terminal)";

// ponytail: low-alpha tints via color-mix, not a dozen one-off vars; mint tokens
// if a tint needs theming.
const phosphor = (pct: number): string =>
  `color-mix(in srgb, ${PHOSPHOR} ${pct}%, transparent)`;
const signal = (pct: number): string =>
  `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`;

function Scanlines({ opacity = 0.012 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `repeating-linear-gradient(to bottom,transparent,transparent 2px,${phosphor(
          opacity * 100,
        )} 2px,${phosphor(opacity * 100)} 4px)`,
      }}
    />
  );
}

const PANEL: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: VOID,
  border: `1px solid ${signal(42)}`,
};

const SECTION_HEADING_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-md)",
  marginBottom: "var(--space-sm)",
};

const SECTION_HEADING_TEXT: CSSProperties = {
  fontFamily: FONT,
  // eslint-disable-next-line local/no-raw-style-values -- ornament: the terminal's banner cut, a step above the content ramp.
  fontSize: 28,
  letterSpacing: "0.04em",
  margin: 0,
  color: PHOSPHOR,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div style={SECTION_HEADING_ROW}>
      <h2 style={SECTION_HEADING_TEXT}>{children}</h2>
      <span style={{ flex: 1, height: 1, minWidth: 30, background: signal(30) }} />
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

/** Node avatar: portrait inside the signal ring, monogram fallback (#2226). */
function NodeGlyph({
  name,
  size,
  avatarUrl,
}: {
  name: string;
  size: number;
  avatarUrl?: string | null;
}) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        border: `1px solid ${BORDER_HARD}`,
        background: signal(14),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        fontSize: size * 0.36,
        color: SIGNAL,
      }}
    >
      {avatarUrl ? <img alt="" aria-hidden="true" src={mediaUrl(avatarUrl)} style={PORTRAIT} /> : initial(name)}
    </span>
  );
}

export default function SingularityFactionBody({ state }: { state: FactionDetailState }) {
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

  const paragraphs = factionDescription(faction.slug)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const array = ranked.slice(1);

  return (
    /* Roles land on the grid root under a body-own prefix (#2675): the cards
       below dispatch per row, so a shared name would repaint another faction's card. */
    <div className="wz-faction-grid" style={{ ...factionBodyVars("singularity"), ...factionRoleVars("singularity", "sg-body") }}>
      <div style={{ ...PANEL, padding: "var(--space-xl)" }}>
        <Scanlines />
        {/* #2547: the About panel needs a heading like every other body. */}
        <SectionHeading>{t("detail.aboutHeading")}</SectionHeading>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {paragraphs.length ? (
            paragraphs.map((para, i) => (
              <p
                key={i}
                className="content-text"
                style={{
                  fontFamily: FONT,
                  lineHeight: 1.8,
                  color: phosphor(72),
                  margin: 0,
                }}
              >
                {para}
              </p>
            ))
          ) : (
            <p className="content-text" style={{ fontFamily: FONT, lineHeight: 1.8, color: phosphor(45), margin: 0 }}>
              {t("detail.descriptionEmpty")}
            </p>
          )}
        </div>
      </div>

      {/* Standing + champion band (#3182) */}
      <div className="wz-faction-band">
        {membership.state !== "none" && (
          <div style={{ ...PANEL }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: SIGNAL_FILL,
                padding: "var(--space-sm) var(--space-lg)",
              }}
            >
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-md)",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: VOID,
                }}
              >
                {t("singularity.join.heading")}
              </span>
            </div>
            {/* #2621: every join panel opens at 16px; a pair so the sides read as untouched. */}
            <div style={{ position: "relative", padding: "var(--space-lg) var(--space-lg)" }}>
              <Scanlines />
              <div style={{ position: "relative" }}>
                {membership.state === "member" && (
                  <div>
                    <div
                      style={{
                        fontFamily: FONT,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: terminal display title.
                        fontSize: 22,
                        lineHeight: 1,
                        color: PHOSPHOR,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {t("singularity.join.memberTitle")}
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: "var(--text-base)", color: signal(60), margin: "var(--space-md) 0 0", letterSpacing: "0.04em" }}>
                      <Trans t={t} i18nKey="singularity.join.memberStanding">
                        array · <span style={{ color: SIGNAL }}>online</span>
                      </Trans>
                    </div>
                  </div>
                )}

                {membership.state === "eligible" && (
                  <JoinControl
                    membership={membership}
                    name={factionName(faction.slug)}
                    skin={JOIN_SKIN}
                    openLabel={t("singularity.join.joinButton")}
                    joiningLabel={t("singularity.join.joining")}
                    intro={
                      <>
                        <div
                          style={{
                            fontFamily: FONT,
                            // eslint-disable-next-line local/no-raw-style-values -- ornament: terminal display title.
                            fontSize: 22,
                            lineHeight: 1.05,
                            color: PHOSPHOR,
                            letterSpacing: "0.03em",
                            marginBottom: "var(--space-md)",
                          }}
                        >
                          {t("singularity.join.eligibleTitle")}
                        </div>
                        <div className="content-text" style={{ fontFamily: FONT, lineHeight: 1.65, color: phosphor(60), marginBottom: "var(--space-lg)" }}>
                          {t("singularity.join.eligibleBody")}
                        </div>
                      </>
                    }
                  />
                )}

                {(membership.state === "gate" || burned) && (
                  <div>
                    {burned && (
                      <div style={{ fontFamily: FONT, fontSize: "var(--text-md)", letterSpacing: "0.2em", color: signal(50), marginBottom: "var(--space-sm)" }}>
                        {t("detail.burned.kicker")}
                      </div>
                    )}
                    <div
                      style={{
                        fontFamily: FONT,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: terminal display title.
                        fontSize: 20,
                        lineHeight: 1.1,
                        color: PHOSPHOR,
                        letterSpacing: "0.03em",
                        marginBottom: "var(--space-md)",
                      }}
                    >
                      {burned
                        ? t("detail.burned.title", { faction: factionName(faction.slug) })
                        : t("singularity.join.gateTitle", { faction: factionName(faction.slug) })}
                    </div>
                    <div className="content-text" style={{ fontFamily: FONT, lineHeight: 1.7, color: phosphor(60) }}>
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
              <div
                style={{
                  ...PANEL,
                  border: `1px solid ${BORDER_HARD}`,
                  boxShadow: `0 0 30px -18px ${phosphor(40)}`,
                  textAlign: "center",
                  padding: "var(--space-xl) var(--space-lg) var(--space-lg)",
                }}
              >
                <Scanlines opacity={0.014} />
                <div style={{ position: "relative", fontFamily: FONT, fontSize: "var(--text-md)", letterSpacing: "0.28em", color: phosphor(45), marginBottom: "var(--space-md)" }}>
                  {t("singularity.spotlight.label")}
                </div>
                <div style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: "var(--space-md)" }}>
                  <NodeGlyph name={spot.display_name} size={72} avatarUrl={spot.avatar_url} />
                </div>
                <div className="content-title" style={{ position: "relative", fontFamily: FONT, lineHeight: 1, color: PHOSPHOR, letterSpacing: "0.03em" }}>
                  {spot.display_name}
                </div>
                <div style={{ position: "relative", fontFamily: FONT, fontSize: "var(--text-md)", letterSpacing: "0.1em", color: signal(55), marginTop: "var(--space-sm)", textTransform: "uppercase" }}>
                  {t("detail.spotlightStat", {
                    level: spot.level,
                    score: spot.all_time_score.toLocaleString(),
                    count: spot.all_time_score,
                  })}
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
            <p className="content-text" style={{ fontFamily: FONT, color: phosphor(45) }}>
              {t("detail.default.tasksEmpty")}
            </p>
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
            <p className="content-text" style={{ fontFamily: FONT, color: phosphor(45) }}>
              {t("detail.default.recentEmpty")}
            </p>
          ) : (
            <div className="wz-faction-praxis-row" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", alignItems: "flex-start" }}>
              {recentPraxis.map((praxis) => (
                <div key={praxis.id} style={{ position: "relative", flex: "0 1 var(--praxis-card-basis, 394px)", minWidth: 280 }}>
                  {/* Task Crown (ADR-0028) replaces the card's built-in stamp. */}
                  {praxis.is_top_for_task && (
                    <TaskCrown
                      size={38}
                      ringInset={3}
                      shadow={`drop-shadow(0 0 4px ${phosphor(35)})`}
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

      {/* Members last: the roll is uncapped (#3182) */}
        <div style={{ ...PANEL, padding: "var(--space-lg) var(--space-lg) var(--space-md)" }}>
          <Scanlines />
          <div style={{ position: "relative", fontFamily: FONT, fontSize: "var(--text-md)", letterSpacing: "0.24em", textTransform: "uppercase", color: phosphor(40), marginBottom: "var(--space-md)" }}>
            {t("detail.default.membersHeading", { total: members.length })}
          </div>
          {array.length === 0 ? (
            <p className="content-text" style={{ position: "relative", fontFamily: FONT, color: phosphor(45) }}>
              {spot
                ? t("detail.membersEmptyWithSpotlight")
                : t("detail.membersEmpty")}
            </p>
          ) : (
            array.map((m) => (
              <Link
                key={m.id}
                to={`/characters/${m.id}`}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-md)",
                  padding: "var(--space-sm) 0",
                  borderBottom: `1px solid ${signal(14)}`,
                  textDecoration: "none",
                }}
              >
                <NodeGlyph name={m.display_name} size={30} avatarUrl={m.avatar_url} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="content-text"
                    style={{
                      fontFamily: FONT,
                      color: PHOSPHOR,
                      lineHeight: 1.1,
                      letterSpacing: "0.03em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.display_name}
                  </div>
                </div>
                <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", color: AMBER, letterSpacing: "0.04em" }}>
                  {t("detail.memberLevel", { level: m.level })}
                </span>
              </Link>
            ))
          )}
        </div>
    </div>
  );
}

/**
 * The join trio's paint (#2651); glow on the open verb only. `sg-control-off`
 * (#3011) rides alongside `.control-off`, whose pale house neutral would slab the
 * theme-invariant void. Exported for `joinControlBusyPaint.test.tsx`.
 */
export const JOIN_SKIN: JoinControlSkin = {
  className: "sg-control-off",
  openStyle: {
    width: "100%",
    fontFamily: FONT,
    fontSize: "var(--text-md)",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: VOID,
    background: PHOSPHOR,
    border: "none",
    padding: "var(--space-md)",
    boxShadow: `0 0 16px ${phosphor(35)}`,
    cursor: "pointer",
  },
  confirmStyle: {
    fontFamily: FONT,
    fontSize: "var(--text-base)",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: VOID,
    background: PHOSPHOR,
    border: "none",
    padding: "var(--space-md)",
  },
  cancelStyle: {
    fontFamily: FONT,
    fontSize: "var(--text-md)",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: signal(60),
    background: "transparent",
    border: `1px solid ${signal(40)}`,
    padding: "var(--space-md) var(--space-lg)",
  },
  proseStyle: { fontFamily: FONT, lineHeight: 1.7, color: phosphor(72), marginBottom: "var(--space-lg)" },
  errorStyle: { fontFamily: FONT, color: "var(--color-danger)", marginBottom: "var(--space-sm)" },
};
