import type { FactionOut } from "../../api/factions";
import { factionCssVar } from "../../utils/factions";
import EverymenCard from "./EverymenFactionCard";
import SnideMasthead from "./SnideMasthead";
import { EphSeal, LapisLastWord } from "./ephemeristsAtoms";

/**
 * FactionCard — faction-archetype switcher.
 *
 * Renders a visually distinct PREVIEW card per faction slug, mirroring the task
 * card archetypes but showing faction info (name, description, status). It is a
 * pure preview: the whole grid card is a link to the faction's detail page, and
 * ALL membership actions (Join / Leave / Accept / Decline) live on that page's
 * membership block (issue #347). The card carries no interactive controls.
 */

export interface FactionCardProps {
  faction: FactionOut;
  status: string;
  /** When set, renders a "NEW INVITATION" eyebrow above the card content. */
  invitationNote?: string | null;
}

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status, slug }: { status: string; slug: string }) {
  if (status === "member") {
    return (
      <span
        className="eyebrow"
        style={{
          fontSize: 8,
          color: "var(--color-success)",
          letterSpacing: "0.1em",
        }}
      >
        MEMBER
      </span>
    );
  }
  if (status === "invited") {
    return (
      <span
        className="eyebrow"
        style={{
          fontSize: 8,
          color: "var(--color-warning)",
          letterSpacing: "0.1em",
        }}
      >
        INVITED
      </span>
    );
  }
  if (status === "burned" || status === "defected") {
    return (
      <span
        className="eyebrow"
        style={{
          fontSize: 8,
          color: factionCssVar(slug, "card-muted"),
          background: factionCssVar(slug, "light"),
          border: `1px solid ${factionCssVar(slug, "border")}`,
          letterSpacing: "0.1em",
          padding: "2px 6px",
        }}
      >
        BURNED
      </span>
    );
  }
  if (status === "welcome_back" || status === "can_return") {
    return (
      <span
        className="eyebrow"
        style={{
          fontSize: 8,
          color: factionCssVar(slug),
          letterSpacing: "0.1em",
        }}
      >
        WELCOME BACK
      </span>
    );
  }
  return null;
}

// ─── Invitation note ──────────────────────────────────────────────────────────

function InvitationNote({ slug, note }: { slug: string; note: string }) {
  return (
    <div
      className="eyebrow"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 8,
        color: factionCssVar(slug),
        background: factionCssVar(slug, "light"),
        border: `1px solid ${factionCssVar(slug, "border")}`,
        padding: "2px 6px",
        letterSpacing: "0.12em",
        marginBottom: 6,
      }}
    >
      <span style={{ fontWeight: 700 }}>NEW INVITATION</span>
      <span style={{ opacity: 0.75 }}>· {note}</span>
    </div>
  );
}

// ─── Per-faction archetypes ───────────────────────────────────────────────────

const ROTATIONS = [-2, 1.5, -1, 2.5];

function UACard({
  faction,
  status,
  invitationNote,
}: FactionCardProps) {
  const rotation = ROTATIONS[faction.slug.length % ROTATIONS.length];
  const desc = faction.description
    ? faction.description.slice(0, 100) +
      (faction.description.length > 100 ? "…" : "")
    : "";
  return (
    <div
      style={{
        width: "100%",
        background: factionCssVar("ua", "card-bg"),
        clipPath: "polygon(0 0, 100% 0, 100% 88%, 88% 100%, 0 100%)",
        transform: `rotate(${rotation}deg)`,
        position: "relative",
        padding: "28px 16px 20px",
        fontFamily: "var(--font-body)",
        color: factionCssVar("ua", "card-text"),
        transition: "background 150ms, color 150ms",
        boxSizing: "border-box",
      }}
    >
      {/* Push pin */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: factionCssVar("ua", "card-accent"),
          border: "2px solid rgba(0,0,0,0.25)",
        }}
      />
      {invitationNote && (
        <InvitationNote slug={faction.slug} note={invitationNote} />
      )}
      <div
        className="card-meta"
        style={{ color: factionCssVar("ua", "card-accent"), marginBottom: 6 }}
      >
        <StatusBadge status={status} slug="ua" />
      </div>
      <div
        style={{
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: 8,
        }}
      >
        {faction.name}
      </div>
      {desc && (
        <div
          className="card-description"
          style={{ color: factionCssVar("ua", "card-muted"), marginBottom: 10 }}
        >
          {desc}
        </div>
      )}
    </div>
  );
}

// ─── Warriors of Whimsy ".exe" window atoms ──────────────────────────────────────────────

