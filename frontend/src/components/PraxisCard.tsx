import type { ComponentType, CSSProperties } from "react";
import type { PraxisCardOut } from "../api/praxis";
import { factionCssVar } from "../utils/factions";
import { pickVariant } from "../utils/factionDispatch";
import SnideMasthead from "./cards/SnideMasthead";
import { EphMark, Foxing } from "./cards/ephemeristsAtoms";
import {
  AdminOverlay,
  PraxisContent,
  PraxisTitle,
  PraxisTaskLink,
  PraxisByline,
  PraxisSeal,
  PraxisStats,
  type AdminProps,
} from "./praxisCard/shared";
import { usePraxisCard } from "./praxisCard/usePraxisCard";

interface Props {
  praxis: PraxisCardOut;
  onModerated?: () => void;
}

/**
 * Each faction's praxis card owns a bespoke frame. The content inside is
 * composed from the shared structural slots in ./praxisCard/shared (an archetype
 * may rearrange them; today every archetype uses the default PraxisContent
 * composition). Admin moderation + the optimistic local praxis come from
 * usePraxisCard; the frame is selected by task faction via pickVariant.
 */
export type ArchetypeProps = { praxis: PraxisCardOut; adminProps: AdminProps };

// ─── Per-faction archetypes ───────────────────────────────────────────────────

/**
 * Shared interim content body for every faction's praxis card: title + task link
 * on the left, the score "seal" (hero) on the right, then a points/mode line and
 * the byline. Each faction's own frame wraps this; tint / muted / sealLabel carry
 * the faction voice (e.g. snide "case", ephemerists "concord", singularity
 * "verified").
 *
 * ponytail: the seal is a placeholder hero showing the computed score. The fully
 * designed per-faction cards — and the vote-reframe summary (Concordance, Signal,
 * heart/ink ramps) that replaces the seal — supersede this once the design and
 * the rating/level/date API fields land. See docs/adr/0005.
 */
function PlaceholderPraxisBody({
  praxis,
  tint,
  muted,
  sealLabel = "sealed",
  titleStyle,
}: {
  praxis: PraxisCardOut;
  tint: string;
  muted: string;
  sealLabel?: string;
  titleStyle?: CSSProperties;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <PraxisTitle praxis={praxis} style={titleStyle} />
          <PraxisTaskLink praxis={praxis} style={{ color: muted }} />
        </div>
        <PraxisSeal praxis={praxis} color={tint} border={tint} label={sealLabel} />
      </div>
      <PraxisStats praxis={praxis} style={{ color: muted, marginTop: 8 }} />
      <PraxisByline praxis={praxis} style={{ color: muted }} />
    </>
  );
}

const ROTATIONS = [-2, 1.5, -1, 2.5];

function UAPraxisCard({ praxis, adminProps }: ArchetypeProps) {
  const rotation =
    ROTATIONS[(praxis.task_faction_slug ?? "").length % ROTATIONS.length];
  return (
    <div
      style={{
        width: "100%",
        flex: "1 1 280px",
        minWidth: 280,
        background: factionCssVar("ua", "card-bg"),
        clipPath: "polygon(0 0, 100% 0, 100% 88%, 88% 100%, 0 100%)",
        transform: `rotate(${rotation}deg)`,
        position: "relative",
        padding: "28px 16px 20px",
        fontFamily: "'Courier Prime', monospace",
        color: factionCssVar("ua", "card-text"),
        transition: "background 150ms, color 150ms",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: factionCssVar("ua", "card-accent"),
          border: "2px solid rgba(0,0,0,0.25)",
        }}
      />
      <AdminOverlay {...adminProps} />
      <PlaceholderPraxisBody
        praxis={praxis}
        tint={factionCssVar("ua", "card-accent")}
        muted={factionCssVar("ua", "card-muted")}
      />
    </div>
  );
}

function EverymenPraxisCard({ praxis, adminProps }: ArchetypeProps) {
  return (
    <div
      style={{
        width: "100%",
        flex: "1 1 280px",
        minWidth: 280,
        background: factionCssVar("everymen", "card-bg"),
        border: "1px solid var(--color-border)",
        clipPath:
          "polygon(0 0, 100% 0, 100% 90%, 92% 100%, 80% 95%, 68% 100%, 56% 93%, 44% 100%, 32% 94%, 20% 100%, 8% 94%, 0 100%)",
        position: "relative",
        padding: "14px 16px 28px 28px",
        fontFamily: "'Special Elite', serif",
        color: factionCssVar("everymen", "card-text"),
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent, transparent 17px, rgba(100,140,200,0.08) 17px, rgba(100,140,200,0.08) 18px)",
        transition: "background 150ms, color 150ms",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 22,
          top: 0,
          bottom: 0,
          width: 1,
          background: "rgba(220,80,80,0.2)",
        }}
      />
      <AdminOverlay {...adminProps} />
      <PlaceholderPraxisBody
        praxis={praxis}
        tint={factionCssVar("everymen", "card-accent")}
        muted={factionCssVar("everymen", "card-muted")}
      />
    </div>
  );
}

