/**
 * The Ephemerists edit praxis — THE VALLEY PLATE, ruled for filing (#1185, epic
 * #1179; design project c491945e, `Ephemerists Edit Praxis.dc.html`, the
 * `ephemerists` row of `SKINS`).
 *
 * Dress over the shared layout, not a layout of its own. `DefaultEditPraxis` is
 * the reference implementation and the contract (ADR-0065 §1); read it there
 * rather than re-deriving it here. What this file adds is the Deco × Egypt plate
 * at composer size: a night-sky masthead under a cavetto cornice, a ground bowed
 * toward a gravity well off the sheet's right edge with an ochre margin rule
 * struck down its gutter, a brass octagon for the points, an ankh in an octagon
 * for the stage, and an open eye following the cast.
 *
 * ## The layout, in order — unchanged from Default
 *
 * masthead → status row → the task slip → title → how it was done → the mode
 * block (roster or duel pair) → seals → write-up → proof → footer. A skin varies
 * neither the order nor the presence of a region, and the footer keeps the
 * global `[Cancel] … [Submit]` order from #646.
 *
 * ## One responsive component, no mobile twin (ADR-0065 §2)
 *
 * `useComposerSizes()` picks the size set and `sizes.isMobile` picks the
 * conditional ornament; there is one tree at two widths. Nothing below is a
 * fixed-px layout grid (SPEC-faction-ui-profile §1a) — every fixed number here
 * is ornament geometry.
 *
 * ## Copy — none of its own (ADR-0065 §3)
 *
 * Every string comes from the shared neutral `editPraxis.composer.*` block. The
 * faction's whole composer vocabulary — `AN ENTRY IN THE EPHEMERIS`, `THE
 * FINDING`, `THE ACCOUNT`, `THE EVIDENCE`, `alone / in concord / in dispute` —
 * was **deleted** with this issue. `editPraxis.ephemerists.collab` outlived it
 * for a while — it was `collabCopy`'s override table rather than composer page
 * copy, read by `CollabRoster` on `/praxis/:id` too — and #1812 has now deleted
 * that as well: collab submission status is a mechanical fact a player acts on,
 * so it speaks one vocabulary on every faction. This file has NO faction copy of
 * any kind left. The masthead's one word is the
 * faction's NAME out of `factions.json` (`factionName`), the same string the
 * praxis-detail masthead sets — a name, not a voice. Since #1634 that name is
 * set by `EphemeristsMasthead` rather than here, which is the same string
 * through the same lookup on one more surface.
 *
 * ## Marks: reused, not redrawn (WORLD_ZERO_STYLE §6, "one primitive")
 *
 * The engraved masthead, the cornice, the rune band, the incised signs, the
 * stepped octagon and the gravity field are all `components/factionMarks` — the
 * module #1120 extracted so the plate's ornament is shared rather than copied.
 * This file draws no new SVG apart from the two marks' arrangement; the field
 * went into the module for the same reason (#1830), and the waiting surface
 * mounts it through this file's `dress.ground`. The winged sun disc that headed the
 * sky band was retired kit-wide by #1634: the sigil is the only mark, and it
 * arrives inside the masthead.
 *
 * `RingMark` is deliberately NOT used for either mark. It is a ring with a
 * circular punch, and both of this design's marks are octagons — a stepped
 * cartouche is the faction's signature shape, and forcing it through the shared
 * circle would be the one place the dress had to give way. The shared geometry
 * it stands in for is `Octagon`, which the praxis-detail skin already reads.
 *
 * ## Motion
 *
 * One piece, and it is already in `index.css`: the slow gold bloom drifting
 * along the cornice (`.eph-cornice-glow`, reserved by `<Cornice glow />`), whose
 * pigment, cycle and `prefers-reduced-motion` gate all live in the stylesheet.
 * None of the seven `ep*` keyframes is read here and `index.css` is untouched.
 *
 * ## Colour
 *
 * Every value is a `--faction-ephemerists-plate-*` token, and this register is
 * THEME-INVARIANT BY DESIGN (#1627 + #1636) — do not read the cascade for it.
 * Every plate var is declared once at `:root`; `[data-theme="dark"]` declares no
 * plate token at all, and the dark block in `index.css` records that on purpose,
 * saying the night half was removed because "the register is theme-invariant and
 * lives entirely in `:root`". The register took the design's NIGHT half in both
 * cascades, so nothing on this page moves when the theme flips — and there is no
 * `dark ?` branch either. The one non-plate colour the file names,
 * `--faction-ephemerists-card-alarm`, does have a dark half, but both halves
 * carry the same value, so it does not move either.
 *
 * `-brass` is a rule colour and never an ink; quiet type takes `-quiet`, which
 * clears AA on the page, the plate AND the inner cells (#1028). This is the
 * plate (`--faction-ephemerists-plate-*`), never the illuminated codex
 * (`--eph-*`); the two grounds must not be mixed on one surface (ADR-0055).
 *
 * ONE DEVIATION IS KEPT AND IS NOT A DRIFT (re-affirmed by #1830). The design's
 * `danger` is the plate ochre `#D9744C`; this file ships
 * `--faction-ephemerists-card-alarm`, which is #1449's alarm rung, because the
 * ochre misses AA for the error banner's ink on this ground. See {@link ALARM}.
 *
 * ## Not drawn as designed
 *
 * The awaiting stage belongs to `PraxisWaitingSurface` and to #1189. Forfeit at
 * that stage is not drawn here or anywhere — #1071 decision 3 rejected the
 * framing against ADR-0011 §Forfeit, and #718 had rejected it once before. The
 * duel clock is cut for the same reason: no expiry field exists to read.
 */
