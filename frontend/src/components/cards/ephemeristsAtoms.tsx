/**
 * THE EPHEMERISTS — shared codex atoms.
 *
 * Reusable primitives for the Ephemerist (ephemerists-slug) surfaces: the sigil,
 * sacred-geometry rosettes, age-foxing, the header lockup, and the "concordance"
 * (the faction's reframe of the 1–5 vote). Ported from the Ephemerists design kit.
 *
 * Colors come only from the --eph-* token block in index.css (light + dark), so
 * every atom is theme-aware through the cascade — no hardcoded hex, no ternaries.
 */
import type { ReactNode } from "react";

/* ── Roman numerals — grades, vote tiers, entry numbers ── */
const ROMAN: Array<[string, number]> = [
  ["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100], ["XC", 90],
  ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1],
];
export function toRoman(value: number): string {
  let n = Math.max(0, Math.floor(value));
  let out = "";
  for (const [glyph, v] of ROMAN) {
    while (n >= v) {
      out += glyph;
      n -= v;
    }
  }
  return out || "0";
}

/* ── The faction sigil: the watching wanderer — an eye on an orbital ring ── */
export function EphMark({
  size = 22,
  color = "currentColor",
  stroke = 1.4,
}: {
  size?: number;
  color?: string;
  stroke?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <ellipse cx="12" cy="12" rx="11" ry="4.4" transform="rotate(-24 12 12)" />
      <path d="M4 12 C7.5 8.2 16.5 8.2 20 12 C16.5 15.8 7.5 15.8 4 12 Z" />
      <circle cx="12" cy="12" r="2.7" />
      <circle cx="12" cy="12" r="0.6" fill={color} stroke="none" />
    </svg>
  );
}

/* ── Faint age-foxing stains (multiply-blended), for vellum surfaces ── */
export function Foxing({ opacity = 0.5 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        zIndex: 1,
        mixBlendMode: "multiply",
        backgroundImage: `
          radial-gradient(8px 6px at 18% 24%, color-mix(in srgb, var(--eph-ink) 14%, transparent), transparent 70%),
          radial-gradient(5px 5px at 78% 16%, color-mix(in srgb, var(--eph-gold-deep) 16%, transparent), transparent 70%),
          radial-gradient(10px 7px at 64% 82%, color-mix(in srgb, var(--eph-ink) 10%, transparent), transparent 70%),
          radial-gradient(4px 4px at 30% 70%, color-mix(in srgb, var(--eph-rubric) 12%, transparent), transparent 70%)`,
      }}
    />
  );
}

/* ── Header lockup — sigil + name + an optional running gloss ── */
export function EphEyebrow({
  color = "var(--eph-gold-light)",
  motto,
  dark = false,
  size = 8.5,
}: {
  color?: string;
  motto?: string;
  dark?: boolean;
  size?: number;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          color,
        }}
      >
        <EphMark size={11} color={color} />
        <span
          style={{
            fontFamily: "var(--eph-display)",
            fontWeight: 600,
            fontSize: size,
            letterSpacing: "0.24em",
          }}
        >
          THE EPHEMERISTS
        </span>
      </div>
      {motto && (
        <div
          style={{
            fontFamily: "var(--eph-script)",
            fontStyle: "italic",
            fontSize: 8.5,
            color: dark
              ? "var(--eph-muted)"
              : "color-mix(in srgb, var(--eph-parchment) 65%, transparent)",
            marginTop: 1,
          }}
        >
          {motto}
        </div>
      )}
    </div>
  );
}

/* ── The wax sigil seal — gold roundel with the eye, used in heroes/badges ── */
export function EphSeal({
  size = 112,
  color = "var(--eph-gold)",
  eye = "var(--eph-lapis)",
  bg = "var(--eph-vellum)",
}: {
  size?: number;
  color?: string;
  eye?: string;
  bg?: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: bg,
        boxShadow: `0 0 0 2px ${color}, 0 0 0 5px var(--eph-ink), inset 0 0 0 4px color-mix(in srgb, ${color} 55%, transparent)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {Array.from({ length: 36 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 1,
            transformOrigin: "top center",
            transform: `translate(-50%,0) rotate(${i * 10}deg)`,
            height: i % 3 ? size * 0.04 : size * 0.07,
            background: `color-mix(in srgb, ${color} ${i % 3 ? 35 : 65}%, transparent)`,
          }}
        />
      ))}
      <EphMark size={size * 0.46} color={eye} stroke={1.2} />
    </div>
  );
}

/* ── Pull one word of a title into the lapis-blue (the faction's signature tic) ── */
export function LapisLastWord({
  text,
  footnote = false,
}: {
  text: string;
  footnote?: boolean;
}): ReactNode {
  const words = text.trim().split(" ");
  const last = words.pop() ?? "";
  return (
    <>
      {words.join(" ")}
      {words.length ? " " : ""}
      <span style={{ color: "var(--eph-lapis)" }}>{last}</span>
      {footnote && (
        <sup
          style={{
            fontFamily: "var(--eph-serif)",
            fontSize: "0.5em",
            color: "var(--eph-lapis)",
            fontWeight: 400,
          }}
        >
          †
        </sup>
      )}
    </>
  );
}

/* ── The Concordance — the faction's reframe of the 1–5 approval vote.
   A wax-seal ramp: doubt → the authoritative ink seal at V. ── */
export interface ConcordTier {
  v: number;
  label: string;
  fill: string;
  ink: string;
}
export const CONCORD: ConcordTier[] = [
  { v: 1, label: "apocryphal", fill: "var(--eph-gold)", ink: "var(--eph-ink)" },
  { v: 2, label: "disputed", fill: "var(--eph-verdigris)", ink: "var(--eph-parchment)" },
  { v: 3, label: "plausible", fill: "var(--eph-lapis)", ink: "var(--eph-parchment)" },
  { v: 4, label: "corroborated", fill: "var(--eph-rubric)", ink: "var(--eph-parchment)" },
  { v: 5, label: "canonical", fill: "var(--eph-ink)", ink: "var(--eph-gold-light)" },
];