function WowPraxisCard({ praxis, adminProps }: ArchetypeProps) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        flex: "1 1 280px",
        minWidth: 280,
        minHeight: 140,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 10,
          left: -4,
          right: -4,
          height: 24,
          background: "var(--faction-wow-scrap-deep)",
          border: "1.5px solid rgba(0,0,0,0.12)",
          transform: "rotate(-4deg)",
          borderRadius: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 4,
          left: -2,
          right: -2,
          height: 36,
          background: "var(--faction-wow-scrap-mid)",
          border: "1.5px solid rgba(0,0,0,0.12)",
          transform: "rotate(3deg)",
          borderRadius: 1,
        }}
      />
      <div
        style={{
          position: "relative",
          background: factionCssVar("wow", "card-bg"),
          border: "1.5px solid rgba(0,0,0,0.12)",
          transform: "rotate(-2deg)",
          padding: "22px 14px 16px",
          fontFamily: "'Courier Prime', monospace",
          color: factionCssVar("wow", "card-text"),
          zIndex: 2,
          transition: "background 150ms, color 150ms",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 5,
            left: "50%",
            transform: "translateX(-50%) rotate(-1deg)",
            width: 48,
            height: 14,
            background: "var(--faction-wow-tape)",
            borderRadius: 1,
          }}
        />
        <AdminOverlay {...adminProps} />
        <PlaceholderPraxisBody
          praxis={praxis}
          tint={factionCssVar("wow", "card-accent")}
          muted={factionCssVar("wow", "card-muted")}
        />
      </div>
    </div>
  );
}

const SNIDE_TORN_CLIP =
  "polygon(0% 0%, 4% 100%, 8% 20%, 12% 90%, 16% 10%, 20% 80%, 24% 0%, 28% 100%, 32% 15%, 36% 85%, 40% 5%, 44% 95%, 48% 20%, 52% 80%, 56% 0%, 60% 100%, 64% 15%, 68% 90%, 72% 5%, 76% 85%, 80% 0%, 84% 100%, 88% 20%, 92% 80%, 96% 10%, 100% 0%)";

function SnidePraxisCard({ praxis, adminProps }: ArchetypeProps) {
  return (
    <div
      style={{
        width: "100%",
        flex: "1 1 280px",
        minWidth: 280,
        background: factionCssVar("snide", "card-bg"),
        position: "relative",
        padding: "14px 14px 16px",
        fontFamily: "'Special Elite', serif",
        color: factionCssVar("snide", "card-text"),
        transition: "background 150ms, color 150ms",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -1,
          left: 0,
          right: 0,
          height: 6,
          background: "var(--color-bg-page)",
          clipPath: SNIDE_TORN_CLIP,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -1,
          left: 0,
          right: 0,
          height: 6,
          background: "var(--color-bg-page)",
          clipPath: SNIDE_TORN_CLIP,
        }}
      />
      <div className="snide-tape" style={{ top: -10, left: 22, transform: "rotate(-8deg)" }} />
      <SnideMasthead subtitle="evidence locker" />
      <AdminOverlay {...adminProps} />
      <PlaceholderPraxisBody
        praxis={praxis}
        tint={factionCssVar("snide", "card-accent")}
        muted={factionCssVar("snide", "card-muted")}
        sealLabel="case"
      />
    </div>
  );
}

/**
 * The Ephemerists (ephemerists slug) — a sealed ephemeris entry. A foxed vellum
 * leaf with a lapis-ruled running head, the sigil, and rubric-accented text.
 */
function EphemeristsPraxisCard({ praxis, adminProps }: ArchetypeProps) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        flex: "1 1 280px",
        minWidth: 280,
        boxSizing: "border-box",
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
          gap: 8,
          padding: "7px 14px 6px",
          borderBottom: "1px solid var(--eph-gold-deep)",
          boxShadow: "0 2px 0 -1px color-mix(in srgb, var(--eph-lapis) 55%, transparent)",
        }}
      >
        <EphMark size={13} color="var(--eph-lapis)" />
        <span
          style={{
            fontFamily: "var(--eph-serif)",
            fontSize: 8.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--eph-rubric)",
          }}
        >
          Ephemeris · sealed entry
        </span>
      </div>
      <div style={{ position: "relative", zIndex: 2, padding: "10px 14px 14px" }}>
        <AdminOverlay {...adminProps} />
        <PlaceholderPraxisBody
          praxis={praxis}
          tint="var(--eph-rubric)"
          muted="var(--eph-muted)"
          sealLabel="concord"
          titleStyle={{ fontFamily: "var(--eph-display)", color: "var(--eph-vellum-text)" }}
        />
      </div>
    </div>
  );
}

