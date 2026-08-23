import { useState, type CSSProperties } from "react";
import catalog from "../../locales/en/glosses.json";
import { CAPS } from "./ephemeristsPlate";

/**
 * THE EPHEMERISTS' LABELS TRAVEL (#2148, epic #2140) — one gloss mechanism for
 * the whole kit.
 *
 * An Ephemerists label rests in ENGLISH and periodically turns into another
 * script, then back: cuneiform → Arabic → Japanese → Latin, drawn at random
 * each turn. The conceit is an almanac compiled by people who read four
 * scripts; it replaces #1637's kanji register, which #1909 cut wholesale as
 * generic copy, by returning the idea with a mechanism behind it instead of
 * thirteen hand-placed strings.
 *
 * ## ONE MECHANISM, ONE CATALOG — the whole point of #2148
 *
 * The vendored design writes five arrays at five moments (`CUN_POINTS`,
 * `CUN_SIGNUP`, `CUN_BASE`, `CUN_BONUS`, `CUN_WORDS`) and they have ALREADY
 * DRIFTED — `CUN_WORDS`'s Latin cast is English words while `CUN_POINTS`'s is
 * actual Latin. The owner's ruling: *"this is one backend, not translate this
 * button 3 ways and another 5 ways."* So:
 *
 *  • the casts live in `locales/en/glosses.json`, one block, because they are
 *    COPY and belong where copy lives;
 *  • the SCRIPTS are declared once, here, in {@link SCRIPTS} — a call site
 *    names a word and gets every registered script, and adding a fifth script
 *    is one entry plus one column of the catalog, not an edit at six sites;
 *  • a call site chooses nothing but which word it is glossing.
 *
 * `GlossWord` is derived from the catalog, so a word with no entry is a
 * compile error rather than an i18next miss at runtime.
 *
 * ## English is the resting state, everywhere
 *
 * The design rests in Latin; the owner overruled — "all in English when at
 * rest." Frame 0 is therefore the LIVE CATALOGUE STRING the surface already
 * printed (`Points`, `base`, `Tasks open`, and `Puntos` on a Spanish site), and
 * frames 1–4 are the casts. The casts are NOT translations of it and no
 * translator can act on them: they are the same word in four hands, which is
 * why they sit in a catalog of their own rather than beside `feed.json`'s
 * sentences.
 *
 * ## What makes it safe, in four parts
 *
 *  1. THE CLOCK IS A CSS ANIMATION in index.css, gated on
 *     `prefers-reduced-motion: no-preference`. No animation means no
 *     `animationiteration`, which means the frame never advances — a
 *     reduced-motion reader gets frame 0, in English, still, with nothing here
 *     branching on it. That is also why frame 0 is never randomised.
 *  2. EVERY FRAME IS RENDERED, all in ONE grid cell, all but the current one
 *     hidden. The slot is therefore the widest cast BY LAYOUT — no measurement
 *     pass, no `important`, and it cannot go stale when a font swaps in. The
 *     design probes the DOM for this in `cycleWire`; the idea is kept and the
 *     walking is not.
 *  3. THE WHOLE STACK IS `aria-hidden` over a visually-hidden copy of the live
 *     string, so the accessible name is the WORD at every instant — never a
 *     glyph, never a concatenation of the two (owner ruling, epic #2027 §4).
 *  4. NUMERALS STAY WESTERN, ALWAYS. Only labels turn. The cost of not decoding
 *     a cast is losing a label, not losing your score, and that is the
 *     condition the whole idea rests on — so no consumer passes a figure here.
 *
 * ## The faces are subsets of exactly these codepoints
 *
 * Three of the four scripts need a webfont, and an unsubset Noto Serif JP is
 * megabytes on every page that draws a task card. `frontend/scripts/fetch-fonts.mjs`
 * pulls each one through the Google Fonts `text=` parameter — one `@font-face`
 * over a face holding only the requested characters — into
 * `src/fonts.faction.css`, which is reached only across a chunk boundary via
 * `factionFaces.ts` and is never on the critical path.
 *
 * `TEXT_FACES` in that script and this catalog are two lists of the same
 * characters with no compiler between them, so
 * `__tests__/ephemeristsScriptTurn.test.tsx` reads the casts out of the catalog
 * and asks whether the shipped `unicode-range` covers each one. That failure is
 * invisible to whoever ships it: a glyph with no face renders in whatever the
 * viewer's OS happens to carry for the script, and as tofu if it carries none,
 * and the two look identical on a reviewer's machine.
 *
 * The design's stacks name a system font ahead of the generic — `Geeza Pro`,
 * `Hiragino Mincho ProN`, `Segoe UI Historic` — and those are deliberately
 * dropped: each covers its script on ONE platform, so relying on them renders
 * cuneiform on Windows and tofu on Android with nothing to tell them apart.
 */

