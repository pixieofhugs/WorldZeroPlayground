import { type CSSProperties, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { TaskCrown } from "../../../components/factionMarks/TaskCrown";
import {
  UA_DISPLAY,
  UA_EYEBROW,
  UA_TEXT,
  uaShade,
} from "../../../components/factionMarks/uaAtoms";
import { computeFactionMultiplier } from "../../../utils/points";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionName, factionDescription } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import type { CharacterOut } from "../../../api/auth";
import { JoinControl, type JoinControlSkin } from "../../../components/JoinControl";
import { SectionPanel, SectionToggle, useFactionSections } from "../sectionDisclosure";
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
  background: "var(--leaf-faction-body-paper)",
  color: "var(--leaf-faction-body-ink)",
  border: "1px solid var(--faction-ua-rule)",
  borderRadius: "var(--radius-md)",
};

const SOLID_ACTION: CSSProperties = {
  fontFamily: UA_TEXT,
  fontSize: "var(--text-xl)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--leaf-faction-body-on-fill)",
  background: "var(--leaf-faction-body-fill)",
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

/**
 * A section title. It used to open on an eyebrow kicker (`ua.tasks.kicker` /
 * `ua.praxis.kicker`); #1909 cut the slot, because the audit ruled the line
 * restated its own heading and only the seven bespoke bodies ever had one.
 */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginBottom: "var(--space-xl)" }}>
      <h2
        style={{
          fontFamily: UA_DISPLAY,
          fontWeight: 600,
          fontSize: "var(--text-heading)",
          lineHeight: 1.05,
          letterSpacing: "-0.01em",
          color: "var(--leaf-faction-body-ink)",
          margin: "var(--space-xs) 0 0",
        }}
      >
        {children}
      </h2>
    </div>
  );
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";
// `anno` formatted the roster and spotlight levels as "Anno {roman}". #1863
// retired *anno* as a name for a character's level and #1911 settled both rows
// onto the shared "Level {{level}}", which takes the integer.

/** A portrait filling a medallion's field, cropped square-to-circle. */
const PORTRAIT: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  objectFit: "cover",
};

/**
 * Circular initials medallion — panel face, display glyph.
 *
 * THE MONOGRAM IS THE FALLBACK, NOT THE DEFAULT (#2226). The rule (or the
 * spotlight's heavier accent ring) is this span's own border, so the portrait
 * sits inside it untouched.
 */
