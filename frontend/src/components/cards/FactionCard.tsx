import type { FactionOut } from "../../api/factions";
import i18n from "../../i18n";
import { factionCssVar, factionName, factionDescription } from "../../utils/factions";
import { pickVariant } from "../../utils/factionDispatch";
import { surfaceMap } from "../../factions";
import SnideMasthead from "./SnideMasthead";
import { EphSeal, LapisLastWord } from "./ephemeristsAtoms";
import * as coven from "./covenSlip";

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
          color: "var(--color-success)",
          letterSpacing: "0.1em",
        }}
      >
        {i18n.t("feed:factionCard.status.member")}
      </span>
    );
  }
  if (status === "invited") {
    return (
      <span
        className="eyebrow"
        style={{
          color: "var(--color-warning)",
          letterSpacing: "0.1em",
        }}
      >
        {i18n.t("feed:factionCard.status.invited")}
      </span>
    );
  }
  if (status === "burned" || status === "defected") {
    return (
      <span
        className="eyebrow"
        style={{
          color: factionCssVar(slug, "card-muted"),
          background: factionCssVar(slug, "light"),
          border: `1px solid ${factionCssVar(slug, "border")}`,
          letterSpacing: "0.1em",
          padding: "var(--space-xs) var(--space-sm)",
        }}
      >
        {i18n.t("feed:factionCard.status.burned")}
      </span>
    );
  }
  if (status === "welcome_back" || status === "can_return") {
    return (
      <span
        className="eyebrow"
        style={{
          color: factionCssVar(slug),
          letterSpacing: "0.1em",
        }}
      >
        {i18n.t("feed:factionCard.status.welcomeBack")}
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
        gap: "var(--space-sm)",
        color: factionCssVar(slug),
        background: factionCssVar(slug, "light"),
        border: `1px solid ${factionCssVar(slug, "border")}`,
        padding: "var(--space-xs) var(--space-sm)",
        letterSpacing: "0.12em",
        marginBottom: "var(--space-sm)",
      }}
    >
      <span style={{ fontWeight: 700 }}>{i18n.t("feed:factionCard.newInvitation")}</span>
      <span style={{ opacity: 0.75 }}>· {note}</span>
    </div>
  );
}

// ─── Per-faction archetypes ───────────────────────────────────────────────────

const ROTATIONS = [-2, 1.5, -1, 2.5];

