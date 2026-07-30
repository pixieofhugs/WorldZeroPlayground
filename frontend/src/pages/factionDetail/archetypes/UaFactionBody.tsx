import { useState, type CSSProperties, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/PraxisCard";
import { TaskCrown } from "../../../components/factionMarks/TaskCrown";
import { toRoman } from "../../../utils/roman";
import {
  UA_DISPLAY,
  UA_EYEBROW,
  UA_TEXT,
  uaShade,
} from "../../../components/factionMarks/uaAtoms";
import { computeFactionMultiplier } from "../../../utils/points";
import { factionName, factionDescription } from "../../../utils/factions";
import type { CharacterOut } from "../../../api/auth";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * UA faction body — the standardized six-section spine in the practice's dress
 * (② The Practice, ③ The Registry, ④ Tasks, ⑤ Praxis, ⑥ Members). Section ① is
 * {@link UaFactionHero} above.
 *
 * Rebuilt for #851. Every plate was a gilt sandwich — gold-leaf inset shadows,
 * a parchment dot-grain overlay, gold hairlines, italic Cormorant everywhere.
 * It is now one repeated surface: card stock, a neutral hairline, an uppercase
 * eyebrow, and the orange used once per block at most.
 *
 * The mandala is ABSENT on this page; the hero above it carries the pattern and
 * the page backdrop carries it behind (brief §5). Tasks and Praxis reuse the
 * app-wide per-faction cards, which already dispatch to the UA archetypes.
 *
 * Both themes come from the `[data-theme="dark"]` cascade.
 */

/** The one surface this page repeats: card stock inside a neutral hairline. */
const SHEET: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: "var(--faction-ua-card-bg)",
  color: "var(--faction-ua-card-text)",
  border: "1px solid var(--faction-ua-rule)",
  borderRadius: "var(--radius-md)",
};

const SOLID_ACTION: CSSProperties = {
  fontFamily: UA_TEXT,
  fontSize: "var(--text-xl)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--faction-ua-on-fill)",
  background: "var(--faction-ua)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-md)",
};

/** An eyebrow with a hairline running out to the margin. */
function RuledLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        marginBottom: "var(--space-lg)",
      }}
    >
      <span style={{ ...UA_EYEBROW, whiteSpace: "nowrap" }}>{children}</span>
      <span
        style={{ flex: 1, height: 1, background: "var(--faction-ua-hair)" }}
      />
    </div>
  );
}

function SectionHeading({
  kicker,
  children,
}: {
  kicker: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: "var(--space-xl)" }}>
      <div style={UA_EYEBROW}>{kicker}</div>
      <h2
        style={{
          fontFamily: UA_DISPLAY,
          fontWeight: 600,
          fontSize: "var(--text-heading)",
          lineHeight: 1.05,
          letterSpacing: "-0.01em",
          color: "var(--faction-ua-card-text)",
          margin: "var(--space-xs) 0 0",
        }}
      >
        {children}
      </h2>
    </div>
  );
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";
// "Anno {roman}"; level 0 shows an em-dash, matching the ephemerists convention.
const anno = (level: number) => (level > 0 ? toRoman(level) : "—");

/** Circular initials medallion — panel face, display glyph. */
function Medallion({
  name,
  size,
  spotlight = false,
}: {
  name: string;
  size: number;
  spotlight?: boolean;
}) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--faction-ua-panel)",
        border: `${spotlight ? 2 : 1}px solid ${
          spotlight ? "var(--faction-ua)" : "var(--faction-ua-rule)"
        }`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: UA_DISPLAY,
        fontWeight: 600,
        fontSize: size * 0.42,
        color: "var(--faction-ua-card-text)",
      }}
    >
      {initial(name)}
    </span>
  );
}

