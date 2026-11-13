import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MediaGallery from "../../../components/MediaGallery";
import MarkdownPreview from "../../editPraxis/blocks/MarkdownPreview";
import VoteUI, { voteRegionVisible } from "../../../components/vote/VoteUI";
import ScoreStamp from "../../../components/praxisCard/scoreStamp/ScoreStamp";
import SingularityLamps from "../../../components/factionMarks/SingularityLamps";
import { CollabRoster } from "../../../components/collab/CollabRoster";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { formatTimestamp } from "../../../utils/dates";
import { mediaUrl } from "../../../utils/media";
import {
  PraxisOwnerActions,
  MemberByline,
  bylineFaces,
  taskRefMeta,
} from "../shared";
import type { PraxisDetailState } from "../usePraxisDetail";
import { PraxisDetailSkin, type DuelInk } from "../praxisDetailSkin";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";

/**
 * Singularity praxis detail, the session log (#1122): the terminal window
 * `SingularityTaskDetail` wears. Lamps, phosphor on a near-black chassis in
 * BOTH themes (§6: the cascade flips the phosphor, never the chassis), raster,
 * scan sweep, blinking cursor; one face, Share Tech Mono.
 *
 * Copy is the shared `detail.*` block (ADR-0061; voice recorded on #1122). The
 * `//` marker and cursor are `aria-hidden` punctuation beside shared strings.
 * Raster and sweep are absolute inside the chassis, clipped by its overflow,
 * never `position: fixed` (WORLD_ZERO_STYLE §5). Shared content components
 * assume a light-in-light-theme sheet, hence the subtree re-points below,
 * scoped to their mounts so the neutral chrome stays neutral.
 * `PraxisDetailSkin` owns the layout and undressed chrome (#2718).
 */

const MONO = "var(--sg-praxis-detail-face)"; /* Share Tech Mono */

const BG = "var(--faction-singularity-term-bg)";
const PANEL = "var(--faction-singularity-term-panel)";
const CHROME = "var(--faction-singularity-term-chrome)";
const INK = "var(--faction-singularity-term-ink)";
const BRIGHT = "var(--faction-singularity-term-bright)";
const DIM = "var(--faction-singularity-term-dim)";
const BLUE = "var(--faction-singularity-term-blue)";
const BLUE_BRIGHT = "var(--faction-singularity-term-blue-bright)";
const BORDER = "var(--faction-singularity-term-border)";
const HAIR = "var(--faction-singularity-term-hair)";

/**
 * Re-point for shared content mounted on the chassis: `--color-*` and
 * `--faction-default-*` assume a light sheet and land ~1:1 here. Applied to the
 * owner actions, proof frame and roster; never the column or comments (a comment
 * row dispatches on its author's faction, ADR-0061). Prefer a component's ink
 * prop where it has one (`DuelCard`, #1153). `--faction-default-rainbow` is left
 * alone: a you-are-here mark (ADR-0039).
 */
const ON_CHASSIS_INK = {
  "--faction-default-card-text": BRIGHT,
  "--faction-default-card-muted": DIM,
  "--faction-default-card-line": HAIR,
  "--faction-default-stamp-bg": PANEL,
  "--color-text-primary": BRIGHT,
  "--color-text-secondary": INK,
  "--color-text-tertiary": DIM,
  "--color-border": HAIR,
} as CSSProperties;

/**
 * `CollabRoster` fills a cast row with `card-muted`, which is Singularity's blue
 * chrome (~1.3:1 under phosphor), so the roster subtree gets the chassis panel.
 */
const CREW_INK = {
  ...ON_CHASSIS_INK,
  "--faction-singularity-card-muted": PANEL,
} as CSSProperties;

const LABEL: CSSProperties = {
  fontFamily: MONO,
  fontSize: "var(--text-md)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: DIM,
};

/** The praxis id in hex, as a process id. Ornament, never copy. */
function hexOf(id: number): string {
  return `0x${id.toString(16).toUpperCase().padStart(3, "0")}`;
}

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "·"
  );
}

/** Stays drawn under reduced motion; `.sg-cursor` owns blink and guard (#911). */
function Cursor({ height }: { height: number }) {
  return (
    <span
      aria-hidden
      className="sg-cursor"
      style={{
        display: "inline-block",
        width: 10,
        height,
        marginLeft: "var(--space-sm)",
        background: "currentColor",
        verticalAlign: "-0.08em",
      }}
    />
  );
}

