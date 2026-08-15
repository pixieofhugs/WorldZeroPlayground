/**
 * Cozy Coven — THE CANDLELIT SPELL SLIP, as a composer (edit praxis v2, #1188,
 * epic #1179; design project c491945e, `Coven Edit Praxis.dc.html`,
 * `faction="coven"`).
 *
 * The shared composer layout (`shared.tsx`) wearing Coven's dress: a centred
 * masthead of a turning pentacle disc under a twinkle field, a glow-and-lavender
 * ground carrying the coven wheel and a scatter of arcane glyphs, one braid of
 * thread closing the sheet, an 88px haloed ward for the points, a 40px pentacle
 * for the stage mark, and a full-bleed band for the cast.
 *
 * ## This REPLACES the `wow.exe` window wholesale
 *
 * The file this one replaces drew a literal desktop-window caption reading
 * `wow.exe` — a chrome string left over from before #784 split Coven off
 * Warriors of Whimsy (ADR-0050). It was never a slug and never a dispatch bug;
 * the window metaphor was simply the old design, and #1023 / #1031 had already
 * retired it on the task card and the task detail page. The composer is the last
 * surface still carrying it, so the whole metaphor goes, caption included.
 *
 * ## Copy is neutral (ADR-0065 §3)
 *
 * Every word comes from the shared `editPraxis.composer.*` set — the same
 * strings an unaffiliated player reads. Coven's own composer vocabulary
 * (`windowTitle`, `pageTitle` "edit praxis", `modeLabel` "how are you walking?",
 * `bodyLabel` "field notes", `publishIdle` "cast it into the world", …) is
 * deleted with this issue. `editPraxis.coven.collab` STAYS: that block is
 * `collabCopy`'s override table, a different resolver, and it also feeds
 * `CollabRoster` on the read page — deleting it would restyle a surface this
 * epic is not touching.
 *
 * The one word this page draws that is not from the neutral set is the
 * MASTHEAD WORDMARK, and it is not composer copy: it is Coven's own wordmark,
 * already owned by `feed:taskCard.coven.masthead` for the v2 task card. Read
 * from there rather than re-keyed here, so the coven is lettered identically on
 * both surfaces and this page introduces no faction copy of its own.
 *
 * ## One responsive component, no mobile twin (ADR-0065 §2)
 *
 * `useComposerSizes()` picks the size set; there is one tree at two widths and
 * no fixed-px grid anywhere below (SPEC-faction-ui-profile §1a). The
 * `mobileEditPraxis` twin and its manifest surface were retired in #1181.
 *
 * ## Colour and motion
 *
 * All colour via `--faction-coven-slip-*` (shared with the v2 task card and task
 * detail) plus `--faction-coven-ward-*` for the sheet and its fields, and the
 * three `--faction-coven-cast-*` tokens this issue adds for the band's
 * submitted state. Light/dark flips entirely through the `[data-theme="dark"]`
 * cascade — there is no `dark ? a : b` anywhere in this file.
 *
 * Motion is reached by CLASS only: `.ep-spin` (the masthead disc at 42s, the
 * ward's spokes at 30s, both re-timed through `--ep-spin-dur`), `.ep-twinkle`
 * (the ward's five stars, staggered through `--ep-delay`) and `.cvn-wheel` (the
 * ground's pentagram, Coven's own 120s turn). Every keyframe already lives in
 * `index.css` behind the shared `prefers-reduced-motion` guard; an inline
 * `animation:` would bypass that guard (#1003).
 *
 * ## Not drawn as designed
 *
 * No forfeit at the awaiting stage and no duel clock: #1071 decisions 3 and 4
 * (unsubmitting before a duel settles is a free neutral reopen, and no expiry
 * field exists to read). The awaiting stage itself belongs to
 * `PraxisWaitingSurface` and to #1189.
 */
