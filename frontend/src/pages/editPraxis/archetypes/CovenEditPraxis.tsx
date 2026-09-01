/**
 * Cozy Coven — THE CANDLELIT SPELL SLIP, as a composer (edit praxis v2, #1188,
 * epic #1179; design project c491945e, `Coven Edit Praxis.dc.html`,
 * `faction="coven"`).
 *
 * The shared composer layout (`shared.tsx`) wearing Coven's dress: a centred
 * masthead of a turning cat under a twinkle field, a glow-and-lavender ground
 * carrying the coven wheel's cat and a scatter of witch hats, one braid of
 * thread closing the sheet, an 88px haloed ward for the points, a 40px hat for
 * the stage mark, and a full-bleed band for the cast.
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
 * deleted with this issue. `editPraxis.coven.collab` was kept back then — it
 * was `collabCopy`'s override table rather than composer page copy, and it also
 * fed `CollabRoster` on a read page this epic was not touching. #1812 has since
 * deleted it too, on a ruling of its own: collab submission status is a
 * mechanical fact and speaks one vocabulary on every faction. There is no
 * `editPraxis.coven` block at all now.
 *
 * The one word this page draws that is not from the neutral set is the
 * MASTHEAD WORDMARK, and it is not composer copy: it is the faction's NAME.
 * It used to be read from `feed:taskCard.coven.masthead`, the v2 task card's
 * copy of it; #1910 deleted that slot and both surfaces read `factionName()`,
 * the one key a faction name lives under (ADR-0038). The lower case is the
 * lettering, so it is a `textTransform` here rather than a second spelling.
 *
 * ## One responsive component, no mobile twin (ADR-0065 §2)
 *
 * `useComposerSizes()` picks the size set; there is one tree at two widths and
 * no fixed-px grid anywhere below (SPEC-faction-ui-profile §1a).
 *
 * ## Colour and motion
 *
 * All colour via `--faction-coven-slip-*` (shared with the v2 task card and task
 * detail) plus `--faction-coven-ward-*` for the sheet and its fields, and the
 * three `--faction-coven-cast-*` tokens this issue adds for the band's
 * submitted state. Light/dark flips entirely through the `[data-theme="dark"]`
 * cascade — there is no `dark ? a : b` anywhere in this file.
 *
 * Motion is reached by CLASS only: `.ep-twinkle` (the ward's five stars,
 * staggered through `--ep-delay`) and `.cvn-wheel` (Coven's own 120s turn, worn
 * by BOTH cats on this page — the ground's watermark and the masthead's mark).
 * Every keyframe already lives in `index.css` or `motion.ornament.css` behind
 * the shared `prefers-reduced-motion` guard; an inline `animation:` would
 * bypass that guard (#1003).
 *
 * `.ep-spin` and the `--ep-spin-dur: 42s` that re-timed it are GONE from this
 * file (#2746) — they turned the pentagram disc the masthead no longer draws.
 * The hook itself is shared and stays: UA's ensō reads it at 200s and Everymen's
 * cogs re-time their counter-turn through it. The sentence that also stood here
 * claiming `.ep-spin` turned "the ward's spokes at 30s" described an element
 * this file has not drawn for some time; it is not a second deletion.
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
import { CovenCat } from "../../../components/factionMarks/covenSlip";
import { CovenSigil } from "../../../components/sigil/CovenSigil";
import { pickArtKey } from "../blocks/useMediaArt";
import {
  ComposerFooter,
  ComposerGround,
  ComposerMasthead,
  ComposerPage,
  ComposerRule,
  ComposerSection,
  ComposerSheet,
  ComposerStatusRow,
  ErrorBanner,
  TaskSlip,
  composerBandStyle,
  composerDropGround,
  composerLabelStyle,
  composerMetaCluster,
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
import { factionName } from "../../../utils/factions";
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";
import Breadcrumb from "../../../components/nav/Breadcrumb";

interface Props {
  state: EditPraxisState;
}

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

/** The masthead's mark. Ornament geometry (WORLD_ZERO_STYLE §4a), and it is the
 *  30 the disc it replaces was drawn at. */
const MAST_CAT = 30;

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