export default function UaFactionBody({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation("factions");
  const {
    faction,
    members,
    tasks,
    recentPraxis,
    viewerFactionSlug,
    gameFactions,
    membership,
  } = state;
  const [confirming, setConfirming] = useState(false);

  if (!faction) return null;

  const paragraphs = factionDescription(faction.slug)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const register = ranked.slice(1);

  const prose: CSSProperties = {
    fontFamily: UA_TEXT,
    lineHeight: 1.7,
    color: "var(--faction-ua-card-body)",
    margin: 0,
  };

  return (
    <div className="wz-faction-grid">
      {/* ── MAIN COLUMN ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2xl)",
        }}
      >
        {/* ② THE PRACTICE */}
        <div style={{ ...SHEET, padding: "var(--space-xl) var(--space-2xl)" }}>
          <RuledLabel>{t("ua.practice.heading")}</RuledLabel>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-md)",
            }}
          >
            {paragraphs.length ? (
              paragraphs.map((para, i) => (
                <p key={i} className="content-text" style={prose}>
                  {para}
                </p>
              ))
            ) : (
              <p
                className="content-text"
                style={{ ...prose, color: "var(--faction-ua-card-muted)" }}
              >
                {t("ua.practice.empty")}
              </p>
            )}
          </div>
        </div>

        {/* ④ TASKS */}
        <div>
          <SectionHeading kicker={t("ua.tasks.kicker")}>
            {t("ua.tasks.heading")}
          </SectionHeading>
          {tasks.length === 0 ? (
            <p
              className="content-text"
              style={{ ...prose, color: "var(--faction-ua-card-muted)" }}
            >
              {t("ua.tasks.empty")}
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-xl)",
                alignItems: "flex-start",
              }}
            >
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
                />
              ))}
            </div>
          )}
        </div>

        {/* ⑤ PRAXIS */}
        <div>
          <SectionHeading kicker={t("ua.praxis.kicker")}>
            {t("ua.praxis.heading")}
          </SectionHeading>
          {recentPraxis.length === 0 ? (
            <p
              className="content-text"
              style={{ ...prose, color: "var(--faction-ua-card-muted)" }}
            >
              {t("ua.praxis.empty")}
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-lg)",
                alignItems: "flex-start",
              }}
            >
              {recentPraxis.map((praxis) => (
                <div
                  key={praxis.id}
                  style={{ position: "relative", flex: "1 1 280px", minWidth: 280 }}
                >
                  {/* Task Crown (ADR-0028) — the skin's own corner medallion,
                      so the card's built-in stamp is suppressed. */}
                  {praxis.is_top_for_task && (
                    <TaskCrown
                      size={42}
                      rotate="-8deg"
                      shadow={`drop-shadow(1.5px 2px 0 ${uaShade(28)})`}
                      style={{
                        position: "absolute",
                        top: -12,
                        right: -8,
                        zIndex: 5,
                      }}
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2xl)",
        }}
      >
        {/* ③ THE REGISTRY — join / gate / standing */}
        {membership.state !== "none" && (
          <div style={{ ...SHEET, padding: "var(--space-xl)" }}>
            <RuledLabel>{t("ua.registry.heading")}</RuledLabel>

            {membership.state === "member" && (
              <div>
                <div
                  className="content-title"
                  style={{
                    fontFamily: UA_DISPLAY,
                    fontWeight: 600,
                    lineHeight: 1.05,
                    color: "var(--faction-ua-card-text)",
                  }}
                >
                  {t("ua.registry.memberTitle")}
                </div>
                <div
                  style={{
                    ...prose,
                    fontSize: "var(--text-content)",
                    marginTop: "var(--space-md)",
                  }}
                >
                  <Trans t={t} i18nKey="ua.registry.memberStanding">
                    Standing ·{" "}
                    <span style={{ color: "var(--faction-ua-card-accent)" }}>
                      practising
                    </span>
                  </Trans>
                </div>
              </div>
            )}

            {membership.state === "eligible" && !confirming && (
              <div>
                <div style={UA_EYEBROW}>{t("ua.registry.eligibleKicker")}</div>
                <div
                  className="content-title"
                  style={{
                    fontFamily: UA_DISPLAY,
                    fontWeight: 600,
                    lineHeight: 1.05,
                    color: "var(--faction-ua-card-text)",
                    margin: "var(--space-xs) 0 var(--space-md)",
                  }}
                >
                  {t("ua.registry.eligibleTitle")}
                </div>
                <p
                  className="content-text"
                  style={{ ...prose, marginBottom: "var(--space-lg)" }}
                >
                  {t("ua.registry.eligibleBody")}
                </p>
                <button
                  onClick={() => setConfirming(true)}
                  style={{ ...SOLID_ACTION, width: "100%", cursor: "pointer" }}
                >
                  {t("ua.registry.joinButton")}
                </button>
              </div>
            )}

            {membership.state === "eligible" && confirming && (
              <div>
                <p
                  className="content-text"
                  style={{
                    ...prose,
                    color: "var(--faction-ua-card-text)",
                    marginBottom: "var(--space-lg)",
                  }}
                >
                  {membership.currentFactionSlug &&
                  membership.currentFactionSlug !== "na"
                    ? t("ua.registry.confirmSwitch", {
                        faction: factionName(faction.slug),
                        current: factionName(membership.currentFactionSlug),
                      })
                    : t("ua.registry.confirm", {
                        faction: factionName(faction.slug),
                      })}
                </p>
                {membership.joinError && (
                  <p
                    className="content-text"
                    style={{
                      ...prose,
                      color: "var(--color-danger)",
                      marginBottom: "var(--space-sm)",
                    }}
                  >
                    {membership.joinError}
                  </p>
                )}
                <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                  <button
                    onClick={() => void membership.join()}
                    disabled={membership.joining}
                    style={{
                      ...SOLID_ACTION,
                      flex: 1,
                      cursor: membership.joining ? "not-allowed" : "pointer",
                    }}
                  >
                    {membership.joining
                      ? t("ua.registry.joining")
                      : t("ua.registry.confirmButton")}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={membership.joining}
                    style={{
                      ...UA_EYEBROW,
                      background: "transparent",
                      border: "1px solid var(--faction-ua-rule)",
                      borderRadius: "var(--radius-sm)",
                      padding: "var(--space-md) var(--space-lg)",
                      cursor: membership.joining ? "not-allowed" : "pointer",
                    }}
                  >
                    {t("detail.join.cancel")}
                  </button>
                </div>
              </div>
            )}

            {membership.state === "gate" && (
              <div>
                <div style={UA_EYEBROW}>{t("ua.registry.gateKicker")}</div>
                <div
                  className="content-title"
                  style={{
                    fontFamily: UA_DISPLAY,
                    fontWeight: 600,
                    lineHeight: 1.05,
                    color: "var(--faction-ua-card-text)",
                    margin: "var(--space-xs) 0 var(--space-md)",
                  }}
                >
                  {t("ua.registry.gateTitle")}
                </div>
                <p className="content-text" style={prose}>
                  {t("ua.registry.gateBody", {
                    faction: factionName(faction.slug),
                  })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ⑥ MEMBERS — held up + the circle */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-xl)",
          }}
        >
          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  ...SHEET,
                  background:
                    "linear-gradient(160deg, var(--faction-ua-lift), var(--faction-ua-card-bg) 60%)",
                  padding: "var(--space-xl) var(--space-lg)",
                  textAlign: "center",
                }}
              >
                <div style={{ ...UA_EYEBROW, marginBottom: "var(--space-md)" }}>
                  {t("ua.spotlight.label")}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: "var(--space-md)",
                  }}
                >
                  <Medallion name={spot.display_name} size={72} spotlight />
                </div>
                <div
                  className="content-title"
                  style={{
                    fontFamily: UA_DISPLAY,
                    fontWeight: 600,
                    lineHeight: 1.05,
                    color: "var(--faction-ua-card-text)",
                  }}
                >
                  {spot.display_name}
                </div>
                <div style={{ ...UA_EYEBROW, marginTop: "var(--space-sm)" }}>
                  {t("ua.spotlight.stat", {
                    anno: anno(spot.level),
                    score: spot.all_time_score.toLocaleString(),
                  })}
                </div>
              </div>
            </Link>
          )}

          <div
            style={{ ...SHEET, padding: "var(--space-lg) var(--space-xl)" }}
          >
            <RuledLabel>{t("ua.roster.heading")}</RuledLabel>
            {register.length === 0 ? (
              <p
                className="content-text"
                style={{ ...prose, color: "var(--faction-ua-card-muted)" }}
              >
                {spot
                  ? t("ua.roster.emptyWithSpotlight")
                  : t("detail.membersEmpty")}
              </p>
            ) : (
              register.map((m) => (
                <Link
                  key={m.id}
                  to={`/characters/${m.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-md)",
                    padding: "var(--space-sm) 0",
                    borderBottom: "1px solid var(--faction-ua-hair)",
                    textDecoration: "none",
                  }}
                >
                  <Medallion name={m.display_name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="content-text"
                      style={{
                        fontFamily: UA_DISPLAY,
                        fontWeight: 600,
                        color: "var(--faction-ua-card-text)",
                        lineHeight: 1.15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.display_name}
                    </div>
                  </div>
                  <span style={{ ...UA_EYEBROW, letterSpacing: "0.16em" }}>
                    {t("ua.roster.level", { anno: anno(m.level) })}
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
