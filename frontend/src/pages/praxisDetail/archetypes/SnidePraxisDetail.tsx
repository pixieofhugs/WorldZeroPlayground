/**
 * S.N.I.D.E. — THE PASTE-UP (praxis detail v2, #1118). The shared anatomy
 * (ADR-0061) in S.N.I.D.E.'s dress: proof flyposted on a xerox wall, a ransom
 * headline cut from four faces, every rail block on one black slab (#2066).
 * `PraxisDetailSkin` owns layout and neutral slots; this file is the kit
 * (`archetypeSlots.test.tsx` holds both halves). `pageStyle` carries the role
 * map because this kit's ink reaches the breadcrumb.
 *
 * Dress only, no voice: every string reads `detail.*` (faction words parked on
 * #1119). Moderation chrome stays neutral and is mounted bare.
 *
 * ONE ground on the wall: the slab, `-card-*`, black in both themes, while the
 * wall (`.snd-detail-sheet`) FLIPS. Anything on the slab takes the whole
 * `-card-*` ink family — the flipping `-note-ink` there is black on black in
 * light (1.08:1). Hence:
 * - `.snd-censor` is invisible on the slab, so slab heads take an acid rule
 *   (`sectionHead(..., { onPlate: true })`); wall heads keep the censor.
 * - The crew keeps an invariant xerox insert: `CollabRoster` fills rows with a
 *   light grey that needs a light ground.
 * Acid/pink are rule/fill on paper, never ink; on the slab acid may be type
 * (`--faction-snide-card-accent`). The ground is the column's, not the
 * viewport's (§5, #1028), so `.snide-backdrop` is not used here.
 */
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MediaGallery from "../../../components/MediaGallery";
import MarkdownPreview from "../../editPraxis/blocks/MarkdownPreview";
import VoteUI, { voteRegionVisible } from "../../../components/vote/VoteUI";
import ScoreStamp from "../../../components/praxisCard/scoreStamp/ScoreStamp";
import { CollabRoster } from "../../../components/collab/CollabRoster";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { formatTimestamp } from "../../../utils/dates";
import { mediaUrl } from "../../../utils/media";
import { PraxisDetailSkin, type DuelInk } from "../praxisDetailSkin";
import {
  PraxisOwnerActions,
  MemberByline,
  bylineFaces,
  orderedMembers,
  taskRefMeta,
} from "../shared";
import type { PraxisDetailState } from "../usePraxisDetail";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";

const IMPACT = "var(--faction-snide-font-black)"; /* Archivo Black */
const BLACK = "var(--faction-snide-font-black)"; /* Archivo Black */
const TYPE = "var(--faction-snide-font-type)"; /* Special Elite */
const MARK = "var(--faction-snide-font-marker)"; /* Permanent Marker */

/** The WALL's inks: flip with the dark cascade; nothing on the slab reads them. */
const INK = "var(--faction-snide-note-ink)";
const MUTED = "var(--faction-snide-note-muted)";
const RULE = "var(--faction-snide-note-rule)";
/** The pink that is TEXT (AA-walked on the wall's stock, both themes). */
const PINK_INK = "var(--faction-snide-note-pink-ink)";
/** The pink that is a DRAWN LINE or FILL — pen circle, tally bar. Invariant. */
const PINK = "var(--faction-snide-pink)";
/** Photocopier black that does NOT flip: borders printed on invariant stock. */
const HARD = "var(--faction-snide-ink)";
/** Warm xerox stock that does NOT flip — the notebook insert taped on. */
const STOCK = "var(--faction-snide-paper)";
/** The SLAB — the page's one ground, black in both themes, with its ink family. */
const PLATE = "var(--snd-read-paper)";
const PLATE_TEXT = "var(--snd-read-ink)";
const PLATE_MUTED = "var(--snd-read-quiet)";
/** Acid as the plate's INK — the one ground that admits it as type. */
const PLATE_ACCENT = "var(--snd-read-accent)";
/** Acid as a drawn RULE or ring. */
const ACID = "var(--faction-snide-acid)";

/**
 * The four headline cuts, shared with `SnideTaskCard`/`SnideTaskDetail`; a word
 * takes its cut off the praxis id. Cut 2's knockout names its own pair: paper/
 * ink swap under dark and would vanish the word. Restyles words, never redacts
 * a player's string (#1023).
 */
