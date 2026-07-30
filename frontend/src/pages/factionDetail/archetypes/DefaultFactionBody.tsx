import { type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/PraxisCard";
import CharacterBadge from "../../../components/CharacterBadge";
import { factionCssVar, factionName } from "../../../utils/factions";
import { computeFactionMultiplier } from "../../../utils/points";
import type { FactionDetailState } from "../useFactionDetail";

/** Shared flex-wrap card grid — varied card sizes are intentional, not a CSS grid. */
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
 * NOTE: the styling here is intentionally PLACEHOLDER — real per-faction visual
 * design is deferred to Claude design. Data wiring + structure are final; the
 * section chrome (member tiles, layout) is meant to be restyled by a faction's
 * own body archetype.
 */
export default function DefaultFactionBody({
  state,
}: {
  state: FactionDetailState;
}) {
  const { t } = useTranslation("factions");
  const { faction, members, tasks, recentPraxis, viewerFactionSlug, gameFactions, membership } =
    state;

  // Guarded non-null by the dispatcher.
  if (!faction) return null;

  const accent = factionCssVar(faction.slug, "border");

  return (
    <>
      {/* ── The burn (#1305) ── this viewer left this faction this era, so
          joining is refused for the rest of it. ponytail: this archetype has
          no join block at all — the factions that fall through to it (WOW,
          Albescent) are waiting on the join/gate design in #951 — so only the
          state a viewer can be MISLED about is surfaced here. When #951 lands
          the full standing / join / gate panel, fold this notice into it
          rather than leaving two. ── */}
      {membership.state === "burned" && (
        <div
          className="sidebar-card mb-6"
          style={{ padding: "var(--space-md) var(--space-lg)" }}
        >
          <p className="eyebrow mb-1">{t("detail.burned.kicker")}</p>
          <p className="font-body content-text text-ink">
            {t("detail.burned.body", { faction: factionName(faction.slug) })}
          </p>
        </div>
      )}

      {/* ── Members ── PLACEHOLDER: design to restyle ── */}
      <section className="mb-8">
        <h2 className="eyebrow mb-3">
          {t("detail.default.membersHeading", { total: members.length })}
        </h2>
        {members.length === 0 ? (
          <p className="font-body text-muted content-text">{t("detail.membersEmpty")}</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {members.map((m) => (
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

      {/* ── Tasks ── reuses the per-faction TaskCard archetype ── */}
      <section className="mb-8">
        <h2 className="eyebrow mb-3">
          {t("detail.default.tasksHeading", { total: tasks.length })}
        </h2>
        {tasks.length === 0 ? (
          <p className="font-body text-muted content-text">{t("detail.default.tasksEmpty")}</p>
        ) : (
          <div style={CARD_GRID}>
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
      </section>

      {/* ── Recently completed ── PLACEHOLDER: design to restyle ── */}
      <section className="mb-8">
        <h2 className="eyebrow mb-3">{t("detail.default.recentHeading")}</h2>
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
      </section>
    </>
  );
}
