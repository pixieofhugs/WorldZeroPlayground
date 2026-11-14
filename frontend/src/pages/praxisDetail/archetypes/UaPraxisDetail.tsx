import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MediaGallery from "../../../components/MediaGallery";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";
import MarkdownPreview from "../../editPraxis/blocks/MarkdownPreview";
import VoteUI from "../../../components/vote/VoteUI";
import { CollabRoster } from "../../../components/collab/CollabRoster";
import { Lotus } from "../../../components/factionMarks";
import { UaSigil } from "../../../components/sigil/UaSigil";
import {
  UA_DISPLAY,
  UA_EYEBROW,
  UA_TEXT,
  UaInkColumn,
  uaShade,
} from "../../../components/factionMarks/uaAtoms";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { formatTimestamp } from "../../../utils/dates";
import { mediaUrl } from "../../../utils/media";
import { PraxisDetailSkin, type DuelInk } from "../praxisDetailSkin";
import {
  MemberByline,
  bylineFaces,
} from "../shared";
import type { PraxisDetailState } from "../usePraxisDetail";

/**
 * University of Asthmatics — THE PRESSED LEAF (#1119; design `UA Praxis
 * Detail.dc.html`). Sibling of `UaTaskDetail`'s vellum leaf; the fine tooth
 * (`.ua-praxis-leaf`) marks a record rather than a brief. `PraxisDetailSkin`
 * owns layout and neutral slots; this file is the kit
 * (`archetypeSlots.test.tsx` holds both halves).
 *
 * Three load-bearing grounds: toothed page (`--faction-ua-page`), sheets
 * (`--faction-ua-card-bg`) for rail/read blocks, sunken well
 * (`--faction-ua-panel`) for proof. `UaScoreStamp`'s box and `UaVote`'s mandala
 * cores were measured on the card-bg sheet; on `-lift`/`-panel` the box vanishes
 * and the mandala becomes a disc (WORLD_ZERO_STYLE §3).
 *
 * Ornament (§6/#849): the ensō only on the score and the one 14px faction mark
 * on the task-reference row; never a border or bullet. Lotus bleeds off the left
 * edge; no mandala on this dense surface. No new tokens or pairings: every
 * ground × ink here is gated by `factionContrast.test.ts`, and no text ink is
 * used as a fill (#1155); `-rank-*` is the only ink-family fill.
 *
 * Copy: none (ADR-0061); faction words parked on #1119, no `detail.ua.*`.
 */
/**
 * The practice's five-rung ramp, indexed by a voter's 1-5 value. FILLS only
 * (directional, flips with theme, #849); nothing legible painted in one.
 */
const RANK_FILL = [
  "",
  "var(--faction-ua-rank-1)",
  "var(--faction-ua-rank-2)",
  "var(--faction-ua-rank-3)",
  "var(--faction-ua-rank-4)",
  "var(--faction-ua-rank-5)",
];

interface SizeSet {
  title: string;
  byline: string;
  disc: number;
  pagePad: string;
  panelPad: string;
  sectionGap: string;
  /** The lotus wash. Ornament geometry, so raw px (§4a). */
  lotus: number;
  lotusLeft: number;
  lotusTop: number;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    title: "var(--text-display)",
    byline: "var(--text-title)",
    disc: 44,
    pagePad: "var(--space-2xl)",
    panelPad: "var(--space-lg)",
    sectionGap: "var(--space-2xl)",
    lotus: 880,
    lotusLeft: -230,
    lotusTop: -110,
  },
  mobile: {
    title: "var(--text-heading)",
    byline: "var(--text-content)",
    disc: 38,
    pagePad: "var(--space-lg)",
    panelPad: "var(--space-lg)",
    sectionGap: "var(--space-xl)",
    lotus: 560,
    lotusLeft: -200,
    lotusTop: 40,
  },
};

/** Initials fallback for a member with no uploaded avatar. */
function initials(name: string): string {
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

/**
 * A member's sienna-ringed disc, stacked for collabs. Not an ensō ring: that is
 * reserved for score and faction mark (§6/#849).
 */
function LeafDisc({
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
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        overflow: "hidden",
        fontFamily: UA_DISPLAY,
        fontWeight: 700,
        fontSize: "var(--text-lg)",
        background: "var(--faction-ua-panel)",
        color: "var(--leaf-praxis-detail-ink)",
        boxShadow: "0 0 0 1.5px var(--faction-ua-card-frame)",
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
        initials(name)
      )}
    </span>
  );
}