const CUTS: CSSProperties[] = [
  { fontFamily: IMPACT, color: INK, textTransform: "uppercase", transform: "rotate(-1deg)" },
  {
    fontFamily: IMPACT,
    color: "var(--faction-snide-note-cta-ink)",
    background: ACID,
    padding: "0 var(--space-xs)",
    textTransform: "uppercase",
    transform: "rotate(0.8deg)",
  },
  {
    fontFamily: BLACK,
    color: "var(--faction-snide-note-knockout-ink)",
    background: "var(--faction-snide-note-knockout-bg)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: the knockout's 1px bleed IS the drawn cut; a 4px rung fattens it into a label chip.
    padding: "1px var(--space-xs)",
    // eslint-disable-next-line local/no-raw-style-values -- ornament: a cut's size is RELATIVE to the headline it was pasted into, not a tier of the type scale.
    fontSize: "0.8em",
    textTransform: "uppercase",
    transform: "rotate(-1.6deg)",
  },
  {
    fontFamily: TYPE,
    color: INK,
    // eslint-disable-next-line local/no-raw-style-values -- ornament: as above; the smallest cut, clipped from body copy rather than a headline.
    fontSize: "0.7em",
    textTransform: "uppercase",
    borderBottom: `3px solid ${PINK}`,
    transform: "rotate(1.2deg)",
  },
];

/** A tiled strip of redaction blocks. `.snd-censor` owns its pigments (#1023). */
function CensorRule({ style }: { style?: CSSProperties }) {
  return <span aria-hidden="true" className="snd-censor" style={style} />;
}

/** Initials fallback for a poster with no uploaded avatar. */
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

/**
 * A poster's photo corner: invariant xerox stock, black initials, tilted.
 * Squares — nothing on this wall is rounded.
 */