export function UaCard({
  faction,
  status,
  invitationNote,
}: FactionCardProps) {
  const rotation = ROTATIONS[faction.slug.length % ROTATIONS.length];
  const fullDesc = factionDescription(faction.slug);
  const desc = fullDesc.slice(0, 100) + (fullDesc.length > 100 ? "…" : "");
  return (
    <div
      style={{
        width: "100%",
        background: factionCssVar("ua", "card-bg"),
        clipPath: "polygon(0 0, 100% 0, 100% 88%, 88% 100%, 0 100%)",
        transform: `rotate(${rotation}deg)`,
        position: "relative",
        padding: "var(--space-2xl) var(--space-lg) var(--space-xl)",
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
        style={{ color: factionCssVar("ua", "card-accent"), marginBottom: "var(--space-sm)" }}
      >
        <StatusBadge status={status} slug="ua" />
      </div>
      <div
        style={{
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: "var(--space-sm)",
        }}
      >
        {factionName(faction.slug)}
      </div>
      {desc && (
        <div
          className="card-description"
          style={{ color: factionCssVar("ua", "card-muted"), marginBottom: "var(--space-md)" }}
        >
          {desc}
        </div>
      )}
    </div>
  );
}

// ─── Cozy Coven — the candlelit spell slip ────────────────────────

/**
 * Cozy Coven faction PREVIEW card (#1209) — a slip of the coven's own paper.
 *
 * The lo-fi `coven.exe` window is gone: the title bar, its three traffic-light
 * dots (the last hardcoded hexes on this card), the `▭ ✕` chrome glyphs, the
 * dotted body and the die-cut ivy sticker were all furniture of a metaphor this
 * faction retired with the v2 task card (#1023). What replaces them is the slip
 * the task card already draws: the pink→lavender sheet, the pentagram badge, a
 * braided thread, and the coven's name hand-lettered on a candle-lit panel.
 *
 * Structure is untouched — status badge, name, truncated description, and the
 * invitation note above them — because #1209 swaps the dress, not the layout.
 *
 * `feed:identity.coven.windowTitle` ("coven.exe") is left in the catalog and no
 * longer rendered: copy is out of scope for the sweep and an unused key is
 * cheap. A slip has no window to title.
 */
export function CovenCard({
  faction,
  status,
  invitationNote,
}: FactionCardProps) {
  const fullDesc = factionDescription(faction.slug);
  const desc = fullDesc.slice(0, 100) + (fullDesc.length > 100 ? "…" : "");
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        fontFamily: coven.CHROME,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          borderRadius: 18,
          border: `2px solid ${coven.BORDER}`,
          background: coven.SLIP_SHEET,
          boxShadow: coven.SHADOW,
          color: coven.INK,
          transition: "background 150ms, color 150ms",
        }}
      >
        {/* masthead — the pentagram badge over a braided thread */}
        <div style={{ padding: "var(--space-md) var(--space-lg) var(--space-sm)", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <coven.SigilMark size={30} />
          <coven.Braid style={{ alignSelf: "stretch", marginTop: "var(--space-sm)" }} />
        </div>

        <div style={{ padding: "0 var(--space-lg) var(--space-lg)" }}>
          {invitationNote && (
            <InvitationNote slug={faction.slug} note={invitationNote} />
          )}
          {/* the written face — paper laid on the wash */}
          <div style={{ ...coven.SLIP_PANEL, padding: "var(--space-md)" }}>
            <div className="card-meta" style={{ marginBottom: "var(--space-xs)" }}>
              <StatusBadge status={status} slug="coven" />
            </div>
            <div
              style={{
                fontFamily: coven.HAND,
                // eslint-disable-next-line local/no-raw-style-values -- ornament: the faction name hand-lettered in Caveat — the slip's own voice.
                fontSize: 26,
                fontWeight: 700,
                lineHeight: 1.05,
                color: coven.INK,
                marginBottom: "var(--space-xs)",
              }}
            >
              {factionName(faction.slug)}
            </div>
            {desc && (
              <div
                className="card-description"
                style={{
                  fontFamily: coven.READING,
                  fontStyle: "italic",
                  lineHeight: 1.45,
                  color: coven.SOFT,
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

export function SnideCard({
  faction,
  status,
  invitationNote,
}: FactionCardProps) {
  const fullDesc = factionDescription(faction.slug);
  const desc = fullDesc.slice(0, 100) + (fullDesc.length > 100 ? "…" : "");
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
        padding: "var(--space-md) var(--space-md) var(--space-lg)",
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
      <SnideMasthead subtitle={i18n.t("feed:factionCard.snide.subtitle")} />
      {invitationNote && (
        <InvitationNote slug={faction.slug} note={invitationNote} />
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-sm)",
        }}
      >
        <div style={{ fontSize: "var(--text-lg)", lineHeight: 1.2 }}>
          {factionName(faction.slug)}
        </div>
        <StatusBadge status={status} slug="snide" />
      </div>
      {desc && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1px 1fr",
            gap: "var(--space-xs)",
            marginBottom: "var(--space-md)",
          }}
        >
          <div
            className="card-description"
            style={{
              color: factionCssVar("snide", "card-muted"),
              lineHeight: 1.5,
            }}
          >
            {col1}
          </div>
          <div style={{ background: "var(--color-border)" }} />
          <div
            className="card-description"
            style={{
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
export function EphemeristsCard({
  faction,
  status,
  invitationNote,
}: FactionCardProps) {
  const fullDesc = factionDescription(faction.slug);
  const desc = fullDesc.slice(0, 110) + (fullDesc.length > 110 ? "…" : "");
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
          gap: "var(--space-lg)",
          padding: "var(--space-lg)",
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
              fontSize: "var(--text-xs)",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "var(--eph-gold-light)",
              marginBottom: "var(--space-xs)",
            }}
          >
            {i18n.t("feed:factionCard.ephemerists.eyebrow")}
          </div>
          <div
            style={{
              fontFamily: "var(--eph-display)",
              fontWeight: 800,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: codex frontispiece wordmark — display serif with a letterpress shadow
              fontSize: 26,
              lineHeight: 0.92,
              color: "var(--eph-parchment)",
              textShadow: "1px 1px 0 var(--eph-field-deep)",
            }}
          >
            <LapisLastWord text={factionName(faction.slug)} />
          </div>
        </div>
      </div>
      {/* Vellum body */}
      <div
        style={{
          background: "var(--eph-vellum)",
          color: "var(--eph-vellum-text)",
          padding: "var(--space-md) var(--space-lg) var(--space-lg)",
        }}
      >
        {invitationNote && (
          <InvitationNote slug={faction.slug} note={invitationNote} />
        )}
        <div
          className="card-meta"
          style={{ color: "var(--eph-rubric)", marginBottom: "var(--space-sm)" }}
        >
          <StatusBadge status={status} slug="ephemerists" />
        </div>
        {desc && (
          <div
            className="card-description"
            style={{ color: "var(--eph-muted)", marginBottom: "var(--space-md)", fontStyle: "italic" }}
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
        gap: "var(--space-sm)",
        padding: "var(--space-xs) 0",
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

export function SingularityCard({
  faction,
  status,
  invitationNote,
}: FactionCardProps) {
  const fullDesc = factionDescription(faction.slug);
  const desc = fullDesc.slice(0, 100) + (fullDesc.length > 100 ? "…" : "");
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
        style={{ padding: "var(--space-sm) var(--space-lg) var(--space-md)", position: "relative", zIndex: 2 }}
      >
        {invitationNote && (
          <InvitationNote slug={faction.slug} note={invitationNote} />
        )}
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--faction-singularity-card-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            marginBottom: "var(--space-sm)",
          }}
        >
          {i18n.t("feed:identity.singularity.protocol")}
          <span
            aria-hidden
            className="sg-cursor"
            style={{
              display: "inline-block",
              width: 5,
              height: 9,
              background: "var(--faction-singularity-card-text)",
              marginLeft: "var(--space-xs)",
              verticalAlign: "middle",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "var(--space-sm)",
          }}
        >
          <div style={{ fontSize: "var(--text-md)", lineHeight: 1.3 }}>
            {"> "}
            {factionName(faction.slug)}
          </div>
          <StatusBadge status={status} slug="singularity" />
        </div>
        {desc && (
          <div
            className="card-description"
            style={{
              color: "var(--faction-singularity-card-muted)",
              lineHeight: 1.5,
              marginBottom: "var(--space-md)",
            }}
          >
            {desc}
          </div>
        )}
      </div>
      <SingularityHoles />
    </div>
  );
}


// ─── Default archetype ───────────────────────────────────────────────────────

/**
 * Generic card built from the faction CSS vars. Every faction without a bespoke
 * `factionCard` in its manifest lands here — including albescent, which has
 * never had one. (Converting the old raw switch did NOT change that: the switch
 * had no `albescent` case because there is no `AlbescentCard` to name, so
 * albescent fell to this same default branch before and after.)
 */
export function DefaultFactionCard(props: FactionCardProps) {
      return (
        <div
          style={{
            width: "100%",
            background: "var(--color-bg-surface)",
            border: `2px solid ${factionCssVar(props.faction.slug, "border")}`,
            padding: "var(--space-md) var(--space-lg)",
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
              marginBottom: "var(--space-sm)",
            }}
          >
            <div
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                color: factionCssVar(props.faction.slug),
              }}
            >
              {factionName(props.faction.slug)}
            </div>
            <StatusBadge status={props.status} slug={props.faction.slug} />
          </div>
          <div className="card-description" style={{ marginBottom: "var(--space-md)" }}>
            {factionDescription(props.faction.slug).slice(0, 100)}
          </div>
        </div>
      );
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export default function FactionCard(props: FactionCardProps) {
  const Card = pickVariant(
    surfaceMap("factionCard"),
    props.faction.slug,
    DefaultFactionCard,
  );
  return <Card {...props} />;
}
