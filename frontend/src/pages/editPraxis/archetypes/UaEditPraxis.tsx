/**
 * University of Asthmatics edit-praxis composer (#1182). Layout, controls and
 * copy are shared (ADR-0065); this file is dress only.
 *
 * No masthead, deliberately: the ground (a lotus top-left, a turning ensō
 * bottom-right, clipped by `ComposerSheet`) carries the identity. The ensō
 * spins by class, re-timed via `--ep-spin-dur`, never inline (#1003).
 *
 * All `--faction-ua-*` tokens; #851's guard forbids a theme ternary in this
 * file, prose included. The design's gold border maps to the accent (UA has no
 * gold, #848) — not `--faction-ua-card-frame`, which is praxis-card-only.
 * No forfeit, no duel clock (#1071).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CSSProperties, ReactNode } from "react";
import { mediaUrl } from "../../../utils/media";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";
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

const SHEET = "var(--leaf-edit-praxis-paper)";
/* Banner ink: neutral `--color-danger` misses AA on this sheet (#1231). */
const ALARM = "var(--faction-ua-card-alarm)";
const FIELD = "var(--faction-ua-panel)";
const INK = "var(--leaf-edit-praxis-ink)";
const BODY = "var(--faction-ua-card-body)";
/* The quiet tier is `-card-body`, not `-card-muted`: muted misses AA on the
 * lotus/ensō wash in both themes (#2485). */
const ACCENT = "var(--leaf-edit-praxis-accent)";
const RULE = "var(--faction-ua-rule)";
const HAIR = "var(--faction-ua-hair)";
const FILL = "var(--leaf-edit-praxis-fill)";
const ON_FILL = "var(--leaf-edit-praxis-on-fill)";

const RADIUS = 7;
const BORDER_WIDTH = 2;

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

  /* Ornament geometry in raw px (§4a). */
  const groundGeometry = sizes.isMobile
    ? { lotus: 300, lotusLeft: -122, lotusTop: -94, enso: 208, ensoRight: -66, ensoBottom: -58 }
    : { lotus: 420, lotusLeft: -170, lotusTop: -130, enso: 300, ensoRight: -96, ensoBottom: -84 };

  /* The shared hairline in UA's ink (the default is `na`'s). For the waiting
   * dress; this page draws it once above the footer (#1707). */
  const rule = <ComposerRule style={{ background: HAIR }} />;

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

  /* Shared by composer and waiting surface (#1189) so the stages can't drift. */
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
      /* Must follow the `border` shorthand, which would erase it (#1706). */
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
    /* Role map on the composer root (#2673), so the constants resolve. */
    pageStyle: { ...factionBodyVars("ua"), ...factionRoleVars("ua", "leaf-edit-praxis"), fontFamily: UA_TEXT, color: INK },
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

  /* Your part is in: the waiting stage (ADR-0059). */
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
        <ComposerStatusRow
          status={t("editPraxis.composer.statusDraft")}
          statusStyle={dress.statusStyle}
        />

        <TaskSlip praxis={praxis} task={task} {...slip} />

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

        {state.showInviteBox && (
          <ComposerSection
            label={
              // The roster labels itself (#1416); only the duel needs a label.
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
                /* The sheet's own quiet tier (#2267). */
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

        {/* No heading (#2085); the editor's name comes from
            `bodyContentAttributes`. */}
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
          {/* One at a time: a hidden textarea is still a tab stop. */}
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
                pickFromGooglePhotos={state.pickFromGooglePhotos}
                skin={{
                  buttonStyle: composerLabelStyle({
                    fontFamily: UA_TEXT,
                    cursor: "pointer",
                    /* Translucent so the ground shows through (#1828). */
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

        {/* [Cancel] … [Submit] (#646), the cast as a full-bleed band. */}
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
                    fontSize: "var(--text-xl)",
                    /* Design says 500, but EB Garamond loads at 400/600 only and
                       500 would resolve DOWN to 400 (#1294). */
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
          // Deliberate (#2597): EB Garamond ships 400/600; dropping this
          // would render the control at 400.
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
