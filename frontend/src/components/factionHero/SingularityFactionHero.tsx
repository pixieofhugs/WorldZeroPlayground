import { Trans } from "react-i18next";
import type { FactionHeroProps } from "../../pages/FactionDetail";
import i18n from "../../i18n";
import { SingularitySigil } from "../sigil/SingularitySigil";
import { factionRoleVars } from "../../utils/factionRoles";
import { HeroCounts, HeroKicker, HeroMark, HeroTagline, HeroWordmark, heroCounts } from "./heroFrame";

/**
 * Singularity faction-page hero — a terminal boot-sequence frontispiece. The
 * masthead reads as the faction initializing itself: a phosphor-green/blue
 * printout on a terminal-black field, framed by an inset signal border,
 * scanlines, a corner phosphor glow, and a slow-spinning sigil. Ported from the
 * Singularity design kit (SgHero); conforms to {@link FactionHeroProps}.
 *
 * Singularity is ALWAYS DARK: its --faction-singularity-* tokens are identical
 * in both themes, so the container styles itself with them and reads as a
 * terminal regardless of the global theme — it never mutates data-theme.
 *
 * The page passes raw counts; the faction labels them in its own terminal
 * voice. Motto + boot lines are faction constants (not backend fields).
 */

// Token shorthands. The five core ones are ROLES now (#2675) — the faction
// supplies the map, this surface picks the prefix, and the masthead below
// declares `--sg-hero-*` on itself with `factionRoleVars`. Each read carries
// today's token as its fallback, so a mount outside that element (there is
// none) resolves to the byte-identical value it always did. `-border` and
// `-border-hard` are not roles and stay exactly as they are: decision 07 keeps
// a surface's genuine extras local to the surface.
const VOID = "var(--sg-hero-paper)"; // terminal black
const PHOSPHOR = "var(--sg-hero-accent)"; // green
const PHOSPHOR_TEXT = "var(--sg-hero-ink)"; // green
const SIGNAL = "var(--sg-hero-quiet)"; // blue
const BORDER = "var(--faction-singularity-border)";
const BORDER_HARD = "var(--faction-singularity-border-hard)";
const FONT = "var(--font-faction-terminal)";

