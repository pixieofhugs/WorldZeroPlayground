/**
 * The Ephemerists edit praxis — THE VALLEY PLATE, ruled for filing (#1185, epic
 * #1179; design project c491945e, `Ephemerists Edit Praxis.dc.html`, the
 * `ephemerists` row of `SKINS`).
 *
 * Dress over the shared layout, not a layout of its own. `DefaultEditPraxis` is
 * the reference implementation and the contract (ADR-0065 §1); read it there
 * rather than re-deriving it here. What this file adds is the Deco × Egypt plate
 * at composer size: a night-sky masthead under a cavetto cornice, a papyrus
 * ground ruled like a field journal with an ochre margin rule struck down its
 * gutter, a brass octagon for the points, an ankh in an octagon for the stage,
 * and an open eye following the cast.
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
 * conditional ornament; there is one tree at two widths.
 * `mobileArchetypes/EphemeristsEditPraxis.tsx` went with the `mobileEditPraxis`
 * surface in #1181. Nothing below is a fixed-px layout grid
 * (SPEC-faction-ui-profile §1a) — every fixed number here is ornament geometry.
 *
 * ## Copy — none of its own (ADR-0065 §3)
 *
 * Every string comes from the shared neutral `editPraxis.composer.*` block. The
 * faction's whole composer vocabulary — `AN ENTRY IN THE EPHEMERIS`, `THE
 * FINDING`, `THE ACCOUNT`, `THE EVIDENCE`, `alone / in concord / in dispute` —
 * was **deleted** with this issue; `editPraxis.ephemerists.collab` survives
 * because it is not composer page copy but `collabCopy`'s override table, read
 * by `CollabRoster` on `/praxis/:id` too. The masthead's one word is the
 * faction's NAME out of `factions.json` (`factionName`), the same string the
 * praxis-detail masthead sets — a name, not a voice.
 *
 * ## Marks: reused, not redrawn (WORLD_ZERO_STYLE §6, "one primitive")
 *
 * The winged disc, the cornice, the fluted rule, the incised signs and the
 * stepped octagon are all `components/cards/ephemeristsPlate` — the module
 * #1120 extracted so the plate's ornament is shared rather than copied. This
 * file draws no new SVG apart from the two marks' arrangement.
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
 * Every value is a `--faction-ephemerists-plate-*` token and light/dark flips
 * through the `[data-theme="dark"]` cascade — there is no `dark ?` branch in the
 * file. `-brass` is a rule colour and never an ink; quiet type takes `-quiet`,
 * which clears AA on the page, the plate AND the inner cells (#1028). The
 * design's two theme-tuned opacities for the ruling (.3 light / .22 dark) are
 * one literal wearing two values: `-rule` already carries that tuning in the
 * colour itself, so the ground layer needs no opacity ternary. This is the
 * plate (`--faction-ephemerists-plate-*`), never the illuminated codex
 * (`--eph-*`); the two grounds must not be mixed on one surface (ADR-0055).
 *
 * ## Not drawn as designed
 *
 * The awaiting stage belongs to `PraxisWaitingSurface` and to #1189. Forfeit at
 * that stage is not drawn here or anywhere — #1071 decision 3 rejected the
 * framing against ADR-0011 §Forfeit, and #718 had rejected it once before. The
 * duel clock is cut for the same reason: no expiry field exists to read.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mediaUrl } from "../../../utils/media";
import { factionName } from "../../../utils/factions";
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
  TaskSlip,
  TitleCounter,
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
import { MetataskSealStack } from "../MetataskSealStack";
import {
  BAND_INK,
  BRASS,
  BRASS_LIGHT,
  CAPS,
  CAPTION,
  Cornice,
  DECO,
  DISC,
  FlutedRule,
  INK,
  INNER,
  LINE,
  NILE,
  OCHRE,
  Octagon,
  PLATE,
  QUIET,
  READING,
  RULE,
  SHADOW,
  SMALL_CAPS,
  Sign,
  WingedDisc,
} from "../../../components/cards/ephemeristsPlate";
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";

interface Props {
  state: EditPraxisState;
}

/* The cast's own pair. Not exported by the plate module because no other
 * surface has a primary button; declared in `index.css` in both themes. */
const CTA = "var(--faction-ephemerists-plate-cta-bg)";
const CTA_INK = "var(--faction-ephemerists-plate-cta-ink)";

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) ──
 *
 * `EPH_BAND` is the design's own name for the sky band's height. The pairs
 * below are its desktop / mobile values, and the praxis-detail masthead's — one
 * plate, one masthead, drawn at the same two sizes on both surfaces. */
