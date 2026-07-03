import { Link } from "react-router-dom";
import type { TaskOut } from "../../api/tasks";
import AlbescentMark from "./AlbescentMark";

/**
 * Albescent — Vellum correspondence. The quietest card in the grid: pure white
 * cotton paper, hairline borders, Cormorant Garamond italic title, the
 * surveyor's Mark as the only sigil. The card whispers. There is no colour, no
 * shout — a task here is an act of devotion with no audience.
 *
 * Albescent is a FIRST-CLASS identity on this surface: the explicit
 * CARD_COMPONENTS['albescent'] entry beats the albescent→ua alias via
 * pickVariant (map[slug] is looked up before the alias), so this renders as soon
 * as it is registered — it is not dead code. It reads its own component-private
 * --faction-albescent-* tokens (identical light/dark — always-light, never
 * dims) rather than factionCssVar('albescent', …), which would resolve the alias
 * to ua until the alias drops in slice 2 of #232.
 *
 * Ported from docs/design/albescent-kit (albescent-cards.jsx `AlbescentCard` +
 * `Albescent Task Card Explorations.html`). Visuals only — same prop contract as
 * every other faction task card. No hardcoded hex (CLAUDE.md).
 */

const FONT = "var(--faction-albescent-card-font)";
const MONO = "var(--faction-albescent-mono)";
const INK = "var(--faction-albescent-card-text)";
/** A near-black ink wash at the given opacity — the whole palette is one hue. */
const ink = (pct: number) => `color-mix(in srgb, ${INK} ${pct}%, transparent)`;

interface Props {
  task: TaskOut;
  displayPoints: number;
  onSignup?: (id: number) => void;
}

export default function AlbescentTaskCard({ task, displayPoints, onSignup }: Props) {
  return (
    <div
      style={{
        minWidth: 212,
        maxWidth: 248,
        flex: "0 1 224px",
        background: "var(--faction-albescent-card-bg)",
        border: `1px solid ${ink(9)}`,
        boxShadow: "0 2px 18px rgba(0,0,0,0.055), 0 1px 3px rgba(0,0,0,0.04)",
        padding: "24px 20px 18px",
        fontFamily: FONT,
        color: INK,
        boxSizing: "border-box",
      }}
    >
      {/* Centred sigil */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <AlbescentMark size={20} />
      </div>

      {/* Top rule */}
      <div style={{ height: 1, background: ink(7), marginBottom: 13 }} />

      {/* Eyebrow */}
      <div
        style={{
          fontFamily: MONO,
          fontSize: 8,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: ink(24),
          marginBottom: 10,
        }}
      >
        Albescent
      </div>

      {/* Title */}
      <Link to={`/tasks/${task.id}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div
          style={{
            fontSize: 18,
            fontStyle: "italic",
            fontWeight: 300,
            lineHeight: 1.28,
            color: INK,
            marginBottom: 11,
            overflowWrap: "anywhere",
          }}
        >
          {task.title}
        </div>
      </Link>

      {/* Description — quiet mono, clamped to three lines */}
      {task.description && (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 9,
            color: ink(42),
            lineHeight: 1.6,
            marginBottom: 16,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {task.description}
        </div>
      )}

      {/* Acknowledge — the sign-up affordance, a bordered whisper */}
      {onSignup && (
        <div style={{ marginBottom: 14 }}>
          <button
            onClick={() => onSignup(task.id)}
            style={{
              background: "none",
              border: "none",
              padding: "0 0 1px",
              cursor: "pointer",
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: ink(40),
              borderBottom: `1px solid ${ink(20)}`,
            }}
          >
            acknowledge
          </button>
        </div>
      )}

      {/* Footer — level + points, in one hue */}
      <div
        style={{
          borderTop: `1px solid ${ink(7)}`,
          paddingTop: 11,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 8,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: ink(22),
          }}
        >
          Lvl {task.level_required}
        </span>
        <span style={{ fontSize: 15, fontWeight: 300, color: ink(52) }}>
          {displayPoints}
          <span
            style={{
              fontFamily: MONO,
              fontSize: 8,
              marginLeft: 3,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            pts
          </span>
        </span>
      </div>
    </div>
  );
}
