import { useState, type CSSProperties } from "react";
import catalog from "../../locales/en/glosses.json";
import { CAPS } from "./ephemeristsPlate";

/**
 * The Ephemerists' turning labels (#2148) — one gloss mechanism for the kit.
 *
 * A label rests in English and periodically turns into cuneiform, Arabic,
 * Japanese or Latin. One mechanism, one catalog (owner ruling): casts live in
 * `locales/en/glosses.json`, scripts are declared once in {@link SCRIPTS}, and
 * a call site picks only the word. Frame 0 is the live catalogue string (so
 * `Puntos` on a Spanish site); the casts are not translations.
 *
 * Safety:
 *  1. The clock is a CSS animation gated on reduced motion; no animation means
 *     no `animationiteration`, so reduced-motion readers stay on frame 0.
 *  2. Every frame renders in one grid cell, so the slot is the widest cast by
 *     layout with no measurement.
 *  3. The stack is `aria-hidden` over an sr-only copy of the live string
 *     (#2027 §4).
 *  4. Numerals never turn; only labels.
 *
 * Faces are Google Fonts `text=` subsets (`scripts/fetch-fonts.mjs` →
 * `fonts.faction.css`); `ephemeristsScriptTurn.test.tsx` checks coverage, since
 * a missing glyph silently falls to an OS font or tofu. Per-OS system faces
 * are dropped for the same reason.
 */

export const SCRIPTS = ["cuneiform", "arabic", "japanese", "latin"] as const;
type Script = (typeof SCRIPTS)[number];

export type GlossWord = keyof typeof catalog;

/** Latin uses the plate's Cinzel; the rest a subset face plus serif fallback. */
const FACES: Record<Script, CSSProperties> = {
  cuneiform: { fontFamily: "'Noto Sans Cuneiform', Georgia, serif", letterSpacing: "0.05em" },
  arabic: { fontFamily: "'Noto Naskh Arabic', Georgia, serif", letterSpacing: "0" },
  japanese: { fontFamily: "'Noto Serif JP', Georgia, serif", letterSpacing: "0.06em" },
  latin: { fontFamily: CAPS, letterSpacing: "0.22em" },
};

export interface Cast {
  script: Script;
  text: string;
  style: CSSProperties;
}

/**
 * Imported, not an i18next namespace: namespaces ride the entry chunk, and
 * these casts don't vary by locale. Importing keeps them in the faction chunk.
 */
export function casts(word: GlossWord): Cast[] {
  return SCRIPTS.map((script) => ({
    script,
    text: catalog[word][script],
    style: FACES[script],
  }));
}

/** A uniformly random frame other than `current`, in one roll. */
export function nextTurn(current: number, count: number): number {
  return (current + 1 + Math.floor(Math.random() * (count - 1))) % count;
}

/**
 * A label's phase on the shared clock (#2392; period lives in `index.css`).
 *
 * Step is −0.382 periods (golden-ratio conjugate): irrational, so ordinals stay
 * spread for any sibling count. Negative so a label starts mid-cycle instead
 * of snapping after a wait. A `calc` over the period so retuning it retunes
 * the stagger.
 *
 * `--ephturn-`, not `--eph-turn-`: `--eph-*` is a retired colour family that
 * suites forbid on plate surfaces.
 */
const phaseFor = (ordinal: number): string =>
  `calc(var(--ephturn-period) * ${(-0.382 * ordinal).toFixed(3)})`;

/**
 * `english` is the live catalogue string: accessible name and resting frame.
 * `ordinal` only sets the phase ({@link phaseFor}).
 *
 * Needs an ancestor with `eph-turn-scope` for WCAG 2.2.2 pause-on-hover/focus.
 */
export default function EphemeristsGloss({
  word,
  english,
  ordinal = 0,
}: {
  word: GlossWord;
  english: string;
  ordinal?: number;
}) {
  const [frame, setFrame] = useState(0);
  const frames: Cast[] = [{ script: "latin", text: english, style: {} }, ...casts(word)];
  return (
    <>
      <span className="sr-only">{english}</span>
      <span
        className="eph-turn"
        aria-hidden="true"
        style={{ display: "grid", textAlign: "center", whiteSpace: "nowrap", "--ephturn-phase": phaseFor(ordinal) } as CSSProperties}
        onAnimationIteration={() => setFrame((showing) => nextTurn(showing, frames.length))}
      >
        {frames.map((cast, index) => (
          <span
            key={index}
            style={{
              gridArea: "1 / 1",
              visibility: index === frame ? "visible" : "hidden",
              ...cast.style,
            }}
          >
            {cast.text}
          </span>
        ))}
      </span>
    </>
  );
}