function MemberCell({
  name,
  avatarUrl,
  size,
}: {
  name: string;
  avatarUrl: string;
  size: number;
}) {
  return (
    <span
      aria-hidden
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: 4,
        // Clips the portrait to the cell's radius.
        overflow: "hidden",
        boxSizing: "border-box",
        background: PANEL,
        border: `1px solid ${BORDER}`,
        fontFamily: MONO,
        fontSize: "var(--text-lg)",
        color: BRIGHT,
      }}
    >
      {avatarUrl ? (
        <img
          src={mediaUrl(avatarUrl)}
          alt={name}
          className="object-cover"
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}

export default function SingularityPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation("praxis");
  const desktop = useFormFactor() !== "mobile";
  const { praxis, voters } = state;

  // Guarded non-null by the dispatcher.
  if (!praxis) return null;

  // A collab is a collab at one member (#1274). Tested positively: a duel side
  // is `type='solo'` + `duel_id` (ADR-0011), so `!== 'solo'` breaks duels (#992).
  const isCollab = praxis.type === "collab";

  const rule = (style?: CSSProperties) => (
    <span aria-hidden style={{ borderTop: `1px dashed ${HAIR}`, ...style }} />
  );

  /** A commented section head: `// LABEL ------------------ gloss`. */
  const sectionHead = (label: ReactNode, gloss?: ReactNode) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        marginBottom: "var(--space-md)",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: desktop ? "var(--text-xl)" : "var(--text-lg)",
          color: BLUE_BRIGHT,
        }}
      >
        <span aria-hidden>{"// "}</span>
        {label}
      </span>
      {rule({ flex: "1 1 20%", minWidth: 20 })}
      {gloss !== undefined && <span style={LABEL}>{gloss}</span>}
    </div>
  );

  const panel: CSSProperties = {
    background: PANEL,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    boxSizing: "border-box",
    padding: "var(--space-lg)",
  };

  // Window chrome only; navigation is site chrome above the terminal (#2102).
  const chrome = (
    <div
      style={{
        position: "relative",
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        padding: "var(--space-sm) var(--space-lg)",
        background: CHROME,
        borderBottom: `1px solid ${HAIR}`,
      }}
    >
      <SingularityLamps />
      <span aria-hidden style={{ ...LABEL, marginLeft: "auto", color: BLUE, flex: "none" }}>
        {hexOf(praxis.id)}
      </span>
    </div>
  );

  const header = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          marginBottom: "var(--space-md)",
        }}
      >
        {/* `bylineFaces` credits the creator even with no member rows. */}
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
          {bylineFaces(praxis).map((author) => (
            <Link key={author.id} to={`/characters/${author.id}`} style={{ display: "block" }}>
              <MemberCell
                name={author.name}
                avatarUrl={author.avatarUrl}
                size={desktop ? 40 : 34}
              />
            </Link>
          ))}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <MemberByline
            praxis={praxis}
            linkStyle={{
              fontFamily: MONO,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              color: BRIGHT,
              textDecoration: "none",
              borderBottom: `1px solid ${BORDER}`,
            }}
            separatorStyle={{ fontFamily: MONO, color: DIM }}
          />
          <div style={{ ...LABEL, marginTop: "var(--space-xs)" }}>
            {t("detail.filed", {
              date: formatTimestamp(praxis.submitted_at ?? praxis.created_at),
            })}
          </div>
        </div>
      </div>

      <h1
        style={{
          fontFamily: MONO,
          fontSize: desktop ? "var(--text-display)" : "var(--text-heading)",
          lineHeight: 1.15,
          margin: "0 0 var(--space-lg)",
          color: BRIGHT,
          overflowWrap: "anywhere",
          textShadow: "var(--faction-singularity-term-halo-green)",
        }}
      >
        {praxis.title || praxis.task_title}
        <Cursor height={desktop ? 30 : 22} />
      </h1>

      {/* Behaviour chrome, not moderation chrome, so it may be re-pointed. */}
      <div style={ON_CHASSIS_INK}>
        <PraxisOwnerActions state={state} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-sm)",
          flexWrap: "wrap",
          borderTop: `1px dashed ${HAIR}`,
          borderBottom: `1px dashed ${HAIR}`,
          padding: "var(--space-md) 0",
          marginBottom: "var(--space-xl)",
        }}
      >
        <span style={LABEL}>{t("detail.taskRef.label")}</span>
        <Link
          to={`/tasks/${praxis.task_id}`}
          className="content-text"
          style={{ fontFamily: MONO, color: BRIGHT, textDecoration: "none" }}
        >
          {praxis.task_title}
        </Link>
        <span style={{ ...LABEL, marginLeft: "auto", color: BLUE }}>
          {taskRefMeta(praxis, t)}
        </span>
      </div>
    </>
  );

  // `ScoreStamp` is the one readout (ADR-0053). Handed over unconditionally:
  // `scoreWasBanked` is the shared gate.
  const scoreBlock = (
    <section style={panel}>
      {sectionHead(t("detail.score.heading"))}
      <div style={{ display: "flex", justifyContent: "center" }}>
        {/* The page's one crown is the stamp's corner fleur (#1710, ADR-0054). */}
        <ScoreStamp praxis={praxis} />
      </div>
    </section>
  );

  // Phosphor by contract through the ink prop (#1153), not a re-point.
  const duelInk: DuelInk = { name: BRIGHT, total: BRIGHT, muted: DIM, line: HAIR, plate: PANEL };

  // Same predicate `VoteUI` gates itself on (#1429), so no empty plate.
  const voteBlock = voteRegionVisible(state.user, praxis.viewer_can_vote) && (
    <section style={panel}>
      {sectionHead(t("detail.vote.heading"))}
      <p
        className="content-text"
        style={{ fontFamily: MONO, margin: "0 0 var(--space-md)", color: DIM }}
      >
        {t("detail.vote.prompt")}
      </p>
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        currentValue={praxis.viewer_vote ?? undefined}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </section>
  );

  // No average anywhere (ADR-0014).
  const votersBlock = voters.length > 0 && (
    <section style={panel}>
      {sectionHead(
        t("detail.voters.heading"),
        t("detail.voters.count", { count: voters.length }),
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {voters.map((voter) => (
          <div
            key={voter.character_id}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}
          >
            <Link
              to={`/characters/${voter.character_id}`}
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontFamily: MONO,
                fontSize: "var(--text-content)",
                color: BRIGHT,
                textDecoration: "none",
              }}
            >
              {voter.display_name}
            </Link>
            <span
              aria-hidden
              style={{
                width: 84,
                height: 8,
                borderRadius: 2,
                background: HAIR,
                position: "relative",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${(voter.value / 5) * 100}%`,
                  background: BRIGHT,
                }}
              />
            </span>
            <span
              style={{
                width: 20,
                textAlign: "right",
                fontFamily: MONO,
                fontSize: "var(--text-content)",
                color: BLUE_BRIGHT,
              }}
            >
              {voter.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );

  const proof = praxis.media_items.length > 0 && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.sections.proof"))}
      <div
        style={{
          ...ON_CHASSIS_INK,
          background: PANEL,
          border: `1px solid ${BORDER}`,
          borderRadius: 6,
          padding: "var(--space-sm)",
        }}
      >
        <MediaGallery media={praxis.media_items} layout={desktop ? "grid" : "column"} />
      </div>
    </section>
  );

  const writeUp = praxis.body_text && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.sections.writeUp"))}
      <MarkdownPreview
        source={praxis.body_text}
        className="markdown-preview content-text"
        style={{ fontFamily: MONO, lineHeight: 1.8, color: BRIGHT }}
      />
    </section>
  );

  // No status guard: `in_progress`/`pending` redirect to the composer (ADR-0062).
  const crew = isCollab && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.sections.members"))}
      <div style={{ ...CREW_INK, color: INK }}>
        <CollabRoster
          praxisType={praxis.type}
          invites={praxis.invites}
          members={praxis.members}
          currentCharacterId={state.user?.character?.id ?? null}
          factionSlug={praxis.task_faction_slug}
          taskPointValue={praxis.task_point_value}
          onKick={state.handleKickMember}
        />
      </div>
    </section>
  );

  return (
    <PraxisDetailSkin
      state={state}
      kit={{
        // Body in the label's warning hue, not `--color-text-secondary`.
        flaggedBodyInk: "var(--color-warning)",
        sheetStyle: {
          /* Roles on the session, not the wrapper holding the neutral
             breadcrumb (#2675). */
          ...factionBodyVars("singularity"), ...factionRoleVars("singularity", "sg-praxis-detail"),
          position: "relative",
          overflow: "hidden",
          maxWidth: 1200,
          margin: "0 auto",
          boxSizing: "border-box",
          background: BG,
          color: INK,
          fontFamily: MONO,
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          boxShadow: "var(--faction-singularity-term-shadow)",
        },
        sheetPrelude: (
          <>
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 4,
                background:
                  "repeating-linear-gradient(0deg, var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)",
              }}
            />
            {/* `.sg-scan` owns the resting offset and the guarded travel. */}
            <div
              aria-hidden
              className="sg-scan"
              style={{
                position: "absolute",
                left: "-30%",
                right: "-30%",
                height: 40,
                pointerEvents: "none",
                zIndex: 4,
                background: "var(--faction-singularity-term-sweep)",
              }}
            />

            {chrome}
          </>
        ),
        sheetBody: (body) => (
          <div
            style={{
              position: "relative",
              zIndex: 2,
              padding: desktop
                ? "var(--space-2xl) var(--space-2xl) var(--space-3xl)"
                : "var(--space-lg) var(--space-md) var(--space-xl)",
            }}
          >
            {body}
          </div>
        ),
        header,
        score: scoreBlock,
        duelPanel: panel,
        duelHeading: sectionHead(t("duelCrossLink.label")),
        duelInk,
        vote: voteBlock,
        voters: votersBlock,
        proof,
        writeUp,
        crew,
        metatasksHeading: sectionHead(t("detail.metatasks.heading")),
        commentsHeading: sectionHead(t("detail.sections.comments")),
      }}
    />
  );
}