/* TWO PRIVATE PENTAGRAM DRAWINGS STOOD HERE (#2746), and neither went through
   `covenSlip`'s export, which is why #2726's six-mount retirement never reached
   them:

     `Pentacle`   the bare star, mounted twice — eight times over in the
                  ground's glyph scatter at 9-15px, and once at 40px as the
                  stage mark. Both draw `CovenSigil` now. The reading that this
                  was a `Spark`-class ORNAMENT rather than a badge — a different
                  device with a different job, the split `covenSlip`'s header
                  defends around the sparkle and the cat — was put to the owner
                  and REJECTED. It was the retired badge's own star, at three
                  sizes; a drawing does not become a second device by being
                  small. Do not re-open it.

     `SigilDisc`  the masthead badge: the same star in the same disc under the
                  same dashed ring, turning once every 42 seconds on `.ep-spin`
                  with a private `--ep-spin-dur`. It is `CovenCat` now — see
                  the mount, which is where the tempo argument lives.

   `PINK` and `GOLD` are untouched by this: the ground's glow, the twinkle
   field, the sheet's edge and the cast band's frame all paint with them. */

/**
 * Gold twinkles behind the masthead row, stretched across the band's OUTER
 * thirds — x below 105 or above 375 of the 480-unit viewBox (#1983).
 *
 * The exclusion is the whole design of this field, not a nudge. The svg is
 * `width="100%"` with `preserveAspectRatio="none"`, so a star's x is a fixed
 * FRACTION of the band, while the wordmark above is a centred flex row at a
 * FIXED size. Narrow the viewport and the row grows as a fraction while the star
 * stays put, so a star near the centre drifts further UNDER the lettering rather
 * than clear of it — which is how a twinkle came to sit against the "c" in
 * "cozy" and read as one crossed letter, "tozy". y is no escape: the 72-unit box
 * is stretched over the wordmark row PLUS the `Braid`, so a star's y does not
 * map to "above the text".
 *
 * At the narrowest supported viewport (375px) the centred row measures ~127px in
 * a 319px band — 30%…70%, i.e. 145…335 — so 105/375 clears it either side. If a
 * future wordmark grows, WIDEN the exclusion; never re-enter the centre.
 * `covenTwinkleClearBand.test.tsx` holds this and shows the arithmetic.
 */
function TwinkleField() {
  const stars: [number, number, number][] = [
    [22, 22, 2.4],
    [62, 52, 1.4],
    [96, 18, 1.8],
    [388, 46, 2],
    [424, 24, 1.4],
    [462, 50, 1.7],
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
 *
 * THE MARK IS THE HAT NOW (#2746), eight of it, 9-15px at 0.22. Two things this
 * changes, both deliberate:
 *
 * A TILT IS NOT A TURN. `turn` runs -24° to +22°, and a hat has an up — the
 * exact property that stopped #2726 from letting the create-character masthead
 * rotate its mark. A quarter-turn either way is a hat set at an angle, which is
 * a thing hats do; a full rotation is the one that reads as broken, and nothing
 * here does that. The angles are the design's own and are unchanged.
 *
 * THE FLOOR IS 9px, below the 15 `CovenSigil` is drawn to hold. That is fine
 * BECAUSE this is texture and not a badge: at 0.22 on the wash there is no
 * identification being asked of it, only a shape, and the shape is fill-only —
 * the star that stood here was a 1.1px stroke, which is the thing that actually
 * disappears under downscale.
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
          <CovenSigil size={glyph.size} color={DEEP} />
        </span>
      ))}
    </>
  );
}

