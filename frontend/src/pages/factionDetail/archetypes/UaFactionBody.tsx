import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/TaskCard";
import PraxisCard from "../../../components/PraxisCard";
import { TaskCrown } from "../../../components/cards/TaskCrown";
import { toRoman } from "../../../components/cards/ephemeristsAtoms";
import { computeDisplayPoints } from "../../../utils/points";
import { factionName } from "../../../utils/factions";
import type { CharacterOut } from "../../../api/auth";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * UA (University of Asthmatics) faction-body — the gilt-salon skin of the
 * standardized six-section spine (② Prospectus, ③ The Registry, ④ Tasks,
 * ⑤ Praxis, ⑥ Members). Section ① (hero + side stats) is UAFactionHero above.
 *
 * Same shape as EverymenFactionBody — Tasks/Praxis reuse the app-wide per-faction
 * cards (TaskCard/PraxisCard already dispatch to the UA archetypes); this file
 * owns the salon chrome: the two-column layout, fixed "Tasks"/"Praxis" titles
 * with salon kickers, the enroll/gate registry block, the artist-in-residence
 * spotlight + register, and the FDL laurel on the top-scoring praxis. Levels read
 * as "Anno {roman}". Always light — UA's faction tokens never dim.
 */

const PAPER = "var(--faction-ua-card-bg)";
const PAPER_WARM = "var(--ua-paper-warm)";
const INK = "var(--faction-ua-card-text)";
const ACCENT = "var(--faction-ua-card-accent)";
const SUB = "var(--faction-ua-card-muted)";
const MUTED = "var(--ua-muted)";
const GOLD = "var(--ua-gold)";
const GOLD_LT = "var(--ua-gold-lt)";
const GOLD_PALE = "var(--ua-gold-pale)";
const LINE = "var(--ua-line)";
const LINE_SOFT = "var(--ua-line-soft)";
const GILT = "var(--ua-gilt)";

const DISPLAY = "var(--faction-ua-card-font)";
const ENGRAVED = '"Marcellus", Georgia, serif';
const MONO = "var(--font-body)";

/** Parchment card with the salon's inset gold-leaf border. */
const PLATE: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: PAPER,
  border: `1px solid ${LINE}`,
  boxShadow: `0 6px 20px rgba(60,40,10,.09), inset 0 0 0 3px ${PAPER}, inset 0 0 0 4px ${GOLD_PALE}`,
};

/** Faint parchment dot texture. */
function Grain() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: "radial-gradient(rgba(60,40,10,.03) 1px, transparent 1px)",
        backgroundSize: "5px 5px",
      }}
    />
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.26em", textTransform: "uppercase", color: MUTED, marginBottom: 7 }}>
      {children}
    </div>
  );
}

function SectionHeading({ kicker, children }: { kicker: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <Kicker>{kicker}</Kicker>
      <h2 style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 700, fontSize: 30, lineHeight: 1, color: INK, margin: 0 }}>
        {children}
      </h2>
    </div>
  );
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";
// "Anno {roman}"; level 0 shows an em-dash, matching the ephemerists convention.
const anno = (level: number) => (level > 0 ? toRoman(level) : "—");

/** Circular initials medallion — parchment face, amber italic glyph. */
function Medallion({ name, size, spotlight = false }: { name: string; size: number; spotlight?: boolean }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background: PAPER_WARM,
        border: `${spotlight ? 2 : 1}px solid ${spotlight ? ACCENT : GOLD_LT}`,
        boxShadow: spotlight ? `0 0 0 3px ${PAPER_WARM}, 0 0 0 4px ${GOLD_LT}` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: DISPLAY,
        fontStyle: "italic",
        fontWeight: 700,
        fontSize: size * 0.42,
        color: ACCENT,
      }}
    >
      {initial(name)}
    </span>
  );
}

