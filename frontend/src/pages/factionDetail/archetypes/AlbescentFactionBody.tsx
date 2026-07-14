import { type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import TaskCard from "../../../components/TaskCard";
import PraxisCard from "../../../components/PraxisCard";
import CharacterBadge from "../../../components/CharacterBadge";
import { computeDisplayPoints } from "../../../utils/points";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * Albescent faction-body — "The Record" skin of the standardized body spine
 * (Members / Tasks / Recently completed), #232. Section ① (hero) is
 * AlbescentFactionHero above; this owns the archival chrome: white sheets ruled
 * with hairlines, quiet mono kickers, and Cormorant-italic headings. Tasks and
 * Praxis reuse the app-wide cards (already dispatching to the Albescent
 * archetypes from slice 1); this file only supplies the section chrome and the
 * keeper tiles.
 *
 * Same shape as the other bodies. Always light — every --faction-albescent-*
 * token is identical in both themes; all colors via tokens (no hardcoded hex,
 * CLAUDE.md). Design: docs/design/albescent-kit `AlHero` / faction page.
 */

const INK = "var(--faction-albescent-card-text)";
const MUTED = "var(--faction-albescent-card-muted)";
const FAINT = "var(--faction-albescent-text-faint)";
const BORDER = "var(--faction-albescent-border)";
const BORDER_FAINT = "var(--faction-albescent-border-faint)";
const SURFACE = "var(--faction-albescent-surface)";
const FONT = "var(--faction-albescent-card-font)"; // Cormorant Garamond
const MONO = "var(--faction-albescent-mono)"; // Courier Prime

const CARD_GRID: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "1rem",
  alignItems: "flex-start",
};

/** White archival sheet with an inset architectural hairline. */
function Sheet({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, marginBottom: 20 }}>
      <div style={{ margin: 6, border: `1px solid ${BORDER_FAINT}`, padding: "20px 22px" }}>
        {children}
      </div>
    </div>
  );
}

function SectionHeading({ kicker, title, count }: { kicker: string; title: string; count?: number }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 7,
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          color: FAINT,
          marginBottom: 7,
        }}
      >
        {kicker}
        {count !== undefined ? ` · ${count}` : ""}
      </div>
      <h2 style={{ fontFamily: FONT, fontStyle: "italic", fontWeight: 300, fontSize: 26, lineHeight: 1, color: INK, margin: 0 }}>
        {title}
      </h2>
      <div style={{ height: 1, width: 56, background: BORDER, marginTop: 12 }} />
    </div>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 15, color: MUTED, margin: 0 }}>
      {children}
    </p>
  );
}

export default function AlbescentFactionBody({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation("factions");
  const { faction, members, tasks, recentPraxis, viewerFactionSlug, gameFactions } = state;

  // Guarded non-null by the dispatcher.
  if (!faction) return null;

  return (
    <>
      {/* ── Keepers (members) ── */}
      <Sheet>
        <SectionHeading
          kicker={t("albescent.keepers.kicker")}
          title={t("albescent.keepers.title")}
          count={members.length}
        />
        {members.length === 0 ? (
          <Quiet>{t("albescent.keepers.empty")}</Quiet>
        ) : (
          <div className="flex flex-wrap gap-3">
            {members.map((m) => (
              <div key={m.id} style={{ border: `1px solid ${BORDER_FAINT}`, padding: "6px 10px", background: SURFACE }}>
                <CharacterBadge character={m} size="sm" />
              </div>
            ))}
          </div>
        )}
      </Sheet>

      {/* ── Tasks (the ledger) ── reuses the Albescent TaskCard archetype ── */}
      <Sheet>
        <SectionHeading
          kicker={t("albescent.ledger.kicker")}
          title={t("albescent.ledger.title")}
          count={tasks.length}
        />
        {tasks.length === 0 ? (
          <Quiet>{t("albescent.ledger.empty")}</Quiet>
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
      </Sheet>

      {/* ── Recently completed (returned) ── reuses the Albescent PraxisCard ── */}
      <Sheet>
        <SectionHeading
          kicker={t("albescent.returned.kicker")}
          title={t("albescent.returned.title")}
        />
        {recentPraxis.length === 0 ? (
          <Quiet>{t("albescent.returned.empty")}</Quiet>
        ) : (
          <div style={CARD_GRID}>
            {recentPraxis.map((p) => (
              <PraxisCard key={p.id} praxis={p} />
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}