function PosterChip({
  name,
  avatarUrl,
  size,
  tilt,
}: {
  name: string;
  avatarUrl: string;
  size: number;
  tilt: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        boxSizing: "border-box",
        background: STOCK,
        border: `2px solid ${HARD}`,
        color: HARD,
        fontFamily: IMPACT,
        fontSize: "var(--text-xl)",
        lineHeight: 1,
        transform: `rotate(${tilt}deg)`,
        boxShadow: `3px 3px 0 ${PINK}`,
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

export default function SnidePraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation("praxis");
  const desktop = useFormFactor() !== "mobile";
  const { praxis, voters } = state;

  // Guarded non-null by the dispatcher.
  if (!praxis) return null;

  const members = orderedMembers(praxis);
  // A collab at ONE member is still a collab (#1274). Tested positively: a duel
  // side is `type='solo'` + `duel_id` (ADR-0011), so `!== 'solo'` is wrong (#992).
  const isCollab = praxis.type === "collab";

  /** Special Elite, uppercase, wide — every micro-label on the wall. */
  const eyebrow: CSSProperties = {
    fontFamily: TYPE,
    fontSize: "var(--text-md)",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: MUTED,
  };

  /** The same micro-label once it is pasted ON a slab, where the ink flips. */
  const plateEyebrow: CSSProperties = { ...eyebrow, color: PLATE_MUTED };

  /** The page's one ground (#2066): black slab, acid rule, hard shadow. */
  const plate: CSSProperties = {
    background: PLATE,
    border: `2px solid ${ACID}`,
    boxShadow: "var(--faction-snide-note-shadow)",
    color: PLATE_TEXT,
    padding: "var(--space-lg)",
    boxSizing: "border-box",
  };

  /**
   * A cut headline with a rule out of it. `onPlate` is which ground the head is
   * on: the censor blocks vanish on the slab, so slab heads get acid.
   */
  const sectionHead = (
    label: ReactNode,
    options: { onPlate?: boolean; big?: boolean; trailing?: ReactNode } = {},
  ) => {
    const { onPlate = false, big = false, trailing } = options;
    return (
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
            fontFamily: IMPACT,
            fontSize: big
              ? desktop
                ? "var(--text-heading)"
                : "var(--text-title)"
              : "var(--text-title)",
            lineHeight: 1.02,
            letterSpacing: "0.01em",
            textTransform: "uppercase",
            color: onPlate ? PLATE_ACCENT : INK,
          }}
        >
          {label}
        </span>
        {onPlate ? (
          <span
            aria-hidden="true"
            style={{
              flex: "1 1 20%",
              minWidth: 24,
              height: 3,
              background: `repeating-linear-gradient(90deg, ${ACID} 0 6px, transparent 6px 10px)`,
            }}
          />
        ) : (
          <CensorRule style={{ flex: "1 1 20%", minWidth: 24 }} />
        )}
        {trailing}
      </div>
    );
  };

  // Navigation and moderation chrome come from the shared skin (#2102, #2718);
  // this kit passes neither flagged-ink knob.
  // ── Byline · title · owner actions · task reference ──
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
        {/* One photo corner per poster; a payload with no member rows still
            credits its creator. */}
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
          {bylineFaces(praxis).map((author, index) => (
            <Link key={author.id} to={`/characters/${author.id}`} style={{ display: "block" }}>
              <PosterChip
                name={author.name}
                avatarUrl={author.avatarUrl}
                size={desktop ? 44 : 38}
                tilt={index % 2 === 0 ? -3 : 2.5}
              />
            </Link>
          ))}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          {members.length > 0 ? (
            <MemberByline
              praxis={praxis}
              linkStyle={{
                fontFamily: TYPE,
                fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
                color: INK,
                textDecoration: "none",
                borderBottom: "2px solid var(--faction-snide-acid-deep)",
              }}
              separatorStyle={{
                fontFamily: TYPE,
                fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
                color: MUTED,
              }}
            />
          ) : (
            <Link
              to={`/characters/${praxis.created_by_id}`}
              style={{
                fontFamily: TYPE,
                fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
                color: INK,
                textDecoration: "none",
                borderBottom: "2px solid var(--faction-snide-acid-deep)",
              }}
            >
              {praxis.created_by_display_name}
            </Link>
          )}
          <div style={{ ...eyebrow, marginTop: "var(--space-xs)" }}>
            {t("detail.filed", {
              date: formatTimestamp(praxis.submitted_at ?? praxis.created_at),
            })}
          </div>
        </div>
      </div>

      {/* Headline cut word by word. Must stay ONE readable string: a flex row
          drops whitespace-only children, so cuts sit inline with real spaces (#1023). */}
      <h1
        style={{
          fontSize: desktop ? "var(--text-display)" : "var(--text-heading)",
          lineHeight: 1.3,
          margin: "0 0 var(--space-md)",
        }}
      >
        {(praxis.title || praxis.task_title).split(/\s+/).map((word, index) => (
          <span key={`${index}-${word}`}>
            {index > 0 ? " " : ""}
            <span
              style={{
                display: "inline-block",
                maxWidth: "100%",
                overflowWrap: "anywhere",
                ...CUTS[(index + praxis.id) % CUTS.length],
              }}
            >
              {word}
            </span>
          </span>
        ))}
      </h1>

      <PraxisOwnerActions state={state} />

      {/* Task reference. */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-sm)",
          flexWrap: "wrap",
          borderTop: `2px solid ${RULE}`,
          borderBottom: `2px solid ${RULE}`,
          padding: "var(--space-md) 0",
          marginBottom: "var(--space-xl)",
        }}
      >
        <span style={eyebrow}>{t("detail.taskRef.label")}</span>
        <Link
          to={`/tasks/${praxis.task_id}`}
          className="content-text"
          style={{ fontFamily: TYPE, color: INK, textDecoration: "none" }}
        >
          {praxis.task_title}
        </Link>
        <span style={{ ...eyebrow, marginLeft: "auto", color: PINK_INK }}>
          {taskRefMeta(praxis, t)}
        </span>
      </div>
    </>
  );

  // ── Score: `ScoreStamp` is the whole readout, dispatched on the TASK's
  // faction (#1091, ADR-0053); `scoreWasBanked` is the skin's gate. ──
  const scoreBlock = (
    <section style={plate}>
      {sectionHead(t("detail.score.heading"), { onPlate: true })}
      <div style={{ display: "flex", justifyContent: "center" }}>
        {/* The crown fleur in the stamp's corner (#1710, ADR-0054). */}
        <ScoreStamp praxis={praxis} />
      </div>
    </section>
  );

  // ── Duel: mounted, not re-narrated; self-hides with no duel / declined /
  // run-up (#1071). Safe on the slab because the `ink` seam (#1153) passes this
  // file's `-card-*` inks. The rival's hue never reaches the card. ──
  const duelInk: DuelInk = {
    name: PLATE_TEXT,
    total: PLATE_TEXT,
    muted: PLATE_MUTED,
    line: PLATE_MUTED,
    plate: PLATE,
  };

  // ── Vote · voters ──
  // `SnideVote`'s acid captions need the slab (2.6:1 on cream). Gated on
  // `VoteUI`'s own predicate (#1429) so an author gets no empty section.
  const voteBlock = voteRegionVisible(state.user, praxis.viewer_can_vote) && (
    <section style={plate}>
      {sectionHead(t("detail.vote.heading"), { onPlate: true })}
      <p
        className="content-text"
        style={{ fontFamily: MARK, margin: "0 0 var(--space-md)", color: PLATE_MUTED }}
      >
        {t("detail.vote.prompt")}
      </p>
      {/* Dispatched on the TASK's faction (ADR-0039); no `points`/`totalVotes`,
          the score rail carries the tally (#888). */}
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        currentValue={praxis.viewer_vote ?? undefined}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </section>
  );

  // Pink as FILL, never ink. NO AVERAGE (ADR-0014): sum and count only.
  const votersBlock = voters.length > 0 && (
    <section style={plate}>
      {sectionHead(
        t("detail.voters.heading"),
        {
          onPlate: true,
          trailing: (
            <span style={plateEyebrow}>
              {t("detail.voters.count", { count: voters.length })}
            </span>
          ),
        },
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        {voters.map((voter) => (
          <div
            key={voter.character_id}
            style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}
          >
            <Link
              to={`/characters/${voter.character_id}`}
              className="content-text"
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontFamily: TYPE,
                color: PLATE_TEXT,
                textDecoration: "none",
              }}
            >
              {voter.display_name}
            </Link>
            <span
              aria-hidden="true"
              style={{
                width: 84,
                height: 10,
                position: "relative",
                overflow: "hidden",
                flexShrink: 0,
                // The slab's xerox tooth: a translucent black would vanish here.
                background: "var(--faction-snide-slab-tooth)",
                border: `1px solid ${PLATE_MUTED}`,
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${(voter.value / 5) * 100}%`,
                  background: PINK,
                }}
              />
            </span>
            <span
              style={{
                width: 22,
                textAlign: "right",
                fontFamily: IMPACT,
                fontSize: "var(--text-title)",
                lineHeight: 1,
                color: PLATE_TEXT,
              }}
            >
              {voter.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );

  // The report card is mounted bare by the skin (ADR-0061).

  // ── Proof · write-up · crew ──
  const proof = praxis.media_items.length > 0 && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.sections.proof"), { big: true })}
      <div style={plate}>
        <MediaGallery media={praxis.media_items} layout={desktop ? "grid" : "column"} />
      </div>
    </section>
  );

  const writeUp = praxis.body_text && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.sections.writeUp"), { big: true })}
      {/* `--link-ink` is a seam whose unset value is 2.19:1 on this slab, so it
          is repointed at the slab's measured pair (as the Ephemerists plate does). */}
      <div
        style={{
          ...plate,
          ["--link-ink" as string]: PLATE_ACCENT,
          ["--link-ink-hover" as string]: PLATE_TEXT,
        }}
      >
        <MarkdownPreview
          source={praxis.body_text}
          className="markdown-preview content-text"
          style={{ fontFamily: TYPE, lineHeight: 1.6, color: PLATE_TEXT }}
        />
      </div>
    </section>
  );

  // Not the slab: `CollabRoster`'s light-grey row fill needs the invariant
  // light xerox stock (13:1 either theme).
  const crew = isCollab && (
    <section style={{ marginBottom: desktop ? "var(--space-2xl)" : "var(--space-xl)" }}>
      {sectionHead(t("detail.sections.members"), { big: true })}
      <div
        style={{
          background: STOCK,
          border: `2px solid ${HARD}`,
          boxShadow: "var(--faction-snide-note-shadow)",
          color: HARD,
          padding: "var(--space-lg)",
          boxSizing: "border-box",
        }}
      >
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

  // Metatasks: the skin mounts the READ-ONLY seal (#1093); add chips would 422
  // (`apply_metatask` needs `in_progress`).

  return (
    <PraxisDetailSkin
      state={state}
      kit={{
        pageStyle: {
          ...factionRoleVars("snide", "snd-read"),
          position: "relative",
          fontFamily: TYPE,
          color: INK,
        },
        sheetClassName: "snd-detail-sheet",
        sheetStyle: {
          ...factionBodyVars("snide"),
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          borderRadius: 18,
          padding: desktop ? "var(--space-2xl)" : "var(--space-lg)",
          overflow: "hidden",
          boxSizing: "border-box",
        },
        header,
        score: scoreBlock,
        duelPanel: plate,
        duelHeading: sectionHead(t("duelCrossLink.label"), { onPlate: true }),
        duelInk,
        vote: voteBlock,
        voters: votersBlock,
        proof,
        writeUp,
        crew,
        metatasksHeading: sectionHead(t("detail.metatasks.heading"), { big: true }),
        /* The comment ROWS stay dispatched on each author's own faction. */
        commentsHeading: sectionHead(t("detail.sections.comments"), { big: true }),
      }}
    />
  );
}