/** A small sparkle glyph used in the wow.exe title bar. */
function WowSparkle({
  size = 10,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 1c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
        fill={color}
      />
    </svg>
  );
}

/** A tiny white die-cut ivy sticker peeking off the window corner. */
function WowIvySticker({
  stem,
  leaf,
}: {
  stem: string;
  leaf: string;
}) {
  return (
    <svg width="22" height="26" viewBox="0 0 20 22" aria-hidden="true">
      <path
        d="M5 22C5 14 4 8 6 2"
        stroke={stem}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M5 12c-5-1-5-6-5-6 4 0 6 3 5 6Z" fill={leaf} />
      <path d="M6 7c4-1 5-5 5-5-3 0-5 2-5 5Z" fill={leaf} />
    </svg>
  );
}

function WowCard({
  faction,
  status,
  invitationNote,
}: FactionCardProps) {
  const desc = faction.description
    ? faction.description.slice(0, 100) +
      (faction.description.length > 100 ? "…" : "")
    : "";
  const titleText = "var(--faction-wow-title-text)";
  return (
    <div
      style={
        {
          position: "relative",
          width: "100%",
          fontFamily: "var(--font-body)",
          boxSizing: "border-box",
        } as React.CSSProperties
      }
    >
      {/* the .exe window frame */}
      <div
        style={
          {
            position: "relative",
            borderRadius: 12,
            overflow: "hidden",
            border: "2px solid var(--faction-wow-win-border)",
            transition: "background 150ms, color 150ms",
            boxSizing: "border-box",
          } as React.CSSProperties
        }
      >
        {/* title bar */}
        <div
          style={
            {
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 11px",
              background:
                "linear-gradient(180deg, var(--faction-wow-title-from), var(--faction-wow-title-to))",
              borderBottom: "2px solid var(--faction-wow-win-border)",
            } as React.CSSProperties
          }
        >
          <span style={{ display: "flex", gap: 5 }}>
            <span
              style={{
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: "#fb7aa8",
                border: "1.5px solid rgba(255,255,255,0.7)",
              }}
            />
            <span
              style={{
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: "#f6c75e",
                border: "1.5px solid rgba(255,255,255,0.7)",
              }}
            />
            <span
              style={{
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: "#86cfa6",
                border: "1.5px solid rgba(255,255,255,0.7)",
              }}
            />
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10.5,
              color: titleText,
              letterSpacing: "0.03em",
            }}
          >
            <WowSparkle size={10} color={titleText} /> wow.exe
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: titleText,
              opacity: 0.75,
              letterSpacing: "1.5px",
            }}
          >
            ▭ ✕
          </span>
        </div>
        {/* dotted body */}
        <div
          style={
            {
              position: "relative",
              padding: "14px 14px 13px",
              background: "var(--faction-wow-body-bg)",
              backgroundImage:
                "radial-gradient(var(--faction-wow-dot) 1.4px, transparent 1.4px)",
              backgroundSize: "13px 13px",
            } as React.CSSProperties
          }
        >
          {/* ivy sticker peeking off the body's lower-left corner */}
          <span
            style={{
              position: "absolute",
              bottom: -2,
              left: 6,
              filter: "drop-shadow(0 2px 2px rgba(120,40,80,0.28))",
              zIndex: 3,
              pointerEvents: "none",
            }}
          >
            <WowIvySticker
              stem="var(--faction-wow-ivy)"
              leaf="var(--faction-wow-ivy-leaf)"
            />
          </span>
          {invitationNote && (
            <InvitationNote slug={faction.slug} note={invitationNote} />
          )}
          {/* notepad panel */}
          <div
            style={
              {
                position: "relative",
                zIndex: 2,
                background: "var(--faction-wow-notepad-bg)",
                border: "1.5px solid var(--faction-wow-notepad-border)",
                borderRadius: 7,
                padding: "11px 13px",
                marginBottom: 11,
              } as React.CSSProperties
            }
          >
            <div
              className="card-meta"
              style={{
                color: factionCssVar("wow", "card-accent"),
                marginBottom: 4,
              }}
            >
              <StatusBadge status={status} slug="wow" />
            </div>
            <div
              style={{
                fontFamily: factionCssVar("wow", "card-font"),
                fontSize: 26,
                fontWeight: 700,
                lineHeight: 1.05,
                color: factionCssVar("wow", "card-text"),
                marginBottom: 4,
              }}
            >
              {faction.name}
            </div>
            {desc && (
              <div
                style={{
                  fontSize: 10,
                  lineHeight: 1.5,
                  color: factionCssVar("wow", "card-muted"),
                }}
              >
                {desc}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const SNIDE_TORN_CLIP =
  "polygon(0% 0%, 4% 100%, 8% 20%, 12% 90%, 16% 10%, 20% 80%, 24% 0%, 28% 100%, 32% 15%, 36% 85%, 40% 5%, 44% 95%, 48% 20%, 52% 80%, 56% 0%, 60% 100%, 64% 15%, 68% 90%, 72% 5%, 76% 85%, 80% 0%, 84% 100%, 88% 20%, 92% 80%, 96% 10%, 100% 0%)";

function SnideCard({
  faction,
  status,
  invitationNote,
}: FactionCardProps) {
  const desc = faction.description
    ? faction.description.slice(0, 100) +
      (faction.description.length > 100 ? "…" : "")
    : "";
  const words = desc.split(" ");
  const mid = Math.ceil(words.length / 2);
  const col1 = words.slice(0, mid).join(" ");
  const col2 = words.slice(mid).join(" ");
  return (
    <div
      style={{
        width: "100%",
        background: factionCssVar("snide", "card-bg"),
        position: "relative",
        padding: "14px 14px 16px",
        fontFamily: factionCssVar("snide", "card-font"),
        color: factionCssVar("snide", "card-text"),
        transition: "background 150ms, color 150ms",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -1,
          left: 0,
          right: 0,
          height: 6,
          background: "var(--color-bg-page)",
          clipPath: SNIDE_TORN_CLIP,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -1,
          left: 0,
          right: 0,
          height: 6,
          background: "var(--color-bg-page)",
          clipPath: SNIDE_TORN_CLIP,
        }}
      />
      <div className="snide-tape" style={{ top: -10, left: 22, transform: "rotate(-8deg)" }} />
      <SnideMasthead subtitle="field dispatch" />
      {invitationNote && (
        <InvitationNote slug={faction.slug} note={invitationNote} />
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: "var(--text-lg)", lineHeight: 1.2 }}>
          {faction.name}
        </div>
        <StatusBadge status={status} slug="snide" />
      </div>
      {desc && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1px 1fr",
            gap: 4,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 8,
              color: factionCssVar("snide", "card-muted"),
              lineHeight: 1.5,
            }}
          >
            {col1}
          </div>
          <div style={{ background: "var(--color-border)" }} />
          <div
            style={{
              fontSize: 8,
              color: factionCssVar("snide", "card-muted"),
              lineHeight: 1.5,
            }}
          >
            {col2}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The Ephemerists — a codex frontispiece "join me" card. Lapis celestial field
 * masthead with the sigil seal, gold rules, the name with one word in the blue,
 * and a vellum body. Colors via the --eph-* tokens (theme-aware).
 */
function EphemeristsCard({
  faction,
  status,
  invitationNote,
}: FactionCardProps) {
  const desc = faction.description
    ? faction.description.slice(0, 110) +
      (faction.description.length > 110 ? "…" : "")
    : "";
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        border: "2px solid var(--eph-gold)",
        boxShadow: "0 0 0 1px var(--eph-ink)",
        fontFamily: "var(--eph-serif)",
        transition: "background 150ms, color 150ms",
      }}
    >
      {/* Celestial-field masthead */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 18px",
          background:
            "radial-gradient(120% 150% at 82% 0%, var(--eph-lapis), var(--eph-field-deep) 60%, #05131c 100%)",
          color: "var(--eph-parchment)",
          borderBottom: "3px solid var(--eph-gold)",
        }}
      >
        <EphSeal size={64} bg="var(--eph-vellum)" eye="var(--eph-lapis)" />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--eph-serif)",
              fontSize: 8,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "var(--eph-gold-light)",
              marginBottom: 4,
            }}
          >
            World Zero · Faction №5
          </div>
          <div
            style={{
              fontFamily: "var(--eph-display)",
              fontWeight: 800,
              fontSize: 26,
              lineHeight: 0.92,
              color: "var(--eph-parchment)",
              textShadow: "1px 1px 0 var(--eph-field-deep)",
            }}
          >
            <LapisLastWord text={faction.name} />
          </div>
        </div>
      </div>
      {/* Vellum body */}
      <div
        style={{
          background: "var(--eph-vellum)",
          color: "var(--eph-vellum-text)",
          padding: "12px 16px 14px",
        }}
      >
        {invitationNote && (
          <InvitationNote slug={faction.slug} note={invitationNote} />
        )}
        <div
          className="card-meta"
          style={{ color: "var(--eph-rubric)", marginBottom: 6 }}
        >
          <StatusBadge status={status} slug="ephemerists" />
        </div>
        {desc && (
          <div
            className="card-description"
            style={{ color: "var(--eph-muted)", marginBottom: 10, fontStyle: "italic" }}
          >
            {desc}
          </div>
        )}
      </div>
    </div>
  );
}

