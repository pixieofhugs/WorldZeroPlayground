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
  PraxisDuelBanner,
  PraxisRoster,
  PraxisMediaGallery,
  PraxisVoteFooter,
  type AdminProps,
  type PraxisCardFonts,
} from "../shared";
import ScoreStamp from "../scoreStamp/ScoreStamp";
import MetataskSeal from "../../metataskSeal/MetataskSeal";

/**
 * Bespoke praxis-card shared pieces (#839): each faction module under `./` owns
 * its FRAME; {@link PraxisBody} composes the shared content slots. `desktop/` is
 * a historical name: these serve both form factors (ADR-0067).
 */

/** Re-exported by the `PraxisCard.tsx` dispatcher for the faction manifests. */
export type ArchetypeProps = {
  praxis: PraxisCardOut;
  adminProps: AdminProps;
  showCrown?: boolean;
};

/**
 * Outer-frame geometry every archetype spreads before its own frame styling.
 *
 * Width is a flex BASIS, not a max-width (surfaces lay cards in wrapping rows).
 * One 394px basis for all nine (the prototype's 380-398 spread is absorbed by
 * flex). A container may narrow it via `--praxis-card-basis` (#1137;
 * `.praxis-gallery` is the only setter); `minWidth: 280` clamps it, so the
 * useful range is [280, 394].
 *
 * The basis is a MAIN-AXIS size (#2149): stack cards with `display: grid`, never
 * a flex column, or it becomes a height cap. `columnMountGuard.test.ts` holds it.
 */
export const frameBase: CSSProperties = {
  width: "100%",
  flex: "1 1 var(--praxis-card-basis, 394px)",
  minWidth: 280,
  boxSizing: "border-box",
  // NO borderRadius on purpose: the prototype's frame radius is per-faction
  // (Snide 0 · Everymen 2 · UA/Singularity/Ephemerists/chronicle 8 ·
  // Default/Albescent 10 · Coven's sticker 16). Each archetype sets its own;
  // `--faction-{key}-card-radius` is this list in tokens (#2361, #2403), and
  // `factionCardFrame.test.ts` parses this comment.
};

/**
 * The heading text column's flex BASIS (#2114). A 0% basis never creates the
 * deficit that makes the stamp's `flex-shrink` apply, so the stamp held 150px and
 * crushed the text. With this, both shrink together until the stamp hits its own
 * min-content. ~14 characters at `--text-content`, under the 184px the 394px
 * default already gives, so a roomy card is unchanged.
 */
export const TEXT_MEASURE = 160;

/**
 * Shared content body: title + task link left, score stamp right, then stats,
 * mode, media and byline. The hero shows earned points (ADR-0014), not a rating
 * or voter count (#375).
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
  bylineDivider,
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
  /** Running head inside the left column, stopping at the stamp (#841). */
  eyebrow?: ReactNode;
  /** A per-faction mark drawn above the vote widget (#842). */
  voteRule?: ReactNode;
  /**
   * Replaces the byline's dashed rule (#2312); pass nothing to keep it. Do not
   * name the Ephemerists strip component here: its test finds mounts by
   * searching source text.
   */
  bylineDivider?: ReactNode;
  /** Un-linked run-in before the task title (#840). */
  taskLead?: string;
  /** The empty media slot's label, in the faction's voice (#840). */
  mediaEmptyLabel?: string;
  mediaEmptyStyle?: CSSProperties;
  /** A closing line under the media slot (#840); not metadata. */
  footnote?: ReactNode;
  /**
   * Display (identity) and body (reading) faces (#888). Each archetype passes
   * its own pair; slots do not resolve `--faction-{slug}-card-font` themselves.
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
          /* The host states the gap under the stamp (#2655, law 09):
             `MetataskSeal` travels with margin 0. A margin, not padding, so it
             collapses with `PraxisStats`'s `margin-top` on an unsealed card. */
          marginBottom: "var(--space-sm)",
        }}
      >
        {/* `overflowWrap` completes `minWidth: 0` (#2556): an unbroken title
            otherwise paints under the stamp. Inherited, so it covers title, task
            line and excerpt. `anywhere` also shrinks min-content. A wordmark
            eyebrow must opt out with `overflow-wrap: normal` (#2000). */}
        <div style={{ flex: `1 1 ${TEXT_MEASURE}px`, minWidth: 0, overflowWrap: "anywhere" }}>
          {eyebrow}
          <PraxisTitle praxis={praxis} style={titleStyle} fonts={fonts} />
          {/* Task line inherits the sheet's card text ink; excerpt keeps `muted`,
              so task and preview read apart (#2114). */}
          <PraxisTaskLink
            praxis={praxis}
            style={{ color: "inherit" }}
            lead={taskLead}
            fonts={fonts}
          />
          <PraxisExcerpt praxis={praxis} style={{ color: muted }} fonts={fonts} />
        </div>
        {/* Dispatched per-faction stamp (ADR-0047, ADR-0049, ADR-0053). */}
        <ScoreStamp praxis={praxis} showCrown={showCrown} />
      </div>
      {/* Applied-metatask seals (#932), dispatched on each ISSUING faction. */}
      <MetataskSeal metatasks={praxis.applied_metatasks ?? []} />
      <PraxisStats
        praxis={praxis}
        style={{ color: muted, marginTop: "var(--space-sm)" }}
        fonts={fonts}
      />
      <PraxisModeChip praxis={praxis} fonts={fonts} />
      {/* Duel banner and collab roster are mutually exclusive by data (#596). */}
      <PraxisDuelBanner praxis={praxis} accent={tint} fonts={fonts} />
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
      <PraxisByline praxis={praxis} style={{ color: muted }} fonts={fonts} divider={bylineDivider} />
      <PraxisVotedByMarker praxis={praxis} style={{ color: muted }} />
      {voteRule}
      <PraxisVoteFooter praxis={praxis} />
    </>
  );
}