export default function UaFactionBody({ state }: { state: FactionDetailState }) {
  const { faction, members, tasks, recentPraxis, viewerFactionSlug, gameFactions, membership } = state;
  const [confirming, setConfirming] = useState(false);

  if (!faction) return null;

  const paragraphs = (faction.description ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const register = ranked.slice(1);

  return (
    <div className="wz-faction-grid">
      {/* ── MAIN COLUMN ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 50 }}>
        {/* ② THE PROSPECTUS */}
        <div style={{ ...PLATE, padding: "26px 30px 28px" }}>
          <Grain />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.26em", textTransform: "uppercase", color: MUTED }}>
              The prospectus
            </span>
            <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD_LT}, transparent)` }} />
          </div>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
            {paragraphs.length ? (
              paragraphs.map((para, i) => (
                <p key={i} style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 15, lineHeight: 1.75, color: INK, margin: 0 }}>
                  {para}
                </p>
              ))
            ) : (
              <p style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 15, lineHeight: 1.75, color: SUB, margin: 0 }}>
                No prospectus written yet.
              </p>
            )}
          </div>
        </div>

        {/* ④ TASKS */}
        <div>
          <SectionHeading kicker="Now accepting submissions">Tasks</SectionHeading>
          {tasks.length === 0 ? (
            <p style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 14, color: SUB }}>No commissions open.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 26, alignItems: "flex-start" }}>
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
          <SectionHeading kicker="Recently exhibited & critiqued">Praxis</SectionHeading>
          {recentPraxis.length === 0 ? (
            <p style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 14, color: SUB }}>Nothing exhibited yet.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
              {recentPraxis.map((praxis) => (
                <div key={praxis.id} style={{ position: "relative", flex: "1 1 280px", minWidth: 280 }}>
                  {/* Task Crown (ADR-0028) — the skin's own corner medallion,
                      so the card's built-in stamp is suppressed. */}
                  {praxis.is_top_for_task && (
                    <TaskCrown
                      size={42}
                      innerBg={PAPER_WARM}
                      glyphColor={INK}
                      rotate="-8deg"
                      shadow="drop-shadow(1.5px 2px 0 rgba(60,40,10,.28))"
                      style={{ position: "absolute", top: -12, right: -8, zIndex: 5 }}
                    />
                  )}
                  <PraxisCard praxis={praxis} showCrown={false} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT RAIL ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 50 }}>
        {/* ③ THE REGISTRY — enroll / gate / standing */}
        {membership.state !== "none" && (
          <div style={{ ...PLATE, boxShadow: `0 8px 24px rgba(60,40,10,.12), inset 0 0 0 3px ${PAPER}, inset 0 0 0 4px ${GOLD_PALE}`, padding: "24px 22px" }}>
            <Grain />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.24em", textTransform: "uppercase", color: MUTED }}>
                The Registry
              </span>
              <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD_LT}, transparent)` }} />
            </div>
            <div style={{ position: "relative" }}>
              {membership.state === "member" && (
                <div>
                  <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 700, fontSize: 24, lineHeight: 1, color: INK }}>
                    Your name is on the wall
                  </div>
                  <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 13, color: SUB, margin: "10px 0 0" }}>
                    Standing · <span style={{ color: ACCENT }}>enrolled</span>
                  </div>
                </div>
              )}

              {membership.state === "eligible" && !confirming && (
                <div>
                  <div style={{ fontFamily: ENGRAVED, fontSize: 10, letterSpacing: "0.1em", color: GOLD, marginBottom: 5 }}>The easels are warm —</div>
                  <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 700, fontSize: 24, lineHeight: 1.02, color: INK, marginBottom: 10 }}>
                    Submit your portfolio
                  </div>
                  <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 13, lineHeight: 1.55, color: SUB, marginBottom: 18 }}>
                    All media welcome, talent optional. Enroll and take your first commission today.
                  </div>
                  <button
                    onClick={() => setConfirming(true)}
                    style={{ width: "100%", fontFamily: ENGRAVED, fontSize: 11, letterSpacing: "0.14em", color: PAPER_WARM, background: ACCENT, border: "none", padding: 12, boxShadow: "0 6px 16px rgba(194,84,31,.28)", cursor: "pointer" }}
                  >
                    Enroll ▸
                  </button>
                </div>
              )}

              {membership.state === "eligible" && confirming && (
                <div>
                  <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 13, lineHeight: 1.6, color: INK, marginBottom: 14 }}>
                    {membership.currentFactionSlug &&
                    membership.currentFactionSlug !== "na"
                      ? `Enroll in ${faction.name}? You won't be able to rejoin ${factionName(membership.currentFactionSlug)} after leaving.`
                      : `Enroll in ${faction.name}?`}
                  </div>
                  {membership.joinError && (
                    <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--color-danger)", marginBottom: 8 }}>{membership.joinError}</div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => void membership.join()}
                      disabled={membership.joining}
                      style={{ flex: 1, fontFamily: ENGRAVED, fontSize: 11, letterSpacing: "0.12em", color: PAPER_WARM, background: ACCENT, border: "none", padding: 11, cursor: membership.joining ? "not-allowed" : "pointer" }}
                    >
                      {membership.joining ? "Enrolling…" : "Confirm"}
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      disabled={membership.joining}
                      style={{ fontFamily: ENGRAVED, fontSize: 10, letterSpacing: "0.12em", color: SUB, background: "transparent", border: `1px solid ${LINE}`, padding: "11px 14px", cursor: membership.joining ? "not-allowed" : "pointer" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {membership.state === "gate" && (
                <div>
                  <div style={{ fontFamily: ENGRAVED, fontSize: 10, letterSpacing: "0.1em", color: GOLD, marginBottom: 5 }}>Not enrolled — yet</div>
                  <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 700, fontSize: 23, lineHeight: 1.04, color: INK, marginBottom: 12 }}>
                    Earn your enrollment
                  </div>
                  <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 13, lineHeight: 1.65, color: SUB }}>
                    Exhibit work worthy of {faction.name} and the Salon will send an invitation. Keep at it — talent is optional, persistence isn't.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ⑥ MEMBERS — artist in residence + the register */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              {/* gilt sandwich frame */}
              <div style={{ padding: 11, background: GILT, boxShadow: "0 12px 28px rgba(60,40,10,.22), inset 0 0 0 1px rgba(255,255,255,.45)" }}>
                <div style={{ padding: 4, background: `linear-gradient(135deg, ${GOLD}, ${GOLD_PALE})` }}>
                  <div style={{ background: PAPER_WARM, border: `1px solid ${LINE}`, padding: "20px 18px 18px", textAlign: "center" }}>
                    <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: "0.3em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>
                      Artist in Residence
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                      <Medallion name={spot.display_name} size={72} spotlight />
                    </div>
                    <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 700, fontSize: 24, lineHeight: 1, color: INK }}>
                      {spot.display_name}
                    </div>
                    <div style={{ fontFamily: ENGRAVED, fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginTop: 8 }}>
                      Anno {anno(spot.level)} · {spot.all_time_score.toLocaleString()} pts
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div style={{ ...PLATE, boxShadow: `0 4px 14px rgba(60,40,10,.08), inset 0 0 0 3px ${PAPER}, inset 0 0 0 4px ${GOLD_PALE}`, padding: "18px 20px 14px" }}>
            <Grain />
            <div style={{ position: "relative", fontFamily: MONO, fontSize: 8, letterSpacing: "0.24em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>
              The register
            </div>
            {register.length === 0 ? (
              <p style={{ position: "relative", fontFamily: DISPLAY, fontStyle: "italic", fontSize: 14, color: SUB }}>
                {spot ? "No other names on the wall yet." : "No members yet."}
              </p>
            ) : (
              register.map((m) => (
                <Link
                  key={m.id}
                  to={`/characters/${m.id}`}
                  style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${LINE_SOFT}`, textDecoration: "none" }}
                >
                  <Medallion name={m.display_name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 15, color: INK, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.display_name}
                    </div>
                  </div>
                  <span style={{ fontFamily: ENGRAVED, fontSize: 9, letterSpacing: "0.08em", color: GOLD }}>Anno {anno(m.level)}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
