import type { FactionHeroProps } from "../../pages/FactionDetail";
import i18n from "../../i18n";
import { factionRoleVars } from "../../utils/factionRoles";
import { WowBannerScatter } from "../factionMarks/wowOrnament";
import { WowSigil } from "../sigil/WowSigil";
import { HeroCounts, HeroKicker, HeroMark, HeroTagline, HeroWordmark, heroCounts } from "./heroFrame";

/**
 * WOW faction-page hero — the recruiting banner (kit §08, #900).
 *
 * A gilt-framed cream plate: the crest swaying on top, the name in
 * MedievalSharp, the motto in Lora italic, the charter's opening in the body
 * face, and the muster in three burnt-gold figures separated by gold hairlines.
 * The plum court-glow washes the plate behind all of it, and a seeded confetti
 * scatter with three still balloon bunches is thrown over the top — see
 * `WowBannerScatter` for why the kit's gilt hatch is not there any more (#2727).
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
  slug,
  name,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  // The Court names only `members`; the frame owns the other two labels and the
  // order (#2997).
  const muster = heroCounts(i18n.t("feed:factionHero.wow.stats.members"), {
    members,
    tasks,
    praxes,
  });

  return (
    <header style={{ marginBottom: "var(--space-2xl)" }}>
      <div
        style={{
          // THE ROLE MAP (#2674), on the banner plate. It goes on the PLATE and
          // not on the <header> above it: the header is only a margin, and a
          // prefix belongs to the surface that reads it.
          ...factionRoleVars("wow", "wow-hero"),
          position: "relative",
          overflow: "hidden",
          borderRadius: "var(--radius-xl)",
          border: "2px solid var(--faction-wow-chronicle-border)",
          background:
            "linear-gradient(160deg, var(--faction-wow-ground-from), var(--faction-wow-ground-to))",
          boxShadow: "0 18px 40px -20px var(--faction-wow-chronicle-shadow)",
        }}
      >
        {/* THE COURT GLOW, AND NO HATCH UNDER IT (#2727). The plate used to
            carry the page backdrop's 135° gilt hatch as well, at its own pitch
            — `20px 22px` over the wallpaper's `22px 24px` — and two grids of the
            same angle two pixels apart beat against each other. The layer is
            gone rather than re-pitched: the wallpaper now reads straight
            through the frame, and `WowBannerScatter` throws seeded confetti and
            three still balloon bunches over it instead. The glow stays; a
            radial wash never repeated and never shimmered. */}
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
              {/* well above the 56px motto floor, so the crest keeps its lettering */}
              <WowSigil size={132} />
            </div>
          </HeroMark>

          {/* The kit draws no eyebrow on the banner; every other faction hero in
              the repo carries one, so WOW gets the house slot in its own display
              face rather than a Courier line the Court would never set. */}
          <HeroKicker
            className="label-heading"
            style={{
              fontFamily: "var(--wow-hero-face)",
              color: "var(--faction-wow-accent-deep)",
            }}
          >
            {i18n.t("feed:factionHero.wow.eyebrow")}
          </HeroKicker>

          {/* The wrap rule is the frame's (#2997). The banner is full-width and
              centred, and "Warriors of Whimsy" sets at --text-heading with two
              spaces to wrap at. */}
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


          {/* ── the muster ── */}
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
                  {/* The banner is the pavilion ground, not the cream card:
                      `-card-muted` measures 4.09:1 on the plate's lower stop
                      (#f1e3b8) and 3.14:1 where the hatch and the court glow
                      above cross it, against the 4.5:1 a 12px caption owes.
                      `-ground-quiet` is that same olive walked down for this
                      ground — 6.01:1 on the stop, 4.61:1 at the crossing
                      (#2248). Both readings still hold after #2727: the hatch
                      LAYER went, but its colour did not — the confetti is drawn
                      in `-hatch` and `-court-glow` themselves, so the worst
                      crossing a caption can meet is the 4.61:1 already priced
                      here, and every flake that misses is better than that. */}
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
