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
 * Bespoke praxis-card shared pieces (#839).
 *
 * Bespoke-frame + shared-slots: each faction's card owns a FRAME (chrome, fonts,
 * tokens) in its own module under `./`, and the CONTENT is the structural slots
 * from `../shared`, composed here by {@link PraxisBody}. Splitting the nine
 * archetypes out of the old 700-line `components/praxisCard/PraxisCard.tsx` gives each
 * faction slice a disjoint footprint.
 *
 * The directory is still called `desktop/`, but these archetypes serve BOTH form
 * factors: ADR-0067 collapsed the praxis card to one responsive component per
 * faction and deleted the `praxisCard/mobile/` tree this file used to mirror.
 * The name is kept because renaming nine imported modules would be a larger diff
 * than the fact it records.
 */

/**
 * The props every desktop archetype takes. `components/praxisCard/PraxisCard.tsx` (the
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
 *
 * 394px is the FEED's basis, and a mount may narrow it through
 * `--praxis-card-basis` (#1137). One card serves every surface since ADR-0067,
 * so a task detail was showing the `/praxes` card at the `/praxes` width — two
 * to a row inside the 1200 column, reading as a transplanted feed. A custom
 * property is what lets the CONTAINER answer that without a `compact` prop
 * forking nine bespoke frames: it inherits, so it reaches an inline style that
 * a class selector could not override, and a surface that sets nothing is
 * byte-identical. `.praxis-gallery` in index.css is the only setter today.
 *
 * `minWidth` deliberately stays out of it. It is the floor that keeps one card
 * per row on a phone, and it is also the clamp that would silently swallow any
 * basis below 280 — so the variable is only ever useful in [280, 394].
 *
 * THE BASIS IS A MAIN-AXIS SIZE, so it is only a WIDTH while the container is a
 * ROW (#2149). Stack these cards with `display: grid`, never a flex COLUMN: on
 * a column main axis the same 394px becomes a height cap and clips the card.
 * The width cannot move to `width` to make that safe — `width: 100%` is what
 * fills the wrapper the faction and profile bodies nest the card in, and the
 * feed rows need the grow — so the axis stays the container's business, and
 * `praxisCard/__tests__/columnMountGuard.test.ts` holds every mount to it.
 */
export const frameBase: CSSProperties = {
  width: "100%",
  flex: "1 1 var(--praxis-card-basis, 394px)",
  minWidth: 280,
  boxSizing: "border-box",
  // NO borderRadius here on purpose. The prototype's frame radius is per-faction
  // (Snide 0 · Everymen 2 · UA/Singularity/Ephemerists/chronicle 8 ·
  // Default/Albescent 10 · Coven's sticker 16). A shared value flattens the very
  // thing that distinguishes an evidence slab from a sticker. Each archetype sets
  // its own — UA and the chronicle by reading `--faction-{key}-card-radius`,
  // which is this list said in tokens (#2361), collapsed to one middle rung by
  // the owner's ruling on #2403.
};

/**
 * What the heading's text column ASKS FOR before the score stamp starts giving
 * ground (#2114).
 *
 * It is a flex BASIS, not a width: the column still grows into every spare
 * pixel above this and still shrinks below it once the stamp has yielded all
 * the slack it has, so nothing about a roomy card moves. What it buys is the
 * one thing `flex: 1` (basis 0%) could not — a DEFICIT. With a basis of zero
 * the row's hypothetical sizes always fitted, so there was never negative free
 * space to distribute, the stamp's `flex-shrink` was never consulted, and it
 * held its full 150px cap into a 280px card while the text column absorbed the
 * whole loss: 184px of text at the 394px `frameBase` default, 110px in a 320px
 * cell, 70px at the phone floor. Three words of preview, which is what #2114
 * reported.
 *
 * So dropping `flex-shrink: 0` from the eight stamps is HALF the fix and does
 * nothing on its own; this is the other half. Below roughly a 370px card the
 * two now shrink together until the stamp reaches its own `min-width: auto` —
 * its drawn min-content size, which is per-skin and correct by construction
 * (the na plate's padding around a 96px mark yields ~28px; Coven's arched
 * plate is 150px of ornament and yields nothing). No skin is ever squeezed
 * below what it draws, and no number here has to know any of their geometries.
 *
 * 160px is a measure, not a magic constant: at the `--text-content` floor (18px,
 * §4a) it is about fourteen characters, and it is deliberately well under the
 * 184px the default basis already gives so a card at 394px renders unchanged.
 */