import { useState, type CSSProperties } from "react";
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
import { MetataskSealStack } from "../../../components/metataskSeal/MetataskSealStack";
import {
  BAND_INK,
  BRASS,
  BRASS_LIGHT,
  CAPS,
  CAPTION,
  Cornice,
  DECO,
  DISC,
  GravityField,
  INK,
  INNER,
  LINE,
  OCHRE,
  Octagon,
  PLATE,
  QUIET,
  READING,
  SHADOW,
  Sign,
} from "../../../components/factionMarks/ephemeristsPlate";
import { EphemeristsMasthead } from "../../../components/factionMarks/EphemeristsMasthead";
import EphemeristsNotationBand from "../../../components/factionMarks/EphemeristsNotationBand";
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";
import Breadcrumb from "../../../components/nav/Breadcrumb";

interface Props {
  state: EditPraxisState;
}

/* The cast's own pair. Not exported by the plate module because no other
 * surface has a primary button; declared in `index.css` in both themes. */
const CTA = "var(--faction-ephemerists-plate-cta-bg)";
/* The error banner's ink (#1231). The banner sits straight on the sheet, and
 * the neutral `--color-danger` under its own veil misses AA there in light
 * (3.31:1 on this ground); this is #1449's alarm rung, already measured
 * on paper. The veil and the edge stay neutral — ADR-0061. */
const ALARM = "var(--faction-ephemerists-card-alarm)";
const CTA_INK = "var(--faction-ephemerists-plate-cta-ink)";

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) ──
 *
 * `EPH_BAND` is the design's own name for the sky band's height, and since #1634
 * it is a FLOOR rather than a height — the engraved masthead sizes the band from
 * its own padding. The pair is its desktop / mobile values, and the
 * praxis-detail masthead's: one plate, one masthead, at the same two sizes on
 * both surfaces. `WORDMARK_DISC` went with the winged disc it measured. */
const EPH_BAND = { desktop: 84, mobile: 68 };
/**
 * The gravity field's nominal sheet width — the design's own `s.w`, and the
 * same pair `useComposerSizes` sets the column to. The well is measured from
 * the sheet's RIGHT edge, so this is what the field's canvas is drawn against;
 * a viewport wider than the nominal scales the rows rather than moving the well
 * (see `GravityField`).
 */
