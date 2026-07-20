import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { PraxisCardOut } from "../api/praxis";
import { factionCssVar } from "../utils/factions";
import { pickVariant } from "../utils/factionDispatch";
import { surfaceMap } from "../factions";
import { useVotedPraxis } from "./vote/useVotedPraxis";
import SnideMasthead from "./cards/SnideMasthead";
import DefaultSigil from "./cards/DefaultSigil";
import { EphemeristsSigil, Foxing } from "./cards/ephemeristsAtoms";
import {
  AdminOverlay,
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
} from "./praxisCard/shared";
import { PraxisScoreStamp } from "./praxisCard/PraxisScoreStamp";
import { usePraxisCard } from "./praxisCard/usePraxisCard";

interface Props {
  praxis: PraxisCardOut;
  onModerated?: () => void;
  /**
   * Task Crown display (ADR-0028) — on by default. The six faction-page bodies
   * pass false because they stamp their own larger corner medallion over the
   * card; every other surface keeps the built-in stamp.
   */
  showCrown?: boolean;
}

/**
 * Each faction's praxis card owns a bespoke frame. The content inside is
 * composed from the shared structural slots in ./praxisCard/shared via the local
 * `PraxisBody` composition (an archetype may rearrange the slots). Admin
 * moderation + the optimistic local praxis come from usePraxisCard; the frame is
 * selected by task faction via pickVariant.
 */
export type ArchetypeProps = {
  praxis: PraxisCardOut;
  adminProps: AdminProps;
  showCrown?: boolean;
};

// ─── Per-faction archetypes ───────────────────────────────────────────────────

/**
 * Outer-frame sizing shared by every faction archetype's root element. Each
 * archetype spreads this then layers its own bespoke frame styling on top.
 * Mirrors Sidebar.tsx's `panelStyle` pattern — one place to change the sizing.
 */
const frameBase: CSSProperties = {
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
function PraxisBody({
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

/**
 * UA — Gilt salon placard, filed. A gold-framed acquisition plate: gilt-leaf
 * gradient border, parchment ground with a faint dotted tooth, an engraved
 * "Acquisition · filed" regalia line. Matches the UA praxis-read sheet, UaVote,
 * and the DS FactionPraxisCard reference. All colors via --ua-* tokens.
 */
export function UaPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    // Gilt frame: gold-leaf gradient border, then the parchment plate.
    <div
      style={{
        ...frameBase,
        padding: "var(--space-xs)",
        background: "var(--ua-gilt)",
        boxShadow:
          "0 12px 26px color-mix(in srgb, var(--ua-ink) 22%, transparent), inset 0 0 0 1px color-mix(in srgb, white 45%, transparent)",
      }}
    >
      <div
        style={{
          position: "relative",
          background: factionCssVar("ua", "card-bg"),
          border: "1px solid color-mix(in srgb, var(--ua-ink) 30%, transparent)",
          padding: "var(--space-lg)",
          fontFamily: "'EB Garamond', serif",
          color: factionCssVar("ua", "card-text"),
          backgroundImage:
            "radial-gradient(color-mix(in srgb, var(--ua-ink) 4%, transparent) 1px, transparent 1px)",
          backgroundSize: "5px 5px",
        }}
      >
        <div
          style={{
            fontFamily: "'Marcellus SC', serif",
            fontSize: "var(--text-xs)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: factionCssVar("ua", "card-accent"),
            marginBottom: "var(--space-sm)",
          }}
        >
          {t("card.masthead.ua")}
        </div>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint={factionCssVar("ua", "card-accent")}
          muted={factionCssVar("ua", "card-muted")}
          paper={factionCssVar("ua", "card-bg")}
          titleStyle={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}
          showCrown={showCrown}
        />
      </div>
    </div>
  );
}

/** The red margin rule down the Everymen ruled sheet. Static (#586). */
const everymenMarginRule: CSSProperties = {
  position: "absolute",
  left: 22,
  top: 0,
  bottom: 0,
  width: 1,
  background: "rgba(220,80,80,0.2)",
};

export function EverymenPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  return (
    <div
      style={{
        ...frameBase,
        background: factionCssVar("everymen", "card-bg"),
        border: "1px solid var(--color-border)",
        clipPath:
          "polygon(0 0, 100% 0, 100% 90%, 92% 100%, 80% 95%, 68% 100%, 56% 93%, 44% 100%, 32% 94%, 20% 100%, 8% 94%, 0 100%)",
        position: "relative",
        padding: "var(--space-lg) var(--space-lg) var(--space-xl) var(--space-2xl)",
        fontFamily: "'Special Elite', serif",
        color: factionCssVar("everymen", "card-text"),
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent, transparent 17px, rgba(100,140,200,0.08) 17px, rgba(100,140,200,0.08) 18px)",
        transition: "background 150ms, color 150ms",
      }}
    >
      <div style={everymenMarginRule} />
      <AdminOverlay {...adminProps} />
      <PraxisBody
        praxis={praxis}
        tint={factionCssVar("everymen", "card-accent")}
        muted={factionCssVar("everymen", "card-muted")}
        paper={factionCssVar("everymen", "card-bg")}
        showCrown={showCrown}
      />
    </div>
  );
}

