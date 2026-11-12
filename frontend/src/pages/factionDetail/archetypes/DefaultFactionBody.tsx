import { type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import CharacterBadge from "../../../components/CharacterBadge";
import { factionCssVar, factionName, factionDescription } from "../../../utils/factions";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { MobileStickyBar } from "../MobileStickyBar";
import { JoinControl, type JoinControlSkin } from "../../../components/JoinControl";
import {
  FACTION_SECTIONS,
  SectionPanel,
  SectionToggle,
  useSectionDisclosures,
} from "../sectionDisclosure";
import type { CharacterOut } from "../../../api/auth";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * The plate's na-spectrum hairline (#2497). `.spectrum-rule` is the shared ramp
 * (so Albescent's kit moves every one at once); `.faction-plate-rule` the geometry.
 */
const PLATE_RULE = <span aria-hidden className="spectrum-rule faction-plate-rule" />;

/**
 * One carrier per object (ADR-0083 3b, #2576): a plate with an ornament (the 3px
 * ring) drops the hairline, so it never wears two rainbows.
 */
function plateRule(ornament: ReactNode): ReactNode {
  return ornament ? null : PLATE_RULE;
}

// The cell doesn't grow, so the row centres a lone card instead of stretching it.
const PRAXIS_CELL: CSSProperties = {
  flex: "0 1 var(--praxis-card-basis, 394px)",
  minWidth: 280,
};

/** Praxis gallery only (#1945); varied card sizes are intentional, not a CSS grid. */
const CARD_GRID: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-lg)",
  alignItems: "flex-start",
};

/**
 * Default faction body: the fall-through for any faction without a bespoke one.
 * Five `.faction-plate` regions (#2497, #2504); the plate sits outside
 * `SectionPanel`, so the kicker stays visible when folded. Champion is derived
 * from `members`, no wire field. Member tiles are deliberately plain pending
 * design. The join block (#1314) is ADR-0019-gated: inline on a laptop, pinned on a phone.
 */
export default function DefaultFactionBody({
  state,
  plateOrnament,
}: {
  state: FactionDetailState;
  /**
   * Inert node mounted inside each plate that holds TEXT, so it clips to the
   * sheet (#2504, #2519). The two card plates never take it: their cards carry
   * their own 3px edge (WORLD_ZERO_STYLE §5, no frame inside a frame).
   */
  plateOrnament?: ReactNode;
}) {
  const { t } = useTranslation("factions");
  const {
    faction,
    members,
    tasks,
    recentPraxis,
    onSignup,
    membership,
  } = state;
  const phone = useFormFactor() === "mobile";
  const sections = useSectionDisclosures(FACTION_SECTIONS);

  // Guarded non-null by the dispatcher.
  if (!faction) return null;

  const accent = factionCssVar(faction.slug, "border");
  const name = factionName(faction.slug);

  // `all_time_score` survives an era reset, so the plate never blanks on day one.
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const champion: CharacterOut | undefined = ranked[0];
  const roll = ranked.slice(1);

  const paragraphs = factionDescription(faction.slug)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  // Rendered once: inline on a laptop, pinned above the tab bar on a phone (#1566).
  const joinAction = membership.state === "eligible" && (
    <JoinControl
      membership={membership}
      name={name}
      skin={joinSkin(faction.slug)}
      // Generic `detail.join.*`, not a `<slug>.join.*` family: this is the
      // fall-through, and an Albescent-voiced key would be a tell (ADR-0027, #2651).
      openLabel={t("detail.join.joinButton", { faction: name })}
      joiningLabel={t("detail.join.joining")}
    />
  );

  return (
    <>
      {/* One stacked order at every width (#3182); Members last, the roll is uncapped. */}
      <div className="wz-faction-grid">
      <section className="faction-plate">
        {plateOrnament}
        <div className="faction-plate-kicker">
          <h2 className="label-heading">{t("detail.aboutHeading")}</h2>
          {plateRule(plateOrnament)}
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
        <div className="wz-faction-band">
          <div className="wz-faction-standing">
      {/* The burn (#1305), in neutral platform wording (ADR-0057). */}
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
      {/* "gate" is "not invited yet" (#454); keep it distinct from the burn. */}
      {membership.state === "member" && (
        <section className="faction-plate">
          {plateOrnament}
          <p className="label-heading">
            {t("mobile.memberBadge")}
          </p>
        </section>
      )}
      {membership.state === "gate" && (
        <p className="font-body text-muted content-text">
          {t("mobile.gateHint", { faction: name })}
        </p>
      )}
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
          </div>
      {champion && (
        <section className="faction-plate">
          {plateOrnament}
          <div className="faction-plate-kicker">
            <h2 className="label-heading">{t("detail.spotlightLabel")}</h2>
            {plateRule(plateOrnament)}
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
        </div>
      {/* No `SectionHeading` here, so the disclosure sits inside the `<h2>` (#2311). */}
      <section className="faction-plate">
        {/* Card plate: no `plateOrnament`, always the rule. */}
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
                  multiplier={task.viewer_faction_multiplier}
                  onSignup={onSignup}
                />
              ))}
            </div>
          )}
        </SectionPanel>
      </section>
      <section className="faction-plate">
        {/* Card plate: no `plateOrnament`. */}
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
            <div className="wz-faction-praxis-row" style={CARD_GRID}>
              {recentPraxis.map((p) => (
                <div key={p.id} style={PRAXIS_CELL}>
                  <PraxisCard praxis={p} />
                </div>
              ))}
            </div>
          )}
        </SectionPanel>
      </section>
      {/* Members: not foldable (#2311). */}
      <section className="faction-plate">
        {plateOrnament}
        <div className="faction-plate-kicker">
          <h2 className="label-heading">
            {t("detail.default.membersHeading", { total: members.length })}
          </h2>
          {plateRule(plateOrnament)}
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

      {/* Last child of the tall box, so `position: sticky` can pin (#1566). */}
      {phone && joinAction && <MobileStickyBar>{joinAction}</MobileStickyBar>}
    </>
  );
}

/**
 * The primary pill in the faction's accent pair (#1819), not page neutrals:
 * `--color-text-on-accent` on `--color-text-primary` was 1.24:1 in dark (#1169).
 * Gated by ACCENT_PAIRS in `factionContrast.test.ts`.
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

/** Label register, so it reads the `--label-ink` seam (7.83/8.94), not a neutral (#1819). */
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

/**
 * The join trio's paint (#2651). Prose sets no colour so a frame repointing ink
 * on its root still reaches it (#1819).
 */
function joinSkin(slug: string): JoinControlSkin {
  return {
    openStyle: joinButtonStyle(slug),
    confirmStyle: joinButtonStyle(slug),
    cancelStyle: CANCEL_BUTTON_STYLE,
    proseStyle: { fontFamily: "var(--font-body)" },
    errorStyle: { fontFamily: "var(--font-body)", color: "var(--color-danger)" },
  };
}