function Medallion({
  name,
  size,
  spotlight = false,
  avatarUrl,
}: {
  name: string;
  size: number;
  spotlight?: boolean;
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
        background: "var(--faction-ua-panel)",
        border: `${spotlight ? 2 : 1}px solid ${
          spotlight ? "var(--leaf-faction-body-fill)" : "var(--faction-ua-rule)"
        }`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: UA_DISPLAY,
        fontWeight: 600,
        fontSize: size * 0.42,
        color: "var(--leaf-faction-body-ink)",
      }}
    >
      {avatarUrl ? <img alt="" aria-hidden="true" src={mediaUrl(avatarUrl)} style={PORTRAIT} /> : initial(name)}
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
    onSignup,
    membership,
  } = state;
  const sections = useFactionSections();
  const burned = membership.state === "burned";

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

  /**
   * The trio's paint (#2651). Every value below was already on these three
   * buttons — the solid fill for both affirmatives, the eyebrow for the cancel
   * — and `flex`, the busy opacity and the busy cursor came off them, because
   * the shared control owns the pending state now. Built here rather than at
   * module scope because it reads `prose`, which is.
   */
  const joinSkin: JoinControlSkin = {
    openStyle: { ...SOLID_ACTION, width: "100%", cursor: "pointer" },
    confirmStyle: SOLID_ACTION,
    cancelStyle: {
      ...UA_EYEBROW,
      background: "transparent",
      border: "1px solid var(--faction-ua-rule)",
      borderRadius: "var(--radius-sm)",
      padding: "var(--space-md) var(--space-lg)",
    },
    proseStyle: {
      ...prose,
      color: "var(--leaf-faction-body-ink)",
      marginBottom: "var(--space-lg)",
    },
    errorStyle: { ...prose, color: "var(--color-danger)", marginBottom: "var(--space-sm)" },
  };

  return (
    <div
      className="wz-faction-grid"
      /* The nine roles under this surface's prefix (#2659/#2673). The two
         module-scope style objects and the join skin built above all mount
         inside this grid, so the cascade reaches every read in the file. */
      style={factionRoleVars("ua", "leaf-faction-body")}
    >
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
          <RuledLabel>{t("detail.aboutHeading")}</RuledLabel>
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
                style={{ ...prose, color: "var(--leaf-faction-body-quiet)" }}
              >
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
              <p
                className="content-text"
                style={{ ...prose, color: "var(--leaf-faction-body-quiet)" }}
              >
                {t("detail.default.tasksEmpty")}
              </p>
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
              <p
                className="content-text"
                style={{ ...prose, color: "var(--leaf-faction-body-quiet)" }}
              >
                {t("detail.default.recentEmpty")}
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
                    style={{ position: "relative", flex: "1 1 var(--praxis-card-basis, 394px)", minWidth: 280 }}
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
          </SectionPanel>
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
          /* #2621: the panel opens at 16px, which is Coven's number and the one
             rhythm every join panel now shares. Its own value, not a shared
             one — the kits agree on it here and any of them may stop agreeing.
             The sides keep `--space-xl`, so this matches the Members sheet
             below it exactly. */
          <div style={{ ...SHEET, padding: "var(--space-lg) var(--space-xl)" }}>
            <RuledLabel>{t("ua.join.heading")}</RuledLabel>

            {membership.state === "member" && (
              <div>
                <div
                  className="content-title"
                  style={{
                    fontFamily: UA_DISPLAY,
                    fontWeight: 600,
                    lineHeight: 1.05,
                    color: "var(--leaf-faction-body-ink)",
                  }}
                >
                  {t("ua.join.memberTitle")}
                </div>
                <div
                  style={{
                    ...prose,
                    fontSize: "var(--text-content)",
                    marginTop: "var(--space-md)",
                  }}
                >
                  {/* The element must be the FIRST child after the text, or
                      the catalog's `<1>` indexes the whitespace node instead
                      and i18next drops the span: UA was the only one of seven
                      bodies that split the separator out as `{" "}`, and it
                      rendered a bare "Standing ·" with no standing. */}
                  <Trans t={t} i18nKey="ua.join.memberStanding">
                    Standing · <span style={{ color: "var(--leaf-faction-body-accent)" }}>practising</span>
                  </Trans>
                </div>
              </div>
            )}

            {membership.state === "eligible" && (
              <JoinControl
                membership={membership}
                name={factionName(faction.slug)}
                skin={joinSkin}
                openLabel={t("ua.join.joinButton")}
                joiningLabel={t("ua.join.joining")}
                intro={
                  <>
                    <div
                      className="content-title"
                      style={{
                        fontFamily: UA_DISPLAY,
                        fontWeight: 600,
                        lineHeight: 1.05,
                        color: "var(--leaf-faction-body-ink)",
                        margin: "var(--space-xs) 0 var(--space-md)",
                      }}
                    >
                      {t("ua.join.eligibleTitle")}
                    </div>
                    <p
                      className="content-text"
                      style={{ ...prose, marginBottom: "var(--space-lg)" }}
                    >
                      {t("ua.join.eligibleBody")}
                    </p>
                  </>
                }
              />
            )}

            {/* The burn (#1305) reuses the gate's chassis — only the words
                change, and they are the neutral platform wording every other
                body uses (ADR-0057: the dress is ours, the words are not).
                UA could reach NEITHER state until #2660: the hook answered
                "none" for every non-member here, so a burned viewer would have
                got this panel as a bare "Those practising" rule over nothing.
                The kicker borrows UA's own eyebrow rather than minting a
                style. */}
            {(membership.state === "gate" || burned) && (
              <div>
                {burned && (
                  <div
                    style={{ ...UA_EYEBROW, marginBottom: "var(--space-xs)" }}
                  >
                    {t("detail.burned.kicker")}
                  </div>
                )}
                <div
                  className="content-title"
                  style={{
                    fontFamily: UA_DISPLAY,
                    fontWeight: 600,
                    lineHeight: 1.05,
                    color: "var(--leaf-faction-body-ink)",
                    margin: "var(--space-xs) 0 var(--space-md)",
                  }}
                >
                  {burned
                    ? t("detail.burned.title", {
                        faction: factionName(faction.slug),
                      })
                    : t("ua.join.gateTitle")}
                </div>
                <p className="content-text" style={prose}>
                  {burned
                    ? t("detail.burned.body", {
                        faction: factionName(faction.slug),
                      })
                    : t("mobile.gateHint", {
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
                    "linear-gradient(160deg, var(--faction-ua-lift), var(--leaf-faction-body-paper) 60%)",
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
                  <Medallion name={spot.display_name} size={72} spotlight avatarUrl={spot.avatar_url} />
                </div>
                <div
                  className="content-title"
                  style={{
                    fontFamily: UA_DISPLAY,
                    fontWeight: 600,
                    lineHeight: 1.05,
                    color: "var(--leaf-faction-body-ink)",
                  }}
                >
                  {spot.display_name}
                </div>
                <div style={{ ...UA_EYEBROW, marginTop: "var(--space-sm)" }}>
                  {t("detail.spotlightStat", {
                    level: spot.level,
                    score: spot.all_time_score.toLocaleString(),
                    count: spot.all_time_score,
                  })}
                </div>
              </div>
            </Link>
          )}

          <div
            style={{ ...SHEET, padding: "var(--space-lg) var(--space-xl)" }}
          >
            <RuledLabel>{t("detail.default.membersHeading", { total: members.length })}</RuledLabel>
            {register.length === 0 ? (
              <p
                className="content-text"
                style={{ ...prose, color: "var(--leaf-faction-body-quiet)" }}
              >
                {spot
                  ? t("detail.membersEmptyWithSpotlight")
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
                  <Medallion name={m.display_name} size={32} avatarUrl={m.avatar_url} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="content-text"
                      style={{
                        fontFamily: UA_DISPLAY,
                        fontWeight: 600,
                        color: "var(--leaf-faction-body-ink)",
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