import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import MediaArt from "../blocks/MediaArt";
import { pickArtKey } from "../blocks/useMediaArt";
import {
  Breadcrumb,
  ComposerFooter,
  ComposerGround,
  ComposerMasthead,
  ComposerPage,
  ComposerRule,
  ComposerSection,
  ComposerSheet,
  ComposerStatusRow,
  ErrorBanner,
  RingMark,
  TaskSlip,
  composerLabelStyle,
  formatAutosave,
  useComposerSizes,
  type ComposerDress,
} from "./shared";
import PraxisWaitingSurface from "../waiting/PraxisWaitingSurface";
import {
  BodyPreview,
  BodyTextarea,
  DropButton,
  FilePicker,
  InviteSearch,
  ModePicker,
  PublishButton,
  SaveDraftButton,
  TitleField,
  WriteUpTabs,
  type ComposerTab,
} from "./controls";
import { MetataskSealStack } from "../../../components/metataskSeal/MetataskSealStack";
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";

interface Props {
  state: EditPraxisState;
}

/* The Write-up header's right end: the word count, then Write/Preview (#1706).
   `ComposerSection` hands `meta` a plain span, and `WriteUpTabs` is a flex DIV,
   so the two need a row of their own or the tabs drop below the count. */
const metaRowStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-md)",
} as const;

/* The two faces the design names. Both are SURFACE faces on shared
 * `--font-faction-*` tokens rather than Coven's `card-font` (still Caveat), for
 * the reason WORLD_ZERO_STYLE §4 gives: repointing a faction's card-font to
 * satisfy one design restyles a dozen other surfaces. */
const DISPLAY = "var(--font-faction-witch)"; /* Grenze Gotisch — title */
const CHROME = "var(--font-faction-rounded)"; /* Quicksand — body + label */

/* The slip's pigments, named for the ROLE each plays in the design's skin row. */
const SHEET = "var(--faction-coven-ward-card)";
/* The error banner's ink (#1231). The banner sits straight on the sheet, and
 * the neutral `--color-danger` under its own veil misses AA there in light
 * (4.23:1 on this ground); this is #1449's alarm rung, already measured
 * on paper. The veil and the edge stay neutral — ADR-0061. */
const ALARM = "var(--faction-coven-card-alarm)";
const FIELD = "var(--faction-coven-ward-page)";
const INK = "var(--faction-coven-slip-ink)";
const SOFT = "var(--faction-coven-slip-soft)";
const LABEL = "var(--faction-coven-slip-label)";
/* the design's accentDeep. ORNAMENT AND RULES ONLY on this surface: everything
   painted on FIELD is on the ward PAGE ground, where `slip-deep` measures
   4.44:1 — under the floor for anything below the 3:1 large-text size (#1295).
   The composer's active-state ink is INK; see the tier note in covenSlip.tsx. */
const DEEP = "var(--faction-coven-slip-deep)";
const PINK = "var(--faction-coven-slip-pk)"; /* the design's accent */
const GOLD = "var(--faction-coven-slip-gold)";
const BORDER = "var(--faction-coven-slip-border)";
const CTA_INK = "var(--faction-coven-slip-cta-ink)";
const CTA_BAND =
  "linear-gradient(180deg, var(--faction-coven-slip-cta-from), var(--faction-coven-slip-cta-to))";
/** Once your part is in, the band goes green. Polarity matches the cast ink. */
const CAST_BAND =
  "linear-gradient(180deg, var(--faction-coven-cast-from), var(--faction-coven-cast-to))";
const CAST_INK = "var(--faction-coven-cast-ink)";

/** The skin's geometry: radius 14, borders 1.5, and the border takes gold. */
const RADIUS = 14;
const FIELD_RADIUS = 10;
const EDGE = `1.5px solid ${GOLD}`;
const RULE = `1.5px solid ${BORDER}`;

/** A four-point star, centred on (x, y) with arm length r. */
function starPath(x: number, y: number, r: number): string {
  const long = r * 2.6;
  return `M${x} ${y - long} l${r} ${long} ${long} ${r} -${long} ${r} -${r} ${long} -${r} -${long} -${long} -${r} ${long} -${r} z`;
}

/** The braided thread rule. `.cvn-braid` owns the strands' pigments (index.css). */
function Braid({ style }: { style?: CSSProperties }) {
  return (
    <span aria-hidden className="cvn-braid" style={{ minWidth: 20, ...style }} />
  );
}

/**
 * The coven's pentagram, alone. The status mark IS this at 40px in accentDeep;
 * the masthead badge is this inside a disc.
 */
