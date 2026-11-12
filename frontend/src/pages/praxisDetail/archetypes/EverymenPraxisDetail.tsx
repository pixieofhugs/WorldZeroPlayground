/**
 * Everymen praxis detail, the filed dispatch (#1123): ruled newsprint under a
 * red margin rule, cogged masthead, Bebas headlines, Courier Prime body,
 * thick-thin double rules. Sibling of `EverymenTaskDetail`'s `.em-broadsheet`,
 * not a copy: that posts a job, this files the proof.
 *
 * The crown stays in both form factors despite the design's `showCrownMobile:
 * false` (ADR-0054). This kit passes no flagged-banner ink, by choice.
 * Copy is the shared `detail.*` set (ADR-0061; voice recorded on #1123).
 * Palette: `--everymen-paper` is a FILL only, never a text ground (4.49:1 with
 * the accent in light); red as ink goes through `-sheet-accent`.
 * `PraxisDetailSkin` owns the layout and undressed chrome (#2718).
 */
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MediaGallery from "../../../components/MediaGallery";
import { EverymenCog } from "../../../components/factionMarks/everymenCogs";
import MarkdownPreview from "../../editPraxis/blocks/MarkdownPreview";
import VoteUI, { voteRegionVisible } from "../../../components/vote/VoteUI";
import ScoreStamp from "../../../components/praxisCard/scoreStamp/ScoreStamp";
import { CollabRoster } from "../../../components/collab/CollabRoster";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { formatTimestamp } from "../../../utils/dates";
import { mediaUrl } from "../../../utils/media";
import { factionName } from "../../../utils/factions";
import { PraxisDetailSkin, type DuelInk } from "../praxisDetailSkin";
import {
  PraxisOwnerActions,
  MemberByline,
  bylineFaces,
  taskRefMeta,
} from "../shared";
import type { PraxisDetailState } from "../usePraxisDetail";
import { factionBodyVars } from "../../../utils/factionBodyFace"

const INK = "var(--everymen-paper-text)";
const MUTED = "var(--everymen-muted)";
/** Red as a RULE or a FILL. For red as text, use {@link ACCENT}. */
const RED = "var(--everymen-red)";
/** Red as INK: the only red that clears AA on this stock in both themes. */
const ACCENT = "var(--faction-everymen-sheet-accent)";
const OLIVE = "var(--everymen-muted)";
/** NOT `--everymen-ink`, which vanishes on dark. */
const FRAME = "var(--everymen-frame)";
const HAIR = "var(--faction-everymen-sheet-hair)";
const SHADOW = "var(--faction-everymen-bill-shadow)";
/** Theme-invariant. */
const MAST = "var(--faction-everymen-bill-mast)";
const MAST_INK = "var(--faction-everymen-bill-mast-ink)";
/** A FILL only, never a ground for text. */
const TRACK = "var(--everymen-paper)";
const PANEL = "var(--faction-everymen-sheet-panel)";

const BEBAS = "var(--font-accent)";
// Labels get Courier Prime from `.label-*` (§4); unclassed text names it.
const BODY = "var(--faction-everymen-body-font)";

/** Ornament geometry. */
const PLATE_DESKTOP = 42;
const PLATE_MOBILE = 36;

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