const GRAVITY_WIDTH = { desktop: 720, mobile: 360 };
/**
 * How far down the field is drawn. The design's canvas is 1500; a composer's
 * sheet is taller than that as soon as you write anything, and the ground is
 * clipped to the sheet, so the canvas overruns and the clip decides.
 */
const GRAVITY_HEIGHT = 2400;
/** Where the ochre margin rule is struck. */
const MARGIN_RULE = { desktop: 22, mobile: 13 };
/** The stage mark: a stepped octagon, drawn on a 100-unit viewBox. */
const STATUS_MARK = 44;
/** The sign following the cast. */
const SUBMIT_SIGN = 17;
/** The ankh inside the status octagon. */
const STATUS_SIGN = 24;

/**
 * The stage mark: the ankh, cut into a stepped octagon with a brass border.
 *
 * The design writes the octagon as a `clipPath`, which is right for the field
 * and cannot carry the border — a clip has no stroke, and an inset box-shadow
 * follows the element's RECTANGLE, so the four diagonals would come out
 * unbordered. The shared `Octagon` path draws both at once, which is what the
 * praxis-detail byline cartouche already does.
 */
function StatusMark() {
  return (
    <span
      style={{
        position: "relative",
        display: "block",
        width: STATUS_MARK,
        height: STATUS_MARK,
        flexShrink: 0,
      }}
    >
      <svg
        width={STATUS_MARK}
        height={STATUS_MARK}
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0 }}
      >
        <Octagon inset={0} stroke={BRASS} width={3.4} fill={DISC} />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Sign name="ankh" size={STATUS_SIGN} color={BRASS} weight={1.6} />
      </span>
    </span>
  );
}

