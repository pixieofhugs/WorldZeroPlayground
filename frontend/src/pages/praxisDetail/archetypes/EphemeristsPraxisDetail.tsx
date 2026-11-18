/**
 * Ephemerists praxis detail, the canonical record (#1120): the Valley plate
 * (Deco × Egypt) at record size. Cornice under a night band, engraved masthead
 * (#1634), octagon bylines, small caps, write-up on a leaf with an ochre margin
 * rule. The one motion is `.eph-cornice-glow` (index.css).
 *
 * Copy is the shared `detail.*` block (ADR-0061; voice recorded on #1118). The
 * score rows keep the shared `card.stamp.*` words so one number has one name.
 * Every colour is a `--faction-ephemerists-plate-*` token; `-brass` is a rule
 * colour, never an ink. `PraxisDetailSkin` owns the layout and the undressed
 * chrome (#2718); this file supplies the kit.
 */
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MediaGallery from "../../../components/MediaGallery";
import MarkdownPreview from "../../editPraxis/blocks/MarkdownPreview";
import VoteUI from "../../../components/vote/VoteUI";
import { reframeLabel } from "../../../components/vote/voteReframes";
import { CollabRoster } from "../../../components/collab/CollabRoster";
import {
  BRASS,
  BRASS_RULE,
  CAPS,
  CAPTION,
  Cornice,
  DECO,
  DISC,
  METAL_SIGILS,
  initialsOf,
  INK,
  INNER,
  LINE,
  MARGINALIA,
  OCHRE,
  Octagon,
  OCTAGON_CLIP,
  PLATE,
  QUIET,
  READING,
  SHADOW,
  SMALL_CAPS,
  Sign,
  BAND,
  BAND_INK,
  BRASS_LIGHT,
} from "../../../components/factionMarks/ephemeristsPlate";
import { EphemeristsColophon, EphemeristsMasthead } from "../../../components/factionMarks/EphemeristsMasthead";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { formatTimestamp } from "../../../utils/dates";
import { mediaUrl } from "../../../utils/media";
import { PraxisDetailSkin, type DuelInk } from "../praxisDetailSkin";
import {
  MemberByline,
  bylineFaces,
  orderedMembers,
} from "../shared";
import type { PraxisDetailState } from "../usePraxisDetail";
import { factionBodyVars } from "../../../utils/factionBodyFace"

const PAGE_WIDTH = 1200;

/** Struck-metal disc and its sigil (#1638). Ornament geometry. */
const VOTER_DISC = 28;
const VOTER_SIGIL = 16;

/**
 * Narrowest row that still prints the metal's word (#2147): chip 28 + rule 10
 * + 3×8 gaps + ~66 for "platinum" leaves ~130px for the name. Below it the
 * word goes `sr-only`, never shrunk or hover-gated.
 */
const VOTER_WORD_MIN = 260;

/**
 * A width decision, not a breakpoint: the panel is a 330px aside on desktop
 * but the full column on mobile. `null` (unmeasured, or no `ResizeObserver`)
 * reads as roomy.
 */
export function voterMetalWordFits(rowWidth: number | null): boolean {
  return rowWidth === null || rowWidth >= VOTER_WORD_MIN;
}

/** A ref callback, not `useRef`, so the effect re-runs when the (conditional) node arrives. */
function useObservedWidth(): [(node: HTMLElement | null) => void, number | null] {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [setNode, width];
}

interface SizeSet {
  /** Geometry, so raw px (WORLD_ZERO_STYLE §4a), as are `disc` and `marginRule`. */
  masthead: number
  disc: number
  titleSize: string
  pagePadding: string
  marginRule: number
  leafPadding: string
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    masthead: 84,
    disc: 46,
    titleSize: "var(--text-display)",
    pagePadding: "var(--space-2xl)",
    marginRule: 26,
    leafPadding: "var(--space-xl) var(--space-xl) var(--space-lg) var(--space-3xl)",
  },
  mobile: {
    masthead: 68,
    disc: 40,
    titleSize: "var(--text-heading)",
    pagePadding: "var(--space-lg)",
    marginRule: 18,
    leafPadding: "var(--space-lg) var(--space-lg) var(--space-md) var(--space-xl)",
  },
};

/**
 * One author's monogram in a stepped octagon. Local, not the kit's
 * `AuthorOctagon`, because this page sizes the monogram from the type ramp.
 */
function AuthorOctagon({
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
        position: "relative",
        display: "block",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0 }}
      >
        <Octagon inset={0} stroke={BRASS} width={2} fill={DISC} />
        <Octagon inset={7} stroke={BRASS_LIGHT} width={0.8} />
      </svg>
      {avatarUrl ? (
        <img
          src={mediaUrl(avatarUrl)}
          alt={name}
          className="object-cover"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            clipPath: OCTAGON_CLIP,
          }}
        />
      ) : (
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: CAPS,
            fontWeight: 500,
            fontSize: "var(--text-md)",
            letterSpacing: "0.08em",
            // The octagon is compass blue in both themes (#2141).
            color: BAND_INK,
          }}
        >
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}