/** A square filing-photo plate; round discs belong to the Unaffiliated sheet. */
function MemberPlate({
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
        flex: "0 0 auto",
        background: "var(--faction-everymen-sheet-panel)",
        border: `2px solid ${FRAME}`,
        borderRadius: 2,
        boxShadow: `2px 2px 0 ${HAIR}`,
        fontFamily: BEBAS,
        fontSize: "var(--text-content)",
        letterSpacing: "0.04em",
        color: ACCENT,
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

export default function EverymenPraxisDetail({
  state,
}: {
  state: PraxisDetailState;
}) {
  const { t } = useTranslation("praxis");
  const desktop = useFormFactor() !== "mobile";
  const { praxis, voters } = state;

  // Guarded non-null by the dispatcher.
  if (!praxis) return null;

  // A collab is a collab at one member (#1274). Tested positively: a duel side
  // is `type='solo'` + `duel_id` (ADR-0011), so `!== 'solo'` breaks duels (#992).
  const isCollab = praxis.type === "collab";

  const label: CSSProperties = {
    fontFamily: BEBAS,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
  };

  const sectionHead = (heading: ReactNode, gloss?: ReactNode): ReactNode => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        marginBottom: "var(--space-md)",
        flexWrap: "wrap",
      }}
    >
      <EverymenCog size={14} fill={RED} hub={PANEL} />
      <span
        style={{
          ...label,
          fontSize: "var(--text-xl)",
          letterSpacing: "0.2em",
          color: INK,
        }}
      >
        {heading}
      </span>
      <span
        aria-hidden
        style={{
          flex: "1 1 20%",
          minWidth: 20,
          height: 4,
          borderTop: `2px solid ${RED}`,
          borderBottom: `1px solid ${RED}`,
        }}
      />
      {gloss}
    </div>
  );

  /** The opaque fill is what interrupts the ruled lines behind it. */
  const panel: CSSProperties = {
    background: "var(--faction-everymen-sheet-panel)",
    border: `2px solid ${FRAME}`,
    borderRadius: 2,
    boxShadow: SHADOW,
    padding: "var(--space-lg)",
    boxSizing: "border-box",
  };

  const masthead = (
    <div style={{ marginBottom: "var(--space-lg)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-md)",
          padding: "var(--space-sm) var(--space-lg)",
          background: MAST,
          border: `2px solid ${FRAME}`,
          borderRadius: 2,
        }}
      >
        <EverymenCog size={14} fill={MAST_INK} hub={MAST} />
        <span
          style={{
            ...label,
            fontSize: "var(--text-content)",
            letterSpacing: "0.3em",
            color: MAST_INK,
            textAlign: "center",
          }}
        >
          {factionName(praxis.task_faction_slug)}
        </span>
        <EverymenCog size={14} fill={MAST_INK} hub={MAST} />
      </div>
      <div
        aria-hidden
        style={{
          height: 3,
          marginTop: "var(--space-xs)",
          borderTop: `2px solid ${FRAME}`,
          borderBottom: `1px solid ${FRAME}`,
        }}
      />
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
          flexWrap: "wrap",
        }}
      >
        {/* `bylineFaces` credits the creator even with no member rows. */}
        <span style={{ display: "flex", gap: "var(--space-xs)" }}>
          {bylineFaces(praxis).map((author) => (
            <Link key={author.id} to={`/characters/${author.id}`}>
              <MemberPlate
                name={author.name}
                avatarUrl={author.avatarUrl}
                size={desktop ? PLATE_DESKTOP : PLATE_MOBILE}
              />
            </Link>
          ))}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <MemberByline
            praxis={praxis}
            linkStyle={{
              fontFamily: BODY,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              color: INK,
              textDecoration: "none",
              borderBottom: `2px solid ${RED}`,
            }}
            separatorStyle={{
              fontFamily: BODY,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              color: MUTED,
            }}
          />
          <div className="label-caption" style={{ color: MUTED }}>
            {t("detail.filed", {
              date: formatTimestamp(praxis.submitted_at ?? praxis.created_at),
            })}
          </div>
        </div>
      </div>

      <h1
        style={{
          fontFamily: BEBAS,
          fontSize: desktop ? "var(--text-display)" : "var(--text-heading)",
          lineHeight: 0.94,
          letterSpacing: "0.01em",
          textTransform: "uppercase",
          color: INK,
          margin: "0 0 var(--space-md)",
          overflowWrap: "anywhere",
        }}
      >
        {praxis.title || praxis.task_title}
      </h1>

      <PraxisOwnerActions state={state} />

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-sm)",
          flexWrap: "wrap",
          borderTop: `2px solid ${RED}`,
          borderBottom: `1px solid ${RED}`,
          padding: "var(--space-md) 0",
          marginBottom: "var(--space-xl)",
        }}
      >
        <span className="label-caption" style={{ color: MUTED }}>
          {t("detail.taskRef.label")}
        </span>
        <Link
          to={`/tasks/${praxis.task_id}`}
          className="content-text"
          style={{
            fontFamily: BODY,
            color: INK,
            textDecoration: "none",
          }}
        >
          {praxis.task_title}
        </Link>
        <span
          className="label-caption"
          style={{ marginLeft: "auto", color: OLIVE }}
        >
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

  // The sheet's measured inks (#1153, `factionContrast.test.ts`). `TRACK` is
  // legal only as `plate`: a fill behind a disc, never a text ground.
  const duelInk: DuelInk = { name: INK, total: INK, muted: MUTED, line: HAIR, plate: TRACK };

  // Same predicate `VoteUI` gates itself on (#1429), so no empty plate.
  const voteBlock = voteRegionVisible(state.user, praxis.viewer_can_vote) && (
    <section style={panel}>
      {sectionHead(t("detail.vote.heading"))}
      <p
        className="content-text"
        style={{
          fontFamily: BODY,
          margin: "0 0 var(--space-md)",
          color: MUTED,
        }}
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
        <span className="label-caption" style={{ color: MUTED }}>
          {t("detail.voters.count", { count: voters.length })}
        </span>,
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-md)",
        }}
      >
        {voters.map((voter) => (
          <div
            key={voter.character_id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-md)",
            }}
          >
            <Link
              to={`/characters/${voter.character_id}`}
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontFamily: BODY,
                fontSize: "var(--text-content)",
                color: INK,
                textDecoration: "none",
              }}
            >
              {voter.display_name}
            </Link>
            <span
              aria-hidden
              style={{
                width: 84,
                height: 10,
                background: TRACK,
                border: `1px solid ${HAIR}`,
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
                  background: RED,
                }}
              />
            </span>
            <span
              style={{
                width: 20,
                textAlign: "right",
                fontFamily: BEBAS,
                fontSize: "var(--text-content)",
                color: INK,
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
    <section
      style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}
    >
      {sectionHead(t("detail.sections.proof"))}
      <div
        style={{
          background: "var(--faction-everymen-sheet-panel)",
          border: `2px solid ${FRAME}`,
          borderRadius: 2,
          boxShadow: SHADOW,
          padding: "var(--space-sm)",
        }}
      >
        <MediaGallery
          media={praxis.media_items}
          layout={desktop ? "grid" : "column"}
        />
      </div>
    </section>
  );

  const writeUp = praxis.body_text && (
    <section
      style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}
    >
      {sectionHead(t("detail.sections.writeUp"))}
      <MarkdownPreview
        source={praxis.body_text}
        className="markdown-preview content-text"
        style={{ fontFamily: BODY, lineHeight: 1.8, color: INK }}
      />
    </section>
  );

  // The design's per-member contribution column is invented data, not built
  // (#1123). No status guard: `in_progress`/`pending` redirect to the composer
  // (ADR-0062).
  const crew = isCollab && (
    <section
      style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}
    >
      {sectionHead(t("detail.sections.members"))}
      <CollabRoster
        praxisType={praxis.type}
        invites={praxis.invites}
        members={praxis.members}
        currentCharacterId={state.user?.character?.id ?? null}
        factionSlug={praxis.task_faction_slug}
        taskPointValue={praxis.task_point_value}
        onKick={state.handleKickMember}
      />
    </section>
  );

  return (
    <PraxisDetailSkin
      state={state}
      kit={{
        pageStyle: { position: "relative", color: INK },
        /* Column, not viewport (WORLD_ZERO_STYLE §5); the margin rule is a
           background layer of `.em-dispatch`. */
        sheetClassName: "em-dispatch",
        sheetStyle: {
          ...factionBodyVars("everymen"),
          position: "relative",
          maxWidth: 1200,
          margin: "0 auto",
          border: `2px solid ${FRAME}`,
          borderRadius: 2,
          padding: desktop ? "var(--space-2xl)" : "var(--space-xl)",
          boxSizing: "border-box",
          overflow: "hidden",
        },
        sheetPrelude: masthead,
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
