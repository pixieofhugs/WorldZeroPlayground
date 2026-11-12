import type { FactionHeroProps } from "../../pages/FactionDetail";
import i18n from "../../i18n";
import { UaSigil } from "../sigil/UaSigil";
import UaMandala from "../factionMarks/UaMandala";
import { UA_DISPLAY, UA_EYEBROW } from "../factionMarks/uaAtoms";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";
import { HeroCounts, HeroKicker, HeroMark, HeroTagline, HeroWordmark, heroCounts } from "./heroFrame";

/**
 * UA faction hero (kit §13, #851): sand wash, ensō by the wordmark, mandala at
 * TEXTURE strength (one of three surfaces allowed it, brief §5), counts in a
 * hairline strip beneath. The motto ribbon is retired; the plain tagline line
 * is not (#2805).
 */
export default function UaFactionHero({
  slug,
  name,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  // Only `members` is named here; the frame owns the rest (#2997).
  const stats = heroCounts(i18n.t("feed:factionHero.ua.stats.members", { count: members }), {
    members,
    tasks,
    praxes,
  });

  return (
    <header style={{ marginBottom: "var(--space-2xl)" }}>
      <div
        style={{
          /* Role map on the plate, not the margin-only header (#2673). */
          ...factionBodyVars("ua"), ...factionRoleVars("ua", "leaf-faction-hero"),
          border: "1px solid var(--faction-ua-rule)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          background: "var(--leaf-faction-hero-paper)",
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            background:
              "linear-gradient(160deg, var(--faction-ua-lift), var(--faction-ua-panel))",
            borderBottom: "1px solid var(--faction-ua-hair)",
            padding: "var(--space-3xl) var(--space-2xl)",
          }}
        >
          <UaMandala
            size={420}
            strength="texture"
            opacity={0.14}
            rings={4}
            petalsPerRing={16}
            rotation={11}
            style={{ position: "absolute", right: -140, top: -150 }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "var(--space-xl)",
            }}
          >
            <HeroMark>
              <UaSigil width={96} height={96} />
            </HeroMark>
            <div style={{ flex: 1, minWidth: 260 }}>
              <HeroKicker style={UA_EYEBROW}>{i18n.t("feed:factionHero.ua.eyebrow")}</HeroKicker>
              {/* "Unwavering" fits the 260px floor; the plate grows on wrap. */}
              <HeroWordmark
                style={{
                  fontFamily: UA_DISPLAY,
                  fontWeight: 600,
                  fontSize: "var(--text-display)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.01em",
                  color: "var(--leaf-faction-hero-ink)",
                  margin: "var(--space-xs) 0 var(--space-sm)",
                }}
              >
                {name}
              </HeroWordmark>
              {/* Tagline as a plain line in Coven's cut (#2805). */}
              <HeroTagline
                slug={slug}
                style={{
                  fontFamily: UA_DISPLAY,
                  fontWeight: 600,
                  fontSize: "var(--text-title)",
                  letterSpacing: "0.02em",
                  color: "var(--leaf-faction-hero-ink)",
                }}
              />
            </div>
          </div>
        </div>

        <HeroCounts counts={stats} style={{ display: "flex", flexWrap: "wrap" }}>
          {(stat, index) => (
            <div
              style={{
                flex: "1 1 120px",
                minWidth: 120,
                padding: "var(--space-lg) var(--space-xl)",
                borderRight:
                  index === stats.length - 1
                    ? undefined
                    : "1px solid var(--faction-ua-hair)",
              }}
            >
              <div
                style={{
                  fontFamily: UA_DISPLAY,
                  fontWeight: 600,
                  fontSize: "var(--text-title)",
                  lineHeight: 1,
                  color: "var(--leaf-faction-hero-ink)",
                }}
              >
                {stat.value}
              </div>
              <div style={{ ...UA_EYEBROW, marginTop: "var(--space-xs)" }}>
                {stat.label}
              </div>
            </div>
          )}
        </HeroCounts>
      </div>
    </header>
  );
}