export default function EphemeristsPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation("praxis");
  const desktop = useFormFactor() !== "mobile";
  const size = SIZES[desktop ? "desktop" : "mobile"];
  // Hooks above the `!praxis` return.
  const [votersRef, votersWidth] = useObservedWidth();
  const { praxis, voters } = state;

  // Guarded non-null by the dispatcher.
  if (!praxis) return null;

  const members = orderedMembers(praxis);

  const authors = bylineFaces(praxis);

  /** `-quiet`: the caption gold is measured on the plate, not the darker page. */
  const eyebrow: CSSProperties = {
    ...SMALL_CAPS,
    fontSize: "var(--text-md)",
    color: QUIET,
  };
  /** On a panel cell, where the caption gold clears. */
  const plateEyebrow: CSSProperties = { ...eyebrow, color: CAPTION };
  const gloss: CSSProperties = {
    fontFamily: MARGINALIA,
    fontSize: "var(--text-content)",
    lineHeight: 1.6,
    color: QUIET,
  };

  const panel: CSSProperties = {
    background: PLATE,
    border: `1px solid ${LINE}`,
    padding: "var(--space-lg)",
    boxSizing: "border-box",
  };

  const sectionHead = (label: ReactNode, trailing?: ReactNode) => (
    <div style={{ marginBottom: "var(--space-lg)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          marginBottom: "var(--space-sm)",
          flexWrap: "wrap",
        }}
      >
        <h2
          style={{
            ...SMALL_CAPS,
            fontWeight: 600,
            fontSize: "var(--text-md)",
            color: INK,
            margin: 0,
            flex: "0 0 auto",
          }}
        >
          {label}
        </h2>
        <span aria-hidden style={{ flex: 1, minWidth: 24, height: 1, background: BRASS, opacity: 0.5 }} />
        {trailing}
      </div>
    </div>
  );

  const masthead = (
    <div>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: size.masthead,
          background: BAND,
          color: BAND_INK,
        }}
      >
        <EphemeristsMasthead
          slug={praxis.task_faction_slug}
          scale={desktop ? "page" : "card"}
          seed={`praxis:${praxis.id}`}
        />
      </div>
      <Cornice glow />
    </div>
  );

  // Flagged-banner ink (#1627): the banner sits on `-plate-page`, night in both
  // themes, where neutral ink (3.01:1) and `--color-warning` (3.68:1) fail.
  // `-card-notice` reads 11.07:1; label, body and rule share it (#1449).
  const NOTICE = "var(--faction-ephemerists-card-notice)";

  const byline = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        marginBottom: "var(--space-md)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
        {authors.map((author) => (
          <Link key={author.id} to={`/characters/${author.id}`} style={{ display: "block" }}>
            <AuthorOctagon
              name={author.name}
              avatarUrl={author.avatarUrl}
              size={size.disc}
            />
          </Link>
        ))}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        {members.length > 0 ? (
          <MemberByline
            praxis={praxis}
            linkStyle={{
              fontFamily: READING,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              color: INK,
              textDecoration: "none",
            }}
          />
        ) : (
          <Link
            to={`/characters/${praxis.created_by_id}`}
            style={{
              fontFamily: READING,
              fontSize: desktop ? "var(--text-title)" : "var(--text-content)",
              color: INK,
              textDecoration: "none",
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
  )

  const title = (
    <h1
      style={{
        fontFamily: DECO,
        fontSize: size.titleSize,
        lineHeight: 1.16,
        letterSpacing: "0.02em",
        margin: "0 0 var(--space-lg)",
        color: INK,
        overflowWrap: "anywhere",
      }}
    >
      {praxis.title || praxis.task_title}
    </h1>
  )

  const taskRef = (meta: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "var(--space-sm)",
        flexWrap: "wrap",
        borderTop: `1px solid ${LINE}`,
        borderBottom: `1px solid ${LINE}`,
        padding: "var(--space-md) 0",
        marginBottom: "var(--space-xl)",
      }}
    >
      <Sign name="djed" size={14} color={BRASS} />
      <span style={eyebrow}>{t("detail.taskRef.label")}</span>
      <Link
        to={`/tasks/${praxis.task_id}`}
        className="content-text"
        style={{ fontFamily: READING, color: BRASS_LIGHT, textDecoration: "none" }}
      >
        {praxis.task_title}
      </Link>
      <span style={{ ...eyebrow, marginLeft: "auto" }}>
        {meta}
      </span>
    </div>
  )


  // The plate's own inks (#1153); `QUIET` clears on all three grounds. The
  // rival's faction hue is never an ink.
  const duelInk: DuelInk = { name: INK, total: INK, muted: QUIET, line: LINE, plate: INNER };

  const voteBlock = (
    <>
      {sectionHead(t("detail.vote.heading"))}
      <p style={{ ...gloss, margin: "0 0 var(--space-md)" }}>{t("detail.vote.prompt")}</p>
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        currentValue={praxis.viewer_vote ?? undefined}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </>
  );

  // No average (ADR-0014). Each vote reads back as the struck metal (#1638),
  // from the widget's own `METAL_SIGILS`, inked in its own metal (#2147): safe
  // only because the disc is `-plate-disc`, dark in both themes (#2141).
  // The metal's word is a real span, not a `title` (unreachable on touch, and
  // the only copy of it): one span, visible or `sr-only` (#2147). Not a row
  // `aria-label`: on a role-less `div` it is dropped.
  const metalWordFits = voterMetalWordFits(votersWidth);
  const votersBlock = (
    <>
      {sectionHead(
        t("detail.voters.heading"),
        <span style={plateEyebrow}>{t("detail.voters.count", { count: voters.length })}</span>,
      )}
      <div
        ref={votersRef}
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}
      >
        {voters.map((voter) => {
          const metal = METAL_SIGILS[voter.value - 1] ?? METAL_SIGILS[0];
          return (
            <div
              key={voter.character_id}
              style={{
                // Contains the `sr-only` word's absolute box.
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
              }}
            >
              <Link
                to={`/characters/${voter.character_id}`}
                style={{
                  flex: "0 1 auto",
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontFamily: READING,
                  fontSize: "var(--text-content)",
                  color: INK,
                  textDecoration: "none",
                }}
              >
                {voter.display_name}
              </Link>
              <span aria-hidden style={{ flex: 1, minWidth: 10, height: 1, background: LINE }} />
              <span
                className={metalWordFits ? undefined : "sr-only"}
                style={
                  metalWordFits
                    ? { ...plateEyebrow, flexShrink: 0, whiteSpace: "nowrap" }
                    : undefined
                }
              >
                {reframeLabel(praxis.task_faction_slug, voter.value)}
              </span>
              <span
                aria-hidden
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: VOTER_DISC,
                  height: VOTER_DISC,
                  borderRadius: "50%",
                  border: `1px solid ${BRASS_RULE}`,
                  background: DISC,
                }}
              >
                <svg
                  width={VOTER_SIGIL}
                  height={VOTER_SIGIL}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  style={{ display: "block" }}
                >
                  <path
                    d={metal.glyph}
                    fill="none"
                    stroke={metal.color}
                    strokeWidth={metal.weight}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );

  const proof = (
    <>
      {sectionHead(t("detail.sections.proof"))}
      <div
        style={{
          background: INNER,
          border: `1px solid ${LINE}`,
          outline: `1px solid ${BRASS_LIGHT}`,
          outlineOffset: 3,
          padding: "var(--space-sm)",
        }}
      >
        <MediaGallery media={praxis.media_items} layout={desktop ? "grid" : "column"} />
      </div>
    </>
  );

  // No horizontal journal ruling: markdown breaks the single leading it needs.
  const writeUp = (
    <>
      {sectionHead(t("detail.sections.writeUp"))}
      <div
        style={{
          position: "relative",
          background: PLATE,
          border: `1px solid ${LINE}`,
          padding: size.leafPadding,
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: size.marginRule,
            width: 1,
            background: OCHRE,
            opacity: 0.5,
          }}
        />
        <MarkdownPreview
          source={praxis.body_text ?? ''}
          className="markdown-preview content-text"
          style={{ fontFamily: READING, lineHeight: 1.85, color: INK }}
        />
      </div>
    </>
  );

  // No status guard: `in_progress`/`pending` redirect to the composer (ADR-0062).
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

  return (
    <PraxisDetailSkin
      state={state}
      kit={{
        flaggedInk: NOTICE,
        flaggedBodyInk: NOTICE,
        /* No full-bleed backdrop: see the `.eph-plate-sheet` note in index.css. */
        sheetClassName: "eph-plate-sheet",
        sheetStyle: {
          ...factionBodyVars("ephemerists"),
          maxWidth: PAGE_WIDTH,
          margin: "0 auto",
          boxSizing: "border-box",
          color: INK,
          border: `1px solid ${LINE}`,
          boxShadow: SHADOW,
        },
        sheetPrelude: masthead,
        /* Pads contents, not edges: the masthead stays flush. */
        sheetBody: (body) => <div style={{ padding: size.pagePadding }}>{body}</div>,
        byline,
        title,
        taskRef,
        scoreHeading: sectionHead(t("detail.score.heading")),
        panel,
        duelHeading: sectionHead(t("duelCrossLink.label")),
        duelInk,
        vote: voteBlock,
        voters: votersBlock,
        proof,
        writeUp,
        crew,
        metatasksHeading: sectionHead(t("detail.metatasks.heading")),
        commentsHeading: sectionHead(t("detail.sections.comments")),
        /* Colophon below both columns, away from player fields (#2143).
           Undated here only: a praxis's date is `submitted_at`, and pairing it
           with the coordinates is the inference #2124 forbids. */
        footer: <EphemeristsColophon scale={desktop ? "page" : "card"} />,
      }}
    />
  );
}