// color-mix helpers for shades that have no dedicated token.
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
  // The array names only `members`; the frame owns the other two labels and the
  // order (#2997). Per the standardization rule these sit in a side "system
  // readout" column beside the sigil, never a full-width band under the blurb.
  const stats = heroCounts(i18n.t("feed:factionHero.singularity.stats.members"), {
    members,
    tasks,
    praxes,
  });

  return (
    <header
      style={{
        ...factionRoleVars("singularity", "sg-hero"),
        position: "relative",
        overflow: "hidden",
        marginBottom: "var(--space-2xl)",
        border: `1px solid ${BORDER_HARD}`,
        background: VOID,
        color: PHOSPHOR_TEXT,
        fontFamily: FONT,
        // The hero casts onto the FACTION PAGE, not onto itself — that ground
        // is `--color-bg-page` and it flips, so this is the ordinary lift
        // (#1609). The tile being always-dark says nothing about its shadow.
        boxShadow: "0 24px 60px -28px var(--color-cast-shadow)",
      }}
    >
      {/* inset signal border */}
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
      {/* scanlines */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          // The one raw colour left in a file whose docblock says "every color
          // resolves to a --faction-singularity-* var" (#1609). It was WHITE at
          // 1.8% on a green-phosphor terminal; `phosphor()` is this file's own
          // helper and keeps the density exactly, so only the hue moves — onto
          // the faction's, which is what the other eight rasters draw.
          background: `repeating-linear-gradient(to bottom,transparent,transparent 2px,${phosphor(1.8)} 2px,${phosphor(1.8)} 4px)`,
        }}
      />
      {/* corner phosphor glow */}
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

      {/* THE SPLIT IS CSS NOW (#2997). This was the family's one
          `useFormFactor()` read — #1314 gave it one because a hard `1fr 240px`
          grid at 375px squeezed the boot lines to nothing, and left a note that
          the media query "belongs to index.css, which is not this PR's to
          edit". `.sg-hero-split` in 06-faction-chrome-2.css is that query,
          on the same 767px breakpoint the hook was reading. */}
      <div className="sg-hero-split" style={{ position: "relative", zIndex: 2 }}>
        {/* The identity column, and the wordmark's SIZING CONTAINER (#2222).
            `container-type: inline-size` earns its keep twice here. It gives the
            mark below a `cqw` to resolve against — the track's own width, which
            is what the mark actually has to fit — and it takes the column's
            min-content contribution to zero, so the `1fr` track above stops
            being floored by an eleven-character unbreakable word and shoving
            the whole grid past the header's clipped edge. */}
        <div style={{ containerType: "inline-size" }}>
          {/* boot lines */}
          <div
            style={{
              fontSize: "var(--text-md)",
              letterSpacing: "0.18em",
              color: signal(55),
              marginBottom: "var(--space-lg)",
              lineHeight: 1.9,
            }}
          >
            <div>{">"} {i18n.t("feed:factionHero.singularity.boot.faction", { name: name.toUpperCase() })}</div>
            <div>{">"} {i18n.t("feed:factionHero.singularity.boot.status")}</div>
            <div>
              {">"}{" "}
              <Trans
                ns="feed"
                i18nKey="factionHero.singularity.boot.threshold"
                components={{ 1: <span style={{ color: PHOSPHOR }} /> }}
              />
            </div>
          </div>

          {/* THE KICKER SINGULARITY DID NOT HAVE (#2997 ruling 1). This hero
              was the one of nine with no eyebrow: its boot sequence was read as
              filling the slot, and the owner ruled that it does not — uniformity
              wins, and the array gets the house line like everyone else.

              It sits BELOW the boot lines and directly above the wordmark,
              which is where the other seven put theirs; the boot sequence is
              this kit's own preamble and keeps its place at the top. The cut is
              the readout title's — the terminal's label register — a step
              brighter than the boot lines so the two do not read as one block.

              ponytail: the STRING is provisional — see #3018, which tracks the
              owner's word for it. `factionHero.singularity.eyebrow` in
              feed.json holds a stand-in written in the faction's own voice
              until then; it is deliberately not the shared "Faction". */}
          <HeroKicker
            style={{
              fontSize: "var(--text-md)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: signal(70),
              marginBottom: "var(--space-md)",
            }}
          >
            {i18n.t("feed:factionHero.singularity.eyebrow")}
          </HeroKicker>

          {/* name */}
          <HeroWordmark
            style={{
              fontFamily: FONT,
              // The mark CAPS rather than overflows (#2222), the doctrine
              // WORLD_ZERO_STYLE.md sets on the Everymen wordmark (#2000). 56px
              // is the terminal's display size and the ceiling; below it the
              // mark scales.
              //
              // The arm is `cqw` and not the `vw` Everymen takes, because this
              // hero's track is not a fraction of the viewport: a fixed 240px
              // readout column sits beside it and the 320px desktop rail sits
              // outside it, so one viewport width yields three different track
              // widths. A `vw` arm fitted to the phone is capped long before
              // 768px and would leave the mark overflowing at ~768-800px, and
              // again at ~1024-1160px with the rail open.
              //
              // 14 is measured, not picked: Share Tech Mono advances 0.54em per
              // glyph, so "Singularity" — eleven characters, no space and no
              // break opportunity, the longest single-word faction name — is
              // 11 x (0.54 + 0.04) = 6.38em wide. 6.38 x 0.14 = 0.89 of the
              // track, so the mark keeps ~11% of its column as air at every
              // width, and the cap engages once the track passes ~400px.
              //
              // ornament: terminal wordmark — the Singularity hero's display
              // type, off the --text-* scale on purpose. This carried a
              // no-raw-style-values disable while it was a bare `56`; the
              // ratchet does not look inside `min()`, so the directive reported
              // unused and had to come off. Same as the Everymen mark.
              fontSize: "min(56px, 14cqw)",
              lineHeight: 0.9,
              letterSpacing: "0.04em",
              margin: "0 0 var(--space-md)",
              color: PHOSPHOR,
            }}
          >
            {name}
          </HeroWordmark>

          {/* motto */}
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

        {/* right column: spinning sigil + side "system readout" stats */}
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

          {/* system readout — stats stacked in a side panel */}
          <div
            style={{
              alignSelf: "stretch",
              border: `1px solid ${BORDER}`,
              background: "var(--faction-singularity-light)",
            }}
          >
            <div
              style={{
                fontSize: "var(--text-md)",
                letterSpacing: "0.2em",
                color: signal(55),
                textTransform: "uppercase",
                padding: "var(--space-sm) var(--space-md) var(--space-xs)",
                borderBottom: `1px solid ${signal(28)}`,
              }}
            >
              {i18n.t("feed:factionHero.singularity.readoutTitle")}
            </div>
            {/* The readout PANEL is the kit's — it has a titled header row the
                other eight rows-containers do not — so the frame's row sits
                inside it as a plain box. The three rows are blocks either way,
                so nothing moves. */}
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

      {/* signal strip at the foot of the masthead */}
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
