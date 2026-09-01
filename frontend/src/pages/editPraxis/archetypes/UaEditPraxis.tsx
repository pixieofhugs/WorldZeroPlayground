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
 * — is deleted with this issue. `editPraxis.ua.collab` survived it, being
 * `collabCopy`'s override table rather than composer page copy; #1812 then
 * deleted all eight of those, because collab submission status speaks one
 * vocabulary on every faction.
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
 * `InviteSearch`) · `MarkdownPreview` · UA's own `UaSigil` / `Lotus`. No control
 * is forked.
 *
 * The slip's points mark is no longer drawn here at all (#1828): it is
 * `TaskSlip`'s default, the shared `ScoreStamp`, which dispatches to
 * `UaScoreStamp` — the ensō, with the total in it. The composer used to draw
 * `UaEnsoScore` itself over the task's bare `point_value`, so the mark changed
 * shape the moment you pressed Submit.
 *
 * `RingMark` is the shared geometry for a mark of this kind and is deliberately
 * NOT used here: its ring is a `background` paint, and UA's ring is a drawn
 * brush delivered as a mask.
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
import { factionRoleVars } from "../../../utils/factionRoles";
import { type PraxisType } from "../../../api/praxis";
import MediaArt from "../blocks/MediaArt";
import { pickArtKey } from "../blocks/useMediaArt";
import {
  ComposerFooter,
  ComposerGround,
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
import { Lotus } from "../../../components/factionMarks";
import { UaSigil } from "../../../components/sigil/UaSigil";
import { UA_DISPLAY, UA_TEXT } from "../../../components/factionMarks/uaAtoms";
import { MetataskSealStack } from "../../../components/metataskSeal/MetataskSealStack";
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";
import Breadcrumb from "../../../components/nav/Breadcrumb";

interface Props {
  state: EditPraxisState;
}

/* The practice's inks, named for the ROLE each plays in the design's skin row.
 * Every one carries both themes in `index.css`. */
const SHEET = "var(--leaf-edit-praxis-paper)"; /* the sun-bleached sheet */
/* The error banner's ink (#1231). The banner sits straight on the sheet, and
 * the neutral `--color-danger` under its own veil misses AA there in light
 * (3.71:1 on this ground); this is #1449's alarm rung, already measured
 * on paper. The veil and the edge stay neutral — ADR-0061. */
const ALARM = "var(--faction-ua-card-alarm)";
const FIELD = "var(--faction-ua-panel)"; /* inset panel — fields, wells */
const INK = "var(--leaf-edit-praxis-ink)";
const BODY = "var(--faction-ua-card-body)";
/* THE QUIET TIER IS `-card-body`, NOT `-card-muted` (#2485). The sheet is
 * washed — `ComposerGround` lays the lotus and the ensō over it at
 * `--faction-ua-card-lotus-opacity` — so what a label sits on is the wash,
 * not the token this file used to measure against. `-card-muted` reads 5.45 /
 * 5.64 flat and 4.38 / 3.79 on that composite, under AA in BOTH themes;
 * `-card-body` is the same family one rung up and clears at 5.74 / 6.78.
 * `UaCreateCharacter` shipped exactly this swap on its own washed leaf
 * (#2348), and `uaCreateCharacterContrast.test.ts` records the refusal as a
 * measurement. `-card-muted` stays right on every UNWASHED UA surface — the
 * task card, the praxis detail, the feed frame — which is why the token is
 * untouched and only this sheet moves. */
const ACCENT = "var(--leaf-edit-praxis-accent)"; /* the design's accentDeep */
const RULE = "var(--faction-ua-rule)"; /* the neutral hairline */
const HAIR = "var(--faction-ua-hair)"; /* the faintest divider, below -rule */
const FILL = "var(--leaf-edit-praxis-fill)";
const ON_FILL = "var(--leaf-edit-praxis-on-fill)";

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

  /* UA does not replace the rule — it is the shared hairline in UA's ink. The
   * shared default reads the `na` hair token, which is a colour measured on
   * another faction's paper, so the ink (and only the ink) is overridden.
   *
   * Kept for the dress the waiting surface wears. On THIS page the hairline is
   * drawn once, above the footer (#1707), and the regions part by the sheet's
   * own gap. */
  const rule = <ComposerRule style={{ background: HAIR }} />;

  /* The label tier's face and colour are the skin's; its geometry (uppercase,
   * 0.14em, --text-lg) is the layout's and is inherited untouched. */
  const labelStyle = { fontFamily: UA_TEXT, color: BODY };

  const fieldBox = {
    width: "100%",
    background: FIELD,
    color: INK,
    border: `1px solid ${RULE}`,
    borderRadius: RADIUS,
    padding: "var(--space-md)",
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
      /* The design left-rules the slip in the accent (#1706). It sits AFTER the
         border shorthand on purpose: a shorthand spread last would erase it. */
      borderLeft: `2px solid ${ACCENT}`,
      borderRadius: RADIUS,
      padding: "var(--space-lg)",
    },
    labelStyle,
    titleStyle: { fontFamily: UA_DISPLAY, fontWeight: 600, color: INK },
    descriptionStyle: { color: BODY },
    pillStyle: { fontFamily: UA_TEXT, color: BODY },
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
    alarm: ALARM,
    /* The nine roles under this surface's prefix (#2659/#2673). `pageStyle`
       lands on `ComposerPage`'s own root div, which is the whole composer, so
       the module constants above resolve inside it. */
    pageStyle: { ...factionRoleVars("ua", "leaf-edit-praxis"), fontFamily: UA_TEXT, color: INK },
    sheetStyle,
    ground: groundLayer,
    rule: () => rule,
    mark: statusMark,
    statusStyle: { fontFamily: UA_TEXT, color: INK, fontWeight: 600 },
    metaStyle: { fontFamily: UA_TEXT, color: BODY },
    labelStyle,
    slip,
    panelStyle: {
      background: FIELD,
      border: `1px solid ${RULE}`,
      borderRadius: RADIUS,
    },
    headingStyle: { fontFamily: UA_DISPLAY, fontWeight: 600, color: INK },
    bodyStyle: { color: BODY },
    quietStyle: { fontFamily: UA_TEXT, color: BODY },
    primaryStyle,
    quietButtonStyle: { fontFamily: UA_TEXT, color: BODY },
  };

  /* Your part is in, so the composer is not a composer any more (ADR-0059).
     Same page, same sheet, same ornament — a different stage. */
  if (isWaitingStage(state.phase)) {
    return (
      <PraxisWaitingSurface
        praxis={praxis}
        task={state.task}
        duel={state.duel}
        phase={state.phase}
        title={state.title}
        body={state.body}
        error={state.error}
        submitting={state.submitting}
        currentCharacterId={state.currentCharacterId}
        crewNudge={state.crewNudge}
        nudge={state.nudge}
        nudgeCrew={state.nudgeCrew}
        kickMember={state.kickMember}
        leaveCollab={state.leaveCollab}
        cancel={state.cancel}
        reopenForEdit={state.reopenForEdit}
        dress={dress}
      />
    );
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
      <ComposerSheet sizes={sizes} style={sheetStyle} ground={groundLayer}>
        {/* `Draft`, alone (#1828). The autosave line moved to the write-up
            header; the sigil is the waiting surface's beat. */}
        <ComposerStatusRow
          status={t("editPraxis.composer.statusDraft")}
          statusStyle={dress.statusStyle}
        />

        {/* The task reference slip, on the inset panel. Its mark is the shared
            ScoreStamp (#1828), which is UA's own ensō score by dispatch — the
            same mark this slip drew, now drawn once for both stages. */}
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
                      fontFamily: UA_TEXT,
                      cursor: disabled ? "not-allowed" : "pointer",
                      padding: "var(--space-sm) var(--space-lg)",
                      borderRadius: RADIUS,
                      background: active ? FILL : FIELD,
                      color: active ? ON_FILL : BODY,
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
                fontFamily: UA_TEXT,
                inputBg: FIELD,
                inputColor: INK,
                inputBorder: `1px solid ${RULE}`,
                dropdownBg: SHEET,
                dropdownBorder: `1px solid ${RULE}`,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { fontFamily: UA_TEXT, color: BODY },
                /* The sheet's own corner. `BODY` is `--faction-ua-card-body`
                 * and this composer IS the card sheet, so the roster's inks ride
                 * the sheet's own quiet tier — the `+ invite` chip is the one
                 * that moves, off the TASK's faction and onto this one (#2267). */
                collab: { radius: RADIUS, quiet: BODY },
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
                  fontFamily: UA_TEXT,
                  color: BODY,
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
                      fontFamily: UA_TEXT,
                      padding: "var(--space-xs) var(--space-sm)",
                      borderRadius: RADIUS,
                      border: `1px solid ${active ? RULE : "transparent"}`,
                      background: active ? FIELD : "transparent",
                      color: active ? INK : BODY,
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
                placeholder: t("editPraxis.composer.bodyPlaceholder"),
                toolbarButtonStyle: {
                  fontFamily: UA_TEXT,
                  background: FIELD,
                  color: BODY,
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
          ) : (
            <BodyPreview
              body={state.body}
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
                      color: BODY,
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
                fileError={state.fileError}
                handleFileChange={state.handleFileChange}
                skin={{
                  buttonStyle: composerLabelStyle({
                    fontFamily: UA_TEXT,
                    cursor: "pointer",
                    /* Translucent, so the lotus and the ensō read through the
                       drop zone (#1828). */
                    background: composerDropGround(FIELD),
                    border: `1px dashed ${FILL}`,
                    borderRadius: RADIUS,
                    padding: "var(--space-2xl) var(--space-lg)",
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    color: BODY,
                  }),
                  errorColor: "var(--faction-ua-vermil)",
                  helperText: t("editPraxis.composer.proofHelper"),
                  helperStyle: {
                    fontFamily: UA_TEXT,
                    fontSize: "var(--text-content)",
                    color: BODY,
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

        <ComposerRule style={{ background: HAIR }} />

        {/* [Cancel] … [Submit] — the global order from #646, with the cast as a
            full-bleed band (#1828): UA's skin row declares a CTA, so it takes
            the committed bottom edge like every other non-na kit. */}
        <ComposerFooter
          band
          start={
            <>
              <SaveDraftButton
                controlsLocked={state.controlsLocked}
                submitting={state.submitting}
                switchingMode={state.switchingMode}
                saveDraft={state.saveDraft}
                skin={{ style: { fontFamily: UA_TEXT, color: BODY } }}
              />
              <DropButton
                praxis={praxis}
                currentCharacterId={state.currentCharacterId}
                cancel={state.cancel}
                skin={{
                  style: composerLabelStyle({
                    fontFamily: UA_TEXT,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    color: BODY,
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
                style: {
                  ...composerBandStyle(sizes, {
                    fontFamily: UA_TEXT,
                    /* Design band: 13 / 500 / 0.14em. 13 sits between the label
                       rung (12) and --text-xl (14); the band takes the rung
                       ABOVE the label it has to outrank (§4a). */
                    fontSize: "var(--text-xl)",
                    /* The design asks 500; `index.html` loads EB Garamond at 400
                       and 600 only, and CSS font matching resolves a requested
                       500 DOWN to 400 — i.e. the design's emphasis would
                       silently not happen (`fontsLoaded.test.ts`, #1294). 600 is
                       the real face on the emphatic side of it. */
                    fontWeight: 600,
                    frame: ACCENT,
                    color: ON_FILL,
                    background: FILL,
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
          // 600, not 700, and the weight is DELIBERATE (#2597). This button
          // inherits `pageStyle`'s EB Garamond, which the loader ships at 400
          // and 600 — so the 700 that stood here was drawn as the real 600 all
          // along and this is the same pixels, honestly named. Not a #2487
          // sweep site: synthesis is a defect, substitution is a design call,
          // and the owner made it. Dropping the weight would render a 22px
          // control at 400, which is a change to a working button.
          fontWeight: 600,
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
