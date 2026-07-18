import { Link } from "react-router-dom";
import type { TaskOut } from "../../api/tasks";
import i18n from "../../i18n";
import LevelGem from "../ui/LevelGem";
import { UaSigil, MottoRibbon } from "./UaSigil";

/**
 * UA — Gilt salon crest placard (the University of Asthmatics archetype).
 * A gold-framed acquisition plate on the salon wall, center-composed around the
 * heraldic crest: masthead ("University of Asthmatics · EST · MMXX"), motto
 * ribbon, Playfair-italic title, and a "Matriculate" sign-up affordance. The
 * crest + motto are shared with UaFactionHero (see UaSigil.tsx), not re-drawn.
 * All colors via --ua-* tokens (never hardcode hex — CLAUDE.md); the salon is
 * always-light, so tokens read identically in both themes.
 */

const REGALIA = "'Marcellus SC', serif";
const DISPLAY = "'Playfair Display', serif";
const SERIF = "'EB Garamond', serif";

interface Props {
  task: TaskOut;
  displayPoints: number;
  onSignup?: (id: number) => void;
}

export default function UaTaskCard({ task, displayPoints, onSignup }: Props) {
  return (
    // Gilt frame: gold-leaf gradient border, then the parchment plate, hung with
    // a slight rotation like a plate on the salon wall.
    <div
      style={{
        minWidth: 240,
        maxWidth: 282,
        flex: "0 1 264px",
        padding: "var(--space-xs)",
        background: "var(--ua-gilt)",
        transform: "rotate(-0.6deg)",
        boxShadow:
          "0 10px 22px color-mix(in srgb, var(--ua-ink) 20%, transparent), inset 0 0 0 1px color-mix(in srgb, white 40%, transparent)",
      }}
    >
      <div
        style={{
          background: "var(--ua-paper)",
          backgroundImage:
            "radial-gradient(color-mix(in srgb, var(--ua-ink) 3%, transparent) 1px, transparent 1px)",
          backgroundSize: "5px 5px",
          border: "1px solid var(--ua-line-soft)",
          padding: "var(--space-lg) var(--space-lg) var(--space-md)",
          color: "var(--ua-ink)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Crest */}
        <UaSigil width={72} height={86} />

        {/* Masthead */}
        <div
          style={{
            fontFamily: REGALIA,
            fontSize: "var(--text-base)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--ua-orange)",
            marginTop: "var(--space-sm)",
          }}
        >
          {i18n.t("feed:identity.ua.fullName")}
        </div>
        <div
          style={{
            fontFamily: REGALIA,
            fontSize: "var(--text-xs)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--ua-muted)",
            marginBottom: "var(--space-md)",
          }}
        >
          {i18n.t("feed:taskCard.ua.estLine")}
        </div>

        {/* Motto ribbon */}
        <MottoRibbon fontSize={9} padding="4px 18px" />

        <Link
          to={`/tasks/${task.id}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div
            className="content-title"
            style={{
              fontFamily: DISPLAY,
              fontStyle: "italic",
              fontWeight: 600,
              lineHeight: 1.2,
              margin: "var(--space-md) 0 var(--space-sm)",
              overflowWrap: "anywhere",
            }}
          >
            {task.title}
          </div>
        </Link>

        {task.description && (
          <div
            className="card-description"
            style={{ fontFamily: SERIF, color: "var(--ua-sub)", marginBottom: "var(--space-xs)" }}
          >
            {task.description}
          </div>
        )}

        <div
          style={{
            fontFamily: REGALIA,
            fontSize: "var(--text-sm)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ua-gold)",
            margin: "var(--space-sm) 0 var(--space-md)",
          }}
        >
          {i18n.t("feed:taskCard.ua.pointsLine", { points: displayPoints })}
        </div>

        {onSignup && (
          <button
            onClick={() => onSignup(task.id)}
            className="btn-primary"
            style={{
              fontFamily: REGALIA,
              fontSize: "var(--text-base)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "var(--space-sm) var(--space-xl)",
              marginBottom: "var(--space-md)",
              background: "var(--ua-orange)",
              border: "none",
            }}
          >
            {i18n.t("feed:taskCard.ua.signup")}
          </button>
        )}

        <div
          className="card-footer"
          style={{
            width: "100%",
            borderTop: "1px solid var(--ua-line-soft)",
          }}
        >
          <LevelGem level={task.level_required} factionSlug="ua" />
          <span
            className="content-title"
            style={{
              fontFamily: DISPLAY,
              fontStyle: "italic",
              fontWeight: 700,
              color: "var(--ua-orange)",
            }}
          >
            {displayPoints}
          </span>
        </div>
      </div>
    </div>
  );
}
