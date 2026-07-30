import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  BAND,
  BAND_INK,
  BRASS,
  BRASS_LIGHT,
  CAPTION,
  Cornice,
  DECO,
  GlyphRegister,
  INK,
  LotusSign,
  OCHRE,
  PLATE,
  QUIET,
  READING,
  SHADOW,
  SMALL_CAPS,
  WASH,
  WingedDisc,
} from "../../factionMarks/ephemeristsPlate";
import { factionName } from "../../../utils/factions";
import { AdminOverlay } from "../shared";
import { PraxisBody, frameBase, type ArchetypeProps } from "./shared";

/**
 * The Ephemerists — THE FIELD-JOURNAL PLATE (#1207, the Valley plate at card
 * size). A papyrus leaf under a night-band masthead: a winged sun disc over an
 * incised register of glyphs, a cavetto cornice ruling it off, the entry's
 * cartouche, the Poiret One title over its Spectral gloss, and the tally cell
 * cut into the right column.
 *
 * It replaces THE CODEX (#841) — the vellum folio painted out of the retired
 * `--eph-*` family. That family is still declared and still worn by every other
 * Ephemerists surface (avatar, faction page, duel seal); what changed is that
 * this card's own metaphor moved (ADR-0055), and the two grounds may not be
 * mixed on one surface. Every colour here is a `--faction-ephemerists-plate-*`
 * token, so the card flips through the `[data-theme="dark"]` cascade with no
 * ternary. `-brass` stays a rule colour and is never an ink: labels take
 * `-caption`, running text `-quiet`.
 *
 * ONE CARD, BOTH FORM FACTORS (ADR-0067). There is no mobile twin any more — the
 * frame is `frameBase`'s flex basis, so this same plate is what a 375px column
 * shows, one card per row. Nothing here is form-factor branched.
 *
 * The ornament is the shared kit's (`ephemeristsPlate`), not a second copy:
 * `GlyphRegister`, `WingedDisc`, `Cornice`, `LotusSign`, `stepClip`. The
 * register's breathing is `.epg-glyph`, whose reduced-motion gate and resting
 * state live in index.css.
 *
 * DEVIATIONS from the vendored `#eph` / `#ephD` frames, all four in the PR body:
 *  • the drifting strip's marks are ochre and CAPTION gold, not ochre and brass
 *    — brass is a rule colour, and the strip's glyphs are set as type;
 *  • the byline keeps the shared portrait (`FactionAvatar`) rather than the
 *    design's octagon monogram: the byline slot is shared card chrome (#888) and
 *    the avatar is one convention across every faction;
 *  • the "for:" gloss is upright, not italic — `PraxisBody` owns that line's
 *    style, and a faction may not reach into a shared slot to italicise it;
 *  • the design's `border-radius` is 0 here (the design draws none), against the
 *    8 the codex folio used.
 */

/** Masthead band, and the field its register is drawn across. Geometry (§4a). */
const MASTHEAD = 110;
const MASTHEAD_VIEW = 340;
/** The wordmark's winged disc, at the design's own span. Geometry. */
const WORDMARK_DISC = 176;

/**
 * The drifting strip above the vote block — a run of marks from the plate's
 * other eras (nabla, psi, the integral), breathing out of phase on `.epg-glyph`.
 * Ornament, `aria-hidden`, and never part of an accessible name.
 */
const DRIFT = [
  "∇", "×", "Ψ", "≡", "∂", "Φ", "∕", "∂", "τ", "·", "∮", "⟨", "ψ", "‖", "Θ",
  "‖", "ψ", "⟩", "∝", "Σ", "μ", "ν", "·", "⊗", "Δ", "λ", "≥", "ϖ", "·", "∫",
  "ρ", "∂",
];

/** The cartouche's end rules. Ornament geometry, so it is shared, not repeated. */
const cartoucheTick: CSSProperties = { width: 1.5, height: 12, background: BRASS };