export default function CovenEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
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
  /* The stage mark — the hat at the size the star held (#2746). It is ornament
     beside the stage word, not a second identity: this page already badges
     itself with the same mark in the masthead's cat's company, and the ONE
     symbol rule (#2726) is about a faction running two devices, not about a
     surface drawing its one device twice. */
  const statusMark = <CovenSigil size={40} color={DEEP} />;
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
                {/* THE MASTHEAD TURNS A CAT (#2746). What turned here was a
                    pentagram disc at 42 seconds, and both halves of that go:
                    the drawing, because the badge is retired (#2726), and the
                    tempo, because `.cvn-wheel` already has one. The class, the
                    `@keyframes cvn-wheel` and the `prefers-reduced-motion:
                    no-preference` gate around it are `motion.ornament.css`'s
                    and are untouched — this mount adds no keyframe, no class
                    and no duration. A cat turning three times faster than every
                    other cat in the kit would be a second device wearing the
                    same name.

                    `CovenCat` positions itself absolutely, because every other
                    mount it has is a corner watermark — including this page's
                    own, in the ground below. Here it is a flex item beside the
                    wordmark, so the mount hands back `static`. Full strength,
                    not the watermark's 0.09: this one is being read, not washed
                    under copy. Two cats on one surface is one device drawn
                    twice at two jobs, and they turn in step because they share
                    the class rather than each holding a duration. */}
                <CovenCat size={MAST_CAT} style={{ position: "static", flex: "0 0 auto" }} />
                <span
                  style={{
                    fontFamily: DISPLAY,
                    // eslint-disable-next-line local/no-raw-style-values -- ornament: the coven's wordmark, lettered in Grenze Gotisch.
                    fontSize: 22,
                    lineHeight: 1,
                    letterSpacing: "0.02em",
                    color: INK,
                    // The lower case is the lettering, not the word (#1910).
                    textTransform: "lowercase",
                  }}
                >
                  {factionName("coven")}
                </span>
              </div>
              <Braid style={{ marginTop: "var(--space-sm)" }} />
            </div>
          </ComposerMasthead>
  );
  const ground = (
          <>
            {/* The glow and the lavender wash, at the design's two anchors.

                THE STRENGTH IS THE FACTION'S, NOT THIS FILE'S (#2485). It was a
                hard-coded `0.7`, and at that weight every ink on the sheet
                misses: `-slip-label` 2.80 / 1.95 and `-slip-ink` 3.33 / 3.25 on
                the composite. Coven has already MINTED this number —
                `--faction-coven-ward-haze` (0.22 light / 0.28 dark) is the
                strength the ward backdrop washes its four blooms at, and the
                block that declares it carries the measurements that picked it.
                A faction that has minted a wash strength has minted it for every
                surface that wash lands on; an opacity chosen in TSX is a
                `dark ? a : b` in numeric clothing (WORLD_ZERO_STYLE §6). */}
            <ComposerGround
              inset={0}
              opacity="var(--faction-coven-ward-haze)"
              background={`radial-gradient(62% 48% at 12% 0%, ${PINK}, transparent 70%), radial-gradient(58% 46% at 100% 100%, var(--faction-coven-slip-lav), transparent 72%)`}
            />
            {/* The wheel and the glyphs, on their own layer so each keeps its
                own strength instead of inheriting the wash's.

                THE WHEEL TURNS A CAT NOW (#2041) — the drawing is `covenSlip`'s
                because five Coven surfaces share it, and it comes inside: 520px
                hung 150px right and 110px below put a third of the mark off the
                sheet, which is survivable for a star and not for a face. 240 at
                a 16px inset is the size that fits the composer at its narrowest
                (this file has no form-factor branch to size against, so the
                figure is the narrow one and the wide sheet simply carries a
                quieter mark). */}
            <ComposerGround inset={0}>
              <CovenCat size={240} style={{ right: 16, bottom: 16, opacity: 0.1 }} />
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
    sheetStyle,
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
          editing
        />
      }
    >
      <ComposerSheet
        sizes={sizes}
        style={sheetStyle}
        masthead={masthead}
        ground={ground}
      >
        {/* `Draft`, alone (#1828). The pentacle here was a second one under the
            sigil in the masthead directly above; it keeps its place as the
            waiting surface's hero mark. */}
        <ComposerStatusRow
          status={t("editPraxis.composer.statusDraft")}
          statusStyle={dress.statusStyle}
        />

        {/* The task reference slip. Its mark is the shared ScoreStamp (#1828) —
            the coven brings its own through `surfaceMap("scoreStamp")`, so the
            ward is not replaced by a neutral one, it is replaced by the ward the
            page draws AFTER you file. */}
        <TaskSlip praxis={praxis} task={task} {...slip} />

        {/* No visible label since #2179, which reverses #2093's VISIBLE
            half: the placeholder carries the field's name on screen and
            `titleLabel` carries it in the accessible tree. Both live in
            `TitleField`, so there is nothing per-faction here. */}
        <ComposerSection rule={false}>
          <TitleField
            title={state.title}
            setTitle={state.setTitle}
            skin={{
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
              praxis={praxis}
              task={task}
              duelMode={state.duelMode}
              duelChipVisible={state.duelChipVisible}
              modeIsLocked={state.modeIsLocked}
              switchingMode={state.switchingMode}
              changeMode={state.changeMode}
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
              praxis={praxis}
              duel={state.duel}
              duelMode={state.duelMode}
              currentCharacterId={state.currentCharacterId}
              autoSubmitDays={state.autoSubmitDays}
              inviteQuery={state.inviteQuery}
              setInviteQuery={state.setInviteQuery}
              inviteResults={state.inviteResults}
              inviteOpen={state.inviteOpen}
              setInviteOpen={state.setInviteOpen}
              inviting={state.inviting}
              sendInvite={state.sendInvite}
              sendChallenge={state.sendChallenge}
              cancelInvite={state.cancelInvite}
              kickMember={state.kickMember}
              leaveCollab={state.leaveCollab}
              cancelDuel={state.cancelDuel}
              dissolveDuel={state.dissolveDuel}
              skin={{
                fontFamily: CHROME,
                inputBg: FIELD,
                inputColor: INK,
                inputBorder: RULE,
                dropdownBg: SHEET,
                dropdownBorder: RULE,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { color: LABEL },
                /* The ward slip is a rounded language, so the collab chips take
                 * the corner this skin's own fields take. `LABEL` and not the
                 * slip's `SOFT` since #2485: the roster's byline, its unanswered
                 * pills and the dashed `+ invite` chip are all drawn on
                 * TRANSPARENT, so their ground is the bloom-washed sheet rather
                 * than the opaque field `SOFT` was measured on, and on that
                 * composite soft is 4.46:1 in dark against label's 4.63. */
                collab: { radius: FIELD_RADIUS, quiet: LABEL },
              }}
            />
          </ComposerSection>
        )}

        {state.showSealStack && (
          <ComposerSection
            label={t("editPraxis.composer.metatasksLabel")}
            rule={false}
            labelStyle={labelStyle}
          >
            <MetataskSealStack
              appliedMetataskList={state.appliedMetataskList}
              canSealMetatask={state.canSealMetatask}
              requestRemoveMetatask={state.requestRemoveMetatask}
              openMetataskPicker={state.openMetataskPicker}
            />
          </ComposerSection>
        )}

        {/* Write-up — the tabs and the autosave line sit in the section's meta
            slot, and since #2085 that slot is the whole row: the `Write-up`
            heading said nothing the box's own placeholder does not. The editor
            keeps its accessible name from `bodyContentAttributes`. */}
        <ComposerSection
          rule={false}
          labelStyle={labelStyle}
          meta={
            <span style={composerMetaCluster}>
              <span
                style={composerLabelStyle({
                  fontFamily: CHROME,
                  color: LABEL,
                  letterSpacing: "0.06em",
                })}
              >
                {state.autosaveAt
                  ? t("editPraxis.composer.statusSaved", {
                      ago: formatAutosave(state.autosaveAt),
                    })
                  : t("editPraxis.composer.statusUnsaved")}
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
              praxis={praxis}
              controlsLocked={state.controlsLocked}
              setBody={state.setBody}
              proposalConfirmArmed={state.proposalConfirmArmed}
              confirmProposalEdit={state.confirmProposalEdit}
              skin={{
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
              body={state.body}
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
                fileError={state.fileError}
                handleFileChange={state.handleFileChange}
                skin={{
                  buttonStyle: composerLabelStyle({
                    fontFamily: CHROME,
                    fontWeight: 700,
                    cursor: "pointer",
                    /* Translucent, so the wheel and the glyph scatter read
                       through the drop zone (#1828). */
                    background: composerDropGround(FIELD),
                    border: `1.5px dashed ${BORDER}`,
                    borderRadius: FIELD_RADIUS,
                    padding: "var(--space-2xl) var(--space-lg)",
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    color: DEEP,
                  }),
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
        <Braid />
        <ComposerFooter
          band
          start={
            <>
              <SaveDraftButton
                controlsLocked={state.controlsLocked}
                submitting={state.submitting}
                switchingMode={state.switchingMode}
                saveDraft={state.saveDraft}
                skin={{ style: { color: LABEL, fontFamily: CHROME } }}
              />
              <DropButton
                praxis={praxis}
                currentCharacterId={state.currentCharacterId}
                cancel={state.cancel}
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
            </>
          }
          end={
            <PublishButton
              praxis={praxis}
              currentCharacterId={state.currentCharacterId}
              isPublished={state.isPublished}
              duel={state.duel}
              duelMode={state.duelMode}
              title={state.title}
              submitting={state.submitting}
              switchingMode={state.switchingMode}
              publish={state.publish}
              propose={state.propose}
              pullBack={state.pullBack}
              markDone={state.markDone}
              requestDuelSeal={state.requestDuelSeal}
              skin={{
                idleLabel: t("editPraxis.composer.submit"),
                busyLabel: t("editPraxis.composer.submitBusy"),
                ornament: <Sparkle size={12} />,
                style: {
                  ...composerBandStyle(sizes, {
                    // The one place Coven speaks in the LABEL face rather than
                    // the title one. Design band: 14 / 700 / 0.12em — 14 is the
                    // --text-xl rung exactly.
                    fontFamily: CHROME,
                    fontSize: "var(--text-xl)",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    // The SHEET's frame, which for Coven is the gilt edge —
                    // `composerBandStyle` draws its own 1.5px rule, so this is
                    // the colour rather than the `EDGE` shorthand.
                    frame: GOLD,
                    color: hasCast ? CAST_INK : CTA_INK,
                    background: hasCast ? CAST_BAND : CTA_BAND,
                  }),
                  cursor: state.submitting ? "wait" : "pointer",
                },
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
