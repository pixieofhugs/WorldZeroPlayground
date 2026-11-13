import type { FactionHeroProps } from "../../pages/FactionDetail";
import { SnideSigil } from "../sigil/SnideSigil";
import i18n from "../../i18n";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";
import { HeroCounts, HeroKicker, HeroMark, HeroTagline, HeroWordmark, heroCounts } from "./heroFrame";

/**
 * S.N.I.D.E. faction hero, a flyposted wall (kit SnideHero): flyer ghosts,
 * halftone, torn acid strip, sigil sticker, skewed acid wordmark, motto strip,
 * acid stat chits on the side.
 *
 * The ground is the FLIPPING `-wall` (#2343), so type takes the flipping
 * `-note-*` inks, not `-card-*` (1.05:1 on the light wall). Acid has no darker
 * rung, so acid-as-type sits on the invariant black `PLATE` (#2173): a censor
 * bar by day, invisible by night. That asymmetry is the ruling.
 */

/** Flips: xerox stock by day, black by night. */
const WALL = "var(--faction-snide-wall)";
/** 16.03:1 light / 17.52:1 dark. */
const NOTE_INK = "var(--faction-snide-note-ink)";
/** The hue `.snide-backdrop` draws its raster with; flips with the wall. */
const GRAIN = "var(--faction-snide-wall-text)";
const ACID = "var(--faction-snide-acid)";
/** Invariant plate acid owes the wall (#2173). */
const PLATE = "var(--faction-snide-ink)";
/** Flipping chrome hue; on the frozen `PLATE` disc it's 6.93 / 15.55:1 (#2368). */
const CHROME = "var(--snd-hero-fill)";
/** Invariant raster ink on the disc. */
const STOCK = "var(--faction-snide-paper)";

const HERO_GHOSTS = [
  { w: 122, h: 152, top: -24, left: 54, rot: -12 },
  { w: 96, h: 128, top: 44, left: 232, rot: 7 },
  { w: 150, h: 92, top: 158, left: 430, rot: -5 },
  { w: 84, h: 116, top: 14, left: 690, rot: 11 },
  { w: 116, h: 150, top: 128, left: 858, rot: -8 },
];

const CHIT_ROT = [-3, 2.5, -2];

