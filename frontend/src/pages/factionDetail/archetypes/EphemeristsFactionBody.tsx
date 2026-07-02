import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/TaskCard";
import PraxisCard from "../../../components/PraxisCard";
import { FdlLaurel, topPraxisIndex } from "../../../components/cards/FdlLaurel";
import { EphMark, Foxing, toRoman } from "../../../components/cards/ephemeristsAtoms";
import { computeDisplayPoints } from "../../../utils/points";
import { factionName } from "../../../utils/factions";
import type { CharacterOut } from "../../../api/auth";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * Ephemerists faction-body — the illuminated-codex / discordant-map skin of the
 * standardized six-section spine (② The Apparatus, ③ The Road, ④ Tasks,
 * ⑤ Praxis, ⑥ Members). Section ① (hero + side-ledger stats) is
 * EphemeristsFactionHero, rendered above.
 *
 * Same shape as Everymen/UaFactionBody — Tasks/Praxis reuse the app-wide
 * per-faction cards (TaskCard/PraxisCard already dispatch to the Ephemerists
 * archetypes); this file only owns the codex chrome the design adds around them:
 * the two-column layout, the fixed "Tasks"/"Praxis" titles with Cormorant
 * kickers, the join/gate "Road" block, the keeper spotlight + roster, and the
 * FDL laurel on the single top-scoring praxis. Levels read as Roman numerals.
 *
 * All colour comes from --eph-* tokens (theme-aware via the cascade); this
 * faction is light-first but flips through --eph-vellum-text etc.
 */

const VELLUM = "var(--eph-vellum)";
const INK = "var(--eph-ink)";
const TEXT = "var(--eph-vellum-text)";
const PARCHMENT = "var(--eph-parchment)";
const GOLD = "var(--eph-gold)";
const GOLD_LIGHT = "var(--eph-gold-light)";
const GOLD_DEEP = "var(--eph-gold-deep)";
const RUBRIC = "var(--eph-rubric)";
const LAPIS = "var(--eph-lapis)";
const FIELD_DEEP = "var(--eph-field-deep)";
const MUTED = "var(--eph-muted)";

const DISPLAY = "var(--eph-display)";
const SERIF = "var(--eph-serif)";
const SCRIPT = "var(--eph-script)";

// ponytail: design's #c9a955 hairline is a warm gold at ~55% strength — mix gold toward the vellum.
const HAIRLINE = "color-mix(in srgb, var(--eph-gold) 62%, var(--eph-vellum))";
// ponytail: the roster's #d8c48f divider is a soft gold on vellum.
const DIVIDER = "color-mix(in srgb, var(--eph-gold) 40%, transparent)";

/** Aged-manuscript card with the design's soft ink shadow. */
const PLATE: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: VELLUM,
  border: `1px solid ${HAIRLINE}`,
  boxShadow: "0 6px 20px color-mix(in srgb, var(--eph-ink) 10%, transparent)",
};

function Kicker({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: SCRIPT, fontStyle: "italic", fontSize: 13, color: MUTED, margin: "4px 0 18px" }}>
      {children}
    </div>
  );
}

/** Cinzel section title with a lapis last word, mirroring the design. */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 30, letterSpacing: "0.03em", margin: 0, color: INK }}>
      {children}
    </h2>
  );
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";
// "grade {roman}"; level 0 shows an em-dash, matching the ephemerists convention.
const grade = (level: number) => (level > 0 ? toRoman(level) : "—");