const EPH_BAND = { desktop: 84, mobile: 68 };
const WORDMARK_DISC = { desktop: 150, mobile: 124 };
const WORDMARK_DISC_HEIGHT = 32;
/** The journal ruling's leading, and where the ochre margin rule is struck. */
const RULING = 25;
const MARGIN_RULE = { desktop: 22, mobile: 13 };
/** The two marks. Both stepped octagons, both drawn on a 100-unit viewBox. */
const POINTS_MARK = 92;
const STATUS_MARK = 44;
/** The sign following the cast. */
const SUBMIT_SIGN = 17;
/** The ankh inside the status octagon. */
const STATUS_SIGN = 24;

/**
 * The points mark: a brass octagon with a second inset hairline, an incised
 * circle and a baseline struck under the figure.
 *
 * The stroke widths are in viewBox units, so a 1.5 unit stroke on the 100-unit
 * square lands at the skin's `borderW: 1.5` once scaled to 92.
 */
function PointsMark({ points, unit }: { points: number; unit: string }) {
  return (
    <div
      style={{
        position: "relative",
        width: POINTS_MARK,
        height: POINTS_MARK,
        flexShrink: 0,
      }}
    >
      <svg
        width={POINTS_MARK}
        height={POINTS_MARK}
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0 }}
      >
        <Octagon inset={0} stroke={BRASS} width={1.6} fill={DISC} />
        <Octagon inset={9} stroke={BRASS_LIGHT} width={0.8} />
        <circle
          cx={50}
          cy={50}
          r={34}
          fill="none"
          stroke={BRASS_LIGHT}
          strokeWidth={0.7}
          opacity={0.7}
        />
        <path d="M18 74 H82" stroke={BRASS} strokeWidth={1} opacity={0.85} />
      </svg>
      {/* The figure sits in the field ABOVE the struck baseline; the unit reads
          beneath it. Percentages, so the split follows the mark at any size. */}
      <span
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: "26%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: DECO,
          fontSize: "var(--text-title)",
          lineHeight: 1,
          color: INK,
        }}
      >
        {points}
      </span>
      <span
        style={{
          ...SMALL_CAPS,
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "7%",
          textAlign: "center",
          fontSize: "var(--text-xs)",
          letterSpacing: "0.2em",
          color: CAPTION,
        }}
      >
        {unit}
      </span>
    </div>
  );
}

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
        <Octagon inset={0} stroke={BRASS} width={3.4} fill={INNER} />
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
        <Sign name="ankh" size={STATUS_SIGN} color={NILE} weight={1.6} />
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

  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];
  const modeOptions: Array<{ key: PraxisType; label: string }> = [
    { key: "solo", label: t("editPraxis.composer.modeSolo") },
    { key: "collab", label: t("editPraxis.composer.modeCollab") },
    { key: "duel", label: t("editPraxis.composer.modeDuel") },
  ];

  /** Cinzel small caps, the plate's label voice, over the layout's tracking. */
  const label = { fontFamily: CAPS, fontWeight: 500, letterSpacing: "0.24em" };
  /** Section heads sit on the plate, where the caption gold is measured. */
  const sectionLabel = { ...label, color: CAPTION };
  /** The flute is this skin's section rule (design: `rule: 'flute'`). */
  const flute = <FlutedRule />;

  /** Radius 0, borderW 1.5 — the skin's whole geometry row. */
  const fieldBox = {
    width: "100%",
    background: INNER,
    color: INK,
    border: `1.5px solid ${LINE}`,
    borderRadius: 0,
    padding: "var(--space-md)",
    outline: "none",
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
      borderRadius: 0,
      padding: "var(--space-lg)",
    },
    labelStyle: { ...label, color: QUIET },
    titleStyle: { fontFamily: CAPS, color: INK, lineHeight: 1.2 },
    descriptionStyle: { fontFamily: READING, color: QUIET },
    pillStyle: { ...label, color: QUIET, borderRadius: 0 },
  } as const;
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
                band at its foot. Both stops are tokens, so the sky flips with
                the theme. */}
            <ComposerMasthead
              height={EPH_BAND[factor]}
              background={`linear-gradient(180deg, color-mix(in srgb, var(--faction-ephemerists-plate-band) 82%, ${NILE}) 0%, var(--faction-ephemerists-plate-band) 100%)`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--space-xs)",
                overflow: "hidden",
                color: BAND_INK,
              }}
            >
              <WingedDisc
                width={WORDMARK_DISC[factor]}
                height={WORDMARK_DISC_HEIGHT}
              />
              <span
                style={{
                  fontFamily: DECO,
                  // Chrome, not content: a wordmark is scanned. The design's
                  // 19/16 land on the two nearest rungs.
                  fontSize: sizes.isMobile
                    ? "var(--text-xl)"
                    : "var(--text-content)",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                  color: BAND_INK,
                  whiteSpace: "nowrap",
                }}
              >
                {factionName(praxis.task_faction_slug)}
              </span>
            </ComposerMasthead>
            {/* The cavetto cornice, beneath the band, carrying the one motion. */}
            <Cornice glow />
          </>
  );
  const ground = (
          <ComposerGround
            inset={0}
            background={`repeating-linear-gradient(0deg, transparent 0 ${RULING}px, ${RULE} ${RULING}px ${RULING + 1}px)`}
          >
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
    pageStyle: { fontFamily: DECO, color: INK },
    breadcrumbInk: QUIET,
    sheetStyle,
    masthead,
    ground,
    rule: () => flute,
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
          inkColor={QUIET}
        />
      }
    >
      <ComposerSheet
        sizes={sizes}
        style={sheetStyle}
        masthead={masthead}
        ground={ground}
      >
        {/* Draft · Saved just now, with the ankh cartouche at the row's end. */}
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

        {/* The task reference slip, on an inner cell with the points mark. */}
        <TaskSlip
          praxis={praxis}
          task={task}
          {...slip}
          mark={
            <PointsMark
              points={task?.point_value ?? praxis.task_point_value ?? 0}
              unit={t("editPraxis.composer.pointsUnit")}
            />
          }
        />

        <ComposerSection
          rule={flute}
          label={t("editPraxis.composer.titleLabel")}
          htmlFor="composer-title"
          labelStyle={sectionLabel}
          meta={<TitleCounter length={state.title.length} color={QUIET} />}
        >
          <TitleField
            state={state}
            skin={{
              id: "composer-title",
              placeholder: t("editPraxis.composer.titlePlaceholder"),
              inputStyle: { ...fieldBox, fontFamily: CAPS },
            }}
          />
        </ComposerSection>

        {/* How it was done — hidden once the mode can no longer change, per the
            house rule that an unusable control is not drawn disabled. */}
        {!state.controlsLocked && (
          <ComposerSection
            rule={flute}
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
                allowedModes,
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
            rule={flute}
            label={
              state.duelMode
                ? t("editPraxis.composer.opponentLabel")
                : t("editPraxis.composer.collaboratorsLabel", {
                    count: praxis.members.length,
                  })
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
                acceptedBg: CTA,
                acceptedColor: CTA_INK,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { fontFamily: READING, color: QUIET },
              }}
            />
          </ComposerSection>
        )}

        {state.showSealStack && (
          <ComposerSection
            rule={flute}
            label={t("editPraxis.composer.sealsLabel")}
            labelStyle={sectionLabel}
          >
            <MetataskSealStack state={state} />
          </ComposerSection>
        )}

        {/* Write-up — the tabs sit in the section's meta slot, so the label row
            reads `Write-up … [Write|Preview]` exactly as the design draws it. */}
        <ComposerSection
          rule={flute}
          label={t("editPraxis.composer.writeUpLabel")}
          htmlFor="composer-body"
          labelStyle={sectionLabel}
          meta={
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
          }
        >
          {/* Both panels are mounted only one at a time: a hidden textarea would
              still be a tab stop and still be submitted by a form, and drawing
              both would put the body in the DOM twice. */}
          {tab === "write" ? (
            <>
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
                    lineHeight: 1.85,
                    fontFamily: READING,
                  },
                }}
              />
              <div
                style={composerLabelStyle({
                  ...label,
                  color: QUIET,
                  marginTop: "var(--space-sm)",
                  letterSpacing: "0.14em",
                })}
              >
                {t("editPraxis.composer.wordCount", { words: state.wordCount })}
              </div>
            </>
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
          rule={flute}
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
                    background: "transparent",
                    border: `1.5px dashed ${BRASS}`,
                    borderRadius: 0,
                    padding: "var(--space-lg) var(--space-xl)",
                    color: CAPTION,
                  }),
                  buttonLabel: t("editPraxis.composer.proofButton"),
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

        <ErrorBanner message={state.error} />

        {/* The footer's own divider. `ComposerRule` hands its whole box over
            when it is given children, so the flute replaces the hairline. */}
        <ComposerRule>{flute}</ComposerRule>

        {/* [Cancel] … [Submit] — the global order from #646. The cast is an
            inline button with the open eye following the word. */}
        <ComposerFooter
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
            <PublishButton
              state={state}
              skin={{
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
                  ...primaryStyle,
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