export function EphemeristsPraxisCard({ praxis, adminProps, showCrown }: ArchetypeProps) {
  const { t } = useTranslation("praxis");
  const { t: tVotes } = useTranslation("votes");

  return (
    <div
      style={{
        ...frameBase,
        position: "relative",
        overflow: "hidden",
        background: PLATE,
        color: INK,
        border: `1px solid ${BRASS}`,
        outline: `1px solid ${BRASS_LIGHT}`,
        outlineOffset: 3,
        boxShadow: SHADOW,
        fontFamily: READING,
        transition: "background 150ms, color 150ms",
      }}
    >
      {/* The masthead: the winged sun disc over an incised register, on night. */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          height: MASTHEAD,
          background: BAND,
          color: BAND_INK,
        }}
      >
        <svg
          width="100%"
          height={MASTHEAD}
          viewBox={`0 0 ${MASTHEAD_VIEW} ${MASTHEAD}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
        >
          <path
            d={`M33 86 H${MASTHEAD_VIEW - 33}`}
            stroke={BRASS_LIGHT}
            strokeWidth="0.6"
            opacity="0.28"
          />
          <GlyphRegister width={MASTHEAD_VIEW} y={97} strength={0.3} keyPrefix="card" />
        </svg>
        <div
          style={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-xs)",
          }}
        >
          <WingedDisc width={WORDMARK_DISC} height={40} />
          <span
            style={{
              fontFamily: DECO,
              fontSize: "var(--text-content)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: BAND_INK,
              whiteSpace: "nowrap",
            }}
          >
            {factionName(praxis.task_faction_slug)}
          </span>
        </div>
      </div>
      <Cornice />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0 var(--space-xl) var(--space-lg)",
        }}
      >
        <AdminOverlay {...adminProps} />

        {/* The entry's cartouche, ruled off at both ends. */}
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-md) 0 var(--space-sm)" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              padding: "var(--space-xs) var(--space-md)",
              border: `1.5px solid ${BRASS}`,
              borderRadius: 12,
              background: WASH,
            }}
          >
            <span aria-hidden style={cartoucheTick} />
            <span
              style={{
                ...SMALL_CAPS,
                fontWeight: 700,
                fontSize: "var(--text-sm)",
                color: INK,
                whiteSpace: "nowrap",
              }}
            >
              {t("card.masthead.ephemerists")}
            </span>
            <span aria-hidden style={cartoucheTick} />
          </span>
        </div>

        <PraxisBody
          praxis={praxis}
          // Brass is the plate's RULE colour: it frames the media well and rings
          // the roster, and never becomes an ink (see index.css).
          tint={BRASS}
          muted={QUIET}
          paper={PLATE}
          showCrown={showCrown}
          titleStyle={{ fontFamily: DECO, fontWeight: 400, letterSpacing: "0.02em", color: INK }}
          // Poiret One for the display line, Spectral for the reading matter.
          fonts={{ display: DECO, body: READING }}
          taskLead={t("card.ephemerists.for")}
          mediaEmptyLabel={t("card.ephemerists.mediaEmpty")}
          mediaEmptyStyle={{
            borderRadius: 0,
            border: `1px solid ${BRASS}`,
            background: "transparent",
            color: CAPTION,
          }}
          voteRule={
            <>
              {/* The drift, bled to the plate's edges. */}
              <div
                aria-hidden
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: 15,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                  margin: "var(--space-md) calc(var(--space-xl) * -1)",
                }}
              >
                {DRIFT.map((mark, index) => (
                  <span
                    key={`${mark}${index}`}
                    className="epg-glyph"
                    style={
                      {
                        flex: "1 1 auto",
                        textAlign: "center",
                        lineHeight: 1,
                        color: index % 2 ? CAPTION : OCHRE,
                        fontSize: index % 2 ? "var(--text-lg)" : "var(--text-sm)",
                        "--epg-op": index % 2 ? 0.72 : 0.48,
                        "--epg-delay": `${(index * 2.83) % 12}s`,
                      } as CSSProperties
                    }
                  >
                    {mark}
                  </span>
                ))}
              </div>

              {/* The vote section's head — the card states the prompt, so the
                  widget carries none and the detail page's own heading is not
                  doubled up. */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-sm)",
                  marginBottom: "var(--space-md)",
                }}
              >
                <span
                  style={{
                    ...SMALL_CAPS,
                    fontSize: "var(--text-base)",
                    letterSpacing: "0.26em",
                    color: CAPTION,
                  }}
                >
                  {tVotes("chrome.ephemerists.prompt")}
                </span>
                <span aria-hidden style={{ flex: 1, height: 1, background: BRASS, opacity: 0.5 }} />
                <LotusSign width={16} color={BRASS} />
              </div>
            </>
          }
        />
      </div>
    </div>
  );
}

export default EphemeristsPraxisCard;