/** The registered scripts, in the order the design names them. */
export const SCRIPTS = ["cuneiform", "arabic", "japanese", "latin"] as const;
export type Script = (typeof SCRIPTS)[number];

/** Every word the catalog glosses. Derived, so a typo cannot compile. */
export type GlossWord = keyof typeof catalog;

/**
 * The hand each script is set in — declared once, for every word.
 *
 * Latin rides the plate's own engraved face (Cinzel, already loaded and free).
 * The other three name their subset family with a serif fallback, never a
 * per-OS face; see the note above.
 */
const FACES: Record<Script, CSSProperties> = {
  cuneiform: { fontFamily: "'Noto Sans Cuneiform', Georgia, serif", letterSpacing: "0.05em" },
  arabic: { fontFamily: "'Noto Naskh Arabic', Georgia, serif", letterSpacing: "0" },
  japanese: { fontFamily: "'Noto Serif JP', Georgia, serif", letterSpacing: "0.06em" },
  latin: { fontFamily: CAPS, letterSpacing: "0.22em" },
};

/** One turn of the wheel: what it says, and the hand it says it in. */
export interface Cast {
  script: Script;
  text: string;
  style: CSSProperties;
}

/**
 * The registered casts of one word, read from the catalog.
 *
 * The catalog is IMPORTED rather than registered as an i18next namespace, and
 * that is a load-time decision as much as a typing one. `i18n.ts` is in the
 * entry chunk, so every namespace it names is on the critical path — and these
 * casts are not translatable copy (the Japanese for *points* is the Japanese
 * for *points* on a Spanish site too), so a namespace would put ~430 gzipped
 * bytes of ornament in front of first paint for the sake of a lookup that
 * cannot vary. Imported here it rides the faction chunk, costs the entry chunk
 * nothing, and `GlossWord` becomes a compile-time key rather than a runtime
 * miss. The file still lives in `locales/en/` because it is still COPY and that
 * is where copy is edited (see `locales/README.md`).
 */
export function casts(word: GlossWord): Cast[] {
  return SCRIPTS.map((script) => ({
    script,
    text: catalog[word][script],
    style: FACES[script],
  }));
}

/**
 * A random frame that is never the one showing.
 *
 * The design draws from the whole set and re-rolls on a collision, which can
 * loop. Stepping by 1..count-1 and wrapping picks uniformly from the other
 * frames in one roll — the same distribution without the loop.
 */
export function nextTurn(current: number, count: number): number {
  return (current + 1 + Math.floor(Math.random() * (count - 1))) % count;
}

/**
 * WHEN ONE LABEL'S TURN FALLS, as a fraction of the clock every label shares.
 *
 * There used to be two clocks — `.eph-turn-points` at 6.5s and `.eph-turn-cta`
 * at 7s — alternated by ordinal, which staggers exactly two labels. The score
 * stamp has five. #2392 collapsed them into one rule with a period and a
 * per-instance `animation-delay`, so the stagger is arithmetic HERE and the
 * period is one number in `index.css`.
 *
 * THE STEP IS IRRATIONAL ON PURPOSE: −0.382 of a period, the golden-ratio
 * conjugate, rather than `period / count`. A label does not know how many
 * siblings it has, and an irrational step keeps successive ordinals distinct
 * and well spread for ANY count — the stamp's five land 0, 3.82, 7.64, 1.46 and
 * 5.28 seconds into a 10s cycle, no two nearer than 1.4s — where a rational one
 * would fold ordinals back onto each other the moment a surface grew.
 *
 * It is NEGATIVE so the clock starts part-way in rather than after a wait: a
 * positive delay would hold the label at opacity 1 and then snap it to the
 * keyframes' 0%. See the rule in `index.css`.
 *
 * The value is a `calc` over the period token rather than a computed number of
 * seconds so that retuning the period retunes the stagger with it; a literal
 * here would be a second copy of the clock, free to drift out of step.
 */
const phaseFor = (ordinal: number): string =>
  `calc(var(--eph-turn-period) * ${(-0.382 * ordinal).toFixed(3)})`;

/**
 * ONE TURNING LABEL.
 *
 * `english` is the live catalogue string the surface would otherwise have
 * printed — it stays the accessible name and the resting frame. `ordinal` is
 * the label's position among the turning labels of its surface, and all it
 * decides is WHEN this one turns; see {@link phaseFor}.
 *
 * The stack needs an ancestor carrying `eph-turn-scope` for WCAG 2.2.2's
 * pause-on-hover/focus mechanism, which is a class on the surface's own
 * container rather than a wrapper here: a wrapper would be a box in every
 * consumer's layout for the sake of one selector.
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
        style={
          {
            display: "grid",
            textAlign: "center",
            whiteSpace: "nowrap",
            "--eph-turn-phase": phaseFor(ordinal),
          } as CSSProperties
        }
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
