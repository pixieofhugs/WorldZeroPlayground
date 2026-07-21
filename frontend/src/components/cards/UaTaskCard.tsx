import { Link } from "react-router-dom";
import type { TaskOut } from "../../api/tasks";
import i18n from "../../i18n";
import LevelGem from "../ui/LevelGem";
import {
  UA_DISPLAY,
  UA_EYEBROW,
  UA_HAIRLINE,
  UA_TEXT,
  UaEnsoScore,
  UaInkColumn,
  uaShade,
} from "./uaAtoms";

/**
 * UA task card — THE INK COLUMN (kit §1 "3a", the reference surface for the
 * whole UA redesign, #851).
 *
 * A sheet of sun-bleached stock with a single hairline of orange running down
 * the left margin and the task's marks held in an ensō at the head. That is
 * the entire ornament budget: no gilt sandwich, no rotation, no dot grid, no
 * motto ribbon, no crest.
 *
 * The mandala is deliberately ABSENT here (brief §5). A task card lives in a
 * list — dense, text-heavy, read in bulk — and the pattern is reserved for the
 * three surfaces that can afford it. The kit draws a lotus corner-bleed on this
 * card; the brief's strength ruling supersedes it, and the brief is the
 * contract.
 *
 * The level indicator is the shared {@link LevelGem}, tinted via
 * `factionCssVar` — tint only, no bespoke UA shape (brief §9).
 *
 * Both themes come from the `[data-theme="dark"]` cascade; the card dims
 * with the app like every other faction's.
 */

interface Props {
  task: TaskOut;
  displayPoints: number;
  onSignup?: (id: number) => void;
}

export default function UaTaskCard({ task, displayPoints, onSignup }: Props) {
  return (
    <article
      style={{
        position: "relative",
        overflow: "hidden",
        minWidth: 240,
        maxWidth: 282,
        flex: "0 1 264px",
        background: "var(--faction-ua-card-bg)",
        color: "var(--faction-ua-card-text)",
        border: UA_HAIRLINE,
        borderRadius: "var(--radius-sm)",
        boxShadow: `0 10px 30px -18px ${uaShade(50)}`,
        padding: "var(--space-xl) var(--space-xl) var(--space-lg)",
      }}
    >
      <UaInkColumn
        style={{
          left: "var(--space-sm)",
          top: "var(--space-xl)",
          bottom: "var(--space-lg)",
        }}
      />

      <div style={{ position: "relative", paddingLeft: "var(--space-lg)" }}>
        <div style={UA_EYEBROW}>{i18n.t("feed:taskCard.ua.estLine")}</div>

        {/* The score, in the ensō — the mark's one sanctioned use besides the
            faction mark itself. */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "var(--space-lg) 0",
          }}
        >
          <UaEnsoScore
            size={96}
            value={displayPoints}
            unit={i18n.t("tasks:ua.stats.honoraria")}
          />
        </div>

        <Link
          to={`/tasks/${task.id}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <h3
            className="content-title"
            style={{
              fontFamily: UA_DISPLAY,
              fontWeight: 600,
              lineHeight: 1.14,
              letterSpacing: "-0.005em",
              color: "var(--faction-ua-card-text)",
              margin: "0 0 var(--space-sm)",
              overflowWrap: "anywhere",
            }}
          >
            {task.title}
          </h3>
        </Link>

        {task.description && (
          <p
            className="card-description"
            style={{
              fontFamily: UA_TEXT,
              lineHeight: 1.55,
              color: "var(--faction-ua-card-body)",
              margin: "0 0 var(--space-lg)",
            }}
          >
            {task.description}
          </p>
        )}

        {onSignup && (
          <button
            onClick={() => onSignup(task.id)}
            style={{
              width: "100%",
              cursor: "pointer",
              fontFamily: UA_TEXT,
              fontSize: "var(--text-xl)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "var(--space-sm) var(--space-lg)",
              marginBottom: "var(--space-lg)",
              background: "var(--faction-ua-card-bg)",
              color: "var(--faction-ua-card-accent)",
              border: "1.5px solid var(--faction-ua)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {i18n.t("feed:taskCard.ua.signup")}
          </button>
        )}

        <div
          className="card-footer"
          style={{ borderTop: UA_HAIRLINE, paddingTop: "var(--space-md)" }}
        >
          <LevelGem level={task.level_required} factionSlug="ua" />
          <span style={{ ...UA_EYEBROW, letterSpacing: "0.16em" }}>
            {i18n.t("feed:taskCard.ua.pointsLine", { points: displayPoints })}
          </span>
        </div>
      </div>
    </article>
  );
}