/** Circular initials medallion — vellum face, lapis glyph, gold/ink ring. */
function Medallion({ name, size, spotlight = false }: { name: string; size: number; spotlight?: boolean }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background: VELLUM,
        boxShadow: spotlight
          ? `0 0 0 2px ${GOLD}, 0 0 0 4px ${FIELD_DEEP}`
          : `0 0 0 1px ${GOLD}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: size * 0.42,
        color: LAPIS,
      }}
    >
      {initial(name)}
    </span>
  );
}

export default function EphemeristsFactionBody({ state }: { state: FactionDetailState }) {
  const { faction, members, tasks, recentPraxis, viewerFactionSlug, gameFactions, membership } = state;
  const [confirming, setConfirming] = useState(false);

  if (!faction) return null;

  // ② apparatus paragraphs — split the single description on blank lines.
  const paragraphs = (faction.description ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  // ⑤ FDL goes to the single highest-scoring praxis.
  const topIdx = topPraxisIndex(recentPraxis.map((p) => p.score));

  // ⑥ spotlight = highest all-time score; roster = the rest.
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const roster = ranked.slice(1);

  return (
    <div className="wz-faction-grid">
      {/* ── MAIN COLUMN ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 46 }}>
        {/* ② THE APPARATUS */}
        <div style={{ ...PLATE, padding: "26px 30px 28px" }}>
          <Foxing opacity={0.5} />
          <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <EphMark size={15} color={RUBRIC} />
            <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: GOLD_DEEP }}>
              The Apparatus
            </span>
            <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
          </div>
          <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 12 }}>
            {paragraphs.length ? (
              paragraphs.map((para, i) => (
                <p key={i} style={{ fontFamily: SERIF, fontSize: 14.5, lineHeight: 1.78, color: TEXT, margin: 0 }}>
                  {para}
                </p>
              ))
            ) : (
              <p style={{ fontFamily: SERIF, fontSize: 14.5, lineHeight: 1.78, color: MUTED, margin: 0 }}>
                No apparatus recorded yet.
              </p>
            )}
          </div>
        </div>

        {/* ④ TASKS */}
        <div>
          <SectionHeading>Tasks</SectionHeading>
          <Kicker>Surveys awaiting a hand to triangulate them</Kicker>
          {tasks.length === 0 ? (
            <p style={{ fontFamily: SCRIPT, fontStyle: "italic", fontSize: 14, color: MUTED }}>No surveys open.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  displayPoints={computeDisplayPoints(
                    task.point_value,
                    viewerFactionSlug,
                    task.primary_faction_slug,
                    gameFactions,
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* ⑤ PRAXIS */}
        <div>
          <SectionHeading>Praxis</SectionHeading>
          <Kicker>Truths filed to the codex &amp; weighed for concordance</Kicker>
          {recentPraxis.length === 0 ? (
            <p style={{ fontFamily: SCRIPT, fontStyle: "italic", fontSize: 14, color: MUTED }}>Nothing sealed to the codex yet.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
              {recentPraxis.map((praxis, i) => (
                <div key={praxis.id} style={{ position: "relative", flex: "1 1 280px", minWidth: 280 }}>
                  {i === topIdx && (
                    <FdlLaurel
                      size={44}
                      innerBg={VELLUM}
                      glyphColor={INK}
                      rotate="-8deg"
                      shadow="drop-shadow(1.5px 2px 0 color-mix(in srgb, var(--eph-ink) 28%, transparent))"
                      style={{ position: "absolute", top: -14, right: -10, zIndex: 5 }}
                    />
                  )}
                  <PraxisCard praxis={praxis} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT RAIL ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 46 }}>
        {/* ③ THE ROAD — join / gate / standing */}
        {membership.state !== "none" && (
          <div style={{ ...PLATE, boxShadow: "0 8px 24px color-mix(in srgb, var(--eph-ink) 12%, transparent)", padding: 0 }}>
            <div style={{ background: LAPIS, color: PARCHMENT, padding: "9px 16px", fontFamily: DISPLAY, fontWeight: 600, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", boxShadow: `inset 0 -2px 0 ${GOLD}` }}>
              The Road
            </div>
            <div style={{ position: "relative", padding: "22px 20px" }}>
              <Foxing opacity={0.4} />
              <div style={{ position: "relative", zIndex: 2 }}>
                {membership.state === "member" && (
                  <div>
                    <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, lineHeight: 1.02, color: INK }}>
                      Your name is in the codex
                    </div>
                    <div style={{ fontFamily: SERIF, fontSize: 13, color: MUTED, margin: "10px 0 0" }}>
                      Standing · <span style={{ fontStyle: "italic", color: RUBRIC }}>keeper of the road</span>
                    </div>
                  </div>
                )}

                {membership.state === "eligible" && !confirming && (
                  <div>
                    <div style={{ fontFamily: SCRIPT, fontStyle: "italic", fontSize: 13, color: GOLD_DEEP, marginBottom: 5 }}>
                      The codex lies open —
                    </div>
                    <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 23, lineHeight: 1.02, color: INK, marginBottom: 10 }}>
                      Walk with the keepers
                    </div>
                    <div style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 1.6, color: TEXT, marginBottom: 18 }}>
                      Take a survey, triangulate what you find, and file it to the record. The road is long and forks often.
                    </div>
                    <button
                      onClick={() => setConfirming(true)}
                      style={{ width: "100%", fontFamily: DISPLAY, fontWeight: 600, fontSize: 13, letterSpacing: "0.14em", color: PARCHMENT, background: LAPIS, border: "none", padding: 12, boxShadow: `inset 0 0 0 1px ${GOLD}, 0 6px 16px color-mix(in srgb, var(--eph-field-deep) 40%, transparent)`, cursor: "pointer" }}
                    >
                      TAKE THE ROAD ▸
                    </button>
                  </div>
                )}

                {membership.state === "eligible" && confirming && (
                  <div>
                    <div style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 1.6, color: TEXT, marginBottom: 14 }}>
                      {membership.currentFactionSlug &&
                      membership.currentFactionSlug !== "na" &&
                      membership.currentFactionSlug !== "aged_out"
                        ? `Join ${faction.name}? You won't be able to rejoin ${factionName(membership.currentFactionSlug)} after leaving.`
                        : `Join ${faction.name}?`}
                    </div>
                    {membership.joinError && (
                      <div style={{ fontFamily: SERIF, fontSize: 12, color: "var(--color-danger)", marginBottom: 8 }}>{membership.joinError}</div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => void membership.join()}
                        disabled={membership.joining}
                        style={{ flex: 1, fontFamily: DISPLAY, fontWeight: 600, fontSize: 12, letterSpacing: "0.12em", color: PARCHMENT, background: LAPIS, border: "none", padding: 11, boxShadow: `inset 0 0 0 1px ${GOLD}`, cursor: membership.joining ? "not-allowed" : "pointer" }}
                      >
                        {membership.joining ? "SEALING…" : "CONFIRM"}
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        disabled={membership.joining}
                        style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 12, letterSpacing: "0.06em", color: MUTED, background: "transparent", border: `1px solid ${HAIRLINE}`, padding: "11px 14px", cursor: membership.joining ? "not-allowed" : "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {membership.state === "gate" && (
                  <div>
                    <div style={{ fontFamily: SCRIPT, fontStyle: "italic", fontSize: 13, color: GOLD_DEEP, marginBottom: 5 }}>
                      Not yet in the codex —
                    </div>
                    <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 21, lineHeight: 1.08, color: INK, marginBottom: 11 }}>
                      Earn your place on the road
                    </div>
                    <div style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 1.65, color: TEXT }}>
                      File surveys worthy of {faction.name} and the keepers will send word. The road is long — keep triangulating, and the record will remember.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ⑥ MEMBERS — keeper of the road + the keepers */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background: `radial-gradient(120% 130% at 50% 0%, ${LAPIS}, ${FIELD_DEEP} 70%)`,
                  color: PARCHMENT,
                  border: `2px solid ${GOLD}`,
                  boxShadow: `0 0 0 3px ${VELLUM}, 0 0 0 4px ${INK}`,
                  textAlign: "center",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    opacity: 0.12,
                    backgroundImage: `repeating-linear-gradient(0deg, ${GOLD_LIGHT} 0 1px, transparent 1px 20px), repeating-linear-gradient(90deg, ${GOLD_LIGHT} 0 1px, transparent 1px 20px)`,
                  }}
                />
                <div style={{ position: "relative", zIndex: 2, padding: "20px 18px 18px" }}>
                  <div style={{ fontFamily: SCRIPT, fontStyle: "italic", fontSize: 11, letterSpacing: "0.06em", color: GOLD_LIGHT, marginBottom: 12 }}>
                    Keeper of the road
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <Medallion name={spot.display_name} size={72} spotlight />
                  </div>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, lineHeight: 1, color: PARCHMENT }}>
                    {spot.display_name}
                  </div>
                  <div style={{ fontFamily: SERIF, fontSize: 8.5, letterSpacing: "0.1em", textTransform: "uppercase", color: `color-mix(in srgb, ${PARCHMENT} 70%, transparent)`, marginTop: 6 }}>
                    grade {grade(spot.level)} · {spot.all_time_score.toLocaleString()} pvncta
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div style={{ ...PLATE, boxShadow: "0 4px 14px color-mix(in srgb, var(--eph-ink) 8%, transparent)", padding: "18px 20px 14px" }}>
            <Foxing opacity={0.4} />
            <div style={{ position: "relative", zIndex: 2, fontFamily: DISPLAY, fontWeight: 600, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: GOLD_DEEP, marginBottom: 12 }}>
              The keepers
            </div>
            {roster.length === 0 ? (
              <p style={{ position: "relative", zIndex: 2, fontFamily: SCRIPT, fontStyle: "italic", fontSize: 14, color: MUTED }}>
                {spot ? "No other names in the codex yet." : "No members yet."}
              </p>
            ) : (
              roster.map((m) => (
                <Link
                  key={m.id}
                  to={`/characters/${m.id}`}
                  style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${DIVIDER}`, textDecoration: "none" }}
                >
                  <Medallion name={m.display_name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: SERIF, fontSize: 15, color: TEXT, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.display_name}
                    </div>
                  </div>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 11, color: RUBRIC }}>grade {grade(m.level)}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