function Pentacle({
  size,
  color,
  strokeWidth = 1.5,
  opacity,
}: {
  size: number;
  color: string;
  strokeWidth?: number;
  opacity?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <path
        d="M22 8 L30.2 33.3 L8.7 17.7 L35.3 17.7 L13.8 33.3 Z"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        opacity={opacity}
      />
    </svg>
  );
}

/**
 * The masthead badge: accent field, a dashed gold ring, the pentagram in
 * accentDeep and a gold centre — turning once every 42 seconds. `.ep-spin` owns
 * the motion and its reduced-motion guard; `--ep-spin-dur` re-times it without
 * a second keyframe.
 */
function SigilDisc({ size }: { size: number }) {
  return (
    <svg
      className="ep-spin"
      width={size}
      height={size}
      viewBox="0 0 44 44"
      aria-hidden="true"
      style={
        {
          display: "block",
          flex: "0 0 auto",
          "--ep-spin-dur": "42s",
        } as CSSProperties
      }
    >
      <circle cx="22" cy="22" r="19" fill={PINK} opacity="0.18" />
      <circle
        cx="22"
        cy="22"
        r="15"
        fill="none"
        stroke={GOLD}
        strokeWidth="1"
        strokeDasharray="2 4"
      />
      <path
        d="M22 8 L30.2 33.3 L8.7 17.7 L35.3 17.7 L13.8 33.3 Z"
        fill="none"
        stroke={DEEP}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="22" cy="22" r="3" fill={GOLD} />
    </svg>
  );
}

/** Gold twinkles behind the masthead row, stretched across the band. */
function TwinkleField() {
  const stars: [number, number, number][] = [
    [34, 22, 2.4],
    [118, 52, 1.4],
    [206, 18, 1.8],
    [292, 46, 2],
    [366, 24, 1.4],
    [452, 50, 1.7],
  ];
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 480 72"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      {stars.map(([x, y, r]) => (
        <path
          key={`${x}-${y}`}
          d={starPath(x, y, r)}
          fill={GOLD}
          opacity={0.75}
        />
      ))}
    </svg>
  );
}

/**
 * The ground's scatter of arcane marks. Positioned in percentages so it reflows
 * with the column instead of pinning to a canvas width — the same reason the
 * layout carries no fixed-px grid.
 */
const GLYPHS: { left: string; top: string; size: number; turn: number }[] = [
  { left: "8%", top: "14%", size: 15, turn: -12 },
  { left: "78%", top: "9%", size: 11, turn: 18 },
  { left: "26%", top: "38%", size: 9, turn: 6 },
  { left: "91%", top: "44%", size: 14, turn: -24 },
  { left: "14%", top: "63%", size: 12, turn: 15 },
  { left: "64%", top: "72%", size: 10, turn: -8 },
  { left: "38%", top: "88%", size: 13, turn: 22 },
  { left: "86%", top: "82%", size: 9, turn: -16 },
];

function GlyphScatter() {
  return (
    <>
      {GLYPHS.map((glyph) => (
        <span
          key={`${glyph.left}-${glyph.top}`}
          aria-hidden
          style={{
            position: "absolute",
            left: glyph.left,
            top: glyph.top,
            transform: `rotate(${glyph.turn}deg)`,
            opacity: 0.22,
          }}
        >
          <Pentacle size={glyph.size} color={DEEP} strokeWidth={1.1} />
        </span>
      ))}
    </>
  );
}

/**
 * The points, held in a glowing ward: a halo in accent, an accent ring, four
 * gold spokes turning once every 30 seconds, and five gold stars twinkling out
 * of step with each other.
 *
 * Built on `RingMark` — the shared geometry the layout contract offers for both
 * marks — with the punch-out collapsed (`inset={0}`, transparent centre) because
 * Coven's ward is a drawn sigil rather than a ring with a hole in it. The size,
 * the centring and the content slot are still the shared ones.
 *
 * The stars are HTML spans rather than SVG nodes on purpose: `epTwinkle`
 * animates `transform: scale()`, and on an SVG child that scales about the
 * viewBox origin instead of the star, which throws them across the disc.
 */
const WARD_STARS: [number, number, string][] = [
  [50, 4, "0s"],
  [88, 26, "0.3s"],
  [14, 74, "0.6s"],
  [84, 78, "0.9s"],
  [16, 24, "1.2s"],
];