function SingularityHoles() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 6,
        padding: "4px 0",
      }}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          style={{
            width: 6,
            height: 4,
            background: "rgba(10,26,14)",
            border:
              "1px solid var(--faction-singularity-card-accent, var(--faction-singularity-border-hard))",
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

function SingularityPraxisCard({ praxis, adminProps }: ArchetypeProps) {
  return (
    <div
      style={{
        width: "100%",
        flex: "1 1 280px",
        minWidth: 280,
        background: "var(--faction-singularity-card-bg)",
        border: "1px solid var(--faction-singularity-border-hard)",
        position: "relative",
        fontFamily: "'Share Tech Mono', monospace",
        color: "var(--faction-singularity-card-text)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.015) 2px, rgba(74,222,128,0.015) 4px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 3,
          left: 3,
          width: 10,
          height: 10,
          borderTop: "1px solid var(--faction-singularity-card-text)",
          borderLeft: "1px solid var(--faction-singularity-card-text)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 3,
          right: 3,
          width: 10,
          height: 10,
          borderTop: "1px solid var(--faction-singularity-card-text)",
          borderRight: "1px solid var(--faction-singularity-card-text)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 3,
          left: 3,
          width: 10,
          height: 10,
          borderBottom: "1px solid var(--faction-singularity-card-text)",
          borderLeft: "1px solid var(--faction-singularity-card-text)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 3,
          right: 3,
          width: 10,
          height: 10,
          borderBottom: "1px solid var(--faction-singularity-card-text)",
          borderRight: "1px solid var(--faction-singularity-card-text)",
        }}
      />
      <SingularityHoles />
      <div
        style={{ padding: "6px 16px 12px", position: "relative", zIndex: 2 }}
      >
        <div
          style={{
            fontSize: 8,
            color: "var(--faction-singularity-card-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            marginBottom: 8,
          }}
        >
          singularity protocol
          <span
            style={{
              display: "inline-block",
              width: 5,
              height: 9,
              background: "var(--faction-singularity-card-text)",
              marginLeft: 3,
              verticalAlign: "middle",
              animation: "blink 1s step-end infinite",
            }}
          />
        </div>
        <AdminOverlay {...adminProps} />
        <PlaceholderPraxisBody
          praxis={praxis}
          tint="var(--faction-singularity-card-text)"
          muted="var(--faction-singularity-card-muted)"
          sealLabel="verified"
        />
      </div>
      <SingularityHoles />
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}

function UAMastersPraxisCard({ praxis, adminProps }: ArchetypeProps) {
  return (
    <div
      style={{
        width: "100%",
        flex: "1 1 280px",
        minWidth: 280,
        background: factionCssVar("ua_masters", "card-bg"),
        border: "1px solid var(--color-border)",
        clipPath:
          "polygon(0 0, 98% 0, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0 98%, 0 2%)",
        padding: "12px 14px 16px",
        fontFamily: "'Special Elite', serif",
        color: factionCssVar("ua_masters", "card-text"),
        position: "relative",
        transition: "background 150ms, color 150ms",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: 7,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          color: factionCssVar("ua_masters", "card-muted"),
          borderBottom: `2px solid ${factionCssVar("ua_masters", "card-accent")}`,
          paddingBottom: 4,
          marginBottom: 6,
        }}
      >
        The UA Masters Gazette
      </div>
      <AdminOverlay {...adminProps} />
      <PraxisContent
        praxis={praxis}
        metaStyle={{ color: factionCssVar("ua_masters", "card-muted") }}
      />
    </div>
  );
}

/** Fallback card for `na` / unknown task factions — a plain accent-bordered slab. */
export function DefaultPraxisCard({ praxis, adminProps }: ArchetypeProps) {
  const slug = praxis.task_faction_slug ?? "ua";
  return (
    <div
      style={{
        width: "100%",
        flex: "1 1 280px",
        minWidth: 280,
        background: factionCssVar(slug, "card-bg"),
        borderLeft: `4px solid ${factionCssVar(slug, "card-accent")}`,
        color: factionCssVar(slug, "card-text"),
        padding: "14px 16px",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <AdminOverlay {...adminProps} />
      <PraxisContent
        praxis={praxis}
        metaStyle={{ color: factionCssVar(slug, "card-muted") }}
      />
    </div>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export const PRAXIS_CARD_BY_SLUG: Record<string, ComponentType<ArchetypeProps>> = {
  ua: UAPraxisCard,
  everymen: EverymenPraxisCard,
  wow: WowPraxisCard,
  snide: SnidePraxisCard,
  ephemerists: EphemeristsPraxisCard,
  singularity: SingularityPraxisCard,
  ua_masters: UAMastersPraxisCard,
};

export default function PraxisCard({ praxis, onModerated }: Props) {
  const { localPraxis, adminProps } = usePraxisCard(praxis, onModerated);
  const Card = pickVariant(
    PRAXIS_CARD_BY_SLUG,
    localPraxis.task_faction_slug,
    DefaultPraxisCard,
  );
  return <Card praxis={localPraxis} adminProps={adminProps} />;
}
