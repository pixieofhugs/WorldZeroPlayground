/**
 * The Singularity edit praxis — composer v2 (#1186, epic #1179; design project
 * c491945e, `Singularity Edit Praxis.dc.html`, `faction="singularity"`).
 *
 * A terminal session. The composer's shared layout (ADR-0065) worn as window
 * chrome over a phosphor chassis: three lamps and a process name on the bar, a
 * standing raster and a travelling scan band on the ground, dashed hairlines
 * between the regions, and a block cursor blinking after the submit key.
 *
 * ## The layout is not this file's
 *
 * masthead → status row → the task slip → `Title` → `How it was done` → the
 * mode block (roster or duel pair) → `Write-up` (Write / Preview) → `Proof` →
 * footer (`Save draft` … `Submit`), in that order and no other. Every region
 * comes from `shared.tsx`, every control from `controls.tsx`, and the footer
 * keeps the global `[Cancel] … [Submit]` order settled in #646.
 * `DefaultEditPraxis` is the reference implementation; this file is the same
 * page wearing the terminal's dress and differs from it in **no** structural
 * respect. A skin brings frame, type, ornament and motion — nothing else.
 *
 * ## One responsive component, no mobile twin (ADR-0065 §2)
 *
 * `useComposerSizes()` picks the size set and `sizes.isMobile` gates conditional
 * ornament — one tree at two widths. The phone stacks with flow (the task slip
 * turns its column, the mode keys wrap); there is no fixed-px grid anywhere
 * below (SPEC-faction-ui-profile §1a).
 *
 * ## Copy (ADR-0065 §3)
 *
 * The one neutral shared `editPraxis.composer.*` set. `editPraxis.singularity`'s
 * page keys — the whole `terminal.*` command line, the `--solo/--networked/
 * --adversarial` flags, `TRANSMIT SIGNAL`, `[esc] :q`, `rm`, `+ attach` — are
 * deleted with this issue. `editPraxis.singularity.collab` survived it — that
 * was `collabCopy`'s override table rather than page copy — but #1812 then
 * deleted all eight of those: collab submission status speaks one vocabulary on
 * every faction. `collabCopy.test.ts` pins the absence.
 *
 * Two strings here are untranslated and that is deliberate: `praxis.proc` on
 * the window bar and `[ok]` as the status mark are ORNAMENT, in the same class
 * as the three lamps beside them — marks that happen to be made of glyphs
 * (WORLD_ZERO_STYLE §4, "role vocabulary"). They are module constants rather
 * than JSX text so they read as identifiers to `i18next/no-literal-string`,
 * which is the shape `BODY_TOOLBAR_BUTTONS` already uses for its glyphs, and
 * both sit inside `aria-hidden` chrome so neither is announced. The status
 * row's real content — `Draft`, `Saved just now` — is beside the mark, in the
 * shared neutral catalog.
 *
 * ## Colour
 *
 * Every value here is a `--faction-singularity-term-*` token — with one
 * deliberate exception, the three window lamps, which are the kit's
 * `SingularityLamps` and its theme-invariant `--faction-singularity-led-*`
 * trio (#1979). The bar's fourth mark, the process light at its right end, is
 * the kit's `SingularityProcessLight` for the same reason and is `term-*` all
 * the same: it was this file's own dot in the ACCENT (green) while the task card
 * and the task detail drew `term-blue-bright`, and #2092 ruled blue. Its hue,
 * bloom and cadence are the mark's — read that file, not this one.
 *
 * This bar used to map its own `[MUTED, BLUE, ACCENT]` onto
 * three dots, which came out green/blue/green while the faction's five other
 * window bars came out red/amber/green. Nothing in this docblock ever argued
 * for that palette: the blanket "every value is a `term-*` token" rule above
 * is what produced it, and the lamps are the one place it was wrong. The
 * cluster is ORNAMENT (see the copy note) rather than this chassis' ink, so it
 * belongs to the faction's mark kit and not to this skin. Its invariance is
 * safe on this bar specifically because `term-chrome` is near-black in BOTH
 * halves (#0c2016 light / #0a1a10 dark), so a fixed bright dot reads on it
 * either way — the pairing, not the family, is what had to be checked.
 *
 * Everything else is the two-theme contract
 * the v2 task card minted (#1023) and the task/praxis details extended (#1034).
 * WORLD_ZERO_STYLE §6 is explicit that this family is NOT theme-invariant even
 * though both its halves are near-black: the chassis stays black and the
 * cascade flips the PHOSPHOR. So there is no `dark ?` branch in this file and
 * no hex; the two halos and the CTA glow are declared as whole shadow values
 * precisely so a component never writes one.
 *
 * Every pairing this skin introduces was measured on the ground it actually
 * lands on, in both halves (§3, "contrast is a pairing"). The tightest are
 * `dim` on the chrome bar (4.52 light / 5.35 dark), `dim` on the readout well
 * (4.57 / 5.10) and `blue-bright` on that same well (4.68 / 9.50).
 *
 * THOSE ARE FLAT READINGS AND THEY ARE NOT THE WHOLE STORY (#2485). This
 * paragraph used to end "everything clears 4.5:1; nothing needed walking", which
 * was true of the TOKENS and not of the GROUND: the sheet mounts a standing
 * raster and a travelling scan band under the whole content column, and on that
 * composite `dim` reads 4.12 / 4.20. The three numbers above still stand — the
 * chrome bar and the readout well are opaque paint the ground never reaches —
 * but a pairing on the CHASSIS has two more layers under it, and the tier note
 * on {@link MUTED} is where that split is written down.
 *
 * ## Motion — three classes, no inline `animation:`
 *
 * `.sg-pulse` on the session lamp, `.ep-blink` on the submit cursor, and
 * `.sg-scan` on the travelling band. The lamp ran `.ep-pulse` re-timed to the
 * design's 1.6s through `--ep-pulse-dur` until #2092 made the light one kit
 * drawing: the mark hangs on a task card too, so it breathes on the faction's
 * own `.sg-pulse` (2.6s) rather than on the composer kit's pulse, and the 1.6s
 * re-time is the cost of that. Named at the mark, where it can be reversed for
 * all three surfaces at once. All three are class-gated behind the
 * shared `prefers-reduced-motion` guard in `index.css`; an inline `animation:`
 * would bypass it, which is what #1003 retired. This file touches `index.css`
 * for nothing.
 *
 * ## Not built as drawn — and why, at the site
 *
 * - **The sweep runs `.sg-scan`, not `.ep-sweep`.** The issue names
 *   `epSweep 6.5s`, but the repo's `epSweep` is `translateY(-120% → 220%)` and
 *   a percentage translate resolves against the ELEMENT — on a 38px band that
 *   is 130px of travel, not a pass down the sheet. `.sg-scan` animates
 *   `top: -24% → 120%` of its parent, which is the motion drawn, and it is
 *   already Singularity's sweep on its task card, task detail and praxis detail
 *   (WORLD_ZERO_STYLE §6: a faction's ornament is one primitive, not one per
 *   surface). Deviation: 5s rather than 6.5s, the sibling surfaces' timing.
 * - **Neither mark is a `RingMark`.** The shared ring is the geometry the other
 *   skins' two marks share; this design draws the points as a bordered readout
 *   box and the status as the bare string `[ok]`, so the ring would be a shape
 *   the terminal does not have.
 * - **`[ok]` is 18px, not the design's 19.** `--text-content` is the rung; a
 *   `--text-*` token names a tier (§4a) and this mark is read, not scanned.
 * - **The points numeral's bloom is `--…-term-halo-blue` (14px), not the
 *   design's 12px.** That token exists for exactly this numeral and is already
 *   `none` in light / lit in dark, which is the "glow in dark only" the design
 *   asks for; minting a second one for 2px is a token nobody can find.
 * - **The submit cursor blinks at 1s, not 1.05s.** `.ep-blink` is
 *   `epBlink 1s step-end`, and `step-end` IS `steps(1)`.
 * - **The breadcrumb keeps the app's neutral ink.** It sits above the sheet on
 *   the page's own watercolour ground, and a phosphor measured on a black
 *   chassis is the #1118 trap — a block whose ground is not yours keeps the ink
 *   it was measured with.
 * - **No forfeit, no duel clock.** #1071 decisions 3 and 4: at `active` an
 *   unsubmit is a free neutral reopen (ADR-0011 §Forfeit, and #718 rejected the
 *   forfeit framing once already), and no expiry field exists to draw a clock
 *   from. The awaiting stage belongs to `PraxisWaitingSurface` and to #1189.
 */
import { useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import MediaArt from "../blocks/MediaArt";
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
import SingularityLamps from "../../../components/factionMarks/SingularityLamps";
import SingularityProcessLight from "../../../components/factionMarks/SingularityProcessLight";
import { MetataskSealStack } from "../../../components/metataskSeal/MetataskSealStack";
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";
import Breadcrumb from "../../../components/nav/Breadcrumb";
import { factionRoleVars } from "../../../utils/factionRoles";

interface Props {
  state: EditPraxisState;
}

/* The terminal's two-theme contract (#1023/#1034), named for the ROLE each
 * plays in this design's skin row rather than for its colour. Both halves are
 * near-black and the cascade flips the phosphor — see the header. */
const CHASSIS = "var(--faction-singularity-term-bg)";
/* The error banner's ink (#1231). The banner sits straight on the sheet, and
 * the neutral `--color-danger` under its own veil misses AA there in light
 * (3.85:1 on this ground); this is #1449's alarm rung, already measured
 * on paper. The veil and the edge stay neutral — ADR-0061. */
const ALARM = "var(--faction-singularity-card-alarm)";
const CHROME = "var(--faction-singularity-term-chrome)";
/** The raised box: fields, the task slip, proof tiles. */
const PANEL = "var(--faction-singularity-term-panel)";
const INK = "var(--faction-singularity-term-ink)";
/** The design's `accent`: titles, the status mark, the lit lamp. */
const ACCENT = "var(--faction-singularity-term-bright)";
/**
 * The design's `muted` — AND A PANEL INK ONLY (#2485, #2353).
 *
 * `-term-dim` clears AA on the flat chassis (5.03 / 5.80, which is what
 * `factionContrast.test.ts` measures) and MISSES it on the chassis this sheet
 * actually draws: `ComposerGround` lays the standing raster over it and the
 * travelling `.sg-scan` band under every region in turn, and on that stack the
 * caption tier reads 4.12 / 4.20. This file's own docblock used to claim
 * "everything clears 4.5:1" on the strength of the flat reading.
 *
 * So the tier is split by GROUND, not by loudness: anything drawn straight on
 * the chassis takes {@link INK}, which clears the band with room, and `MUTED`
 * stays for the surfaces the ground cannot reach — the raised `-term-panel`
 * (slip, fields, the toolbar, an unpicked mode) and the opaque window bar.
 * `SingularityCreateCharacter` made exactly this split on the same two layers
 * (#2353) and `singularityCreateCharacterGround.test.ts` records the refusal.
 */
const MUTED = "var(--faction-singularity-term-dim)";
const BLUE = "var(--faction-singularity-term-blue)";
const BORDER = "var(--faction-singularity-term-border)";
const HAIR = "var(--faction-singularity-term-hair)";
const SCAN = "var(--faction-singularity-term-scan)";
const SWEEP = "var(--faction-singularity-term-sweep)";
const CTA_BG = "var(--faction-singularity-term-cta-bg)";
const CTA_INK = "var(--faction-singularity-term-cta-ink)";
const CTA_GLOW = "var(--faction-singularity-term-cta-glow)";
const HALO_GREEN = "var(--faction-singularity-term-halo-green)";
const SHADOW = "var(--faction-singularity-term-shadow)";

/* Share Tech Mono, for the title, the body AND the label — the whole surface is
 * one face. Reached through the faction's own accessor rather than through
 * --font-faction-terminal directly, which is what §4 asks for when the face IS
 * the faction's (as against a face a single surface borrows). */
const FACE = "var(--sg-compose-face)";

/** The design's geometry: radius 2, borderW 1. A terminal has square corners. */
const RADIUS = 2;

/* Ornament, not copy — see the header. Module constants so they reach JSX as
 * identifier expressions rather than as literal text. */
const PROC_NAME = "praxis.proc";
const STATUS_MARK = "[ok]";

/** The composer's label tier in the terminal's face. */
function termLabel(overrides: CSSProperties = {}): CSSProperties {
  return composerLabelStyle({ fontFamily: FACE, ...overrides });
}

export default function SingularityEditPraxis({ state }: Props) {
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

  /** Every field is the same lit panel inside a hard 1px frame. */
  const fieldBox = {
    width: "100%",
    background: PANEL,
    color: INK,
    border: `1px solid ${BORDER}`,
    borderRadius: RADIUS,
    padding: "var(--space-md)",
    fontFamily: FACE,
    boxSizing: "border-box",
  } as const;

  /* The rule: a dashed hair, not a solid line. One node, drawn ONCE above the
     footer (#1707) — the design calls its rule there and nowhere else, and the
     regions above it separate by the sheet's own gap. */
  const hairRule = (
    <ComposerRule
      style={{
        height: 0,
        background: "none",
        borderTop: `1px dashed ${HAIR}`,
      }}
    />
  );

  /* The chrome, named once and mounted twice: the composer below, and the
     waiting surface once your part is in (#1189). The same ELEMENTS both
     times, so the window bar, its breathing lamp and the travelling scanline
     cannot drift between the two stages. */
  const sheetStyle = {
    background: CHASSIS,
    border: `1px solid ${BORDER}`,
    borderRadius: RADIUS,
    boxShadow: SHADOW,
  };
  const statusMark = (
    <span
      aria-hidden
      style={{
        fontFamily: FACE,
        // 19 in the design → the 18px content rung (§4a).
        fontSize: "var(--text-content)",
        // The design's own 0.04em. A monospace readout is set loose, and this
        // is the one slot on the page that had been left at the face's natural
        // fit (#1830).
        letterSpacing: "0.04em",
        lineHeight: 1,
        color: ACCENT,
      }}
    >
      {STATUS_MARK}
    </span>
  );
  const slip = {
    style: {
      background: PANEL,
      border: `1px solid ${BORDER}`,
      /* The design left-rules the slip in the accent (#1706). It sits AFTER the
         border shorthand on purpose: a shorthand spread last would erase it. */
      borderLeft: `2px solid ${ACCENT}`,
      borderRadius: RADIUS,
      padding: "var(--space-lg)",
      flexDirection: sizes.isMobile ? ("column" as const) : ("row" as const),
    },
    labelStyle: { fontFamily: FACE, color: MUTED },
    titleStyle: {
      fontFamily: FACE,
      color: ACCENT,
      textShadow: HALO_GREEN,
    },
    descriptionStyle: { fontFamily: FACE, color: INK },
    pillStyle: { fontFamily: FACE, color: BLUE, borderRadius: RADIUS },
  };
  const primaryStyle = termLabel({
    display: "inline-flex",
    alignItems: "center",
    border: `1px solid ${CTA_BG}`,
    borderRadius: RADIUS,
    padding: "var(--space-md) var(--space-xl)",
    color: CTA_INK,
    background: CTA_BG,
    boxShadow: CTA_GLOW,
    letterSpacing: "0.1em",
  });
  const masthead = (
          /* The window bar. `ComposerMasthead` is a 3px band by default; the
             skin gives it its own height and padding through `style`, which is
             spread last. Its whole content is aria-hidden chrome. */
          <ComposerMasthead
            background={CHROME}
            style={{
              height: "auto",
              padding: "var(--space-sm) var(--space-lg)",
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            <div
              aria-hidden
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
              }}
            >
              <SingularityLamps />
              <span
                style={termLabel({
                  color: MUTED,
                  letterSpacing: "0.1em",
                  textTransform: "none",
                  marginLeft: "var(--space-sm)",
                  /* What pushes the process light to the far end of the bar. The
                     margin belongs to the bar's layout, so it rides on the name
                     rather than on the mark — the mark takes no props (#2092). */
                  marginRight: "auto",
                })}
              >
                {PROC_NAME}
              </span>
              {/* The session lamp — the kit's process light since #2092, drawn
                  once for this bar, the task card and the task detail. It was
                  this file's own span in the chassis' GREEN accent while the
                  other two surfaces drew blue; the owner ruled blue. The hue,
                  the bloom and the breathing all live in the mark now. */}
              <SingularityProcessLight />
            </div>
          </ComposerMasthead>
  );
  const ground = (
          /* The standing raster, at inset 0 — a fixed scrim, so unlike the
             spectrum's aurora it neither drifts nor overhangs. The travelling
             band rides inside it and overhangs horizontally instead, so its
             soft ends never show against the sheet's edges. */
          <ComposerGround
            inset={0}
            background={`repeating-linear-gradient(0deg, ${SCAN} 0 1px, transparent 1px 3px)`}
          >
            <div
              aria-hidden
              className="sg-scan"
              style={{
                position: "absolute",
                left: "-30%",
                right: "-30%",
                height: 38,
                background: SWEEP,
              }}
            />
          </ComposerGround>
  );

  const dress: ComposerDress = {
    accent: ACCENT,
    alarm: ALARM,
    // `pageStyle` IS THE ROOT OF BOTH STAGES -- the composer page here and the
    // shared waiting surface this same dress is handed to -- so it is the one
    // slot that reaches everything this archetype draws (#2675). The same call
    // `EverymenEditPraxis` made in lane 06, for the same reason.
    //
    // IT SPANS THE BREADCRUMB, WHICH IS DELIBERATE AND COSTS NOTHING. That
    // block is neutral shared site chrome standing on the page's own ground
    // (#2102) -- the docblock above says so in writing -- and it reads
    // `--color-*`, never `--sg-*`, so a custom property declared over it paints
    // not one pixel of it. Declaring on the sheet instead would leave every
    // read on the waiting stage resolving through its fallback, and reaching
    // that stage any other way means a new prop, which is tree work rather than
    // a paint lane's.
    //
    // AND THE LABEL SEAM IS ONE OF THEM NOW (#2831). `.label-caption` /
    // `.label-heading` paint `--label-ink`, and so does CodeMirror's
    // `.cm-placeholder` -- `bodyEditorTheme.ts` reads the seam rather than
    // `color`, which is #1819. Unset, all of them fell through to the global
    // tertiary: an ink calibrated against ordinary page stock, on a terminal
    // that is near-black in BOTH cascades. Measured on the real composited
    // grounds in light, that is 1.81:1 on the washed chassis -- the waiting
    // notices, the live-proposal line, the publish-needs-title line -- and
    // 2.07:1 on the panel, where the write-up box's placeholder sits. Dark was
    // never the miss (6.79 / 8.99). `EphemeristsEditPraxis` makes the identical
    // repoint on the identical slot for the identical reason (#1800); this is
    // the other near-black composer, and it was the one that never got it.
    //
    // INK AND NOT `MUTED`, which is the ground split {@link MUTED} spells out.
    // Everything this seam reaches on the sheet stands on the washed chassis,
    // where the quiet rung reads 4.12 / 4.20 -- the refusal
    // `composerGround.test.ts` already asserts. INK clears it at 6.82 / 8.11.
    // The one reader on the raised panel is the placeholder, and `index.css`
    // steps it back down to `MUTED` there rather than let it borrow this
    // field's own typed ink.
    //
    // The breadcrumb is untouched by this too, and for a second reason beyond
    // the one above: it paints `--color-text-tertiary` directly and carries no
    // label class, so the seam never reaches it (#2102).
    pageStyle: {
      ...factionRoleVars("singularity", "sg-compose"),
      fontFamily: FACE,
      color: INK,
      ["--label-ink" as string]: INK,
    } as CSSProperties,
    sheetStyle,
    masthead,
    ground,
    rule: () => hairRule,
    mark: statusMark,
    statusStyle: { fontFamily: FACE, color: ACCENT },
    metaStyle: { fontFamily: FACE, color: INK },
    labelStyle: { fontFamily: FACE, color: INK },
    slip,
    panelStyle: {
      background: PANEL,
      border: `1px solid ${BORDER}`,
      borderRadius: RADIUS,
    },
    headingStyle: { fontFamily: FACE, color: ACCENT, textShadow: HALO_GREEN },
    bodyStyle: { fontFamily: FACE, color: INK },
    quietStyle: { fontFamily: FACE, color: INK },
    primaryStyle,
    quietButtonStyle: { fontFamily: FACE, color: INK },
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
        {/* `Draft`, alone (#1828). The autosave line moved to the write-up
            header; `[ok]` is the waiting surface's beat. */}
        <ComposerStatusRow
          status={t("editPraxis.composer.statusDraft")}
          statusStyle={dress.statusStyle}
        />

        {/* The task reference slip, on a raised panel. Its mark is the shared
            ScoreStamp (#1828) — the terminal's own readout by dispatch, which is
            what this page swapped to the moment you filed. It turns its column
            on a phone so the mark never squeezes the borrowed title. */}
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
              inputStyle: { ...fieldBox, color: ACCENT },
            }}
          />
        </ComposerSection>

        {/* How it was done — hidden once the mode can no longer change, per the
            house rule that an unusable control is not drawn disabled. */}
        {!state.controlsLocked && (
          <ComposerSection
            label={t("editPraxis.composer.modeLabel")}
            rule={false}
            labelStyle={{ fontFamily: FACE, color: INK }}
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
                    style={termLabel({
                      cursor: disabled ? "not-allowed" : "pointer",
                      padding: "var(--space-sm) var(--space-lg)",
                      borderRadius: RADIUS,
                      background: active ? CTA_BG : PANEL,
                      color: active ? CTA_INK : MUTED,
                      border: `1px solid ${active ? CTA_BG : BORDER}`,
                      boxShadow: active ? CTA_GLOW : undefined,
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
            labelStyle={{ fontFamily: FACE, color: INK }}
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
                fontFamily: FACE,
                inputBg: PANEL,
                inputColor: INK,
                inputBorder: `1px solid ${BORDER}`,
                dropdownBg: CHASSIS,
                dropdownBorder: `1px solid ${BORDER}`,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { fontFamily: FACE, color: INK },
                /* The terminal's own 2px corner, the one `fieldBox` takes.
                 * `INK` and not `MUTED`: the roster's leave link and the dashed
                 * `+ invite` chip are both drawn on TRANSPARENT, i.e. straight on
                 * the chassis under the raster and the band, which is the one
                 * ground `-term-dim` misses (#2485). Not `-card-muted` either —
                 * that is the blue brand chrome, measured against the card. */
                collab: { radius: RADIUS, quiet: INK },
              }}
            />
          </ComposerSection>
        )}

        {state.showSealStack && (
          <ComposerSection
            label={t("editPraxis.composer.metatasksLabel")}
            rule={false}
            labelStyle={{ fontFamily: FACE, color: INK }}
          >
            <MetataskSealStack state={state} />
          </ComposerSection>
        )}

        {/* Write-up — the tabs and the autosave line sit in the section's meta
            slot, and since #2085 that slot is the whole row: the `Write-up`
            heading said nothing the box's own placeholder does not. The editor
            keeps its accessible name from `bodyContentAttributes`. */}
        <ComposerSection
          rule={false}
          labelStyle={{ fontFamily: FACE, color: INK }}
          meta={
            <span style={composerMetaCluster}>
              <span
                style={termLabel({
                  color: INK,
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
                    termLabel({
                      padding: "var(--space-xs) var(--space-sm)",
                      borderRadius: RADIUS,
                      border: `1px solid ${active ? BORDER : "transparent"}`,
                      background: active ? PANEL : "transparent",
                      color: active ? ACCENT : INK,
                    }),
                }}
              />
            </span>
          }
        >
          {/* Both panels are mounted only one at a time: a hidden textarea would
              still be a tab stop and still be submitted by a form, and drawing
              both would put the body in the DOM twice. */}
          {tab === "write" ? (
            <BodyTextarea
              praxis={praxis}
              controlsLocked={state.controlsLocked}
              setBody={state.setBody}
              proposalConfirmArmed={state.proposalConfirmArmed}
              confirmProposalEdit={state.confirmProposalEdit}
              skin={{
                /* The second surface that re-points the house disabled pair
                   (#2574), and for the same reason the publish band does: the
                   terminal is theme-invariant, so the neutral `--control-off-*`
                   would lay a pale slab on a black chassis — here a full-width
                   one, at ΔE 80.6 from this field in light. NOT `sg-control-off`:
                   that class answers the band's ground, whose panel is a raised
                   box on the chassis, and this box already IS the panel. The
                   values live in `index.css` beside the rule that reads them;
                   this only says which ground. Inert until `aria-disabled`. */
                className: "sg-composer-off",
                placeholder: t("editPraxis.composer.bodyPlaceholder"),
                textareaStyle: {
                  ...fieldBox,
                  resize: "vertical",
                  minHeight: 200,
                  lineHeight: 1.7,
                },
                toolbarButtonStyle: {
                  background: PANEL,
                  color: MUTED,
                  border: `1px solid ${BORDER}`,
                  borderRadius: RADIUS,
                  fontFamily: FACE,
                },
              }}
            />
          ) : (
            <BodyPreview
              body={state.body}
              skin={{
                wrapperStyle: { ...fieldBox, minHeight: 200 },
                markdownStyle: {
                  fontFamily: FACE,
                  lineHeight: 1.7,
                  color: INK,
                },
                emptyState: (
                  <p
                    style={{
                      fontFamily: FACE,
                      fontSize: "var(--text-content)",
                      color: MUTED,
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
          labelStyle={{ fontFamily: FACE, color: INK }}
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
                  buttonStyle: termLabel({
                    cursor: "pointer",
                    /* Translucent, so the scanline and the sweep read through
                       the drop zone (#1828). */
                    background: composerDropGround(PANEL),
                    border: `1px dashed ${BORDER}`,
                    borderRadius: RADIUS,
                    padding: "var(--space-2xl) var(--space-lg)",
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    color: ACCENT,
                  }),
                  helperText: t("editPraxis.composer.proofHelper"),
                  helperStyle: {
                    fontFamily: FACE,
                    fontSize: "var(--text-content)",
                    color: INK,
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

        <ComposerRule
          style={{
            height: 0,
            background: "none",
            borderTop: `1px dashed ${HAIR}`,
          }}
        />

        {/* [Cancel] … [Submit] — the global order from #646, with the cast as a
            full-bleed band flush to the chassis's bottom edge (#1828). */}
        <ComposerFooter
          band
          start={
            <>
              <SaveDraftButton
                controlsLocked={state.controlsLocked}
                submitting={state.submitting}
                switchingMode={state.switchingMode}
                saveDraft={state.saveDraft}
                skin={{ style: termLabel({ color: INK }) }}
              />
              <DropButton
                praxis={praxis}
                currentCharacterId={state.currentCharacterId}
                cancel={state.cancel}
                skin={{
                  style: termLabel({
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    color: INK,
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
                /* The one surface that re-points the house disabled pair
                   (#2573). `controls.tsx` adds `.control-off` itself when the
                   title gate holds the band (#2484); the house neutral is a
                   warm off-white, which on this theme-invariant black chassis
                   would make the dead control the loudest thing on the page. So
                   this hands it the terminal's own panel and dim ink instead —
                   a token override, not a second rule about what disabled looks
                   like. Inert while the band is live: it declares two custom
                   properties and nothing reads them until `:disabled`. */
                className: "sg-control-off",
                idleLabel: t("editPraxis.composer.submit"),
                busyLabel: t("editPraxis.composer.submitBusy"),
                // The prompt's block cursor, trailing the word. `.ep-blink` is
                // `epBlink 1s step-end` in index.css, behind the reduced-motion
                // guard — an inline `animation:` here would bypass it (#1003).
                trailingOrnament: (
                  <span
                    aria-hidden
                    className="ep-blink"
                    style={{
                      display: "inline-block",
                      width: "0.55em",
                      height: "1em",
                      marginLeft: "var(--space-sm)",
                      verticalAlign: "-0.12em",
                      background: "currentColor",
                    }}
                  />
                ),
                style: {
                  ...composerBandStyle(sizes, {
                    /* Design band: 13 / 400 / 0.1em. 13 sits between the label
                       rung (12) and --text-xl (14); the band takes the rung
                       above the label it has to outrank (§4a). */
                    fontFamily: FACE,
                    fontSize: "var(--text-xl)",
                    letterSpacing: "0.1em",
                    frame: BORDER,
                    color: CTA_INK,
                    background: CTA_BG,
                    /* The terminal's own CTA halo — `none` in light, real in
                       dark, straight off the token. */
                    boxShadow: CTA_GLOW,
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

interface MediaTileProps {
  children: React.ReactNode;
  caption: string;
  onRemove: () => void;
}

/** One already-uploaded proof item, framed on the terminal's raised panel. */
function MediaTile({ children, caption, onRemove }: MediaTileProps) {
  const { t } = useTranslation("forms");
  return (
    <div
      style={{
        position: "relative",
        background: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: RADIUS,
        overflow: "hidden",
      }}
    >
      <div style={{ width: 120, height: 120, overflow: "hidden" }}>{children}</div>
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
          borderRadius: RADIUS,
          background: CHASSIS,
          border: `1px solid ${BORDER}`,
          color: ACCENT,
          fontFamily: FACE,
          fontSize: "var(--text-md)",
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