function PointsWard({ size, points }: { size: number; points: number }) {
  return (
    <RingMark
      size={size}
      inset={0}
      ring="var(--faction-coven-slip-sigil-halo)"
      inner="transparent"
    >
      {/* The still layer: the accent ring the numeral sits inside. */}
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <circle
          cx="50"
          cy="50"
          r="32"
          fill="none"
          stroke={PINK}
          strokeWidth="1.8"
          opacity="0.9"
        />
      </svg>
      {/* The turning layer: four gold spokes outside the ring. */}
      <svg
        className="ep-spin"
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={
          {
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            transformOrigin: "50% 50%",
            "--ep-spin-dur": "30s",
          } as CSSProperties
        }
      >
        <g stroke={GOLD} strokeWidth="1.4" strokeLinecap="round" opacity="0.85">
          <path d="M50 50 L74.7 25.3" />
          <path d="M50 50 L74.7 74.7" />
          <path d="M50 50 L25.3 74.7" />
          <path d="M50 50 L25.3 25.3" />
        </g>
      </svg>
      {WARD_STARS.map(([x, y, delay]) => (
        // Two nodes, not one: the outer span is CENTRED on the point by
        // transform (a negative half-pixel margin would be spacing wearing
        // ornament's clothes), and `epTwinkle` animates `transform` — so the
        // keyframe would overwrite that centring if they shared an element.
        // This is where the ratchet's blind spot to a unary minus was found;
        // that hole is closed now (#1233), and the two nodes still stand on
        // the animation argument alone.
        <span
          key={`${x}-${y}`}
          aria-hidden
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span
            className="ep-twinkle"
            style={
              {
                display: "block",
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: GOLD,
                "--ep-delay": delay,
              } as CSSProperties
            }
          />
        </span>
      ))}
      <span
        style={{
          position: "relative",
          fontFamily: DISPLAY,
          fontSize: "var(--text-title)",
          lineHeight: 1,
          color: DEEP,
        }}
      >
        {points}
      </span>
    </RingMark>
  );
}

