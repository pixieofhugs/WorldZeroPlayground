import { Link } from "react-router-dom";
import type { TaskOut } from "../../api/tasks";
import i18n from "../../i18n";
import AlbescentSigil from "./AlbescentSigil";

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
        padding: "var(--space-xl) var(--space-lg) var(--space-lg)",
        fontFamily: FONT,
        color: INK,
        boxSizing: "border-box",
      }}
    >
      {/* Centred sigil */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-lg)" }}>
        <AlbescentSigil size={20} />
      </div>

      {/* Top rule */}
      <div style={{ height: 1, background: ink(7), marginBottom: "var(--space-md)" }} />

      {/* Eyebrow */}
      <div
        style={{
          fontFamily: MONO,
          fontSize: "var(--text-xs)",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: ink(24),
          marginBottom: "var(--space-md)",
        }}
      >
        {i18n.t("feed:taskCard.albescent.eyebrow")}
      </div>

      {/* Title */}
      <Link to={`/tasks/${task.id}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div
          className="content-title"
          style={{
            fontStyle: "italic",
            fontWeight: 300,
            lineHeight: 1.28,
            color: INK,
            marginBottom: "var(--space-md)",
            overflowWrap: "anywhere",
          }}
        >
          {task.title}
        </div>
      </Link>

      {/* Description — quiet mono, clamped to three lines */}
      {task.description && (
        <div
          className="content-text"
          style={{
            fontFamily: MONO,
            /* Muted body ink — shares the AA-cleared token (0.61α ≈ 4.64:1 on
               white) so the description meets WCAG AA rather than the old
               ink(42) wash (~2.9:1). #594. */
            color: "var(--faction-albescent-card-muted)",
            lineHeight: 1.6,
            marginBottom: "var(--space-lg)",
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
        <div style={{ marginBottom: "var(--space-lg)" }}>
          <button
            onClick={() => onSignup(task.id)}
            style={{
              background: "none",
              border: "none",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: 1px lead holding the letterpress hairline against its label; the nearest rung detaches the rule.
              padding: "0 0 1px",
              cursor: "pointer",
              fontFamily: MONO,
              fontSize: "var(--text-sm)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: ink(40),
              borderBottom: `1px solid ${ink(20)}`,
            }}
          >
            {i18n.t("feed:taskCard.albescent.signup")}
          </button>
        </div>
      )}

      {/* Footer — level + points, in one hue */}
      <div
        style={{
          borderTop: `1px solid ${ink(7)}`,
          paddingTop: "var(--space-md)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: "var(--text-xs)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: ink(22),
          }}
        >
          {i18n.t("feed:taskCard.albescent.level", { level: task.level_required })}
        </span>
        <span className="content-title" style={{ fontWeight: 300, color: ink(52) }}>
          {displayPoints}
          <span
            style={{
              fontFamily: MONO,
              fontSize: "var(--text-xs)",
              marginLeft: "var(--space-xs)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {i18n.t("feed:taskCard.albescent.pointsUnit")}
          </span>
        </span>
      </div>
    </div>
  );
}