export const TEXT_MEASURE = 160;

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
   * The faction's own mark in place of the byline's dashed rule (#2312).
   *
   * Same shape and the same reason as `voteRule` above — a divider is a
   * per-faction MARK, so it arrives as a node — but a different slot: this one
   * REPLACES a rule eight archetypes are right to keep, where `voteRule` adds
   * one none of them draw by default. Pass nothing and the dashed rule stands.
   *
   * The Ephemerists plate is the only caller — it rules its byline with the
   * faction's rune strip — and the mount owns its own bleed: the strip fills
   * its container's padding box, so a caller whose leaf is padded hands it a
   * wrapper carrying the negative margin, exactly as the retired `DRIFT` row
   * did. (The component is deliberately NOT named here: the strip's own test
   * detects its mounts by searching source text, and a prose mention in a file
   * that mounts nothing would read as a fourth surface.)
   */
  bylineDivider?: ReactNode;
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
        {/*
         * `overflowWrap` is the other half of `minWidth: 0` (#2556). The zero
         * floor is what lets this column shrink past its content so the stamp
         * is never pushed off the card — but shrinking a box does not tell the
         * text inside it where it may break, and a title with no space in it
         * (the keysmash the bug was reported on) has a min-content width of
         * the whole word. It kept that width, painted out of the column, and
         * ran UNDER the stamp beside it.
         *
         * It sits here rather than on the title because `overflow-wrap` is
         * INHERITED: one declaration covers all three user-authored strings in
         * this column — title, task line, excerpt — where patching
         * `PraxisTitle` would leave a long task title doing the same thing one
         * line down. Nine archetypes compose this head (Albescent through
         * `DefaultPraxisCard`), so this is the single slot for all of them.
         *
         * `anywhere` rather than `break-word` for the reason `.markdown-preview`
         * gives in index.css: it also lets min-content shrink, so an unbroken
         * run cannot inflate this flex item and squeeze its sibling. Truncation
         * is NOT the alternative — the title is a link, and clipping it hides
         * where it goes.
         *
         * An eyebrow that is a WORDMARK is the one thing that must opt out
         * (§"A wordmark is a MARK", #2000): a break that invents a new word is
         * worse than an overflow. No archetype passes one today, and the slot's
         * own `overflow-wrap: normal` beats this inherited value if one ever
         * does — the same escape `comments/shared.tsx` already uses.
         */}
        <div style={{ flex: `1 1 ${TEXT_MEASURE}px`, minWidth: 0, overflowWrap: "anywhere" }}>
          {eyebrow}
          <PraxisTitle praxis={praxis} style={titleStyle} fonts={fonts} />
          {/*
           * TWO LINES, TWO INKS (#2114). These were both handed `muted` — same
           * face, same `--text-content` size, same colour, separated by a
           * margin — so a reader could not tell the task being answered from
           * the answer's first words. The type CANNOT carry the distinction:
           * both are content and the floor is the floor (§4a), and a wash on
           * either is the mute-a-muted-token mistake #1675 already undid.
           *
           * So the split is the ink, and it costs no new token. The task line
           * inherits the sheet's own `--faction-{slug}-card-text` — every frame
           * sets it on the card root, it is the best-measured pairing each
           * faction has, and it is what `currentColor` already means on this
           * card (the byline's dashed rule reads it). `inherit` rather than a
           * prop because the value differs per faction and the frame is
           * already holding it. The excerpt keeps `muted`, so the hierarchy
           * reads title → task → preview on all nine sheets and in both
           * cascades. The link keeps `hover:underline`, so colour is not the
           * only thing telling it apart from the prose under it.
           */}
          <PraxisTaskLink
            praxis={praxis}
            style={{ color: "inherit" }}
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
      {/*
       * Read-only applied-metatask seal stack (#932): below the score, above the
       * media. Each seal dispatches on its metatask's ISSUING faction, not this
       * card's — a WOW card can carry a Snide seal. Renders nothing when empty.
       */}
      <MetataskSeal metatasks={praxis.applied_metatasks ?? []} />
      <PraxisStats
        praxis={praxis}
        style={{ color: muted, marginTop: "var(--space-sm)" }}
        fonts={fonts}
      />
      <PraxisModeChip praxis={praxis} fonts={fonts} />
      {/*
       * Duel banner (#596) and collab roster are the same slot wearing two
       * modes, and they are mutually exclusive by construction: the banner
       * needs an `opponent_display_name` (duel only), the roster needs
       * `type === 'collab'`. One card can never draw both, so they sit as
       * siblings rather than behind a ternary that would have to re-derive the
       * duel test the banner already owns.
       */}
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
