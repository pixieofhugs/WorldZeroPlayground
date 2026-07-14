import { type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import TaskCard from "../../../components/TaskCard";
import PraxisCard from "../../../components/PraxisCard";
import CharacterBadge from "../../../components/CharacterBadge";
import { factionCssVar } from "../../../utils/factions";
import { computeDisplayPoints } from "../../../utils/points";
import type { FactionDetailState } from "../useFactionDetail";

/** Shared flex-wrap card grid — varied card sizes are intentional, not a CSS grid. */
const CARD_GRID: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "1rem",
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
  const { faction, members, tasks, recentPraxis, viewerFactionSlug, gameFactions } =
    state;

  // Guarded non-null by the dispatcher.
  if (!faction) return null;

  const accent = factionCssVar(faction.slug, "border");

  return (
    <>
      {/* ── Members ── PLACEHOLDER: design to restyle ── */}
      <section className="mb-8">
        <h2 className="eyebrow mb-3">
          {t("detail.default.membersHeading", { total: members.length })}
        </h2>
        {members.length === 0 ? (
          <p className="font-body text-muted text-sm">{t("detail.membersEmpty")}</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {members.map((m) => (
              <div
                key={m.id}
                style={{
                  border: `1px solid ${accent}`,
                  padding: "6px 10px",
                  background: "var(--color-bg-card)",
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
          <p className="font-body text-muted text-sm">{t("detail.default.tasksEmpty")}</p>
        ) : (
          <div style={CARD_GRID}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                displayPoints={computeDisplayPoints(
                  task.point_value,
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
          <p className="font-body text-muted text-sm">
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