export default function EphemeristsEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
  const sizes = useComposerSizes();
  const [tab, setTab] = useState<ComposerTab>("write");
  const praxis = state.praxis!;
  const task = state.task;
  const factor = sizes.isMobile ? "mobile" : "desktop";

  const modeOptions: Array<{ key: PraxisType; label: string }> = [
    { key: "solo", label: t("editPraxis.composer.modeSolo") },
    { key: "collab", label: t("editPraxis.composer.modeCollab") },
    { key: "duel", label: t("editPraxis.composer.modeDuel") },
  ];

  /** Cinzel small caps, the plate's label voice, over the layout's tracking. */
  const label = { fontFamily: CAPS, fontWeight: 500, letterSpacing: "0.24em" };
  /** Section heads sit on the plate, where the caption gold is measured. */
  const sectionLabel = { ...label, color: CAPTION };
  /**
   * The skin's rule, drawn ONCE above the footer (#1707) rather than at the head
   * of every section — the design calls its rule once and parts the regions with
   * the sheet's own gap.
   *
   * IT IS THE BRASS HAIRLINE ALONE SINCE #2210. The rule used to be that
   * hairline PAIRED with the kit's rune band, and the pairing was the point: the
   * plate's other mounts sat under a section HEAD whose own filler rule already
   * drew the line, while this one closes a column of bare field labels, where a
   * band on its own read as a loose row of marks. #2210 retires the band's glyph
   * vocabulary kit-wide, so what is left is the half that was doing the ruling —
   * the same 1px brass the section heads draw, through the shared
   * `ComposerRule` rather than a second declaration of it here.
   */
  const composerRule = <ComposerRule style={{ background: BRASS, opacity: 0.5 }} />;

  /** Radius 0, borderW 1.5 — the skin's whole geometry row. */
  const fieldBox = {
    width: "100%",
    background: INNER,
    color: INK,
    border: `1.5px solid ${LINE}`,
    borderRadius: 0,
    padding: "var(--space-md)",
    boxSizing: "border-box",
  } as const;

  /* The chrome, named once and mounted twice: the composer below, and the
     waiting surface once your part is in (#1189). The same ELEMENTS both
     times, so the sky band, the cornice and the ruled ground cannot drift
     between the two stages. */
  const sheetStyle = {
    background: PLATE,
    border: `1.5px solid ${LINE}`,
    borderRadius: 0,
    boxShadow: SHADOW,
  };
  const statusMark = <StatusMark />;
  const slip = {
    style: {
      background: INNER,
      border: `1.5px solid ${LINE}`,
      /* The design left-rules the slip in the accent (#1706). It sits AFTER the
         border shorthand on purpose: a shorthand spread last would erase it. */
      borderLeft: `2px solid ${BRASS}`,
      borderRadius: 0,
      padding: "var(--space-lg)",
    },
    labelStyle: { ...label, color: QUIET },
    titleStyle: { fontFamily: CAPS, color: INK, lineHeight: 1.2 },
    descriptionStyle: { fontFamily: READING, color: QUIET },
    pillStyle: { ...label, color: QUIET, borderRadius: 0 },
  } as const;
  /* NOT `.eph-cta`, and this is a reported gap rather than a decision (#2146).
     This is the affirmative control on the WAITING stage, and it paints the
     plate CTA like every other — but it reaches that surface as
     `dress.primaryStyle`, a bare `CSSProperties`, and `PraxisWaitingSurface`
     derives its own `className` from whether that style exists. There is no
     seam for a class without giving the shared dress a `primaryClassName`, and
     that file carries the stage's state rather than its paint.
     ponytail: one optional field on `ComposerDress` and one `??` in
     `PraxisWaitingSurface` closes it; until then this is the one Ephemerists
     plate CTA whose enclosure does not flip with the theme. */
  const primaryStyle = composerLabelStyle({
    ...label,
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-sm)",
    border: `1.5px solid ${BRASS}`,
    borderRadius: 0,
    padding: "var(--space-md) var(--space-xl)",
    color: CTA_INK,
    background: CTA,
  });
  const masthead = (
          <>
            {/* The sky band. A wash rather than a flat fill: the night blue
                lifts toward the nile at the horizon and settles back into the
                band at its foot. Both stops are plate tokens, so — like the
                rest of this register — the sky is the SAME in both themes and
                does not flip; the design's byte-identical light/dark objects
                say so too (#1830 corrected this note). */}
            <ComposerMasthead
              height={EPH_BAND[factor]}
              background={`linear-gradient(180deg, color-mix(in srgb, var(--faction-ephemerists-plate-band) 82%, ${BRASS_LIGHT}) 0%, var(--faction-ephemerists-plate-band) 100%)`}
              style={{
                // The engraved masthead sizes itself from its own padding, so
                // the shared band's `height` becomes a FLOOR. `style` is spread
                // after `height` in `ComposerMasthead`, which is what lets a skin
                // relax it without the shared block growing a second prop.
                height: "auto",
                minHeight: EPH_BAND[factor],
                overflow: "hidden",
                color: BAND_INK,
              }}
            >
              {/* NO COLOPHON ON THIS SURFACE, and it is a structural block
                  rather than a choice: #1828 makes the cast a full-bleed band
                  that closes the sheet with a negative bottom margin, so a
                  trailing sibling is pulled back up over the brass instead of
                  sitting under it — the same block the trailing rune strip
                  records at the footer below. The composer therefore keeps the
                  notation band and loses the coordinates, which is also the
                  placement #2124 wanted least: this is the one Ephemerists
                  surface whose every field is the author's own. */}
              <EphemeristsMasthead
                slug={praxis.task_faction_slug}
                scale={sizes.isMobile ? "card" : "page"}
                seed={`praxis:${praxis.id}`}
              />
            </ComposerMasthead>
            {/* The cavetto cornice, beneath the band, carrying the one motion. */}
            <Cornice glow />
          </>
  );
  const ground = (
          <ComposerGround inset={0} style={{ overflow: "hidden" }}>
            {/* The plate's own field, bowed toward the well off the sheet's
                right edge (#1830). NOT lined paper — see `GravityField`. */}
            <GravityField
              width={GRAVITY_WIDTH[factor]}
              height={GRAVITY_HEIGHT}
            />
            {/* The margin rule, struck in ochre down the gutter — outside the
                content column's inset, so no line of type ever runs into it. */}
            <span
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: MARGIN_RULE[factor],
                width: 1,
                background: OCHRE,
                opacity: 0.5,
              }}
            />
          </ComposerGround>
  );

  const dress: ComposerDress = {
    accent: BRASS,
    alarm: ALARM,
    /* The plate's LINK INKS, set once on the root both this composer and
       `PraxisWaitingSurface` mount (#1636). `.markdown-preview a` reads
       `--link-ink`, whose `:root` default is the app's warm neutral — chosen
       against a near-white page, and 2.60:1 on the panel cell `BodyPreview`
       renders into (hover 1.16:1). The detail column declares the identical
       pair through `.eph-plate-sheet`; this is the same seam reached from the
       one Ephemerists root that is not inside that column. BRASS_LIGHT is the plate's
       declared link hue and is measured on all three of its grounds.

       AND THE LABEL SEAM, for the identical reason, one issue later (#1754 fixed
       the sheet, #1800 this root — the #1754 agent found this one and was scoped
       out of `editPraxis/**` at the time). Unset, `.label-caption` and
       `.label-heading` inherit the global tertiary: on the sheet's `PLATE` that
       is 2.01:1 in light and in a panel cell's `INNER` 1.86:1. QUIET is
       `-plate-quiet`, the same ink `.eph-plate-sheet` names, so both Ephemerists
       roots land on one value — 5.98 on the sheet, 5.52 in a cell, in both
       cascades.

       THE COMPOSER'S PAGE GROUND IS NOT THE PLATE'S, which is worth saying
       because the plate's numbers do not transfer wholesale. `ComposerPage`
       renders a bare `<div style={style}>` with no background, so what is under
       the sheet here is the APP's `--color-bg-page` — near-white in light, where
       QUIET reads 2.64:1 (the #1793 defect, on the faction page). Every label
       this seam reaches renders inside `ComposerSheet` or a panel, and the one
       thing on the bare page, the breadcrumb, is neutral SITE chrome that reads
       the app's own tertiary and never this seam at all (#2102 — it took a
       `breadcrumbInk` off the dress until then).
       A `.label-caption` mounted directly on this page would need the app's own
       tier instead; there is none today, and the guard in
       `factionContrast.test.ts` records why. */
    pageStyle: {
      fontFamily: DECO,
      color: INK,
      ["--link-ink" as string]: BRASS_LIGHT,
      ["--link-ink-hover" as string]: INK,
      ["--label-ink" as string]: QUIET,
    } as CSSProperties,
    sheetStyle,
    masthead,
    ground,
    rule: () => composerRule,
    mark: statusMark,
    statusStyle: { ...label, color: INK },
    metaStyle: { fontFamily: READING, color: QUIET },
    labelStyle: sectionLabel,
    slip,
    panelStyle: {
      background: INNER,
      border: `1.5px solid ${LINE}`,
      borderRadius: 0,
    },
    headingStyle: { fontFamily: CAPS, color: INK, lineHeight: 1.2 },
    bodyStyle: { fontFamily: READING, color: QUIET },
    quietStyle: { fontFamily: READING, color: QUIET },
    primaryStyle,
    quietButtonStyle: { ...label, color: QUIET },
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
            header; the ankh cartouche is the waiting surface's beat. */}
        <ComposerStatusRow
          status={t("editPraxis.composer.statusDraft")}
          statusStyle={dress.statusStyle}
        />

        {/* The task reference slip, on an inner cell. Its mark is the shared
            ScoreStamp (#1828) — the plate's own medallion by dispatch, carrying
            the praxis's total instead of the task's bare figure. */}
        <TaskSlip praxis={praxis} task={task} {...slip} />

        {/* No visible label since #2179, which reverses #2093's VISIBLE
            half: the placeholder carries the field's name on screen and
            `titleLabel` carries it in the accessible tree. Both live in
            `TitleField`, so there is nothing per-faction here. */}
        <ComposerSection rule={false}>
          <TitleField
            state={state}
            skin={{
              placeholder: t("editPraxis.composer.titlePlaceholder"),
              inputStyle: { ...fieldBox, fontFamily: CAPS },
            }}
          />
        </ComposerSection>

        {/* How it was done — hidden once the mode can no longer change, per the
            house rule that an unusable control is not drawn disabled. */}
        {!state.controlsLocked && (
          <ComposerSection
            rule={false}
            label={t("editPraxis.composer.modeLabel")}
            labelStyle={sectionLabel}
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
                      ...label,
                      cursor: disabled ? "not-allowed" : "pointer",
                      padding: "var(--space-sm) var(--space-lg)",
                      borderRadius: 0,
                      background: active ? CTA : INNER,
                      color: active ? CTA_INK : QUIET,
                      border: `1.5px solid ${active ? BRASS : LINE}`,
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
            rule={false}
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
            labelStyle={sectionLabel}
          >
            <InviteSearch
              state={state}
              skin={{
                fontFamily: READING,
                inputBg: INNER,
                inputColor: INK,
                inputBorder: `1.5px solid ${LINE}`,
                dropdownBg: INNER,
                dropdownBorder: `1.5px solid ${BRASS}`,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { fontFamily: READING, color: QUIET },
                /* THE CORNER IS THE RULING (#2269): "the corners shouldn't be
                 * rounded for Ephemerists". Every field on this plate is
                 * `borderRadius: 0` — the brass plate is square, ruled and
                 * chamfered — while the shared collab chips rounded themselves
                 * at 4 anyway. Same 0 as `fieldBox`, from the same file, so a
                 * future change to one cannot leave the other behind. */
                collab: { radius: 0, quiet: QUIET },
              }}
            />
          </ComposerSection>
        )}

        {state.showSealStack && (
          <ComposerSection
            rule={false}
            label={t("editPraxis.composer.metatasksLabel")}
            labelStyle={sectionLabel}
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
          labelStyle={sectionLabel}
          meta={
            <span style={composerMetaCluster}>
              <span
                style={composerLabelStyle({
                  ...label,
                  color: QUIET,
                  letterSpacing: "0.14em",
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
                      ...label,
                      padding: "var(--space-xs) var(--space-sm)",
                      borderRadius: 0,
                      border: `1px solid ${active ? BRASS : "transparent"}`,
                      background: active ? INNER : "transparent",
                      color: active ? INK : QUIET,
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
              state={state}
              skin={{
                placeholder: t("editPraxis.composer.bodyPlaceholder"),
                textareaStyle: {
                  ...fieldBox,
                  resize: "vertical",
                  minHeight: 180,
                  lineHeight: 1.85,
                  fontFamily: READING,
                },
              }}
            />
          ) : (
            <BodyPreview
              state={state}
              skin={{
                wrapperStyle: { ...fieldBox, minHeight: 180 },
                markdownStyle: {
                  fontFamily: READING,
                  lineHeight: 1.85,
                  color: INK,
                },
                emptyState: (
                  <p
                    style={{
                      fontFamily: READING,
                      fontStyle: "italic",
                      fontSize: "var(--text-content)",
                      color: QUIET,
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
          rule={false}
          label={t("editPraxis.composer.proofLabel")}
          labelStyle={sectionLabel}
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
                    ...label,
                    cursor: "pointer",
                    /* Translucent, so the journal ruling reads through the drop
                       zone (#1828). */
                    background: composerDropGround(INNER),
                    border: `1.5px dashed ${BRASS}`,
                    borderRadius: 0,
                    padding: "var(--space-2xl) var(--space-lg)",
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    color: CAPTION,
                  }),
                  helperText: t("editPraxis.composer.proofHelper"),
                  helperStyle: {
                    fontFamily: READING,
                    fontStyle: "italic",
                    fontSize: "var(--text-content)",
                    color: QUIET,
                    maxWidth: 260,
                    lineHeight: 1.55,
                    marginTop: "var(--space-sm)",
                  },
                }}
              />
            )}
          </div>
        </ComposerSection>

        <ErrorBanner message={state.error} style={{ color: ALARM }} />

        {/* The footer's own divider — the plate's brass, at the shared rule's
            own 1px. */}
        {composerRule}

        {/* [Cancel] … [Submit] — the global order from #646. The cast is a
            full-bleed band (#1828) with the open eye following the word. */}
        <ComposerFooter
          band
          start={
            <>
              <SaveDraftButton
                state={state}
                skin={{
                  className: "hover:underline",
                  style: composerLabelStyle({
                    ...label,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: QUIET,
                  }),
                }}
              />
              <DropButton
                state={state}
                skin={{
                  style: composerLabelStyle({
                    ...label,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    color: QUIET,
                    textDecoration: "underline",
                    cursor: "pointer",
                  }),
                }}
              />
            </>
          }
          end={
            <>
              {/* The rune strip ahead of the cast (#2067) — the same component
                  the task card and the task page mount, so the motif is one
                  drawing on all three surfaces that paint a plate CTA.

                  ONLY THE LEADING STRIP, and that is a reported gap rather than
                  a choice. #1828 makes this skin's cast a FULL-BLEED BAND that
                  closes the sheet: `composerBandStyle` gives it
                  `margin-bottom: calc(-1 * padBottom)`, so a trailing sibling is
                  pulled back up over the brass instead of sitting under it.
                  There is no room below the band inside the sheet, and taking it
                  would mean undoing #1828 — which this issue puts out of scope.
                  The card and the task page carry both strips. */}
              <EphemeristsNotationBand side="top" seed={`praxis:${praxis.id}`} />
              <PublishButton
                state={state}
                skin={{
                  /* THE ONE PLATE CTA (#2146). The band takes its ground and
                     its ink from `.eph-cta` — this is the same control the task
                     card and the task page draw, so it may not restate them —
                     and keeps its own 1.5px top rule, because #1828 made it
                     full-bleed and a band has no enclosure to be given one. */
                  className: "eph-cta",
                  idleLabel: t("editPraxis.composer.submit"),
                  busyLabel: t("editPraxis.composer.submitBusy"),
                  trailingOrnament: (
                    <Sign
                      name="openEye"
                      size={SUBMIT_SIGN}
                      color={CTA_INK}
                      weight={1.4}
                    />
                  ),
                  style: {
                    ...composerBandStyle(sizes, {
                      /* Design band: 12 / 500 / 0.24em — the engraved label
                         metrics exactly, which is the one skin whose band and
                         label agree, and 12 is the --text-lg rung. */
                      fontFamily: CAPS,
                      fontWeight: 500,
                      letterSpacing: "0.24em",
                      frame: LINE,
                    }),
                    cursor: state.submitting ? "wait" : "pointer",
                  },
                }}
              />
            </>
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

/** One already-uploaded proof item, mounted in a brass-ruled inner cell. */
function MediaTile({ children, caption, onRemove }: MediaTileProps) {
  const { t } = useTranslation("forms");
  return (
    <div
      style={{
        position: "relative",
        background: INNER,
        border: `1.5px solid ${LINE}`,
        outline: `1px solid ${BRASS_LIGHT}`,
        outlineOffset: 3,
      }}
    >
      <div style={{ width: 120, height: 120, overflow: "hidden" }}>{children}</div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("media.removeAria", { name: caption })}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 22,
          height: 22,
          background: PLATE,
          border: `1px solid ${BRASS}`,
          color: INK,
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
