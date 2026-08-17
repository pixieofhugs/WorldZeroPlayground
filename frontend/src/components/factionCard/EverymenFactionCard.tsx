import type { FactionCardProps } from "./FactionCard";
import i18n from "../../i18n";
import { factionName, factionDescription } from "../../utils/factions";
import { EverymenSigil } from "../sigil/EverymenSigil";

/**
 * EverymenFactionCard — the Everymen faction PREVIEW card.
 *
 * A union recruitment poster: a masthead with the faction name in a big Bebas
 * headline and the blurb from factionDescription(slug). Pure preview —
 * the whole card is a link to the faction detail page, where the enlist / leave
 * membership block lives (issue #347). No interactive controls here.
 *
 * The faction sigil is the shared EverymenSigil atom; the poster-only atoms
 * (Halftone, Sunburst) are declared locally.
 */

// ─── SVG atoms ────────────────────────────────────────────────────────────────

function Halftone({ color = "var(--everymen-cream)", opacity = 0.08 }: { color?: string; opacity?: number }) {
  const id = "em-halftone";
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width={10} height={10} patternUnits="userSpaceOnUse">
          <circle cx={2} cy={2} r={1.4} fill={color} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} />
    </svg>
  );
}

function Sunburst({
  color = "var(--everymen-field-deep)",
  from = "50% 32%",
  opacity = 0.55,
  step = 7.5,
}: {
  color?: string;
  from?: string;
  opacity?: number;
  step?: number;
}) {
  const stops: string[] = [];
  for (let angle = 0; angle < 360; angle += step * 2) {
    stops.push(`${color} ${angle}deg`, `${color} ${angle + step}deg`);
    stops.push(`transparent ${angle + step}deg`, `transparent ${angle + step * 2}deg`);
  }
  return (
    <div
      style={
        {
          position: "absolute",
          inset: 0,
          zIndex: 0,
          opacity,
          pointerEvents: "none",
          background: `conic-gradient(from 0deg at ${from}, ${stops.join(", ")})`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    />
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────

export default function EverymenCard({
  faction,
  invitationNote,
}: FactionCardProps) {
  const blurb = factionDescription(faction.slug);

  // The three-perk checklist under the blurb was Everymen's alone — no other
  // faction card had one — and #1909 cut all three strings with the surface.
  // The card ends on the description, which is where the other eight end.

  return (
    <div
      style={
        {
          position: "relative",
          overflow: "hidden",
          border: "3px solid var(--everymen-ink)",
          background: "var(--everymen-field)",
          color: "var(--everymen-cream)",
          boxShadow: "0 0 0 4px var(--everymen-paper), 0 0 0 6px var(--everymen-ink)",
          fontFamily: "var(--font-body)",
        } as React.CSSProperties
      }
    >
      <Sunburst color="var(--everymen-field-deep)" from="50% 32%" opacity={0.55} step={7.5} />
      <Halftone color="var(--everymen-cream)" opacity={0.09} />

      {/* The struck banner ribbon, now ONLY for an invitation.
          #1909 cut both of its strings. `factionCard.everymen.summons` ("NEW
          SUMMONS · {{note}}") is covered by the generic
          `factionCard.newInvitation` the shared card already prints, so the
          ribbon reads that instead — the note is appended here rather than
          interpolated, because the generic key takes no variable.
          `factionCard.everymen.kicker` ("THE EVERYMEN WANT YOU") had no generic
          twin, so with no invitation there is nothing for the ribbon to say and
          it is not drawn. */}
      {invitationNote && (
        <>
          <div
            style={{
              position: "relative",
              zIndex: 2,
              background: "var(--everymen-ink)",
              color: "var(--everymen-gold)",
              textAlign: "center",
              fontFamily: "var(--faction-everymen-card-font)",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: struck banner ribbon across the card head — illustration, not chrome
              fontSize: 15,
              letterSpacing: "0.34em",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: lead of the struck banner ribbon; rounding reflows it.
              padding: "7px 0",
            }}
          >
            <span>{i18n.t("feed:factionCard.newInvitation")}</span>
            <span> · {invitationNote.toUpperCase()}</span>
          </div>
          <div style={{ height: 4, background: "var(--everymen-gold)", position: "relative", zIndex: 2 }} />
        </>
      )}

      <div style={{ position: "relative", zIndex: 2, padding: "var(--space-2xl)", textAlign: "center" }}>
        {/* sigil seal */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-lg)" }}>
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: "50%",
              background: "var(--everymen-cream)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 4px var(--everymen-ink), inset 0 0 0 6px var(--everymen-red)",
            }}
          >
            <EverymenSigil size={58} color="var(--everymen-red)" />
          </div>
        </div>

        {/* A "WORLD ZERO · FACTION" eyebrow sat here
            (`factionCard.everymen.eyebrow`). #1909 cut it — two factions wrote
            one, seven never had the slot, and the audit ruled the card generic. */}

        {/* big Bebas headline = faction name */}
        <h1
          style={{
            fontFamily: "var(--faction-everymen-card-font)",
            // eslint-disable-next-line local/no-raw-style-values -- ornament: union-poster headline — Bebas at 0.84 leading, the archetype's voice
            fontSize: 60,
            lineHeight: 0.84,
            letterSpacing: "0.01em",
            margin: 0,
            color: "var(--everymen-cream)",
            textShadow: "3px 3px 0 var(--everymen-ink)",
          }}
        >
          {factionName(faction.slug)}
        </h1>

        {/* The struck motto plaque ("UNITED · WE · STAND") sat here.
            #1909 cut `factionCard.everymen.motto`: Everymen was the only faction
            with a motto on this card, on a surface the audit ruled generic. */}

        {/* blurb from description */}
        <p
          className="content-text"
          style={{
            fontFamily: "var(--font-body)",
            lineHeight: 1.65,
            maxWidth: 420,
            margin: "var(--space-lg) auto 0",
            color: "var(--everymen-cream)",
          }}
        >
          {blurb}
        </p>

        {/* The "what you get" checklist stood here — see the note beside the
            blurb above. #1909 cut all three of its strings. */}
      </div>
    </div>
  );
}
