/**
 * University of Asthmatics edit praxis — composer v2 (#1182, epic #1179; design
 * project c491945e, `UA Edit Praxis.dc.html`, `faction="ua"`).
 *
 * The same page `DefaultEditPraxis` draws, wearing UA's dress (ADR-0065): the
 * layout, the copy and every control are shared, and this file brings frame,
 * type, ornament and motion only. It varies neither the order nor the presence
 * of the layout's regions:
 *
 *   status row → the task slip → Title → How it was done → the mode block →
 *   Write-up → Proof → footer (`Save draft` … `Submit`)
 *
 * ## UA draws no masthead
 *
 * It is the one faction in the set with no top band — the GROUND carries the
 * identity instead, so `ComposerSheet` gets a `ground` and no `masthead`. That
 * absence is the dress decision, not an omission: a band here would put a second
 * ornament above a page whose whole voice is one quiet mark on paper.
 *
 * ## The ground
 *
 * A lotus bleeding off the top-left corner and an ensō off the bottom-right,
 * both clipped by `ComposerSheet`'s own `overflow: hidden`. The site background
 * still shows around the column and no ornament can reach the viewport — the
 * #1028 ruling, which the shared sheet now enforces for every skin.
 *
 * The ensō turns on `.ep-spin` at 200s, re-timed through the shared
 * `--ep-spin-dur` hook rather than a second keyframe. It is a CLASS: the
 * keyframes live in `index.css` behind the `prefers-reduced-motion` guard, and
 * an inline `animation:` would bypass that guard (#1003). Nothing was added to
 * `index.css` for this file.
 *
 * ## One responsive component, no mobile twin (ADR-0065 §2)
 *
 * `useComposerSizes()` picks the size set and `sizes.isMobile` scales the two
 * ground marks — conditional ornament, never a second layout. The phone stacks
 * with flow; there is no fixed-px grid below (SPEC-faction-ui-profile §1a).
 *
 * ## Copy
 *
 * The one neutral shared `editPraxis.composer.*` set (ADR-0065 §3). UA's page
 * vocabulary — `Seal a praxis`, `Mark · Anno III`, `The other hands`, `Seal it`
 * — is deleted with this issue. `editPraxis.ua.collab` SURVIVES: that block is
 * `collabCopy`'s override table, a different resolver that also dresses
 * `CollabRoster` on the read page, and it is not composer page copy.
 *
 * ## Dress, and where its tokens come from
 *
 * Everything is a `--faction-ua-*` token, so both themes come from the
 * `[data-theme="dark"]` cascade, and no theme ternary stands in for it anywhere
 * below (#851's standing guard asserts exactly that on this file — including,
 * as this line learned, on its prose).
 *
 * Two mappings are worth naming, because the design's own words do not exist in
 * UA's palette:
 *
 *   - The design's border is `gold / accentDeep`. UA HAS NO GOLD — #848 took it
 *     out of the practice entirely ("gold went to WOW"), so both themes take the
 *     accent, `--faction-ua-card-accent`, which is UA's accentDeep and flips on
 *     its own. Deliberately not `--faction-ua-card-frame`: that token is scoped
 *     "PRAXIS CARD ONLY" in `index.css` as a named exception, and a composer
 *     reading it would quietly widen an exception the file asks not to widen.
 *   - The design's `ensoFilter` is a hue-rotate stack that recolours a
 *     hex-frozen `<img src="enso-detailed.svg">`. Our ensō is a CSS mask tinted
 *     from a token (ADR-0049, #908) — the filter's whole job is already done by
 *     `--faction-ua-glow`, and porting it would tint the mark twice.
 *
 * ## Reused, not rebuilt
 *
 * `useEditPraxis` and its whole state surface · every control in `controls.tsx`
 * · every block in `shared.tsx` · `MetataskSealStack` · `CollabRoster` (inside
 * `InviteSearch`) · `MarkdownPreview` · UA's own `UaSigil` / `UaEnsoScore` /
 * `Lotus`. No control is forked and no shared block was changed by this issue.
 *
 * `RingMark` is the shared geometry for the two marks and is deliberately NOT
 * used here: its ring is a `background` paint, and UA's ring is a drawn brush
 * delivered as a mask. `UaEnsoScore` is the same geometry with the mark in it
 * and is already UA's, on every other surface that centres a number in the ensō.
 *
 * ## Not drawn as designed
 *
 * The design offers "Forfeit the duel" at the awaiting stage. Not drawn, here or
 * anywhere: #1071 decision 3 rejected that framing against ADR-0011 §Forfeit —
 * at `active` (you cast, the rival has not) unsubmitting is a free neutral
 * reopen, and #718 had already rejected it once. The duel CLOCK is cut for the
 * same reason (#1071 decision 4: no expiry field exists to read). The awaiting
 * stage itself belongs to `PraxisWaitingSurface` and to #1189.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CSSProperties, ReactNode } from "react";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import MediaArt from "../blocks/MediaArt";
import { pickArtKey } from "../blocks/useMediaArt";
import {
  Breadcrumb,
  ComposerFooter,
  ComposerGround,
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
import { Lotus } from "../../../components/factionMarks";
import { UaSigil } from "../../../components/cards/UaSigil";
import { UA_DISPLAY, UA_TEXT, UaEnsoScore } from "../../../components/cards/uaAtoms";
import { MetataskSealStack } from "../MetataskSealStack";
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";

interface Props {
  state: EditPraxisState;
}

/* The practice's inks, named for the ROLE each plays in the design's skin row.
 * Every one carries both themes in `index.css`. */
