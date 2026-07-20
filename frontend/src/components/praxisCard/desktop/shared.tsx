import type { CSSProperties } from "react";
import type { PraxisCardOut } from "../../../api/praxis";
import {
  PraxisTitle,
  PraxisTaskLink,
  PraxisByline,
  PraxisVotedByMarker,
  PraxisStats,
  PraxisExcerpt,
  PraxisModeChip,
  PraxisRoster,
  PraxisMediaGallery,
  PraxisVoteFooter,
  type AdminProps,
} from "../shared";
import { PraxisScoreStamp } from "../PraxisScoreStamp";

/**
 * Bespoke DESKTOP praxis-card shared pieces (#839).
 *
 * Mirrors the `praxisCard/mobile/` split: each faction's desktop card owns a
 * bespoke FRAME (chrome, fonts, tokens) in its own module under `./`, and the
 * CONTENT is the structural slots from `../shared`, composed here by
 * {@link PraxisBody}. Splitting the nine archetypes out of the old 700-line
 * `components/PraxisCard.tsx` gives each faction slice a disjoint footprint.
 */

/**
 * The props every desktop archetype takes. `components/PraxisCard.tsx` (the
 * dispatcher) re-exports this so the faction manifests keep their import site.
 */
export type ArchetypeProps = {
  praxis: PraxisCardOut;
  adminProps: AdminProps;
  showCrown?: boolean;
};

/**
 * Outer-frame sizing shared by every faction archetype's root element. Each
 * archetype spreads this then layers its own bespoke frame styling on top.
 * Mirrors Sidebar.tsx's `panelStyle` pattern — one place to change the sizing.
 */
export const frameBase: CSSProperties = {
  width: "100%",
  flex: "1 1 280px",
  minWidth: 280,
  boxSizing: "border-box",
};

/**
 * Shared content body for every faction's praxis card: title + task link on the
 * left, the score hero (`{base} + {votes}` points) on the right, then a
 * points/mode line and the byline. Each faction's own frame wraps this; tint /
 * muted carry the faction voice via the frame's accent tokens. The hero shows
 * earned points (task base + points-from-votes, ADR-0014) — not a rating, not an
 * average, not a voter count (#375, Molly's call).
 */
export function PraxisBody({
  praxis,
  tint,
  muted,
  paper,
  titleStyle,
  showCrown,
}: {
  praxis: PraxisCardOut;
  tint: string;
  muted: string;
  /** The frame's paper colour — inner disc of the Task Crown (ADR-0028). */
  paper?: string;
  titleStyle?: CSSProperties;
  showCrown?: boolean;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "var(--space-md)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <PraxisTitle praxis={praxis} style={titleStyle} />
          <PraxisTaskLink praxis={praxis} style={{ color: muted }} />
          <PraxisExcerpt praxis={praxis} style={{ color: muted }} />
        </div>
        {/*
         * The conditional score stamp (ADR-0047) on EVERY faction (#821). It
         * replaced the legacy `PraxisScoreHero` here — the hero survives only on
         * the praxis-detail surfaces that have not yet migrated.
         */}
        <PraxisScoreStamp
          praxis={praxis}
          theme={{ color: tint, border: tint, muted, paper }}
          showCrown={showCrown}
        />
      </div>
      <PraxisStats praxis={praxis} style={{ color: muted, marginTop: "var(--space-sm)" }} />
      <PraxisModeChip praxis={praxis} />
      <PraxisRoster praxis={praxis} accent={tint} paper={paper} />
      {/* Every card shows the media slot — a drop target when empty (#821). */}
      <PraxisMediaGallery praxis={praxis} accent={tint} paper={paper} showPlaceholder />
      <PraxisByline praxis={praxis} style={{ color: muted }} />
      <PraxisVotedByMarker praxis={praxis} style={{ color: muted }} />
      <PraxisVoteFooter praxis={praxis} />
    </>
  );
}
