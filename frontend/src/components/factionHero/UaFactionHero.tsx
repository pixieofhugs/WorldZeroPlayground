import type { FactionHeroProps } from "../../pages/FactionDetail";
import i18n from "../../i18n";
import { UaSigil } from "../sigil/UaSigil";
import UaMandala from "../factionMarks/UaMandala";
import { UA_DISPLAY, UA_EYEBROW } from "../factionMarks/uaAtoms";
import { factionRoleVars } from "../../utils/factionRoles";

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
 * THE RIBBON'S REMOVAL DID NOT SETTLE THE TAGLINE, and the sentence above was
 * read as if it had (#2805). This hero drew no tagline of any kind while the
 * other seven did, so UA was the one faction page that could not say the line
 * the catalog held for it. The owner ruled the slot back: a plain line under
 * the wordmark, in the type step Coven's hero already uses — the RIBBON is
 * still retired, the LINE is not.
 *
 * The page passes raw counts; the practice supplies its own labels from the
 * copy catalog (feed:factionHero.ua.stats.*), per ADR-0016 — presentation only,
 * no new fields.
 */
export default function UaFactionHero({
  name,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  const stats = [
    { value: members, label: i18n.t("feed:factionHero.ua.stats.members") },
    { value: tasks, label: i18n.t("feed:factionHero.stats.tasks") },
    { value: praxes, label: i18n.t("feed:factionHero.stats.praxes") },
  ];

  return (
    <header style={{ marginBottom: "var(--space-2xl)" }}>
      <div
        style={{
          /* The nine roles under this surface's prefix (#2659/#2673), on the
             PLATE rather than on the `<header>`: the header is a margin, and a
             surface's namespace should start where the surface does. */
          ...factionRoleVars("ua", "leaf-faction-hero"),
          border: "1px solid var(--faction-ua-rule)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          background: "var(--leaf-faction-hero-paper)",
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
                  color: "var(--leaf-faction-hero-ink)",
                  margin: "var(--space-xs) 0 var(--space-sm)",
                  // No overflow-wrap: a wordmark never breaks mid-word (#2000).
                  // #2332 renamed the faction from "UA" to "Unwavering
                  // Artisans", so this is no longer two glyphs. It still needs
                  // no break: the name has a space, and its longest unbreakable
                  // run — "Unwavering", ten characters of Cormorant Garamond at
                  // --text-display — sits inside the 260px column floor above,
                  // which is why the floor holds without moving. What changes
                  // is that a narrow column now wraps it to two lines instead
                  // of one; nothing clips, because the plate grows.
                }}
              >
                {name}
              </h1>
              {/* THE TAGLINE, RESTORED AS A LINE AND NOT AS THE RIBBON (#2805,
                  owner ruling). This hero drew no tagline at all — UA was the
                  one faction whose page could not say the thing the catalog
                  held for it. The gilt ribbon the redesign retired is not
                  coming back; what comes back is the plain line the other six
                  heroes draw, in Coven's cut (display face, 600,
                  `--text-title`, 0.02em) so it is the kit's existing step
                  rather than a new one. Same key as the select tile, which is
                  the whole of #2805. */}
              <div
                style={{
                  fontFamily: UA_DISPLAY,
                  fontWeight: 600,
                  fontSize: "var(--text-title)",
                  letterSpacing: "0.02em",
                  color: "var(--leaf-faction-hero-ink)",
                }}
              >
                {i18n.t("feed:factionSelect.ua.tagline")}
              </div>
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
                  color: "var(--leaf-faction-hero-ink)",
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
