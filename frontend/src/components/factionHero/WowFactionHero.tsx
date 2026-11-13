import type { FactionHeroProps } from "../../pages/FactionDetail";
import i18n from "../../i18n";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";
import { WowBannerScatter } from "../factionMarks/wowOrnament";
import { WowSigil } from "../sigil/WowSigil";
import { HeroCounts, HeroKicker, HeroMark, HeroTagline, HeroWordmark, heroCounts } from "./heroFrame";

/**
 * WOW faction hero, the recruiting banner (kit §08, #900): gilt-framed cream
 * plate, crest, MedievalSharp name, Lora motto, muster figures, court glow and a
 * seeded `WowBannerScatter` (#2727).
 *
 * No oath button: `FactionHeroProps` has no join handler (the Join block below
 * owns eligibility), so it would be a dead control.
 */
export default function WowFactionHero({
  slug,
  name,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  // Only `members` is named here; the frame owns the rest (#2997).
  const muster = heroCounts(i18n.t("feed:factionHero.wow.stats.members", { count: members }), {
    members,
    tasks,
    praxes,
  });

  return (
    <header style={{ marginBottom: "var(--space-2xl)" }}>
      <div
        style={{
          // Role map on the plate, not the margin-only header (#2674).
          ...factionBodyVars("wow"), ...factionRoleVars("wow", "wow-hero"),
          position: "relative",
          overflow: "hidden",
          borderRadius: "var(--radius-xl)",
          border: "2px solid var(--faction-wow-chronicle-border)",
          background:
            "linear-gradient(160deg, var(--faction-wow-ground-from), var(--faction-wow-ground-to))",
          boxShadow: "0 18px 40px -20px var(--faction-wow-chronicle-shadow)",
        }}
      >
        {/* Court glow, no hatch: a second hatch beat against the wallpaper's
            (#2727). */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 82% 18%, var(--faction-wow-court-glow), transparent 42%)",
          }}
        >
          <WowBannerScatter />
        </div>

        <div
          style={{
            position: "relative",
            padding: "var(--space-3xl) var(--space-2xl) var(--space-2xl)",
            textAlign: "center",
          }}
        >
          <HeroMark>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "var(--space-md)",
                filter: "drop-shadow(0 6px 8px var(--faction-wow-stamp-shadow))",
              }}
            >
              {/* Above the 56px motto floor, so the crest keeps its lettering. */}
              <WowSigil size={132} />
            </div>
          </HeroMark>

          {/* Not in the kit; the house slot, in WOW's display face. */}
          <HeroKicker
            className="label-heading"
            style={{
              fontFamily: "var(--wow-hero-face)",
              color: "var(--faction-wow-accent-deep)",
            }}
          >
            {i18n.t("feed:factionHero.wow.eyebrow")}
          </HeroKicker>

          <HeroWordmark
            style={{
              fontFamily: "var(--wow-hero-face)",
              fontSize: "var(--text-heading)",
              lineHeight: 1.05,
              color: "var(--wow-hero-ink)",
              margin: "var(--space-sm) 0 var(--space-xs)",
            }}
          >
            {name}
          </HeroWordmark>

          <HeroTagline
            slug={slug}
            as="p"
            className="content-text"
            style={{
              fontFamily: "var(--faction-wow-body-font)",
              fontStyle: "italic",
              color: "var(--wow-hero-accent)",
              margin: "0 0 var(--space-lg)",
            }}
          />


          <HeroCounts
            counts={muster}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "stretch",
              gap: "var(--space-xl)",
            }}
          >
            {(entry, index) => (
              <div
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
                      fontFamily: "var(--wow-hero-face)",
                      lineHeight: 1,
                      color: "var(--faction-wow-figure)",
                    }}
                  >
                    {entry.value}
                  </div>
                  {/* `-ground-quiet`, not `-card-muted` (4.09:1 here): 6.01:1,
                      4.61:1 at worst under the confetti/glow (#2248). */}
                  <div
                    className="label-caption"
                    style={{
                      fontFamily: "var(--faction-wow-body-font)",
                      color: "var(--faction-wow-ground-quiet)",
                      marginTop: "var(--space-xs)",
                    }}
                  >
                    {entry.label}
                  </div>
                </div>
              </div>
            )}
          </HeroCounts>
        </div>
      </div>
    </header>
  );
}
