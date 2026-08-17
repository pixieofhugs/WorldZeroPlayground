import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";

/**
 * Everymen — THE HELP WANTED BILL (task card v2, #1023).
 *
 * A WPA union broadsheet posted on a wall: a double-ruled red masthead flanked
 * by toothed cogs, poster rays fanning out from behind it, a typewritten
 * dispatch in Courier Prime, a rubber-stamp points seal struck a few degrees off
 * true, a red dashed rule, and a full-bleed report-for-duty bar. Bebas Neue
 * carries every headline and label; Courier Prime carries everything read.
 *
 * This replaces "The Rally Bill" (ADR-0055 / ADR-0056). Same family of
 * references, rebuilt on the shared v2 information structure: eyebrow → LEVEL +
 * POINTS hero → title → brief → in-progress → CTA.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0056): `useFormFactor` picks the size set, not a
 * different card. There is no mobile twin: ADR-0056 was accepted and the
 * `mobileTaskCard` surface retired, so this file serves both form factors.
 *
 * Colour comes almost entirely from the existing `--everymen-*` family, which
 * the design's own palette turned out to match value-for-value; only the
 * masthead, the CTA bar, the modifier ink and the three washes needed new
 * `--faction-everymen-bill-*` tokens. Light/dark flips through the
 * `[data-theme="dark"]` cascade, never a ternary.
 */

const POSTER = "var(--faction-everymen-card-font)"; /* Bebas Neue */
const TYPED = "var(--font-body)"; /* Courier Prime */

/**
 * The sheet's ink — the paper's own text colour, which FLIPS with the paper.
 * Deliberately not `--everymen-ink`, which is a near-black structure colour in
 * dark and would vanish on a dark bill.
 */
const INK = "var(--everymen-paper-text)";

interface SizeSet {
  /** Card width. Geometry, so a raw px number (WORLD_ZERO_STYLE §4a). */
  cardWidth: number;
  mastPad: string;
  bodyPad: string;
  titleSize: string;
  levelSize: string;
  pointsSize: string;
  /** Diameter of the rubber-stamp seal. Geometry. */
  seal: number;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    mastPad: "var(--space-md) var(--space-lg)",
    bodyPad: "var(--space-lg) var(--space-xl) var(--space-xl)",
    titleSize: "var(--text-heading)",
    levelSize: "var(--text-display)",
    pointsSize: "var(--text-heading)",
    seal: 70,
  },
  mobile: {
    cardWidth: 340,
    mastPad: "var(--space-sm) var(--space-lg)",
    bodyPad: "var(--space-lg) var(--space-lg) var(--space-lg)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-heading)",
    pointsSize: "var(--text-title)",
    seal: 62,
  },
};

