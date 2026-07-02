import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/TaskCard";
import PraxisCard from "../../../components/PraxisCard";
import { FdlLaurel, topPraxisIndex } from "../../../components/cards/FdlLaurel";
import { computeDisplayPoints } from "../../../utils/points";
import { factionName } from "../../../utils/factions";
import type { CharacterOut } from "../../../api/auth";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * Singularity faction-body — the terminal-printout skin of the standardized
 * six-section spine (② Manifest, ③ Access, ④ Tasks, ⑤ Praxis, ⑥ Members).
 * Section ① (hero + side "system readout" stats) is SingularityFactionHero,
 * rendered above.
 *
 * Same shape as EverymenFactionBody / UaFactionBody — Tasks/Praxis reuse the
 * app-wide per-faction cards (TaskCard/PraxisCard already dispatch to the
 * Singularity archetypes); this file owns only the terminal chrome: the
 * two-column layout, the fixed "Tasks"/"Praxis" titles with system kickers, the
 * access/gate readout block, the primary-node spotlight + array roster, and the
 * FDL laurel on the single top-scoring praxis.
 *
 * Singularity is ALWAYS DARK: every colour resolves to a --faction-singularity-*
 * token that reads identically in both themes, so this body reads as a terminal
 * regardless of the global theme — it never mutates data-theme.
 */

// Token shorthands — every color resolves to a --faction-singularity-* var.
const VOID = "var(--faction-singularity-card-bg)"; // terminal black
const PHOSPHOR = "var(--faction-singularity-card-accent)"; // green
const SIGNAL = "var(--faction-singularity-card-muted)"; // blue
const BORDER_HARD = "var(--faction-singularity-border-hard)"; // blue brand
const SIGNAL_FILL = "var(--faction-singularity)"; // blue brand fill
const AMBER = "var(--underline-1)"; // credits accent (shared brand gold)
const FONT = "var(--font-faction-terminal)";

// color-mix helpers for shades that have no dedicated token.
// ponytail: green/blue only exist as full-strength tokens; the terminal skin
// needs many low-alpha tints, so derive them with color-mix rather than adding
// a dozen one-off vars.
const phosphor = (pct: number): string =>
  `color-mix(in srgb, ${PHOSPHOR} ${pct}%, transparent)`;
const signal = (pct: number): string =>
  `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`;

/** Scanline overlay reused from the hero/cards — subtle phosphor sweep. */
function Scanlines({ opacity = 0.012 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `repeating-linear-gradient(to bottom,transparent,transparent 2px,${phosphor(
          opacity * 100,
        )} 2px,${phosphor(opacity * 100)} 4px)`,
      }}
    />
  );
}

/** Void terminal panel with a signal-blue hairline border. */
const PANEL: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: VOID,
  border: `1px solid ${signal(42)}`,
};

/** Section heading — uppercase phosphor title trailing a signal rule. */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
      <h2
        style={{
          fontFamily: FONT,
          fontSize: 28,
          letterSpacing: "0.04em",
          margin: 0,
          color: PHOSPHOR,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </h2>
      <span style={{ flex: 1, height: 1, minWidth: 30, background: signal(30) }} />
    </div>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: 7.5,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: phosphor(40),
        marginBottom: 18,
      }}
    >
      {children}
    </div>
  );
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

/** Node avatar — signal-ringed initials disc. */
function NodeGlyph({ name, size }: { name: string; size: number }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        border: `1px solid ${BORDER_HARD}`,
        background: signal(14),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        fontSize: size * 0.36,
        color: SIGNAL,
      }}
    >
      {initial(name)}
    </span>
  );
}

