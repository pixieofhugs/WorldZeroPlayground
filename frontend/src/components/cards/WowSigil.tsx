import { useId, type CSSProperties } from "react";

import type { SigilVariantProps } from "./FactionSigil";

/**
 * WowSigil — THE CREST. Warriors of Whimsy's seal, and the faction's only mark.
 *
 * A gilt coin: a beaded rope ring, a motto band carrying "IMSYWHAY · ORFAY ·
 * EVERYONEWAY" (whimsy for everyone, in Pig Latin) on a circular textPath, and a
 * cream inner field where a goofy unicorn brandishes a floppy noodle sword. The
 * Pig Latin and the noodle sword are the faction's whole conceit — they are not
 * decoration and must not be simplified out.
 *
 * Ported geometry-for-geometry from the kit's `Crest.dc.html`, with every hex
 * swapped for a --faction-wow-crest-* token and every inline `animation:` moved
 * into a `prefers-reduced-motion`-gated class in index.css. The crest is drawn
 * ONCE here and reused by every WOW surface that carries the mark (masthead,
 * avatar, decree task card, faction hero, backdrop watermark, mobile header) —
 * there is no image pipeline in this repo, so the mark is inline SVG.
 *
 * THEME. The seal is struck metal and is theme-INVARIANT: the kit draws the same
 * coin on its light decree card and its dark one. Its tokens are declared once
 * in `:root`; nothing here flips. The chrome that FRAMES it (the avatar's field
 * disc) is what carries the cascade.
 *
 * MOTION. The whole seal sways (`.wow-seal`, applied here so the sway is free at
 * every use site, as it is in the kit), the sword flops, the unicorn bobs, and
 * three sparkles plus the horn glint twinkle. All four are stilled wholesale
 * under `prefers-reduced-motion` — none of them carries state.
 *
 * A11Y. Decorative, like every other faction sigil in the repo (`CovenSigil`,
 * `SnideSigil`, …): the surface that mounts the mark is what names the faction,
 * so the coin is `aria-hidden` and the drawn motto is lettering, not copy.
 */

/**
 * Below this rendered width the motto band loses its lettering and keeps only
 * its gold ring.
 *
 * The band's type is 13 units tall in a 160-unit drawing, so it renders at
 * `size * 0.081` CSS px — 5.7px at the kit's 70px decree header (small, but the
 * kit ships it and it reads as intentional texture), 3.9px at the 48px seal-on-
 * ribbon and 1.8px in a 22px avatar badge. Under ~4.5px the glyphs stop being
 * glyphs and antialias into a dirty grey smudge that dulls the band and muddies
 * the rope ring beside it, so the crest reads WORSE than with no lettering at
 * all. Dropping the `<text>` and keeping the band ring preserves the silhouette
 * — three gold rings round a cream field — which is what carries recognition at
 * badge sizes anyway. Nothing is lost semantically: the motto was never in the
 * accessible name (see A11Y above).
 */
const MOTTO_FLOOR_PX = 56;

/** The drawing is 160x168; keep that ratio at every size. */
const CREST_ASPECT = 168 / 160;

