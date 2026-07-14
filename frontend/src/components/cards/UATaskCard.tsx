import { Link } from "react-router-dom";
import type { TaskOut } from "../../api/tasks";
import i18n from "../../i18n";
import LevelPill from "../ui/LevelPill";
import { UACrest, MottoRibbon } from "./UACrest";

/**
 * UA — Gilt salon crest placard (the University of Asthmatics archetype).
 * A gold-framed acquisition plate on the salon wall, center-composed around the
 * heraldic crest: masthead ("University of Asthmatics · EST · MMXX"), motto
 * ribbon, Playfair-italic title, and a "Matriculate" sign-up affordance. The
 * crest + motto are shared with UAFactionHero (see UACrest.tsx), not re-drawn.
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

export default function UATaskCard({ task, displayPoints, onSignup }: Props) {
  return (
    // Gilt frame: gold-leaf gradient border, then the parchment plate, hung with
    // a slight rotation like a plate on the salon wall.
    <div
      style={{
        minWidth: 240,
        maxWidth: 282,
        flex: "0 1 264px",
        padding: 4,
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
          padding: "18px 20px 14px",
          color: "var(--ua-ink)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Crest */}
        <UACrest width={72} height={86} />

        {/* Masthead */}
        <div
          style={{
            fontFamily: REGALIA,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--ua-orange)",
            marginTop: 8,
          }}
        >
          {i18n.t("feed:identity.ua.fullName")}
        </div>
        <div
          style={{
            fontFamily: REGALIA,
            fontSize: 8,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--ua-muted)",
            marginBottom: 10,
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
            style={{
              fontFamily: DISPLAY,
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: "var(--text-lg)",
              lineHeight: 1.2,
              margin: "12px 0 6px",
              overflowWrap: "anywhere",
            }}
          >
            {task.title}
          </div>
        </Link>

        {task.description && (
          <div
            className="card-description"
            style={{ fontFamily: SERIF, color: "var(--ua-sub)", marginBottom: 4 }}
          >
            {task.description}
          </div>
        )}

        <div
          style={{
            fontFamily: REGALIA,
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ua-gold)",
            margin: "6px 0 10px",
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
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "7px 22px",
              marginBottom: 12,
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
          <LevelPill level={task.level_required} factionSlug="ua" />
          <span
            style={{
              fontFamily: DISPLAY,
              fontStyle: "italic",
              fontSize: "var(--text-base)",
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