export default function UaPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation("praxis");
  const formFactor = useFormFactor();
  const desktop = formFactor !== "mobile";
  const size = SIZES[formFactor];
  const { praxis, voters } = state;

  // Guarded non-null by the dispatcher.
  if (!praxis) return null;


  /** A quiet sheet laid on the leaf — the page's one container. */
  const sheet: CSSProperties = {
    background: "var(--leaf-praxis-detail-paper)",
    border: "1px solid var(--faction-ua-rule)",
    borderRadius: 6,
    boxSizing: "border-box",
    boxShadow: `0 14px 36px -30px ${uaShade(52)}`,
    color: "var(--leaf-praxis-detail-ink)",
  };

  /** The same sheet with the rail's padding already on it. */
  const panel: CSSProperties = { ...sheet, padding: size.panelPad };

  /**
   * The rule out of a label: sienna → hairline → nothing (as `UaTaskDetail`;
   * no gilt token since #853 gave gold to WOW).
   */
  const rule = (
    <span
      aria-hidden
      style={{
        flex: "1 1 20%",
        minWidth: 20,
        height: 1,
        opacity: 0.7,
        background:
          "linear-gradient(90deg, var(--faction-ua-card-frame), var(--faction-ua-rule) 55%, transparent)",
      }}
    />
  );

  /** UA's one label shape plus rule; `ink` differs by ground (leaf vs sheet). */
  const head = (ink: string, label: ReactNode, trailing?: ReactNode) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        marginBottom: "var(--space-md)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ ...UA_EYEBROW, color: ink }}>{label}</span>
      {rule}
      {trailing}
    </div>
  );

  const sectionHead = (label: ReactNode, trailing?: ReactNode) =>
    head("var(--faction-ua-page-text)", label, trailing);
  const panelHead = (label: ReactNode, trailing?: ReactNode) =>
    head("var(--leaf-praxis-detail-ink)", label, trailing);

  // Navigation and moderation chrome come from the shared skin (#2102, #2718);
  // this kit passes neither flagged-ink knob.

  // ── Byline · title · owner actions · task reference ──
  const byline = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        marginBottom: "var(--space-md)",
      }}
    >
      {/* Stacked discs, one per member; no member rows still credits the creator. */}
      <span style={{ display: "flex", alignItems: "center" }}>
        {bylineFaces(praxis).map((author, index) => (
          <Link
            key={author.id}
            to={`/characters/${author.id}`}
            style={{
              display: "block",
              // Each disc laps the one before by a negated spacing step.
              marginLeft: index === 0 ? 0 : "calc(-1 * var(--space-lg))",
              zIndex: index,
            }}
          >
            <LeafDisc
              name={author.name}
              avatarUrl={author.avatarUrl}
              size={size.disc}
            />
          </Link>
        ))}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <MemberByline
          praxis={praxis}
          linkStyle={{
            fontFamily: UA_DISPLAY,
            fontWeight: 600,
            fontSize: size.byline,
            color: "var(--faction-ua-page-text)",
            textDecoration: "none",
          }}
        />
        {/* When the work was set down. */}
        <div
          style={{
            fontFamily: UA_TEXT,
            fontSize: "var(--text-xl)",
            lineHeight: 1.5,
            color: "var(--leaf-praxis-detail-quiet)",
          }}
        >
          {t("detail.filed", {
            date: formatTimestamp(praxis.submitted_at ?? praxis.created_at),
          })}
        </div>
      </div>
    </div>
  )

  const title = (
    <h1
      style={{
        fontFamily: UA_DISPLAY,
        fontWeight: 700,
        fontSize: size.title,
        lineHeight: 1.08,
        letterSpacing: "-0.015em",
        margin: "0 0 var(--space-md)",
        color: "var(--faction-ua-page-text)",
        overflowWrap: "anywhere",
      }}
    >
      {praxis.title || praxis.task_title}
    </h1>
  )

  // Task reference, with the faction mark (§6/#849). Truthful by
  // construction: this archetype mounts off `task_faction_slug`.
  const taskRef = (meta: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        flexWrap: "wrap",
        borderTop: "1px solid var(--faction-ua-rule)",
        borderBottom: "1px solid var(--faction-ua-rule)",
        padding: "var(--space-md) 0",
        marginBottom: size.sectionGap,
      }}
    >
      <UaSigil width={14} height={14} />
      <span style={UA_EYEBROW}>{t("detail.taskRef.label")}</span>
      <Link
        to={`/tasks/${praxis.task_id}`}
        className="content-text"
        style={{
          fontFamily: UA_TEXT,
          color: "var(--faction-ua-page-text)",
          textDecoration: "none",
          borderBottom: "1px solid var(--faction-ua-rule)",
        }}
      >
        {praxis.task_title}
      </Link>
      <span style={{ ...UA_EYEBROW, marginLeft: "auto" }}>
        {meta}
      </span>
    </div>
  )


  // ── Duel: `DuelCard` self-hides with no duel / declined / run-up (#1071).
  // Inks are the sheet's set (#1153). No sienna on totals: `card-accent` is
  // this page's LINK ink. No rival faction hue. ──
  const duelInk: DuelInk = {
    name: "var(--leaf-praxis-detail-ink)",
    total: "var(--leaf-praxis-detail-ink)",
    muted: "var(--leaf-praxis-detail-quiet)",
    line: "var(--faction-ua-rule)",
    plate: "var(--faction-ua-panel)",
  };

  // ── Vote · voters ──
  // The mandala's cores punch to `--faction-ua-card-bg`, hence this stock.
  // Gated on `VoteUI`'s own predicate (#1429) so an author gets no empty section.
  const voteBlock = (
    <>
      {panelHead(t("detail.vote.heading"))}
      <p
        className="content-text"
        style={{
          fontFamily: UA_TEXT,
          fontStyle: "italic",
          lineHeight: 1.6,
          margin: "0 0 var(--space-md)",
          color: "var(--leaf-praxis-detail-quiet)",
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
    </>
  );

  // Rungs graded on the practice ramp (fill, not ink). NO AVERAGE (ADR-0014).
  const votersBlock = (
    <>
      {panelHead(
        t("detail.voters.heading"),
        <span style={{ ...UA_EYEBROW, fontSize: "var(--text-base)" }}>
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
              className="content-text"
              style={{
                fontFamily: UA_TEXT,
                flex: "1 1 auto",
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: "var(--leaf-praxis-detail-ink)",
                textDecoration: "none",
              }}
            >
              {voter.display_name}
            </Link>
            <span
              aria-hidden
              style={{
                width: 84,
                height: 6,
                borderRadius: 3,
                background: "var(--faction-ua-rule)",
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
                  background: RANK_FILL[voter.value],
                }}
              />
            </span>
            <span
              style={{
                fontFamily: UA_DISPLAY,
                fontWeight: 600,
                width: 20,
                textAlign: "right",
                fontSize: "var(--text-content)",
                color: "var(--leaf-praxis-detail-ink)",
              }}
            >
              {voter.value}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  // The report card is mounted bare by the skin (ADR-0061).

  // ── Proof · write-up · members ──
  const proof = (
    <>
      {sectionHead(t("detail.sections.proof"))}
      <div style={{ ...sheet, padding: "var(--space-md)" }}>
        {/* Sunken well a shade off the sheet: papers separate without a second frame. */}
        <div
          style={{
            background: "var(--faction-ua-panel)",
            border: "1px solid var(--faction-ua-hair)",
            borderRadius: 5,
            padding: "var(--space-sm)",
          }}
        >
          <MediaGallery
            media={praxis.media_items}
            layout={desktop ? "grid" : "column"}
          />
        </div>
      </div>
    </>
  );

  const writeUp = (
    <>
      {sectionHead(t("detail.sections.writeUp"))}
      <div
        style={{
          ...sheet,
          position: "relative",
          padding:
            "var(--space-lg) var(--space-lg) var(--space-lg) var(--space-2xl)",
        }}
      >
        {/* Hairline at 14px inside a 32px inset clears the copy by 16, so
            `position: absolute` is harmless (§5). */}
        <UaInkColumn style={{ left: 14, top: 14, bottom: 14 }} />
        <MarkdownPreview
          source={praxis.body_text ?? ''}
          className="markdown-preview content-text"
          style={{
            fontFamily: UA_TEXT,
            lineHeight: 1.72,
            color: "var(--faction-ua-card-body)",
          }}
        />
      </div>
    </>
  );

  // The roster paints its own sheet and ink (#694), so it sits on the leaf.
  const crew = (
    <>
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
    </>
  );

  // Metatasks: the skin mounts the READ-ONLY seal (#1093); add chips would 422
  // (`apply_metatask` needs `in_progress`).

  return (
    <PraxisDetailSkin
      state={state}
      kit={{
        pageStyle: { position: "relative" },
        /* Toothed vellum on the COLUMN, not the viewport (§5, #1028); `zIndex: 1`
           is the lotus's stacking context. */
        sheetClassName: "ua-praxis-leaf",
        sheetStyle: {
          /* Roles on the leaf, not the wrapper: the wrapper parents the neutral
             `Breadcrumb` (#2659). */
          ...factionBodyVars("ua"), ...factionRoleVars("ua", "leaf-praxis-detail"),
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          border: "1px solid var(--faction-ua-rule)",
          borderRadius: 18,
          padding: size.pagePad,
          overflow: "hidden",
          boxSizing: "border-box",
          fontFamily: UA_TEXT,
          color: "var(--faction-ua-page-text)",
        },
        /* Lotus clipped by the column's `overflow: hidden`. `zIndex: -1` paints
           it above the ground but under the copy; `0` would sit ON the static
           text (§5). Opacity is a token so dark mode lifts it. */
        sheetPrelude: (
          <Lotus
            size={size.lotus}
            color="var(--faction-ua-card-lotus)"
            style={{
              position: "absolute",
              left: size.lotusLeft,
              top: size.lotusTop,
              zIndex: -1,
              opacity: "var(--faction-ua-card-lotus-opacity)",
              pointerEvents: "none",
            }}
          />
        ),
        byline,
        title,
        taskRef,
        scoreHeading: panelHead(t("detail.score.heading")),
        panel,
        duelHeading: panelHead(t("duelCrossLink.label")),
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