/** Poster label voice — condensed caps, the bill's whole chrome. */
const LABEL: CSSProperties = {
  fontFamily: POSTER,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

/**
 * A toothed gear on a 24-unit square, built rather than drawn: eight long teeth
 * on a hub, which no hand-written path holds legibly at three different sizes.
 */
function gearPath(): string {
  const teeth = 8;
  const radius = 9.5;
  const tipLength = 5;
  const tipHalf = 1.6;
  const rootHalf = 2.6;
  const point = (r: number, angle: number): [number, number] =>
    [12 + r * Math.cos(angle), 12 + r * Math.sin(angle)];

  let path = "";
  for (let n = 0; n < teeth; n += 1) {
    const start = (n / teeth) * Math.PI * 2;
    const step = (Math.PI * 2) / teeth;
    const rootA = point(radius, start - rootHalf / radius);
    const tipA = point(radius + tipLength, start - tipHalf / (radius + tipLength));
    const tipB = point(radius + tipLength, start + tipHalf / (radius + tipLength));
    const rootB = point(radius, start + rootHalf / radius);
    const nextRoot = point(radius, start + step - rootHalf / radius);
    path += `${n === 0 ? "M" : "L"}${rootA[0]},${rootA[1]}`
      + `L${tipA[0]},${tipA[1]}L${tipB[0]},${tipB[1]}L${rootB[0]},${rootB[1]}`
      + `A${radius},${radius} 0 0 1 ${nextRoot[0]},${nextRoot[1]}`;
  }
  return `${path}Z`;
}

const GEAR_PATH = gearPath();

function Gear({ size, fill, hub, opacity }: {
  size: number
  fill: string
  hub: string
  opacity?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto", opacity }}
    >
      <path d={GEAR_PATH} fill={fill} />
      <circle cx="12" cy="12" r="3" fill={hub} />
    </svg>
  );
}

export default function EverymenTaskCard({
  task,
  basePoints,
  multiplier,
  inProgressCount,
  onSignup,
}: CardProps) {
  const formFactor = useFormFactor();
  const size = SIZES[formFactor];
  const cta = taskCardSignupCta(task, onSignup);
  const showMultiplier = !isNeutralMultiplier(multiplier);

  return (
    <div
      data-form-factor={formFactor}
      style={{ width: size.cardWidth, maxWidth: "100%", boxSizing: "border-box" }}
    >
      <article
        style={{
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
          background: "var(--everymen-paper)",
          color: INK,
          border: `2px solid ${INK}`,
          borderRadius: 2,
          padding: "var(--space-xs)",
          boxShadow: "var(--faction-everymen-bill-shadow)",
        }}
      >
        <div style={{ position: "relative", overflow: "hidden", border: `1px solid ${INK}`, borderRadius: 1 }}>
          {/* Poster rays and two corner glows, masked away from the copy. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 0,
              backgroundImage:
                "radial-gradient(40% 32% at 100% 0, var(--faction-everymen-bill-glow-gold), transparent 70%),"
                + " radial-gradient(44% 38% at 0 100%, var(--faction-everymen-bill-glow-olive), transparent 70%),"
                + " repeating-conic-gradient(from 0deg at 50% 16%, var(--faction-everymen-bill-ray) 0 5.2deg, transparent 5.2deg 10.4deg)",
              WebkitMaskImage: "radial-gradient(130% 100% at 50% 16%, #000 40%, transparent 96%)",
              maskImage: "radial-gradient(130% 100% at 50% 16%, #000 40%, transparent 96%)",
            }}
          />

          {/* Masthead — cogs either side of the call, on the union's red bar. */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-sm)",
              padding: size.mastPad,
              background: "var(--faction-everymen-bill-mast)",
              color: "var(--faction-everymen-bill-mast-ink)",
              borderBottom: "3px double var(--faction-everymen-bill-cta-bg)",
              boxShadow: "inset 0 -6px 0 -4px var(--everymen-paper-deep)",
            }}
          >
            {/* The masthead read "Help Wanted!" between the two gears
                (`feed:taskCard.everymen.billMasthead`). #1909 cut it: Everymen
                was the only faction with a masthead on a task card, and the
                audit ruled the surface generic. The gears and the double rule
                are the band, and they stay. */}
            <Gear size={15} fill="currentColor" hub="var(--faction-everymen-bill-mast)" opacity={0.95} />
            <Gear size={15} fill="currentColor" hub="var(--faction-everymen-bill-mast)" opacity={0.95} />
          </div>

          <div style={{ position: "relative", zIndex: 2, padding: size.bodyPad }}>
            {/* Everything but the CTA reads the full call — a card-sized target
                that stays valid HTML (no <button> nested in an <a>). */}
            <Link to={`/tasks/${task.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
              {/* The dateline carried the uniform "Task {id}" ordinal and nothing
                  else, so #1124's retirement of the id takes the whole line. */}
              {/* LEVEL and the seal ride in two EQUAL halves with the cog
                  between them, so the cog lands on the sheet's own centreline —
                  the axis the masthead pair and the rays' convergence already
                  share (#1965). It used to be the midpoint of the dashed rule,
                  which begins after LEVEL and ends before the seal: a span whose
                  centre is (levelWidth − sealWidth) / 2 ≈ 20px LEFT of the card's,
                  which is exactly how far off true the cog read.

                  ponytail: the halves are equal only while each holds less than
                  half the row. LEVEL always does; the right half does too until
                  the ×modifier badge appears beside the seal, which era_1's
                  neutralized multipliers never let happen. Ceiling: an era that
                  ships a non-1.0 modifier pushes the cog left again on mobile.
                  Upgrade path: at that point the badge wants its own line under
                  the seal rather than a third thing crowding one row. */}
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
                <div style={{ flex: "1 1 0", display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                  <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
                    <span style={{ ...LABEL, fontSize: "var(--text-base)", color: "var(--everymen-olive)", marginBottom: "var(--space-xs)" }}>
                      {i18n.t("feed:taskCard.levelCaption")}
                    </span>
                    <span style={{ fontFamily: POSTER, fontSize: size.levelSize, lineHeight: 0.82 }}>
                      {task.level_required}
                    </span>
                  </div>
                  <span aria-hidden="true" style={{ flex: 1, height: 0, borderTop: "2px dashed var(--everymen-red)" }} />
                </div>

                <Gear size={15} fill="var(--everymen-red)" hub="var(--everymen-paper)" />

                <div style={{ flex: "1 1 0", display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                  <span aria-hidden="true" style={{ flex: 1, height: 0, borderTop: "2px dashed var(--everymen-red)" }} />

                  {/* The faction modifier — hidden at ×1.00, so invisible under
                      era_1's neutralized modifiers and automatic the day one moves
                      (ADR-0055). */}
                  {showMultiplier && (
                    <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                      <span
                        style={{
                          ...LABEL,
                          fontSize: "var(--text-lg)",
                          letterSpacing: "0.04em",
                          color: "var(--faction-everymen-bill-mult-ink)",
                          border: "1.5px solid var(--everymen-gold)",
                          borderRadius: 2,
                          padding: "var(--space-xs) var(--space-sm)",
                        }}
                      >
                        {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                      </span>
                      <span style={{ ...LABEL, fontSize: "var(--text-md)", color: "var(--everymen-muted)" }}>
                        {i18n.t("feed:taskCard.modifierCaption")}
                      </span>
                    </div>
                  )}

                  {/* The rubber-stamp points seal, struck a few degrees off true. */}
                  <div
                    style={{
                      position: "relative",
                      flex: "0 0 auto",
                      width: size.seal,
                      height: size.seal,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: "rotate(-4deg)",
                      color: "var(--everymen-red)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        border: "2px solid var(--everymen-red)",
                        boxShadow: "inset 0 0 0 3px var(--everymen-paper), inset 0 0 0 4px var(--everymen-red)",
                      }}
                    />
                    <span style={{ fontFamily: POSTER, fontSize: size.pointsSize, lineHeight: 0.8 }}>
                      {basePoints}
                    </span>
                    {/* The seal's unit word. It was `feed:taskCard.everymen.
                        sealUnit` ("POINTS") until #1909 cut the slot — Everymen
                        was the only faction that had one — which left the struck
                        seal a bare figure, because this was also the one faction
                        card with no `pointsUnit` of its own to fall back on. The
                        ponytail note parked here named the upgrade path: read
                        the shared key once it exists. #1911 made it exist. The
                        stamp still uppercases, so the catalog's "Points" strikes
                        as POINTS exactly as before. */}
                    {/* eslint-disable-next-line local/no-raw-style-values -- ornament: stamp text, sized to the struck seal rather than the label ramp (§4a). */}
                    <span style={{ ...LABEL, fontSize: 8, letterSpacing: "0.22em", marginTop: "var(--space-xs)" }}>
                      {i18n.t("feed:taskCard.pointsUnit")}
                    </span>
                  </div>
                </div>
              </div>

              <h2
                style={{
                  fontFamily: POSTER,
                  fontSize: size.titleSize,
                  lineHeight: 0.96,
                  letterSpacing: "0.01em",
                  textTransform: "uppercase",
                  margin: "0 0 var(--space-sm)",
                  overflowWrap: "anywhere",
                }}
              >
                {task.title}
              </h2>

              {task.description && (
                <p
                  className="card-description"
                  style={{
                    fontFamily: TYPED,
                    lineHeight: 1.55,
                    color: "var(--everymen-muted)",
                    margin: "0 0 var(--space-md)",
                  }}
                >
                  {task.description}
                </p>
              )}

              <div aria-hidden="true" style={{ borderTop: "2px dashed var(--everymen-red)", margin: "0 0 var(--space-md)" }} />

              {inProgressCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                  <Gear size={15} fill="var(--everymen-red)" hub="var(--everymen-paper)" />
                  <span style={{ fontFamily: TYPED, fontSize: "var(--text-lg)", color: "var(--everymen-muted)" }}>
                    {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                  </span>
                </div>
              )}
            </Link>
          </div>

          {cta && (
            <button
              type="button"
              onClick={cta.onPress}
              aria-disabled={cta.denied || undefined}
              style={{
                position: "relative",
                zIndex: 2,
                cursor: cta.denied ? "not-allowed" : "pointer",
                width: "100%",
                background: "var(--faction-everymen-bill-cta-bg)",
                color: "var(--faction-everymen-bill-cta-ink)",
                fontFamily: POSTER,
                fontSize: "var(--text-xl)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                textAlign: "center",
                padding: "var(--space-md) 0",
                border: "none",
                borderTop: `2px solid ${INK}`,
              }}
            >
              {cta.label}
            </button>
          )}
        </div>
      </article>
    </div>
  );
}
