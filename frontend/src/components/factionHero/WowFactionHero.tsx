import type { FactionHeroProps } from "../../pages/FactionDetail";
import i18n from "../../i18n";
import { WowSigil } from "../sigil/WowSigil";

/**
 * WOW faction-page hero — the recruiting banner (kit §08, #900).
 *
 * A gilt-framed cream plate: the crest swaying on top, the name in
 * MedievalSharp, the motto in Lora italic, the charter's opening in the body
 * face, and the muster in three burnt-gold figures separated by gold hairlines.
 * The plum court-glow and the 135° gilt hatch wash the plate behind all of it,
 * exactly as the kit draws them.
 *
 * NO OATH BUTTON. The kit puts a "Take the Oath ⚔" CTA at the foot of the
 * banner, but `FactionHeroProps` carries no join handler — enlisting lives in
 * the Join block on the page BELOW the hero, which owns the eligibility flags.
 * A button here would be a dead control, and the style guide's "every button
 * does something" is stricter than fidelity to the mock. The gilt lozenge the
 * kit designed for it ships on the pledge card instead, where the CTA is real.
 *
 * The page hands raw counts; the Court supplies its own labels from the copy
 * catalog (feed:factionHero.wow.stats.*), per ADR-0016 — presentation only.
 */
export default function WowFactionHero({
  name,
  description,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  const muster = [
    { value: members, label: i18n.t("feed:factionHero.wow.stats.members") },
    { value: tasks, label: i18n.t("feed:factionHero.stats.tasks") },
    { value: praxes, label: i18n.t("feed:factionHero.stats.praxes") },
  ];

  return (
    <header style={{ marginBottom: "var(--space-2xl)" }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "var(--radius-xl)",
          border: "2px solid var(--faction-wow-chronicle-border)",
          background:
            "linear-gradient(160deg, var(--faction-wow-ground-from), var(--faction-wow-ground-to))",
          boxShadow: "0 18px 40px -20px var(--faction-wow-chronicle-shadow)",
        }}
      >
        {/* court-glow + gilt hatch, the same pair the page backdrop wears */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 82% 18%, var(--faction-wow-court-glow), transparent 42%), repeating-linear-gradient(135deg, transparent 0 20px, var(--faction-wow-hatch) 20px 22px)",
          }}
        />

        <div
          style={{
            position: "relative",
            padding: "var(--space-3xl) var(--space-2xl) var(--space-2xl)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "var(--space-md)",
              filter: "drop-shadow(0 6px 8px var(--faction-wow-stamp-shadow))",
            }}
          >
            {/* well above the 56px motto floor, so the crest keeps its lettering */}
            <WowSigil size={132} />
          </div>

          {/* The kit draws no eyebrow on the banner; every other faction hero in
              the repo carries one, so WOW gets the house slot in its own display
              face rather than a Courier line the Court would never set. */}
          <div
            className="label-heading"
            style={{
              fontFamily: "var(--faction-wow-card-font)",
              color: "var(--faction-wow-accent-deep)",
            }}
          >
            {i18n.t("feed:factionHero.wow.eyebrow")}
          </div>

          <h1
            style={{
              fontFamily: "var(--faction-wow-card-font)",
              fontSize: "var(--text-heading)",
              lineHeight: 1.05,
              color: "var(--faction-wow-card-text)",
              margin: "var(--space-sm) 0 var(--space-xs)",
              overflowWrap: "anywhere",
            }}
          >
            {name}
          </h1>

          <p
            className="content-text"
            style={{
              fontFamily: "var(--faction-wow-body-font)",
              fontStyle: "italic",
              color: "var(--faction-wow-card-accent)",
              margin: "0 0 var(--space-lg)",
            }}
          >
            {i18n.t("feed:factionHero.wow.motto")}
          </p>

          <p
            className="content-text"
            style={{
              fontFamily: "var(--faction-wow-body-font)",
              lineHeight: 1.55,
              color: "var(--faction-wow-card-text)",
              maxWidth: 560,
              margin: "0 auto var(--space-xl)",
            }}
          >
            {description ?? i18n.t("feed:factionHero.wow.descriptionFallback")}
          </p>

          {/* ── the muster ── */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "stretch",
              gap: "var(--space-xl)",
            }}
          >
            {muster.map((entry, index) => (
              <div
                key={entry.label}
                style={{ display: "flex", alignItems: "stretch", gap: "var(--space-xl)" }}
              >
                {index > 0 && (
                  <span
                    aria-hidden="true"
                    style={{ width: 1, background: "var(--faction-wow-rule)" }}
                  />
                )}
                <div>
                  <div
                    className="content-title"
                    style={{
                      fontFamily: "var(--faction-wow-card-font)",
                      lineHeight: 1,
                      color: "var(--faction-wow-figure)",
                    }}
                  >
                    {entry.value}
                  </div>
                  <div
                    className="label-caption"
                    style={{
                      fontFamily: "var(--faction-wow-body-font)",
                      color: "var(--faction-wow-card-muted)",
                      marginTop: "var(--space-xs)",
                    }}
                  >
                    {entry.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