function SingularityHoles() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 6,
        padding: "4px 0",
      }}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          style={{
            width: 6,
            height: 4,
            background: "rgba(10,26,14)",
            border:
              "1px solid var(--faction-singularity-card-accent, var(--faction-singularity-border-hard))",
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

function SingularityCard({
  faction,
  status,
  invitationNote,
}: FactionCardProps) {
  const desc = faction.description
    ? faction.description.slice(0, 100) +
      (faction.description.length > 100 ? "…" : "")
    : "";
  return (
    <div
      style={{
        width: "100%",
        background: "var(--faction-singularity-card-bg)",
        border: "1px solid var(--faction-singularity-border-hard)",
        position: "relative",
        fontFamily: factionCssVar("singularity", "card-font"),
        color: "var(--faction-singularity-card-text)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Scanline overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.015) 2px, rgba(74,222,128,0.015) 4px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {/* Corner brackets */}
      <div
        style={{
          position: "absolute",
          top: 3,
          left: 3,
          width: 10,
          height: 10,
          borderTop: "1px solid var(--faction-singularity-card-text)",
          borderLeft: "1px solid var(--faction-singularity-card-text)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 3,
          right: 3,
          width: 10,
          height: 10,
          borderTop: "1px solid var(--faction-singularity-card-text)",
          borderRight: "1px solid var(--faction-singularity-card-text)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 3,
          left: 3,
          width: 10,
          height: 10,
          borderBottom: "1px solid var(--faction-singularity-card-text)",
          borderLeft: "1px solid var(--faction-singularity-card-text)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 3,
          right: 3,
          width: 10,
          height: 10,
          borderBottom: "1px solid var(--faction-singularity-card-text)",
          borderRight: "1px solid var(--faction-singularity-card-text)",
        }}
      />
      <SingularityHoles />
      <div
        style={{ padding: "6px 16px 12px", position: "relative", zIndex: 2 }}
      >
        {invitationNote && (
          <InvitationNote slug={faction.slug} note={invitationNote} />
        )}
        <div
          style={{
            fontSize: 8,
            color: "var(--faction-singularity-card-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            marginBottom: 8,
          }}
        >
          singularity protocol
          <span
            style={{
              display: "inline-block",
              width: 5,
              height: 9,
              background: "var(--faction-singularity-card-text)",
              marginLeft: 3,
              verticalAlign: "middle",
              animation: "blink 1s step-end infinite",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: "var(--text-md)", lineHeight: 1.3 }}>
            {"> "}
            {faction.name}
          </div>
          <StatusBadge status={status} slug="singularity" />
        </div>
        {desc && (
          <div
            style={{
              fontSize: 9,
              color: "var(--faction-singularity-card-muted)",
              lineHeight: 1.5,
              marginBottom: 10,
            }}
          >
            {desc}
          </div>
        )}
      </div>
      <SingularityHoles />
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}


// ─── Switcher ─────────────────────────────────────────────────────────────────

export default function FactionCard(props: FactionCardProps) {
  switch (props.faction.slug) {
    case "ua":
      return <UACard {...props} />;
    case "wow":
      return <WowCard {...props} />;
    case "snide":
      return <SnideCard {...props} />;
    case "ephemerists":
      return <EphemeristsCard {...props} />;
    case "singularity":
      return <SingularityCard {...props} />;
    case "everymen":
      return <EverymenCard {...props} />;
    default:
      // Fallback: generic styled card using faction CSS vars
      return (
        <div
          style={{
            width: "100%",
            background: "var(--color-bg-card)",
            border: `2px solid ${factionCssVar(props.faction.slug, "border")}`,
            padding: "14px 16px",
            fontFamily: "var(--font-body)",
            color: "var(--color-text-primary)",
            boxSizing: "border-box",
          }}
        >
          {props.invitationNote && (
            <InvitationNote
              slug={props.faction.slug}
              note={props.invitationNote}
            />
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: factionCssVar(props.faction.slug),
              }}
            >
              {props.faction.name}
            </div>
            <StatusBadge status={props.status} slug={props.faction.slug} />
          </div>
          {props.faction.description && (
            <div className="card-description" style={{ marginBottom: 10 }}>
              {props.faction.description.slice(0, 100)}
            </div>
          )}
        </div>
      );
  }
}
