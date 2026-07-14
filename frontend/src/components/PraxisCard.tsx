import type { ComponentType, CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { PraxisCardOut } from "../api/praxis";
import { factionCssVar } from "../utils/factions";
import { pickVariant } from "../utils/factionDispatch";
import SnideMasthead from "./cards/SnideMasthead";
import AlbescentMark from "./cards/AlbescentMark";
import DefaultSigil from "./cards/DefaultSigil";
import { EphMark, Foxing } from "./cards/ephemeristsAtoms";
import {
  AdminOverlay,
  PraxisTitle,
  PraxisTaskLink,
  PraxisByline,
  PraxisScoreHero,
  PraxisStats,
  type AdminProps,
} from "./praxisCard/shared";
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
          gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <PraxisTitle praxis={praxis} style={titleStyle} />
          <PraxisTaskLink praxis={praxis} style={{ color: muted }} />
        </div>
        <PraxisScoreHero
          praxis={praxis}
          color={tint}
          border={tint}
          paper={paper}
          showCrown={showCrown}
        />
      </div>
      <PraxisStats praxis={praxis} style={{ color: muted, marginTop: 8 }} />
      <PraxisByline praxis={praxis} style={{ color: muted }} />
    </>
  );
}

/**
 * UA — Gilt salon placard, filed. A gold-framed acquisition plate: gilt-leaf
 * gradient border, parchment ground with a faint dotted tooth, an engraved
 * "Acquisition · filed" regalia line. Matches the UA praxis-read sheet, UAVote,
 * and the DS FactionPraxisCard reference. All colors via --ua-* tokens.
 */
function UAPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    // Gilt frame: gold-leaf gradient border, then the parchment plate.
    <div
      style={{
        width: "100%",
        flex: "1 1 280px",
        minWidth: 280,
        padding: 5,
        background: "var(--ua-gilt)",
        boxShadow:
          "0 12px 26px color-mix(in srgb, var(--ua-ink) 22%, transparent), inset 0 0 0 1px color-mix(in srgb, white 45%, transparent)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "relative",
          background: factionCssVar("ua", "card-bg"),
          border: "1px solid color-mix(in srgb, var(--ua-ink) 30%, transparent)",
          padding: "16px 17px 14px",
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
            fontSize: 8,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: factionCssVar("ua", "card-accent"),
            marginBottom: 6,
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

function EverymenPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
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

function WowPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
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
        <PraxisBody
          praxis={praxis}
          tint={factionCssVar("wow", "card-accent")}
          muted={factionCssVar("wow", "card-muted")}
          paper={factionCssVar("wow", "card-bg")}
          showCrown={showCrown}
        />
      </div>
    </div>
  );
}

const SNIDE_TORN_CLIP =
  "polygon(0% 0%, 4% 100%, 8% 20%, 12% 90%, 16% 10%, 20% 80%, 24% 0%, 28% 100%, 32% 15%, 36% 85%, 40% 5%, 44% 95%, 48% 20%, 52% 80%, 56% 0%, 60% 100%, 64% 15%, 68% 90%, 72% 5%, 76% 85%, 80% 0%, 84% 100%, 88% 20%, 92% 80%, 96% 10%, 100% 0%)";

function SnidePraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
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
function EphemeristsPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
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
          {t("card.masthead.ephemerists")}
        </span>
      </div>
      <div style={{ position: "relative", zIndex: 2, padding: "10px 14px 14px" }}>
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

function SingularityPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
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
          {t("card.masthead.singularity")}
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
 * Albescent — a filed account in the Register. Vellum correspondence: pure white
 * sheet, a hairline architectural inset border, the surveyor's Mark and a quiet
 * "Account · filed" running head in mono, then the shared body in Cormorant
 * Garamond italic. Always-light — never dims. First-class identity: the explicit
 * PRAXIS_CARD_BY_SLUG['albescent'] entry beats the albescent→ua alias in
 * pickVariant, so it renders immediately. Reads its own --faction-albescent-*
 * tokens directly (not factionCssVar('albescent', …), which resolves to ua until
 * the alias drops in slice 2 of #232). Ported from docs/design/albescent-kit.
 */
function AlbescentPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  const ink = (pct: number) =>
    `color-mix(in srgb, var(--faction-albescent-card-text) ${pct}%, transparent)`;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        flex: "1 1 280px",
        minWidth: 280,
        boxSizing: "border-box",
        background: "var(--faction-albescent-card-bg)",
        color: "var(--faction-albescent-card-text)",
        border: `1px solid ${ink(10)}`,
        fontFamily: "var(--faction-albescent-card-font)",
        boxShadow: "0 2px 18px rgba(0,0,0,0.055), 0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* architectural inset hairline — the sheet's quiet frame */}
      <div
        style={{
          position: "absolute",
          inset: 5,
          border: `1px solid ${ink(5)}`,
          pointerEvents: "none",
        }}
      />
      {/* running head — sigil + "Account · filed" */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 15px 7px",
          borderBottom: `1px solid ${ink(7)}`,
        }}
      >
        <AlbescentMark size={13} />
        <span
          style={{
            fontFamily: "var(--faction-albescent-mono)",
            fontSize: 8,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: ink(30),
          }}
        >
          {t("card.masthead.albescent")}
        </span>
      </div>
      <div style={{ position: "relative", padding: "12px 15px 14px" }}>
        <AdminOverlay {...adminProps} />
        <PraxisBody
          praxis={praxis}
          tint={ink(60)}
          muted={ink(42)}
          paper="var(--faction-albescent-card-bg)"
          titleStyle={{
            fontFamily: "var(--faction-albescent-card-font)",
            fontStyle: "italic",
            fontWeight: 300,
            color: "var(--faction-albescent-card-text)",
          }}
          showCrown={showCrown}
        />
      </div>
    </div>
  );
}

/**
 * Fallback praxis card for `na` / unaffiliated + any task faction without a
 * bespoke archetype — the spectrum default skin (#418). A clean sheet wrapped in
 * the spectrum band and marked with the seven-segment ring; the shared
 * PraxisBody inside. No longer borrows the task faction's costume. All colours
 * via --faction-default-* tokens; flips light/dark.
 */
export function DefaultPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  return (
    // Spectrum band → clean inner sheet.
    <div
      style={{
        width: "100%",
        flex: "1 1 280px",
        minWidth: 280,
        borderRadius: 10,
        padding: 5,
        background: "var(--faction-default-rainbow)",
        boxShadow: "0 12px 26px -14px rgba(0,0,0,0.4)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "relative",
          background: "var(--faction-default-card-bg)",
          color: "var(--faction-default-card-text)",
          borderRadius: 5,
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
            fontFamily: "'Courier Prime', monospace",
            fontSize: 8.5,
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

export const PRAXIS_CARD_BY_SLUG: Record<string, ComponentType<ArchetypeProps>> = {
  ua: UAPraxisCard,
  everymen: EverymenPraxisCard,
  wow: WowPraxisCard,
  snide: SnidePraxisCard,
  ephemerists: EphemeristsPraxisCard,
  singularity: SingularityPraxisCard,
  // First-class Albescent identity (#232 slice 1) — beats the albescent→ua alias.
  albescent: AlbescentPraxisCard,
};

export default function PraxisCard({ praxis, onModerated, showCrown = true }: Props) {
  const { localPraxis, adminProps } = usePraxisCard(praxis, onModerated);
  const Card = pickVariant(
    PRAXIS_CARD_BY_SLUG,
    localPraxis.task_faction_slug,
    DefaultPraxisCard,
  );
  return <Card praxis={localPraxis} adminProps={adminProps} showCrown={showCrown} />;
}