export default function SnideFactionHero({
  slug,
  name,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  // Only `members` is named here; the frame owns the rest (#2997).
  const stats = heroCounts(i18n.t("feed:factionHero.snide.stats.members", { count: members }), {
    members,
    tasks,
    praxes,
  });

  return (
    <header
      style={{
        ...factionBodyVars("snide"), ...factionRoleVars("snide", "snd-hero"),
        position: "relative",
        overflow: "hidden",
        marginBottom: "var(--space-xl)",
        background: WALL,
        color: NOTE_INK,
        // ornament (#1609): print offset register, not elevation. 40% is the
        // shared strength (#2302).
        boxShadow: "8px 10px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)",
        paddingBottom: "var(--space-xs)",
      }}
    >
      {/* Densities are the drawing and stay here; the hue is `GRAIN`, which
          flips with the wall so the raster stays visible (#2343). */}
      <div
        className="ht-dots"
        style={{
          position: "absolute",
          inset: 0,
          color: `color-mix(in srgb, ${GRAIN} 5.5%, transparent)`,
          pointerEvents: "none",
        }}
      />
      {HERO_GHOSTS.map((g, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: g.top,
            left: g.left,
            width: g.w,
            height: g.h,
            border: `1px solid color-mix(in srgb, ${GRAIN} 7%, transparent)`,
            background: `color-mix(in srgb, ${GRAIN} ${i % 2 ? "3.5%" : "2.5%"}, transparent)`,
            transform: `rotate(${g.rot}deg)`,
            pointerEvents: "none",
          }}
        />
      ))}
      {/* Torn acid strip: a wordless mark that reads by chroma, owes no ratio. */}
      <div
        style={{
          height: 6,
          background: ACID,
          position: "relative",
          zIndex: 2,
          clipPath:
            "polygon(0 0,100% 0,100% 55%,97% 100%,94% 50%,90% 100%,86% 55%,82% 100%,78% 60%,0 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "var(--space-2xl)",
          padding: "var(--space-xl) var(--space-3xl) var(--space-2xl)",
        }}
      >
        {/* `min(…, 100%)`: a 375px phone leaves only 263px inner (#1314). */}
        <div style={{ flex: 1, minWidth: "min(300px, 100%)" }}>
          <HeroKicker
            style={{
              display: "inline-block",
              width: "fit-content",
              whiteSpace: "nowrap",
              color: NOTE_INK,
              fontFamily: "var(--faction-snide-font-type)",
              fontSize: "var(--text-base)",
              letterSpacing: "0.05em",
              transform: "rotate(-1.5deg)",
            }}
          >
            {i18n.t("feed:factionHero.snide.eyebrow")}
          </HeroKicker>
          {/* Acid wordmark on the plate (#2173; acid is 1.026:1 on the light
              wall). The plate is on an inline span, not the h1: an inline
              background covers the font's full ascent/descent, while the h1's
              0.8 leading would clip it. `<hgroup>` ties the subhead (#2368). */}
          <hgroup style={{ margin: 0 }}>
          <HeroWordmark
            style={{
              fontFamily: "var(--faction-snide-font-black)",
              // Archivo Black runs 5.109em for S.N.I.D.E. (+0.2em track); inner width is
              // 100vw - 140px (page margin, band gutters, plate, shadow). 82px caps it.
              fontSize: "min(82px, calc((100vw - 140px) / 5.8))",
              lineHeight: 0.8,
              letterSpacing: "0.02em",
              margin: "var(--space-lg) 0 0",
              textShadow: "4px 4px 0 var(--faction-snide-pink)",
              transform: "skewX(-5deg) rotate(-1.5deg)",
            }}
          >
            <span style={{ color: ACID, background: PLATE, padding: "0 var(--space-md)" }}>{name}</span>
          </HeroWordmark>
          {/* A subhead, not a caption (#2368): marker face, full ink, and
              `--text-xl` so it never sits below the eyebrow's rung. */}
          <p
            style={{
              fontFamily: "var(--faction-snide-font-marker)",
              fontSize: "var(--text-xl)",
              lineHeight: 1.05,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: NOTE_INK,
              // Clears the PLATE, not the letters (#2495): the inline plate
              // hangs ~29px below the h1 plus the rotation's dip, and in light
              // the subhead ink equals the plate. `--space-3xl` is a tangency.
              // Floor asserted in `snidePlateClearsTheSubhead.test.tsx`.
              margin: "var(--space-4xl) 0 0",
              transform: "rotate(-0.4deg)",
            }}
          >
            {i18n.t("feed:identity.snide.fullName")}
          </p>
          </hgroup>
          <HeroTagline
            slug={slug}
            style={{
              display: "inline-block",
              marginTop: "var(--space-lg)",
              // Brings its own ground: 15.55:1 in both cascades.
              background: ACID,
              color: PLATE,
              fontFamily: "var(--faction-snide-font-black)",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: motto slapped on an acid sticker, rotated -2deg — illustration, not chrome
              fontSize: 15,
              letterSpacing: "0.02em",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: inset of the motto on its acid sticker; rounding reflows the sticker.
              padding: "6px 15px",
              transform: "rotate(-2deg)",
              boxShadow: "2px 3px 0 var(--faction-snide-pink)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "var(--space-md)",
            flexShrink: 0,
            width: 196,
          }}
        >
          <HeroMark>
          {/* eslint-disable-next-line local/no-raw-style-values -- ornament: offset of the slapped sigil sticker; rounding reflows the tilted paste-up. */}
          <div style={{ position: "relative", transform: "rotate(9deg)", margin: "2px 10px 6px 0" }}>
            <div
              style={{
                position: "relative",
                width: 94,
                height: 94,
                borderRadius: "50%",
                // Black in both cascades (owner ruling, #2368); the chrome mark
                // clears AA at both ends, so it may keep flipping.
                background: PLATE,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                // The chrome rim is the disc's only edge at night (disc vs dark
                // wall is 1.05:1); it matches the chits' rim below.
                border: `2px solid ${CHROME}`,
                // Offset register (#1609).
                boxShadow: "3px 4px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)",
              }}
            >
              {/* Invariant paper raster on the black disc (#2368). */}
              <div
                className="ht-dots"
                style={{
                  position: "absolute",
                  inset: 0,
                  color: `color-mix(in srgb, ${STOCK} 6%, transparent)`,
                  borderRadius: "50%",
                  pointerEvents: "none",
                }}
              />
              {/* A drawn mark owes 3:1 (WCAG 1.4.11); 6.93 / 15.55:1. */}
              <SnideSigil size={54} color={CHROME} />
            </div>
          </div>
          </HeroMark>

          {/* Staggered chits; the row box repeats the column's gap/stretch. */}
          <HeroCounts
            counts={stats}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-md)",
              alignSelf: "stretch",
            }}
          >
            {(s, i) => (
            <div
              style={{
                alignSelf: "stretch",
                textAlign: "right",
                // Opaque plate, not a wash: acid owes it (#2173, #2343).
                background: PLATE,
                color: ACID,
                border: `2px solid ${ACID}`,
                // eslint-disable-next-line local/no-raw-style-values -- ornament: inset of a rotated stat chit; rounding reflows the staggered stack.
                padding: "7px 14px 6px",
                transform: `rotate(${CHIT_ROT[i % CHIT_ROT.length]}deg)`,
                // Offset register (#1609).
                boxShadow: "2px 3px 0 color-mix(in srgb, var(--color-print-offset) 40%, transparent)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--faction-snide-font-black)",
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: chit numeral in the impact face; above the content floor already
                  fontSize: 30,
                  lineHeight: 0.85,
                  // Acid is inherited: ink and plate on one element (#2173).
                  whiteSpace: "nowrap",
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: "var(--faction-snide-font-type)",
                  fontSize: "var(--text-md)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  // Card tier only here: the chit is a slab, not the wall.
                  color: "var(--snd-hero-quiet)",
                }}
              >
                {s.label}
              </div>
            </div>
            )}
          </HeroCounts>
        </div>
      </div>
    </header>
  );
}