/** The two offset scrap layers behind the COVEN card, plus its tape. Static (#586). */
const wowScrapDeep: CSSProperties = {
  position: "absolute",
  top: 10,
  left: -4,
  right: -4,
  height: 24,
  background: "var(--faction-coven-scrap-deep)",
  border: "1.5px solid rgba(0,0,0,0.12)",
  transform: "rotate(-4deg)",
  borderRadius: 1,
};

const wowScrapMid: CSSProperties = {
  position: "absolute",
  top: 4,
  left: -2,
  right: -2,
  height: 36,
  background: "var(--faction-coven-scrap-mid)",
  border: "1.5px solid rgba(0,0,0,0.12)",
  transform: "rotate(3deg)",
  borderRadius: 1,
};

const wowTape: CSSProperties = {
  position: "absolute",
  top: 5,
  left: "50%",
  transform: "translateX(-50%) rotate(-1deg)",
  width: 48,
  height: 14,
  background: "var(--faction-coven-tape)",
  borderRadius: 1,
};

export function CovenPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  return (
    <div
      style={{
        position: "relative",
        ...frameBase,
        minHeight: 140,
      }}
    >
      <div style={wowScrapDeep} />
      <div style={wowScrapMid} />
      <div
        style={{
          position: "relative",
          background: factionCssVar("coven", "card-bg"),
          border: "1.5px solid rgba(0,0,0,0.12)",
          transform: "rotate(-2deg)",
          padding: "var(--space-xl) var(--space-lg) var(--space-lg)",
          fontFamily: "'Courier Prime', monospace",
          color: factionCssVar("coven", "card-text"),
          zIndex: 2,
          transition: "background 150ms, color 150ms",
          boxSizing: "border-box",
        }}
      >
        <div style={wowTape} />
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint={factionCssVar("coven", "card-accent")}
          muted={factionCssVar("coven", "card-muted")}
          paper={factionCssVar("coven", "card-bg")}
          showCrown={showCrown}
        />
      </div>
    </div>
  );
}

const SNIDE_TORN_CLIP =
  "polygon(0% 0%, 4% 100%, 8% 20%, 12% 90%, 16% 10%, 20% 80%, 24% 0%, 28% 100%, 32% 15%, 36% 85%, 40% 5%, 44% 95%, 48% 20%, 52% 80%, 56% 0%, 60% 100%, 64% 15%, 68% 90%, 72% 5%, 76% 85%, 80% 0%, 84% 100%, 88% 20%, 92% 80%, 96% 10%, 100% 0%)";