const SHEET = "var(--faction-ua-card-bg)"; /* the sun-bleached sheet */
const FIELD = "var(--faction-ua-panel)"; /* inset panel — fields, wells */
const INK = "var(--faction-ua-card-text)";
const BODY = "var(--faction-ua-card-body)";
const MUTED = "var(--faction-ua-card-muted)";
const ACCENT = "var(--faction-ua-card-accent)"; /* the design's accentDeep */
const RULE = "var(--faction-ua-rule)"; /* the neutral hairline */
const HAIR = "var(--faction-ua-hair)"; /* the faintest divider, below -rule */
const FILL = "var(--faction-ua)";
const ON_FILL = "var(--faction-ua-on-fill)";

/** Geometry the design pins: radius 7, a 2px border. Ornament, not spacing. */
const RADIUS = 7;
const BORDER_WIDTH = 2;

/** The ensō's turn, re-timed off the shared `--ep-spin-dur` hook. */
const GROUND_SPIN = "200s";

export default function UaEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
  const sizes = useComposerSizes();
  const [tab, setTab] = useState<ComposerTab>("write");
  const praxis = state.praxis!;
  const task = state.task;

  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];
  const modeOptions: Array<{ key: PraxisType; label: string }> = [
    { key: "solo", label: t("editPraxis.composer.modeSolo") },
    { key: "collab", label: t("editPraxis.composer.modeCollab") },
    { key: "duel", label: t("editPraxis.composer.modeDuel") },
  ];

  /* Ornament geometry, in raw px because a drawn figure is neither type nor
   * spacing (WORLD_ZERO_STYLE §4a). The phone gets the same two marks, smaller
   * and pulled in — conditional ornament, not a second layout. */
  const groundGeometry = sizes.isMobile
    ? { lotus: 300, lotusLeft: -122, lotusTop: -94, enso: 208, ensoRight: -66, ensoBottom: -58 }
    : { lotus: 420, lotusLeft: -170, lotusTop: -130, enso: 300, ensoRight: -96, ensoBottom: -84 };

  /* UA does not replace the divider — it is the shared hairline in UA's ink.
   * The shared default reads the `na` hair token, which is a colour measured on
   * another faction's paper, so the ink (and only the ink) is overridden. */
  const rule = <ComposerRule style={{ background: HAIR }} />;

  /* The label tier's face and colour are the skin's; its geometry (uppercase,
   * 0.14em, --text-lg) is the layout's and is inherited untouched. */
  const labelStyle = { fontFamily: UA_TEXT, color: MUTED };

  const fieldBox = {
    width: "100%",
    background: FIELD,
    color: INK,
    border: `1px solid ${RULE}`,
    borderRadius: RADIUS,
    padding: "var(--space-md)",
    outline: "none",
    boxSizing: "border-box",
  } as const;

  /* The chrome, named once and mounted twice: the composer below, and the
     waiting surface once your part is in (#1189). The same ELEMENTS both
     times, so the lotus and the turning ensō cannot drift between stages. */
  const sheetStyle = {
    background: SHEET,
    border: `${BORDER_WIDTH}px solid ${ACCENT}`,
    borderRadius: RADIUS,
  };
  const statusMark = <UaSigil width={44} height={44} />;
  const slip = {
    style: {
      background: FIELD,
      border: `1px solid ${RULE}`,
      borderRadius: RADIUS,
      padding: "var(--space-lg)",
    },
    labelStyle,
    titleStyle: { fontFamily: UA_DISPLAY, fontWeight: 600, color: INK },
    descriptionStyle: { color: BODY },
    pillStyle: { fontFamily: UA_TEXT, color: MUTED },
  } as const;
  const primaryStyle = composerLabelStyle({
    fontFamily: UA_TEXT,
    border: "none",
    borderRadius: RADIUS,
    padding: "var(--space-md) var(--space-xl)",
    color: ON_FILL,
    background: FILL,
  });
  /* NO masthead. UA is the one faction that draws no top band. */
  const groundLayer = (
          <ComposerGround inset={0} opacity="var(--faction-ua-card-lotus-opacity)">
            <Lotus
              size={groundGeometry.lotus}
              color="var(--faction-ua-card-lotus)"
              style={{
                position: "absolute",
                left: groundGeometry.lotusLeft,
                top: groundGeometry.lotusTop,
              }}
            />
            {/* The ensō turns once every 200s — re-timed through the shared
                hook, so no second keyframe and no inline `animation:`. */}
            <span
              className="ep-spin"
              style={
                {
                  position: "absolute",
                  right: groundGeometry.ensoRight,
                  bottom: groundGeometry.ensoBottom,
                  "--ep-spin-dur": GROUND_SPIN,
                } as CSSProperties
              }
            >
              <UaSigil width={groundGeometry.enso} height={groundGeometry.enso} />
            </span>
          </ComposerGround>
  );

  const dress: ComposerDress = {
    accent: ACCENT,
    pageStyle: { fontFamily: UA_TEXT, color: INK },
    sheetStyle,
    ground: groundLayer,
    rule: () => rule,
    mark: statusMark,
    statusStyle: { fontFamily: UA_TEXT, color: INK, fontWeight: 600 },
    metaStyle: { fontFamily: UA_TEXT, color: MUTED },
    labelStyle,
    slip,
    panelStyle: {
      background: FIELD,
      border: `1px solid ${RULE}`,
      borderRadius: RADIUS,
    },
    headingStyle: { fontFamily: UA_DISPLAY, fontWeight: 600, color: INK },
    bodyStyle: { color: BODY },
    quietStyle: { fontFamily: UA_TEXT, color: MUTED },
    primaryStyle,
    quietButtonStyle: { fontFamily: UA_TEXT, color: MUTED },
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
        /* No `inkColor`: the breadcrumb sits ABOVE the sheet, on the site
           background, so it takes the global tertiary ink like every other
           page's. A `--faction-ua-*` ink here would be a colour measured on
           UA's paper and then painted on the app's (#651, #694). */
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
        />
      }
    >
      <ComposerSheet sizes={sizes} style={sheetStyle} ground={groundLayer}>
        {/* Draft · Saved just now, with the ensō as the status mark. */}
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

        {/* The task reference slip, on the inset panel with the points mark. */}
        <TaskSlip
          praxis={praxis}
          task={task}
          {...slip}
          mark={
            <UaEnsoScore
              size={88}
              value={task?.point_value ?? 0}
              valueColor={ACCENT}
              valueSize="var(--text-title)"
              valueWeight={700}
            />
          }
        />

        <ComposerSection
          label={t("editPraxis.composer.titleLabel")}
          htmlFor="composer-title"
          rule={rule}
          meta={<TitleCounter length={state.title.length} color={MUTED} />}
          labelStyle={labelStyle}
        >
          <TitleField
            state={state}
            skin={{
              id: "composer-title",
              placeholder: t("editPraxis.composer.titlePlaceholder"),
              inputStyle: {
                ...fieldBox,
                fontFamily: UA_DISPLAY,
                fontWeight: 600,
              },
            }}
          />
        </ComposerSection>

        {/* How it was done — hidden once the mode can no longer change, per the
            house rule that an unusable control is not drawn disabled. */}
        {!state.controlsLocked && (
          <ComposerSection
            label={t("editPraxis.composer.modeLabel")}
            rule={rule}
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
                allowedModes,
                renderOption: (option, { active, disabled, onSelect }) => (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={active}
                    onClick={onSelect}
                    disabled={disabled && !active}
                    style={composerLabelStyle({
                      fontFamily: UA_TEXT,
                      cursor: disabled ? "not-allowed" : "pointer",
                      padding: "var(--space-sm) var(--space-lg)",
                      borderRadius: RADIUS,
                      background: active ? FILL : FIELD,
                      color: active ? ON_FILL : MUTED,
                      border: `1px solid ${active ? FILL : RULE}`,
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
              state.duelMode
                ? t("editPraxis.composer.opponentLabel")
                : t("editPraxis.composer.collaboratorsLabel", {
                    count: praxis.members.length,
                  })
            }
            rule={rule}
            labelStyle={labelStyle}
          >
            <InviteSearch
              state={state}
              skin={{
                fontFamily: UA_TEXT,
                inputBg: FIELD,
                inputColor: INK,
                inputBorder: `1px solid ${RULE}`,
                dropdownBg: SHEET,
                dropdownBorder: `1px solid ${RULE}`,
                acceptedBg: FILL,
                acceptedColor: ON_FILL,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { fontFamily: UA_TEXT, color: MUTED },
              }}
            />
          </ComposerSection>
        )}

        {state.showSealStack && (
          <ComposerSection
            label={t("editPraxis.composer.sealsLabel")}
            rule={rule}
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
          rule={rule}
          labelStyle={labelStyle}
          meta={
            <WriteUpTabs
              tab={tab}
              setTab={setTab}
              skin={{
                containerStyle: { gap: "var(--space-xs)" },
                buttonStyle: (active) =>
                  composerLabelStyle({
                    fontFamily: UA_TEXT,
                    padding: "var(--space-xs) var(--space-sm)",
                    borderRadius: RADIUS,
                    border: `1px solid ${active ? RULE : "transparent"}`,
                    background: active ? FIELD : "transparent",
                    color: active ? INK : MUTED,
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
                  toolbarButtonStyle: {
                    fontFamily: UA_TEXT,
                    background: FIELD,
                    color: MUTED,
                    border: `1px solid ${RULE}`,
                    borderRadius: RADIUS,
                  },
                  textareaStyle: {
                    ...fieldBox,
                    resize: "vertical",
                    minHeight: 180,
                    lineHeight: 1.7,
                    fontFamily: UA_TEXT,
                  },
                }}
              />
              <div
                style={composerLabelStyle({
                  fontFamily: UA_TEXT,
                  color: MUTED,
                  marginTop: "var(--space-sm)",
                  letterSpacing: "0.06em",
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
                  fontFamily: UA_TEXT,
                  lineHeight: 1.7,
                  color: BODY,
                },
                emptyState: (
                  <p
                    style={{
                      fontFamily: UA_TEXT,
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
          rule={rule}
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
                <MediaPlate
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
                </MediaPlate>
              );
            })}
            {!state.controlsLocked && (
              <FilePicker
                state={state}
                skin={{
                  buttonStyle: composerLabelStyle({
                    fontFamily: UA_TEXT,
                    cursor: "pointer",
                    background: "transparent",
                    border: `1px dashed ${FILL}`,
                    borderRadius: RADIUS,
                    padding: "var(--space-lg) var(--space-xl)",
                    color: MUTED,
                  }),
                  buttonLabel: t("editPraxis.composer.proofButton"),
                  errorColor: "var(--faction-ua-vermil)",
                  helperText: t("editPraxis.composer.proofHelper"),
                  helperStyle: {
                    fontFamily: UA_TEXT,
                    fontSize: "var(--text-content)",
                    color: MUTED,
                    maxWidth: 260,
                    lineHeight: 1.5,
                    marginTop: "var(--space-sm)",
                  },
                }}
              />
            )}
          </div>
        </ComposerSection>

        <ErrorBanner message={state.error} />

        <ComposerRule style={{ background: HAIR }} />

        {/* [Cancel] … [Submit] — the global order from #646. An inline button
            with no ornament, which is the design's submit treatment for UA. */}
        <ComposerFooter
          start={
            <>
              <SaveDraftButton
                state={state}
                skin={{ style: { fontFamily: UA_TEXT, color: MUTED } }}
              />
              <DropButton
                state={state}
                skin={{
                  style: composerLabelStyle({
                    fontFamily: UA_TEXT,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    color: MUTED,
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

interface MediaPlateProps {
  children: ReactNode;
  caption: string;
  onRemove: () => void;
}

/** One already-uploaded proof item, on the practice's inset panel. */
function MediaPlate({ children, caption, onRemove }: MediaPlateProps) {
  const { t } = useTranslation("forms");
  return (
    <div
      style={{
        position: "relative",
        background: FIELD,
        border: `1px solid ${RULE}`,
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
          borderRadius: "50%",
          background: SHEET,
          border: `1px solid ${RULE}`,
          color: ACCENT,
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
