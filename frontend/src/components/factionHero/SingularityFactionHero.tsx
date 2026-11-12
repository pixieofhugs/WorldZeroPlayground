import type { FactionHeroProps } from "../../pages/FactionDetail";
import i18n from "../../i18n";
import { SingularitySigil } from "../sigil/SingularitySigil";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";
import { HeroCounts, HeroKicker, HeroMark, HeroTagline, HeroWordmark, heroCounts } from "./heroFrame";

/**
 * Singularity faction hero, a terminal frontispiece (kit SgHero): inset signal
 * border, scanlines, corner glow, spinning sigil. ALWAYS DARK: its tokens are
 * identical in both themes; it never touches data-theme.
 */

// Roles under `--sg-hero-*` (#2675); `-border` / `-border-hard` are not roles.
const VOID = "var(--sg-hero-paper)"; // terminal black
const PHOSPHOR = "var(--sg-hero-accent)"; // green
const PHOSPHOR_TEXT = "var(--sg-hero-ink)"; // green
const SIGNAL = "var(--sg-hero-quiet)"; // blue
const BORDER = "var(--faction-singularity-border)";
const BORDER_HARD = "var(--faction-singularity-border-hard)";
const FONT = "var(--font-faction-terminal)";

const phosphor = (pct: number): string =>
  `color-mix(in srgb, ${PHOSPHOR} ${pct}%, transparent)`;
const signal = (pct: number): string =>
  `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`;
const signalFill = "var(--sg-hero-fill)"; // blue brand fill

export default function SingularityFactionHero({
  slug,
  name,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  // Only `members` is named here; the frame owns the rest (#2997).
  const stats = heroCounts(i18n.t("feed:factionHero.singularity.stats.members", { count: members }), {
    members,
    tasks,
    praxes,
  });

  return (
    <header
      style={{
        ...factionBodyVars("singularity"), ...factionRoleVars("singularity", "sg-hero"),
        position: "relative",
        overflow: "hidden",
        marginBottom: "var(--space-2xl)",
        border: `1px solid ${BORDER_HARD}`,
        background: VOID,
        color: PHOSPHOR_TEXT,
        fontFamily: FONT,
        // Casts onto the flipping page, so the ordinary lift (#1609).
        boxShadow: "0 24px 60px -28px var(--color-cast-shadow)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 6,
          border: `1px solid ${signal(18)}`,
          pointerEvents: "none",
          zIndex: 3,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `repeating-linear-gradient(to bottom,transparent,transparent 2px,${phosphor(1.8)} 2px,${phosphor(1.8)} 4px)`,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -60,
          left: -60,
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${phosphor(12)}, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Split is `.sg-hero-split` in 06-faction-chrome-2.css (#2997). */}
      <div className="sg-hero-split" style={{ position: "relative", zIndex: 2 }}>
        {/* Size container (#2222): gives the wordmark a `cqw` and zeroes the
            column's min-content, so the unbreakable name can't overflow. */}
        <div style={{ containerType: "inline-size" }}>
          <HeroKicker
            style={{
              fontSize: "var(--text-md)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: signal(70),
              marginBottom: "var(--space-md)",
            }}
          >
            {/* Leetspeak reads aloud as noise: speak the plain word (#3248). */}
            <span aria-hidden="true">{i18n.t("feed:factionHero.singularity.eyebrow")}</span>
            <span className="sr-only">{i18n.t("feed:factionHero.singularity.eyebrowSpoken")}</span>
          </HeroKicker>

          <HeroWordmark
            style={{
              fontFamily: FONT,
              // Caps rather than overflows (#2222). `cqw`, not `vw`: the
              // readout column and desktop rail make the track independent of
              // the viewport. 14 is measured: "Singularity" in Share Tech Mono
              // is 11 × (0.54 + 0.04) = 6.38em, so 0.89 of the track.
              // Ornament, off the type scale (no lint disable inside `min()`).
              fontSize: "min(56px, 14cqw)",
              lineHeight: 0.9,
              letterSpacing: "0.04em",
              margin: "0 0 var(--space-md)",
              color: PHOSPHOR,
            }}
          >
            {name}
          </HeroWordmark>

          <HeroTagline
            slug={slug}
            style={{
              fontSize: "var(--text-base)",
              letterSpacing: "0.28em",
              color: signal(70),
              textTransform: "uppercase",
              marginBottom: "var(--space-lg)",
            }}
          />

        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-xl)",
            alignItems: "center",
          }}
        >
          <HeroMark>
          <div style={{ position: "relative", flexShrink: 0, width: 120, height: 120 }}>
            <div
              aria-hidden="true"
              className="sg-pulse"
              style={{
                position: "absolute",
                inset: -20,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${phosphor(28)}, transparent 70%)`,
                opacity: 0.2,
                pointerEvents: "none",
              }}
            />
            <div className="sg-rotate">
              <SingularitySigil size={120} color={phosphor(55)} />
            </div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SingularitySigil size={44} color={PHOSPHOR} />
            </div>
          </div>
          </HeroMark>

          <div
            style={{
              alignSelf: "stretch",
              border: `1px solid ${BORDER}`,
              background: "var(--faction-singularity-light)",
            }}
          >
            <HeroCounts counts={stats}>
              {(s) => (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: "var(--space-md)",
                  padding: "var(--space-sm) var(--space-md)",
                  borderBottom: `1px solid ${signal(14)}`,
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-md)",
                    letterSpacing: "0.14em",
                    color: signal(50),
                    textTransform: "uppercase",
                  }}
                >
                  {s.label}
                </span>
                {/* eslint-disable-next-line local/no-raw-style-values -- ornament: readout numeral sized to the terminal face; above the content floor already */}
                <span style={{ fontSize: 20, lineHeight: 1, color: PHOSPHOR }}>
                  {s.value}
                </span>
              </div>
              )}
            </HeroCounts>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          height: 4,
          background: signalFill,
          position: "relative",
          zIndex: 2,
          opacity: 0.7,
        }}
      />
    </header>
  );
}