/** The torn top/bottom edges of the Snide scrap. Static (#586). */
const snideTornBase: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  height: 6,
  background: "var(--color-bg-page)",
  clipPath: SNIDE_TORN_CLIP,
};
const snideTornTop: CSSProperties = { ...snideTornBase, top: -1 };
const snideTornBottom: CSSProperties = { ...snideTornBase, bottom: -1 };

export function SnidePraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    <div
      style={{
        ...frameBase,
        background: factionCssVar("snide", "card-bg"),
        position: "relative",
        padding: "var(--space-lg)",
        fontFamily: "'Special Elite', serif",
        color: factionCssVar("snide", "card-text"),
        transition: "background 150ms, color 150ms",
      }}
    >
      <div style={snideTornTop} />
      <div style={snideTornBottom} />
      <div className="snide-tape" style={{ top: -10, left: 22, transform: "rotate(-8deg)" }} />
      <SnideMasthead subtitle={t("card.masthead.snide")} />
      <AdminOverlay {...adminProps} />
      <PraxisBody
        praxis={praxis}
        tint={factionCssVar("snide", "card-accent")}
        muted={factionCssVar("snide", "card-muted")}
        paper={factionCssVar("snide", "card-bg")}
        showCrown={showCrown}
      />
    </div>
  );
}

/**
 * The Ephemerists (ephemerists slug) — a sealed ephemeris entry. A foxed vellum
 * leaf with a lapis-ruled running head, the sigil, and rubric-accented text.
 */
export function EphemeristsPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    <div
      style={{
        position: "relative",
        ...frameBase,
        overflow: "hidden",
        background: "var(--eph-vellum)",
        color: "var(--eph-vellum-text)",
        border: "1px solid color-mix(in srgb, var(--eph-vellum-text) 30%, transparent)",
        fontFamily: "var(--eph-serif)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 8px 20px -16px rgba(0,0,0,0.6)",
        transition: "background 150ms, color 150ms",
      }}
    >
      <Foxing opacity={0.4} />
      {/* running head — sigil + ephemeris label, lapis-ruled */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          padding: "var(--space-sm) var(--space-lg) var(--space-sm)",
          borderBottom: "1px solid var(--eph-gold-deep)",
          boxShadow: "0 2px 0 -1px color-mix(in srgb, var(--eph-lapis) 55%, transparent)",
        }}
      >
        <EphemeristsSigil size={13} color="var(--eph-lapis)" />
        <span
          style={{
            fontFamily: "var(--eph-serif)",
            fontSize: "var(--text-xs)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--eph-rubric)",
          }}
        >
          {t("card.masthead.ephemerists")}
        </span>
      </div>
      <div style={{ position: "relative", zIndex: 2, padding: "var(--space-md) var(--space-lg) var(--space-lg)" }}>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--eph-rubric)"
          muted="var(--eph-muted)"
          paper="var(--eph-vellum)"
          titleStyle={{ fontFamily: "var(--eph-display)", color: "var(--eph-vellum-text)" }}
          showCrown={showCrown}
        />
      </div>
    </div>
  );
}

/** Punch-card sprocket strip — the row and one hole. Static (#586). */
const holeRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-xs) 0",
};

const holeStyle: CSSProperties = {
  width: 6,
  height: 4,
  background: "rgba(10,26,14)",
  border:
    "1px solid var(--faction-singularity-card-accent, var(--faction-singularity-border-hard))",
  borderRadius: 1,
};

function SingularityHoles() {
  return (
    <div style={holeRowStyle}>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} style={holeStyle} />
      ))}
    </div>
  );
}

/** Terminal scanline wash + the four corner brackets. Static (#586). */
const scanlineStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.015) 2px, rgba(74,222,128,0.015) 4px)",
  pointerEvents: "none",
  zIndex: 1,
};

