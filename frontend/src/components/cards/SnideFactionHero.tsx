import { SnideSigil } from "../snide/snideAtoms";
import i18n from "../../i18n";

/**
 * S.N.I.D.E. faction-page hero — a flyposted wall (NOT a tidy poster): a
 * photocopier-black field with faint pasted-flyer ghosts, halftone + grain, a
 * torn acid strip, a slapped sigil sticker, a skewed acid wordmark with a pink
 * drop-shadow, the motto on a strip, and — per the faction-page standardization
 * — the acid stat chits stacked on the SIDE of the sigil (stats live on the side
 * of the hero, never a full-width band). Ported from the SNIDE design kit
 * (SnideHero); conforms to {@link FactionHeroProps}.
 *
 * The page passes raw counts; the faction labels them in its own voice. Motto +
 * full name are faction constants (not backend fields).
 */

const HERO_GHOSTS = [
  { w: 122, h: 152, top: -24, left: 54, rot: -12 },
  { w: 96, h: 128, top: 44, left: 232, rot: 7 },
  { w: 150, h: 92, top: 158, left: 430, rot: -5 },
  { w: 84, h: 116, top: 14, left: 690, rot: 11 },
  { w: 116, h: 150, top: 128, left: 858, rot: -8 },
];

const CHIT_ROT = [-3, 2.5, -2];

export default function SnideFactionHero({
  name,
  description,
  members,
  tasks,
  praxes,
}: {
  name: string;
  description?: string | null;
  members: number;
  tasks: number;
  praxes: number;
}) {
  const stats = [
    { value: members, label: i18n.t("feed:factionHero.snide.stats.members") },
    { value: tasks, label: i18n.t("feed:factionHero.snide.stats.tasks") },
    { value: praxes, label: i18n.t("feed:factionHero.snide.stats.praxes") },
  ];

  return (
    <header
      style={{
        position: "relative",
        overflow: "hidden",
        marginBottom: 24,
        background: "var(--faction-snide-ink)",
        color: "#fff",
        boxShadow: "8px 10px 0 rgba(0,0,0,0.32)",
        paddingBottom: 4,
      }}
    >
      <div
        className="ht-dots"
        style={{
          position: "absolute",
          inset: 0,
          color: "rgba(182,255,46,0.055)",
          pointerEvents: "none",
        }}
      />
      {/* faint pasted flyers on the wall */}
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
            border: "1px solid rgba(182,255,46,0.07)",
            background: i % 2 ? "rgba(255,45,139,0.035)" : "rgba(182,255,46,0.025)",
            transform: `rotate(${g.rot}deg)`,
            pointerEvents: "none",
          }}
        />
      ))}
      {/* torn acid strip */}
      <div
        style={{
          height: 6,
          background: "var(--faction-snide-acid)",
          position: "relative",
          zIndex: 2,
          clipPath:
            "polygon(0 0,100% 0,100% 55%,97% 100%,94% 50%,90% 100%,86% 55%,82% 100%,78% 60%,0 100%)",
        }}
      />

      {/* identity + side stat column — stats sit on the SIDE, never a band */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 30,
          padding: "26px 38px 30px",
        }}
      >
        {/* identity — eyebrow + wordmark + motto + blurb */}
        <div style={{ flex: 1, minWidth: 300 }}>
          {/* eyebrow on tape */}
          <div
            style={{
              display: "inline-block",
              width: "fit-content",
              whiteSpace: "nowrap",
              background: "var(--faction-snide-tape)",
              color: "var(--faction-snide-ink)",
              fontFamily: "var(--faction-snide-font-type)",
              fontSize: 10,
              letterSpacing: "0.05em",
              padding: "3px 12px",
              transform: "rotate(-1.5deg)",
              boxShadow: "1px 1px 0 rgba(0,0,0,0.3)",
            }}
          >
            {i18n.t("feed:factionHero.snide.eyebrow")}
          </div>
          {/* wordmark */}
          <h1
            style={{
              fontFamily: "var(--faction-snide-font-impact)",
              fontSize: 82,
              lineHeight: 0.8,
              letterSpacing: "0.02em",
              margin: "16px 0 0",
              color: "var(--faction-snide-acid)",
              textShadow: "4px 4px 0 var(--faction-snide-pink)",
              transform: "skewX(-5deg) rotate(-1.5deg)",
            }}
          >
            {name}
          </h1>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#b7b5a7",
              margin: "12px 0 0",
              transform: "rotate(-0.4deg)",
            }}
          >
            {i18n.t("feed:identity.snide.fullName")}
          </div>
          {/* motto */}
          <div
            style={{
              display: "inline-block",
              marginTop: 14,
              background: "var(--faction-snide-acid)",
              color: "var(--faction-snide-ink)",
              fontFamily: "var(--faction-snide-font-black)",
              fontSize: 15,
              letterSpacing: "0.02em",
              padding: "6px 15px",
              transform: "rotate(-2deg)",
              boxShadow: "2px 3px 0 var(--faction-snide-pink)",
            }}
          >
            {i18n.t("feed:factionHero.snide.motto")}
          </div>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 12.5,
              lineHeight: 1.6,
              maxWidth: 560,
              margin: "16px 0 0",
              color: "#e7e4d8",
            }}
          >
            {description ?? i18n.t("feed:factionHero.snide.descriptionFallback")}
          </p>
        </div>

        {/* right: slapped sigil + acid stat chits stacked on the side */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 13,
            flexShrink: 0,
            width: 196,
          }}
        >
          {/* slapped sigil sticker, tilted */}
          <div style={{ position: "relative", transform: "rotate(9deg)", margin: "2px 10px 6px 0" }}>
            <div
              style={{
                position: "relative",
                width: 94,
                height: 94,
                borderRadius: "50%",
                background: "var(--faction-snide-paper)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid var(--faction-snide)",
                boxShadow: "0 0 0 4px var(--faction-snide-ink), 3px 4px 0 rgba(0,0,0,0.4)",
              }}
            >
              <div
                className="ht-dots"
                style={{
                  position: "absolute",
                  inset: 0,
                  color: "rgba(20,17,11,0.06)",
                  borderRadius: "50%",
                  pointerEvents: "none",
                }}
              />
              <SnideSigil size={54} color="var(--faction-snide)" />
            </div>
            <div
              style={{
                position: "absolute",
                top: -9,
                left: "50%",
                marginLeft: -26,
                width: 52,
                height: 18,
                background: "var(--faction-snide-tape)",
                transform: "rotate(-7deg)",
              }}
            />
          </div>

          {/* staggered acid stat chits — not a clean band */}
          {stats.map((s, i) => (
            <div
              key={s.label}
              style={{
                alignSelf: "stretch",
                textAlign: "right",
                background: "rgba(0,0,0,0.34)",
                border: "2px solid var(--faction-snide-acid)",
                padding: "7px 14px 6px",
                transform: `rotate(${CHIT_ROT[i % CHIT_ROT.length]}deg)`,
                boxShadow: "2px 3px 0 rgba(0,0,0,0.4)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--faction-snide-font-impact)",
                  fontSize: 30,
                  lineHeight: 0.85,
                  color: "var(--faction-snide-acid)",
                  whiteSpace: "nowrap",
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 8.5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#cfcdbf",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
