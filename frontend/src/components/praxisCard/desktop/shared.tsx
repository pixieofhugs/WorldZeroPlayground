import type { CSSProperties, ReactNode } from "react";
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
  type PraxisCardFonts,
} from "../shared";
import ScoreStamp from "../scoreStamp/ScoreStamp";

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
 * Outer-frame geometry shared by every faction archetype's root element. Each
 * archetype spreads this then layers its own bespoke frame styling on top.
 * Mirrors Sidebar.tsx's `panelStyle` pattern — one place to change the sizing.
 *
 * The width is carried as a flex BASIS rather than a max-width: every surface
 * that renders praxis cards lays them out in a wrapping flex row, so this is the
 * target each card grows from, and a hard cap would only maroon a card in a wide
 * single column.
 *
 * DEVIATION: the prototype's frames run 380-398px (Singularity 380, UA 394, the
 * rest 398). Collapsed to a single 394px basis — under flex the difference is
 * absorbed by the row anyway, and nine bespoke bases would be nine things to
 * keep in sync for a <5% delta. The RADIUS is not collapsed; see below.
 */
export const frameBase: CSSProperties = {
  width: "100%",
  flex: "1 1 394px",
  minWidth: 280,
  boxSizing: "border-box",
  // NO borderRadius here on purpose. The prototype's frame radius is per-faction
  // (Snide 0 · Everymen 2 · UA 7 · Singularity/Ephemerists 8 · chronicle 9 ·
  // Default/Albescent 10 · Coven's sticker 16). A shared value flattens the very
  // thing that distinguishes an evidence slab from a sticker. Each archetype sets
  // its own.
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
  eyebrow,
  voteRule,
  taskLead,
  mediaEmptyLabel,
  mediaEmptyStyle,
  footnote,
  fonts,
}: {
  praxis: PraxisCardOut;
  tint: string;
  muted: string;
  /** The frame's paper colour — inner disc of the Task Crown (ADR-0028). */
  paper?: string;
  titleStyle?: CSSProperties;
  showCrown?: boolean;
  /**
   * An optional running head, rendered INSIDE the left column above the title
   * (#841). Some archetypes carry their eyebrow as a full-width bar across the
   * frame (Everymen's masthead); others — the Ephemerists' codex folio line —
   * draw it as the first line of the entry itself, where it must sit in the
   * text column and stop at the score stamp rather than run under it.
   */
  eyebrow?: ReactNode;
  /**
   * An optional rule drawn immediately above the vote widget (#842). Several
   * archetypes close the record with a divider before the "how did this land?"
   * prompt — S.N.I.D.E.'s dashed acid perforation, the unaffiliated sheet's one
   * 2px rainbow. It is a per-faction MARK (dashed vs. solid, tooth spacing,
   * pigment, opacity), so it arrives as a node rather than a boolean; an
   * archetype that draws no rule simply passes nothing.
   */
  voteRule?: ReactNode;
  /**
   * An un-linked run-in before the task title (#840) — WOW's chronicle writes
   * this line as "for the quest — {task}" rather than a bare reference.
   */
  taskLead?: string;
  /** The empty media slot's invitation + frame, in the faction's voice (#840). */
  mediaEmptyLabel?: string;
  mediaEmptyStyle?: CSSProperties;
  /**
   * An optional line under the media slot and above the byline rule (#840) —
   * WOW's "Sealed by the Court · {date}". A closing formula, not metadata:
   * `PraxisStats` already carries the level/crew/date facts.
   */
  footnote?: ReactNode;
  /**
   * The archetype's two typefaces (#888) — display for identity (title, author
   * name, mode chip), body for reading (task line, excerpt, meta line). Before
   * this, `../shared` declared no `fontFamily` at all, so every faction's card
   * body was Courier Prime however loudly its frame declared otherwise.
   *
   * Each archetype passes its OWN pair. The slots deliberately do not resolve
   * `--faction-{slug}-card-font` themselves: that would be a second dispatch
   * mechanism, and it collapses the display/body split that keeps a Permanent
   * Marker faction's excerpt readable.
   */
  fonts?: PraxisCardFonts;
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
          {eyebrow}
          <PraxisTitle praxis={praxis} style={titleStyle} fonts={fonts} />
          <PraxisTaskLink
            praxis={praxis}
            style={{ color: muted }}
            lead={taskLead}
            fonts={fonts}
          />
          <PraxisExcerpt praxis={praxis} style={{ color: muted }} fonts={fonts} />
        </div>
        {/*
         * The conditional score stamp (ADR-0047) on EVERY faction (#821), now a
         * dispatched faction SURFACE (ADR-0049) rather than one presentation
         * tinted by four colour props — a faction's total mark is its own
         * signature device, not a recolour. It replaced the legacy score hero,
         * now deleted (ADR-0053); the praxis-detail surfaces keep their own
         * inline presentation but share this module's arithmetic.
         */}
        <ScoreStamp praxis={praxis} showCrown={showCrown} />
      </div>
      <PraxisStats
        praxis={praxis}
        style={{ color: muted, marginTop: "var(--space-sm)" }}
        fonts={fonts}
      />
      <PraxisModeChip praxis={praxis} fonts={fonts} />
      <PraxisRoster praxis={praxis} accent={tint} paper={paper} />
      {/* Every card shows the media slot — a drop target when empty (#821). */}
      <PraxisMediaGallery
        praxis={praxis}
        accent={tint}
        paper={paper}
        showPlaceholder
        emptyLabel={mediaEmptyLabel}
        emptyStyle={mediaEmptyStyle}
        fonts={fonts}
      />
      {footnote}
      <PraxisByline praxis={praxis} style={{ color: muted }} fonts={fonts} />
      <PraxisVotedByMarker praxis={praxis} style={{ color: muted }} />
      {voteRule}
      <PraxisVoteFooter praxis={praxis} />
    </>
  );
}
