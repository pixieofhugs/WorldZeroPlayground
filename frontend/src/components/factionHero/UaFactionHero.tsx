import type { FactionHeroProps } from "../../pages/FactionDetail";
import i18n from "../../i18n";
import { UaSigil } from "../sigil/UaSigil";
import UaMandala from "../cards/UaMandala";
import { UA_DISPLAY, UA_EYEBROW, UA_TEXT } from "../cards/uaAtoms";

/**
 * UA faction-page hero (kit §13, #851).
 *
 * A wash of sand with the ensō beside the wordmark and the mandala bled off the
 * top-right at TEXTURE strength — the faction hero is one of the three surfaces
 * the pattern is allowed on (brief §5). The three counts sit in a hairline-ruled
 * strip beneath, not as engraved regalia stacked in a side column.
 *
 * The gilt museum frame, the gold leaf, the dot grid and the Latin motto ribbon
 * are gone, and so is the ruling that kept this surface undimmed: both themes
 * come from the `[data-theme="dark"]` cascade.
 *
 * The page passes raw counts; the practice supplies its own labels from the
 * copy catalog (feed:factionHero.ua.stats.*), per ADR-0016 — presentation only,
 * no new fields.
 */
export default function UaFactionHero({
  name,
  description,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  const stats = [
    { value: members, label: i18n.t("feed:factionHero.ua.stats.members") },
    { value: tasks, label: i18n.t("feed:factionHero.ua.stats.tasks") },
    { value: praxes, label: i18n.t("feed:factionHero.ua.stats.praxes") },
  ];

  return (
    <header style={{ marginBottom: "var(--space-2xl)" }}>
      <div
        style={{
          border: "1px solid var(--faction-ua-rule)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          background: "var(--faction-ua-card-bg)",
        }}
      >
        {/* ── the plate ── */}
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
            <UaSigil width={96} height={96} />
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={UA_EYEBROW}>
                {i18n.t("feed:factionHero.ua.eyebrow")}
              </div>
              <h1
                style={{
                  fontFamily: UA_DISPLAY,
                  fontWeight: 600,
                  fontSize: "var(--text-display)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.01em",
                  color: "var(--faction-ua-card-text)",
                  margin: "var(--space-xs) 0 var(--space-sm)",
                  overflowWrap: "anywhere",
                }}
              >
                {name}
              </h1>
              <p
                className="content-text"
                style={{
                  fontFamily: UA_TEXT,
                  lineHeight: 1.5,
                  color: "var(--faction-ua-card-body)",
                  maxWidth: 520,
                  margin: 0,
                }}
              >
                {description ??
                  i18n.t("feed:factionHero.ua.descriptionFallback")}
              </p>
            </div>
          </div>
        </div>

        {/* ── the counts ── */}
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {stats.map((stat, index) => (
            <div
              key={stat.label}
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
                  color: "var(--faction-ua-card-text)",
                }}
              >
                {stat.value}
              </div>
              <div style={{ ...UA_EYEBROW, marginTop: "var(--space-xs)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