export default function CovenEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
  /* The wordmark is Coven's own, already lettered for the v2 task card. Read
     from `feed` rather than re-keyed under `editPraxis.coven`, which this issue
     deletes — the composer introduces no faction copy of its own. */
  const { t: tFeed } = useTranslation("feed");
  const sizes = useComposerSizes();
  const [tab, setTab] = useState<ComposerTab>("write");
  const praxis = state.praxis!;
  const task = state.task;

  const modeOptions: Array<{ key: PraxisType; label: string }> = [
    { key: "solo", label: t("editPraxis.composer.modeSolo") },
    { key: "collab", label: t("editPraxis.composer.modeCollab") },
    { key: "duel", label: t("editPraxis.composer.modeDuel") },
  ];

  /* The sheet's own inset, declared here rather than inherited, so the submit
     band's full bleed is arithmetic the reader can check against one place.
     Same values `useComposerSizes` would have given. */
  const padX = sizes.isMobile ? "var(--space-lg)" : "var(--space-2xl)";
  const padTop = sizes.isMobile ? "var(--space-lg)" : "var(--space-xl)";
  const padBottom = sizes.isMobile ? "var(--space-xl)" : "var(--space-2xl)";

  /* Cast, not merely composing: a duel side that has sealed, or a collab member
     whose part is in. The band goes green for both — the only two states where
     the footer still draws a button after publishing (`PublishButton`). */
  const hasCast =
    state.isPublished ||
    praxis.members.some(
      (member) =>
        member.character_id === state.currentCharacterId && member.has_submitted,
    );

  const labelStyle: CSSProperties = { fontFamily: CHROME, color: LABEL };
  const fieldBox = {
    width: "100%",
    background: FIELD,
    color: INK,
    border: RULE,
    borderRadius: FIELD_RADIUS,
    padding: "var(--space-md)",
    outline: "none",
    boxSizing: "border-box",
  } as const;
  /* The braid, for the dress the waiting surface wears. On THIS page the one
     braid the design allows (#1707) is the footer's own, drawn below. */
  const braidRule = (
    <ComposerRule>
      <Braid />
    </ComposerRule>
  );

  /* The chrome, named once and mounted twice: the composer below, and the
     waiting surface once your part is in (#1189). The same ELEMENTS both
     times, so the twinkling wordmark, the braid, the wheel and the glyph
     scatter cannot drift between the two stages. */
  const sheetStyle = {
    background: SHEET,
    border: EDGE,
    borderRadius: RADIUS,
    boxShadow: "var(--faction-coven-slip-shadow)",
  };
  const contentStyle = { padding: `${padTop} ${padX} ${padBottom}` };
  const statusMark = <Pentacle size={40} color={DEEP} />;
  const slip = {
    style: {
      background: FIELD,
      border: RULE,
      /* The design left-rules the slip in the accent (#1706). It sits AFTER the
         border shorthand on purpose: a shorthand spread last would erase it. */
      borderLeft: `2px solid ${INK}`,
      borderRadius: FIELD_RADIUS,
      padding: "var(--space-lg)",
    },
    labelStyle,
    titleStyle: { fontFamily: DISPLAY, color: INK },
    descriptionStyle: { fontFamily: CHROME, color: SOFT },
    pillStyle: { fontFamily: CHROME, color: LABEL },
  } as const;
  /* The waiting footer's affirmative control is a BUTTON, not the composer's
     full-bleed band: the band is the slip's one irreversible act, and taking
     your own part back out is neither irreversible nor the page's subject. */
  const primaryStyle = composerLabelStyle({
    fontFamily: CHROME,
    fontSize: "var(--text-xl)",
    fontWeight: 700,
    border: "none",
    borderRadius: FIELD_RADIUS,
    padding: "var(--space-md) var(--space-xl)",
    color: CTA_INK,
    background: CTA_BAND,
  });
  const masthead = (
          <ComposerMasthead
            style={{
              height: "auto",
              padding: "var(--space-lg) var(--space-lg) var(--space-md)",
              overflow: "hidden",
            }}
          >
            <div aria-hidden style={{ position: "relative" }}>
              <TwinkleField />
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "var(--space-sm)",
                }}
              >
                <SigilDisc size={30} />
                <span
                  style={{
                    fontFamily: DISPLAY,
                    // eslint-disable-next-line local/no-raw-style-values -- ornament: the coven's wordmark, lettered in Grenze Gotisch.
                    fontSize: 22,
                    lineHeight: 1,
                    letterSpacing: "0.02em",
                    color: INK,
                  }}
                >
                  {tFeed("taskCard.coven.masthead")}
                </span>
              </div>
              <Braid style={{ marginTop: "var(--space-sm)" }} />
            </div>
          </ComposerMasthead>
  );
  const ground = (
          <>
            {/* The glow and the lavender wash, at the design's two anchors. */}
            <ComposerGround
              inset={0}
              opacity={0.7}
              background={`radial-gradient(62% 48% at 12% 0%, ${PINK}, transparent 70%), radial-gradient(58% 46% at 100% 100%, var(--faction-coven-slip-lav), transparent 72%)`}
            />
            {/* The wheel and the glyphs, on their own layer so each keeps its
                own strength instead of inheriting the wash's. */}
            <ComposerGround inset={0}>
              <svg
                className="cvn-wheel"
                width={520}
                height={520}
                viewBox="0 0 100 100"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: -150,
                  bottom: -110,
                  opacity: 0.1,
                }}
              >
                <path
                  d="M50 12 L73.5 84.3 L11.9 39.7 L88.1 39.7 L26.5 84.3 Z"
                  fill="none"
                  stroke={DEEP}
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
              <GlyphScatter />
            </ComposerGround>
          </>
  );

  const dress: ComposerDress = {
    // INK, not DEEP (#1295). `PraxisWaitingSurface` paints `accent` as 12px
    // LABEL text — the duel side's sealed/writing pill and the nudge button —
    // on a panel this skin grounds in FIELD, i.e. the ward PAGE. That is the
    // one ground `slip-deep` misses (4.44:1). The accent is also a border and a
    // ring stroke there, and INK clears the 3:1 graphic floor just as easily.
    accent: INK,
    alarm: ALARM,
    pageStyle: { fontFamily: CHROME, color: INK },
    breadcrumbInk: LABEL,
    sheetStyle,
    contentStyle,
    masthead,
    ground,
    rule: () => braidRule,
    mark: statusMark,
    statusStyle: { fontFamily: CHROME, color: INK, fontWeight: 700 },
    metaStyle: { fontFamily: CHROME, color: LABEL },
    labelStyle,
    slip,
    panelStyle: {
      background: FIELD,
      border: RULE,
      borderRadius: FIELD_RADIUS,
    },
    headingStyle: { fontFamily: DISPLAY, color: INK },
    bodyStyle: { fontFamily: CHROME, color: SOFT },
    quietStyle: { fontFamily: CHROME, color: LABEL },
    primaryStyle,
    quietButtonStyle: { fontFamily: CHROME, color: LABEL },
  };

  /* Your part is in, so the composer is not a composer any more (ADR-0059).
     Same page, same sheet, same ornament — a different stage. */
  if (isWaitingStage(state.phase)) {
    return <PraxisWaitingSurface state={state} dress={dress} />;
  }

  return (
    <ComposerPage
      sizes={sizes}
      style={dress.pageStyle}
      breadcrumb={
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
          inkColor={LABEL}
        />
      }
    >
      <ComposerSheet
        sizes={sizes}
        style={sheetStyle}
        contentStyle={contentStyle}
        masthead={masthead}
        ground={ground}
      >
        {/* Draft · Saved just now, closed by the pentacle. */}
        <ComposerStatusRow
          status={t("editPraxis.composer.statusDraft")}
          meta={
            state.autosaveAt
              ? t("editPraxis.composer.statusSaved", {
                  ago: formatAutosave(state.autosaveAt),
                })
              : t("editPraxis.composer.statusUnsaved")
          }
          statusStyle={dress.statusStyle}
          metaStyle={dress.metaStyle}
          mark={statusMark}
        />

        {/* The task reference slip, with the ward. */}
        <TaskSlip
          praxis={praxis}
          task={task}
          {...slip}
          mark={<PointsWard size={88} points={task?.point_value ?? 0} />}
        />

        <ComposerSection
          label={t("editPraxis.composer.titleLabel")}
          htmlFor="composer-title"
          rule={false}
          labelStyle={labelStyle}
        >
          <TitleField
            state={state}
            skin={{
              id: "composer-title",
              placeholder: t("editPraxis.composer.titlePlaceholder"),
              inputStyle: { ...fieldBox, fontFamily: DISPLAY },
            }}
          />
        </ComposerSection>

        {/* How it was done — hidden once the mode can no longer change, per the
            house rule that an unusable control is not drawn disabled. */}
        {!state.controlsLocked && (
          <ComposerSection
            label={t("editPraxis.composer.modeLabel")}
            rule={false}
            labelStyle={labelStyle}
          >
            <ModePicker
              state={state}
              skin={{
                containerStyle: {
                  display: "flex",
                  gap: "var(--space-sm)",
                  flexWrap: "wrap",
                },
                options: modeOptions,
                renderOption: (option, { active, disabled, onSelect }) => (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={active}
                    onClick={onSelect}
                    disabled={disabled && !active}
                    style={composerLabelStyle({
                      fontFamily: CHROME,
                      fontWeight: 700,
                      cursor: disabled ? "not-allowed" : "pointer",
                      padding: "var(--space-sm) var(--space-lg)",
                      borderRadius: 999,
                      background: active ? CTA_BAND : FIELD,
                      color: active ? CTA_INK : LABEL,
                      border: active
                        ? "1.5px solid var(--faction-coven-slip-cta-to)"
                        : RULE,
                    })}
                  >
                    {option.label}
                  </button>
                ),
              }}
            />
          </ComposerSection>
        )}

        {/* The mode block: the collaborator roster, or the duel pair. One
            control draws both — `InviteSearch` switches on `state.duelMode`. */}
        {state.showInviteBox && (
          <ComposerSection
            label={
              // The roster names itself now — `Collaborators · N` sits on its
              // own header row inside the panel, beside the tally it used to
              // disagree with (#1416). Only the duel guise of this block still
              // needs a section label, and `undefined` drops the heading row
              // rather than printing an empty one.
              state.duelMode
                ? t("editPraxis.composer.opponentLabel")
                : undefined
            }
            rule={false}
            labelStyle={labelStyle}
          >
            <InviteSearch
              state={state}
              skin={{
                fontFamily: CHROME,
                inputBg: FIELD,
                inputColor: INK,
                inputBorder: RULE,
                dropdownBg: SHEET,
                dropdownBorder: RULE,
                acceptedBg: "var(--faction-coven-slip-cta-from)",
                acceptedColor: CTA_INK,
                pendingColor: SOFT,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { color: LABEL },
              }}
            />
          </ComposerSection>
        )}

        {state.showSealStack && (
          <ComposerSection
            label={t("editPraxis.composer.sealsLabel")}
            rule={false}
            labelStyle={labelStyle}
          >
            <MetataskSealStack state={state} />
          </ComposerSection>
        )}

        {/* Write-up — the tabs sit in the section's meta slot, so the label row
            reads `Write-up … [Write|Preview]` exactly as the design draws it. */}
        <ComposerSection
          label={t("editPraxis.composer.writeUpLabel")}
          htmlFor="composer-body"
          rule={false}
          labelStyle={labelStyle}
          meta={
            <span style={metaRowStyle}>
              <span
                style={composerLabelStyle({
                  fontFamily: CHROME,
                  color: LABEL,
                  letterSpacing: "0.06em",
                })}
              >
                {t("editPraxis.composer.wordCount", { words: state.wordCount })}
              </span>
              <WriteUpTabs
                tab={tab}
                setTab={setTab}
                skin={{
                  containerStyle: { gap: "var(--space-xs)" },
                  buttonStyle: (active) =>
                    composerLabelStyle({
                      fontFamily: CHROME,
                      fontWeight: 700,
                      padding: "var(--space-xs) var(--space-sm)",
                      borderRadius: 999,
                      border: active ? RULE : "1.5px solid transparent",
                      background: active ? FIELD : "transparent",
                      // The active chip is filled with FIELD, i.e. the ward PAGE
                      // ground, so its ink is INK rather than DEEP (#1295).
                      color: active ? INK : LABEL,
                    }),
                }}
              />
            </span>
          }
        >
          {/* Both panels are mounted only one at a time: a hidden textarea would
              still be a tab stop and still be submitted by a form. */}
          {tab === "write" ? (
            <BodyTextarea
              state={state}
              skin={{
                id: "composer-body",
                rows: 8,
                placeholder: t("editPraxis.composer.bodyPlaceholder"),
                textareaStyle: {
                  ...fieldBox,
                  resize: "vertical",
                  minHeight: 180,
                  lineHeight: 1.7,
                  fontFamily: CHROME,
                },
                toolbarButtonStyle: {
                  background: FIELD,
                  // Label-sized text on the ward PAGE ground — INK (#1295).
                  color: INK,
                  border: RULE,
                  borderRadius: 8,
                },
              }}
            />
          ) : (
            <BodyPreview
              state={state}
              skin={{
                wrapperStyle: { ...fieldBox, minHeight: 180 },
                markdownStyle: {
                  fontFamily: CHROME,
                  lineHeight: 1.7,
                  color: INK,
                },
                emptyState: (
                  <p
                    style={{
                      fontFamily: CHROME,
                      fontSize: "var(--text-content)",
                      color: LABEL,
                      margin: 0,
                    }}
                  >
                    {t("editPraxis.composer.bodyPlaceholder")}
                  </p>
                ),
              }}
            />
          )}
        </ComposerSection>

        <ComposerSection
          label={t("editPraxis.composer.proofLabel")}
          rule={false}
          labelStyle={labelStyle}
        >
          <div
            style={{
              display: "flex",
              gap: "var(--space-lg)",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {state.media.map((item) => {
              const filename = item.file_path.split("/").pop() ?? item.file_path;
              const src = mediaUrl(item.file_path);
              return (
                <MediaTile
                  key={item.id}
                  caption={filename}
                  onRemove={() => void state.removeMedia(item)}
                >
                  {item.type === "image" ? (
                    <img
                      src={src}
                      alt=""
                      style={{ width: 120, height: 120, objectFit: "cover" }}
                    />
                  ) : item.type === "video" ? (
                    <video
                      src={src}
                      style={{ width: 120, height: 120, objectFit: "cover" }}
                    />
                  ) : (
                    <MediaArt
                      art={pickArtKey(filename, "audio")}
                      width={120}
                      height={120}
                    />
                  )}
                </MediaTile>
              );
            })}
            {!state.controlsLocked && (
              <FilePicker
                state={state}
                skin={{
                  buttonStyle: composerLabelStyle({
                    fontFamily: CHROME,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: "transparent",
                    border: `1.5px dashed ${BORDER}`,
                    borderRadius: FIELD_RADIUS,
                    padding: "var(--space-2xl) var(--space-lg)",
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    color: DEEP,
                  }),
                  buttonLabel: t("editPraxis.composer.proofButton"),
                  helperText: t("editPraxis.composer.proofHelper"),
                  helperStyle: {
                    fontFamily: CHROME,
                    fontSize: "var(--text-content)",
                    color: LABEL,
                    maxWidth: 260,
                    lineHeight: 1.5,
                    marginTop: "var(--space-sm)",
                  },
                }}
              />
            )}
          </div>
        </ComposerSection>

        <ErrorBanner message={state.error} style={{ color: ALARM }} />

        {/* The composer's ONE braid (#1707) is the one the footer already opens
            with, just below — no second one is added here. The design calls its
            rule exactly once, immediately above the footer; every other region
            is separated by the sheet's own gap. Six braids read as a chain of
            dividers rather than as the mark that closes the page.

            [Cancel] … [Submit] — the global order from #646, stacked here
            because Coven's cast is a full-bleed band rather than an inline
            button: the exits read first, the band closes the sheet. */}
        <ComposerFooter
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "var(--space-lg)",
          }}
          start={
            <>
              <Braid />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-lg)",
                  flexWrap: "wrap",
                }}
              >
                <SaveDraftButton
                  state={state}
                  skin={{ style: { color: LABEL, fontFamily: CHROME } }}
                />
                <DropButton
                  state={state}
                  skin={{
                    style: composerLabelStyle({
                      fontFamily: CHROME,
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      color: LABEL,
                      textDecoration: "underline",
                      cursor: "pointer",
                    }),
                  }}
                />
              </div>
            </>
          }
          end={
            <PublishButton
              state={state}
              skin={{
                idleLabel: t("editPraxis.composer.submit"),
                busyLabel: t("editPraxis.composer.submitBusy"),
                ornament: <Sparkle size={12} />,
                style: composerLabelStyle({
                  // The one place Coven speaks in the LABEL face rather than
                  // the title one. 13px in the design; the label ramp's top
                  // rung is 14, and button chrome is label tier (§4a — a token
                  // names a tier, so the number lands where it lands).
                  fontFamily: CHROME,
                  fontSize: "var(--text-xl)",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "var(--space-sm)",
                  cursor: state.submitting ? "wait" : "pointer",
                  border: "none",
                  borderTop: EDGE,
                  borderRadius: 0,
                  padding: "var(--space-lg) var(--space-xl)",
                  color: hasCast ? CAST_INK : CTA_INK,
                  background: hasCast ? CAST_BAND : CTA_BAND,
                  // Full bleed: back out the sheet's own inset so the band runs
                  // edge to edge and sits flush on the bottom. The sheet's
                  // `overflow: hidden` rounds its corners for us.
                  margin: `0 calc(-1 * ${padX}) calc(-1 * ${padBottom})`,
                }),
              }}
            />
          }
        />
      </ComposerSheet>
    </ComposerPage>
  );
}

/** The band's leading sparkle, in the cast ink it sits on. */
function Sparkle({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <path
        d="M12 1c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
        fill="currentColor"
      />
    </svg>
  );
}

interface MediaTileProps {
  children: React.ReactNode;
  caption: string;
  onRemove: () => void;
}

/** One already-uploaded proof item, on the slip's field ground. */
function MediaTile({ children, caption, onRemove }: MediaTileProps) {
  const { t } = useTranslation("forms");
  return (
    <div
      style={{
        position: "relative",
        background: FIELD,
        border: RULE,
        borderRadius: FIELD_RADIUS,
        overflow: "hidden",
      }}
    >
      <div style={{ width: 120, height: 120, overflow: "hidden" }}>
        {children}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("media.removeAria", { name: caption })}
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: SHEET,
          border: `1.5px solid ${BORDER}`,
          color: DEEP,
          fontSize: "var(--text-md)",
          fontWeight: 700,
          cursor: "pointer",
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