const cornerRule = "1px solid var(--faction-singularity-card-text)";
const cornerBase: CSSProperties = { position: "absolute", width: 10, height: 10 };
const cornerTopLeft: CSSProperties = {
  ...cornerBase,
  top: 3,
  left: 3,
  borderTop: cornerRule,
  borderLeft: cornerRule,
};
const cornerTopRight: CSSProperties = {
  ...cornerBase,
  top: 3,
  right: 3,
  borderTop: cornerRule,
  borderRight: cornerRule,
};
const cornerBottomLeft: CSSProperties = {
  ...cornerBase,
  bottom: 3,
  left: 3,
  borderBottom: cornerRule,
  borderLeft: cornerRule,
};
const cornerBottomRight: CSSProperties = {
  ...cornerBase,
  bottom: 3,
  right: 3,
  borderBottom: cornerRule,
  borderRight: cornerRule,
};

export function SingularityPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    <div
      style={{
        ...frameBase,
        background: "var(--faction-singularity-card-bg)",
        border: "1px solid var(--faction-singularity-border-hard)",
        position: "relative",
        fontFamily: "'Share Tech Mono', monospace",
        color: "var(--faction-singularity-card-text)",
        overflow: "hidden",
      }}
    >
      <div style={scanlineStyle} />
      <div style={cornerTopLeft} />
      <div style={cornerTopRight} />
      <div style={cornerBottomLeft} />
      <div style={cornerBottomRight} />
      <SingularityHoles />
      <div
        style={{ padding: "var(--space-sm) var(--space-lg) var(--space-md)", position: "relative", zIndex: 2 }}
      >
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--faction-singularity-card-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            marginBottom: "var(--space-sm)",
          }}
        >
          {t("card.masthead.singularity")}
          <span
            style={{
              display: "inline-block",
              width: 5,
              height: 9,
              background: "var(--faction-singularity-card-text)",
              marginLeft: "var(--space-xs)",
              verticalAlign: "middle",
              animation: "blink 1s step-end infinite",
            }}
          />
        </div>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--faction-singularity-card-text)"
          muted="var(--faction-singularity-card-muted)"
          paper="var(--faction-singularity-card-bg)"
          showCrown={showCrown}
        />
      </div>
      <SingularityHoles />
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}


/**
 * Fallback praxis card for `na` / unaffiliated + any task faction without a
 * bespoke archetype — the SPECTRUM card (#820, ADR-0039). A clean sheet wrapped
 * in the community-rainbow band and marked with the seven-segment ring, holding
 * the conditional score stamp (ADR-0047) and the empty-media drop target. No
 * longer borrows the task faction's costume. All colours via --faction-default-*
 * / --spectrum-* tokens; flips light/dark through the [data-theme] cascade.
 */
export function DefaultPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    // Spectrum band → clean inner sheet.
    <div
      style={{
        ...frameBase,
        borderRadius: 8,
        padding: "var(--space-xs)",
        background: "var(--faction-default-rainbow)",
        boxShadow: "0 12px 26px -14px color-mix(in srgb, black 40%, transparent)",
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: "var(--faction-default-card-bg)",
          color: "var(--faction-default-card-text)",
          borderRadius: 5,
          padding: "var(--space-lg)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            marginBottom: "var(--space-md)",
            fontFamily: "'Courier Prime', monospace",
            fontSize: "var(--text-xs)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--faction-default-card-muted)",
          }}
        >
          <DefaultSigil size={22} /> {t("card.masthead.default")}
        </div>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint="var(--faction-default-card-accent)"
          muted="var(--faction-default-card-muted)"
          paper="var(--faction-default-card-bg)"
          showCrown={showCrown}
        />
      </div>
    </div>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export default function PraxisCard({ praxis, onModerated, showCrown = true }: Props) {
  const { localPraxis, adminProps } = usePraxisCard(praxis, onModerated);
  // Merge the viewer's own just-cast vote (#626) before the skin sees it, so the
  // score hero, footer meta and vote tally all move together on one object.
  const voted = useVotedPraxis(localPraxis);
  const Card = pickVariant(
    surfaceMap('praxisCard'),
    voted.task_faction_slug,
    DefaultPraxisCard,
  );
  return <Card praxis={voted} adminProps={adminProps} showCrown={showCrown} />;
}