export function WowSigil({ size = 22 }: SigilVariantProps) {
  // Two <defs> ids. SVG ids are document-global, so two crests on one page (the
  // masthead and a feed avatar, say) would collide; useId keeps them apart.
  // Colons are illegal in a url(#…) reference, hence the strip — same shape as
  // PointsRoundel.
  const uid = useId().replace(/:/g, "");
  const discId = `wz-wow-disc-${uid}`;
  const mottoRingId = `wz-wow-motto-${uid}`;

  return (
    <svg
      className="wow-seal"
      width={size}
      height={Math.round(size * CREST_ASPECT)}
      viewBox="0 0 160 168"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible", flexShrink: 0 }}
    >
      <defs>
        <radialGradient id={discId} cx="42%" cy="34%" r="72%">
          <stop offset="0" stopColor="var(--faction-wow-crest-disc-lit)" />
          <stop offset="0.55" stopColor="var(--faction-wow-chronicle-gold)" />
          <stop offset="1" stopColor="var(--faction-wow-crest-disc-deep)" />
        </radialGradient>
        <path
          id={mottoRingId}
          d="M 80,80 m -63,0 a 63,63 0 1,1 126,0 a 63,63 0 1,1 -126,0"
          fill="none"
        />
      </defs>

      {/* outer coin */}
      <circle
        cx="80"
        cy="80"
        r="78"
        fill={`url(#${discId})`}
        stroke="var(--faction-wow-crest-rim)"
        strokeWidth="3"
      />
      {/* beaded rope ring */}
      <circle
        cx="80"
        cy="80"
        r="72"
        fill="none"
        stroke="var(--faction-wow-crest-rope)"
        strokeWidth="3.4"
        strokeDasharray="1.5 4.2"
        strokeLinecap="round"
        opacity="0.8"
      />
      {/* motto band */}
      <circle
        cx="80"
        cy="80"
        r="63"
        fill="none"
        stroke="var(--faction-wow-crest-band)"
        strokeWidth="19"
        opacity="0.55"
      />
      <circle
        cx="80"
        cy="80"
        r="53.5"
        fill="none"
        stroke="var(--faction-wow-crest-rim)"
        strokeWidth="1.1"
        opacity="0.6"
      />
      {size >= MOTTO_FLOOR_PX && (
        <text
          fontFamily="var(--faction-wow-body-font)"
          fontWeight="700"
          fontSize="13"
          letterSpacing="2.4"
          fill="var(--faction-wow-crest-ink)"
        >
          <textPath href={`#${mottoRingId}`} startOffset="3.5%">
            ✦ IMSYWHAY · ORFAY · EVERYONEWAY ✦ IMSYWHAY · ORFAY · EVERYONEWAY
          </textPath>
        </text>
      )}

      {/* inner cream field */}
      <circle
        cx="80"
        cy="80"
        r="52"
        fill="var(--faction-wow-crest-field)"
        stroke="var(--faction-wow-crest-field-rim)"
        strokeWidth="1.4"
      />
      <circle
        cx="80"
        cy="80"
        r="52"
        fill="none"
        stroke="var(--faction-wow-chronicle-gold)"
        strokeWidth="1"
      />

      {/* noodle sword: floppy, wobbling, held aloft */}
      <g className="wow-crest-sword">
        <path
          d="M16 148 C30 138 14 128 30 118 C46 108 26 98 44 90 C58 84 50 74 60 66"
          fill="none"
          stroke="var(--faction-wow-crest-noodle)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M16 148 C30 138 14 128 30 118 C46 108 26 98 44 90 C58 84 50 74 60 66"
          fill="none"
          stroke="var(--faction-wow-crest-noodle-line)"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M9 152 L26 141"
          stroke="var(--faction-wow-crest-rim)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle
          cx="11"
          cy="153"
          r="3.6"
          fill="var(--faction-wow-chronicle-gold)"
          stroke="var(--faction-wow-crest-rim)"
          strokeWidth="1.6"
        />
      </g>

      {/* unicorn — a goofy cartoon head facing right */}
      <g className="wow-crest-unicorn">
        {/* mane curls (plum-tinged) */}
        <g
          fill="none"
          stroke="var(--faction-wow-crest-mane)"
          strokeWidth="4.2"
          strokeLinecap="round"
        >
          <path d="M66 66 c-8 1 -12 8 -8 14" />
          <path d="M60 80 c-9 1 -13 8 -8 15" />
          <path d="M60 96 c-8 2 -11 8 -6 14" />
        </g>
        {/* head */}
        <path
          d="M70 118
             C60 114 55 104 58 93
             C52 91 49 85 51 79
             C56 82 60 81 64 78
             C65 69 72 62 82 61
             C86 58 90 58 92 61
             C93 64 92 68 90 70
             C99 73 106 80 108 90
             C109 96 107 102 103 105
             C104 110 102 115 97 117
             C95 113 92 112 89 113
             C86 118 78 121 70 118 Z"
          fill="var(--faction-wow-crest-ink)"
        />
        {/* ear */}
        <path d="M80 62 L75 47 L88 60 Z" fill="var(--faction-wow-crest-ink)" />
        {/* big googly eye */}
        <circle cx="92" cy="80" r="7.5" fill="var(--faction-wow-crest-field)" />
        <circle cx="94" cy="81.5" r="3.6" fill="var(--faction-wow-crest-pupil)" />
        <circle cx="95.4" cy="80" r="1.2" fill="var(--faction-wow-crest-shine)" />
        {/* silly grin */}
        <path
          d="M98 96 q7 5 13 1"
          fill="none"
          stroke="var(--faction-wow-crest-field)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* rosy plum cheek */}
        <circle cx="86" cy="98" r="4" fill="var(--faction-wow-crest-cheek)" opacity="0.5" />
        {/* horn, spiral, pointing up */}
        <path
          d="M88 61 L91 59 L101 34 L96 33 Z"
          fill="var(--faction-wow-crest-horn)"
          stroke="var(--faction-wow-crest-disc-deep)"
          strokeWidth="0.9"
        />
        <path
          d="M90 56 l4.5 -10 M88.5 60 l4 -9 M91.5 51 l4.4 -10"
          stroke="var(--faction-wow-crest-disc-deep)"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
        {/* horn glint */}
        <g className="wow-crest-glint">
          <path
            d="M99 33 c.4 2 1.2 2.8 3.2 3.2 c-2 .4 -2.8 1.2 -3.2 3.2 c-.4 -2 -1.2 -2.8 -3.2 -3.2 c2 -.4 2.8 -1.2 3.2 -3.2z"
            fill="var(--faction-wow-crest-shine)"
          />
        </g>
      </g>

      {/* twinkling sparkles around the field */}
      <g fill="var(--faction-wow-chronicle-gold)">
        <g className="wow-crest-twinkle">
          <path d="M40 52 c.5 3 1.6 4.2 4.6 4.7 c-3 .5 -4.1 1.7 -4.6 4.7 c-.5 -3 -1.6 -4.2 -4.6 -4.7 c3 -.5 4.1 -1.7 4.6 -4.7z" />
        </g>
        {/* the delays stagger the three sparkles; they arrive as a custom
            property so the keyframe itself stays in index.css */}
        <g
          className="wow-crest-twinkle"
          fill="var(--faction-wow-crest-mane)"
          style={{ "--wow-twinkle-delay": "0.7s" } as CSSProperties}
        >
          <path d="M118 116 c.4 2.4 1.3 3.4 3.7 3.8 c-2.4 .4 -3.3 1.4 -3.7 3.8 c-.4 -2.4 -1.3 -3.4 -3.7 -3.8 c2.4 -.4 3.3 -1.4 3.7 -3.8z" />
        </g>
        <g
          className="wow-crest-twinkle"
          style={{ "--wow-twinkle-delay": "1.3s" } as CSSProperties}
        >
          <path d="M46 120 c.4 2.4 1.3 3.4 3.7 3.8 c-2.4 .4 -3.3 1.4 -3.7 3.8 c-.4 -2.4 -1.3 -3.4 -3.7 -3.8 c2.4 -.4 3.3 -1.4 3.7 -3.8z" />
        </g>
      </g>
    </svg>
  );
}

export default WowSigil;