export default function SingularityFactionBody({ state }: { state: FactionDetailState }) {
  const { faction, members, tasks, recentPraxis, viewerFactionSlug, gameFactions, membership } =
    state;
  const [confirming, setConfirming] = useState(false);

  if (!faction) return null;

  // ② manifest paragraphs — split the single description on blank lines.
  const paragraphs = (faction.description ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // ⑤ FDL goes to the single highest-scoring praxis.
  const topIdx = topPraxisIndex(recentPraxis.map((p) => p.score));

  // ⑥ spotlight = highest all-time score; array = the rest.
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const array = ranked.slice(1);

  return (
    <div className="wz-faction-grid">
      {/* ── MAIN COLUMN ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 42 }}>
        {/* ② MANIFEST */}
        <div style={{ ...PANEL, padding: "22px 26px 24px" }}>
          <Scanlines />
          <div
            style={{
              position: "relative",
              fontFamily: FONT,
              fontSize: 9,
              letterSpacing: "0.14em",
              color: signal(55),
              marginBottom: 14,
            }}
          >
            {"> cat /faction/manifest.txt"}
          </div>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
            {paragraphs.length ? (
              paragraphs.map((para, i) => (
                <p
                  key={i}
                  style={{
                    fontFamily: FONT,
                    fontSize: 11.5,
                    lineHeight: 1.8,
                    color: phosphor(72),
                    margin: 0,
                  }}
                >
                  {para}
                </p>
              ))
            ) : (
              <p style={{ fontFamily: FONT, fontSize: 11.5, lineHeight: 1.8, color: phosphor(45), margin: 0 }}>
                {"> manifest.txt: empty"}
              </p>
            )}
          </div>
        </div>

        {/* ④ TASKS */}
        <div>
          <SectionHeading>Tasks</SectionHeading>
          <Kicker>Open protocols // awaiting nodes</Kicker>
          {tasks.length === 0 ? (
            <p style={{ fontFamily: FONT, fontSize: 11, color: phosphor(45) }}>
              {"> no open protocols"}
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-start" }}>
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
          <Kicker>Sealed outputs // verified by the array</Kicker>
          {recentPraxis.length === 0 ? (
            <p style={{ fontFamily: FONT, fontSize: 11, color: phosphor(45) }}>
              {"> nothing sealed yet"}
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
              {recentPraxis.map((praxis, i) => (
                <div key={praxis.id} style={{ position: "relative", flex: "1 1 280px", minWidth: 280 }}>
                  {i === topIdx && (
                    <FdlLaurel
                      size={38}
                      innerBg={VOID}
                      glyphColor={PHOSPHOR}
                      ringInset={3}
                      shadow={`drop-shadow(0 0 4px ${phosphor(35)})`}
                      style={{ position: "absolute", top: -12, right: -8, zIndex: 5 }}
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
      <div style={{ display: "flex", flexDirection: "column", gap: 42 }}>
        {/* ③ ACCESS — join / gate / standing */}
        {membership.state !== "none" && (
          <div style={{ ...PANEL }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: SIGNAL_FILL,
                padding: "9px 15px",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: VOID,
                }}
              >
                ACCESS
              </span>
              <span style={{ fontFamily: FONT, fontSize: 8, letterSpacing: "0.1em", color: phosphor(60) }}>
                re: you
              </span>
            </div>
            <div style={{ position: "relative", padding: "20px 18px" }}>
              <Scanlines />
              <div style={{ position: "relative" }}>
                {membership.state === "member" && (
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 22, lineHeight: 1, color: PHOSPHOR, letterSpacing: "0.04em" }}>
                      NODE ONLINE
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: 10, color: signal(60), margin: "10px 0 0", letterSpacing: "0.04em" }}>
                      array · <span style={{ color: SIGNAL }}>online</span>
                    </div>
                  </div>
                )}

                {membership.state === "eligible" && !confirming && (
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 8, letterSpacing: "0.2em", color: signal(50), marginBottom: 7 }}>
                      {"> ACCESS GRANTED"}
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: 22, lineHeight: 1.05, color: PHOSPHOR, letterSpacing: "0.03em", marginBottom: 10 }}>
                      JOIN THE ARRAY
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: 10, lineHeight: 1.65, color: phosphor(60), marginBottom: 18 }}>
                      Take a node. Run protocols, seal outputs, cast signal into the consensus. The threshold is already behind us.
                    </div>
                    <button
                      onClick={() => setConfirming(true)}
                      style={{
                        width: "100%",
                        fontFamily: FONT,
                        fontSize: 11,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: VOID,
                        background: PHOSPHOR,
                        border: "none",
                        padding: 12,
                        boxShadow: `0 0 16px ${phosphor(35)}`,
                        cursor: "pointer",
                      }}
                    >
                      {"> CONNECT"}
                    </button>
                  </div>
                )}

                {membership.state === "eligible" && confirming && (
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 10, lineHeight: 1.7, color: phosphor(72), marginBottom: 14 }}>
                      {membership.currentFactionSlug &&
                      membership.currentFactionSlug !== "na" &&
                      membership.currentFactionSlug !== "aged_out"
                        ? `Join ${faction.name}? You won't be able to rejoin ${factionName(membership.currentFactionSlug)} after leaving.`
                        : `Join ${faction.name}?`}
                    </div>
                    {membership.joinError && (
                      <div style={{ fontFamily: FONT, fontSize: 9, color: "var(--color-danger)", marginBottom: 8 }}>
                        {membership.joinError}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => void membership.join()}
                        disabled={membership.joining}
                        style={{
                          flex: 1,
                          fontFamily: FONT,
                          fontSize: 10,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: VOID,
                          background: PHOSPHOR,
                          border: "none",
                          padding: 11,
                          cursor: membership.joining ? "not-allowed" : "pointer",
                        }}
                      >
                        {membership.joining ? "> CONNECTING…" : "> CONFIRM"}
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        disabled={membership.joining}
                        style={{
                          fontFamily: FONT,
                          fontSize: 8,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: signal(60),
                          background: "transparent",
                          border: `1px solid ${signal(40)}`,
                          padding: "11px 14px",
                          cursor: membership.joining ? "not-allowed" : "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {membership.state === "gate" && (
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 8, letterSpacing: "0.2em", color: signal(50), marginBottom: 7 }}>
                      {"> NODE NOT YET ONLINE"}
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: 20, lineHeight: 1.1, color: PHOSPHOR, letterSpacing: "0.03em", marginBottom: 11 }}>
                      {faction.name} is listening
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: 10, lineHeight: 1.7, color: phosphor(60) }}>
                      Keep running protocols and the array will bring your node online.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ⑥ MEMBERS — primary node + the array */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  ...PANEL,
                  border: `1px solid ${BORDER_HARD}`,
                  boxShadow: `0 0 30px -18px ${phosphor(40)}`,
                  textAlign: "center",
                  padding: "20px 18px 18px",
                }}
              >
                <Scanlines opacity={0.014} />
                <div style={{ position: "relative", fontFamily: FONT, fontSize: 7, letterSpacing: "0.28em", color: phosphor(45), marginBottom: 12 }}>
                  {"> PRIMARY NODE"}
                </div>
                <div style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <NodeGlyph name={spot.display_name} size={72} />
                </div>
                <div style={{ position: "relative", fontFamily: FONT, fontSize: 24, lineHeight: 1, color: PHOSPHOR, letterSpacing: "0.03em" }}>
                  {spot.display_name}
                </div>
                <div style={{ position: "relative", fontFamily: FONT, fontSize: 8, letterSpacing: "0.1em", color: signal(55), marginTop: 6, textTransform: "uppercase" }}>
                  lvl {spot.level} · {spot.all_time_score.toLocaleString()} cr
                </div>
              </div>
            </Link>
          )}

          <div style={{ ...PANEL, padding: "16px 16px 12px" }}>
            <Scanlines />
            <div style={{ position: "relative", fontFamily: FONT, fontSize: 7, letterSpacing: "0.24em", textTransform: "uppercase", color: phosphor(40), marginBottom: 12 }}>
              {"> THE ARRAY"}
            </div>
            {array.length === 0 ? (
              <p style={{ position: "relative", fontFamily: FONT, fontSize: 11, color: phosphor(45) }}>
                {spot ? "> no other nodes online" : "> no nodes online"}
              </p>
            ) : (
              array.map((m) => (
                <Link
                  key={m.id}
                  to={`/characters/${m.id}`}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "8px 0",
                    borderBottom: `1px solid ${signal(14)}`,
                    textDecoration: "none",
                  }}
                >
                  <NodeGlyph name={m.display_name} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: FONT,
                        fontSize: 12,
                        color: PHOSPHOR,
                        lineHeight: 1.1,
                        letterSpacing: "0.03em",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.display_name}
                    </div>
                  </div>
                  <span style={{ fontFamily: FONT, fontSize: 10, color: AMBER, letterSpacing: "0.04em" }}>
                    lvl {m.level}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
