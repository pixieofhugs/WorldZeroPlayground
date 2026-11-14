/**
 * The Singularity edit-praxis composer (#1186): a terminal session — window
 * bar with lamps and a process name, standing raster plus travelling scan band,
 * dashed hairlines, a blinking block cursor after Submit. Layout, controls and
 * copy are shared (ADR-0065); this file is dress only.
 *
 * `praxis.proc` and `[ok]` are untranslated ornament inside `aria-hidden`
 * chrome, kept as module constants so `i18next/no-literal-string` passes.
 *
 * All `--faction-singularity-term-*` tokens except the lamps (`SingularityLamps`,
 * theme-invariant, #1979) and `SingularityProcessLight` (#2092). The chassis
 * stays black and the cascade flips the phosphor: no `dark ?`, no hex.
 * `-term-dim` misses AA on the raster+scan composite (#2485): see {@link MUTED}.
 *
 * Motion is class-only behind `prefers-reduced-motion` (#1003). The sweep is
 * `.sg-scan`, not `.ep-sweep`: a % translate resolves against the 38px band,
 * not the sheet. No forfeit, no duel clock (#1071).
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
import { factionBodyVars } from "../../../utils/factionBodyFace";

interface Props {
  state: EditPraxisState;
}

const CHASSIS = "var(--faction-singularity-term-bg)";
/* Banner ink: neutral `--color-danger` misses AA on this sheet (#1231). */
const ALARM = "var(--faction-singularity-card-alarm)";
const CHROME = "var(--faction-singularity-term-chrome)";
const PANEL = "var(--faction-singularity-term-panel)";
const INK = "var(--faction-singularity-term-ink)";
const ACCENT = "var(--faction-singularity-term-bright)";
/**
 * PANEL INK ONLY (#2485): AA on the flat chassis, but 4.12 / 4.20 on the
 * raster+scan composite. Anything straight on the chassis takes {@link INK};
 * `MUTED` is for the opaque panel and window bar.
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

/* Share Tech Mono: one face for the whole surface. */
const FACE = "var(--sg-compose-face)";

const RADIUS = 2;

/* Ornament, not copy — see the header. */
const PROC_NAME = "praxis.proc";
const STATUS_MARK = "[ok]";

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

  /* Drawn ONCE, above the footer (#1707). */
  const hairRule = (
    <ComposerRule
      style={{
        height: 0,
        background: "none",
        borderTop: `1px dashed ${HAIR}`,
      }}
    />
  );

  /* Shared by composer and waiting surface (#1189) so the stages can't drift. */
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
        fontSize: "var(--text-content)",
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
      /* Must follow the `border` shorthand, which would erase it (#1706). */
      borderLeft: `2px solid ${ACCENT}`,
      borderRadius: RADIUS,
      padding: "var(--space-lg)",
      flexDirection: sizes.rowDirection,
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
          /* The window bar: aria-hidden chrome. */
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
                  /* Pushes the process light right; the mark takes no props. */
                  marginRight: "auto",
                })}
              >
                {PROC_NAME}
              </span>
              <SingularityProcessLight />
            </div>
          </ComposerMasthead>
  );
  const ground = (
          /* Fixed raster at inset 0; the band overhangs sideways so its soft
             ends never show at the sheet's edges. */
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
    // Root of both stages, so it reaches everything (#2675); the breadcrumb
    // reads `--color-*` only, so it is unaffected (#2102).
    //
    // `--label-ink` (#2831): `.label-*` and CodeMirror's `.cm-placeholder`
    // read it; unset, the global tertiary is 1.81:1 on this chassis in light.
    // INK, not MUTED (see {@link MUTED}); `index.css` steps the placeholder
    // back to MUTED on the panel. Same repoint as Ephemerists (#1800).
    pageStyle: {
      ...factionBodyVars("singularity"), ...factionRoleVars("singularity", "sg-compose"),
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
      <ComposerSheet
        sizes={sizes}
        style={sheetStyle}
        masthead={masthead}
        ground={ground}
      >
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
              inputStyle: { ...fieldBox, color: ACCENT },
            }}
          />
        </ComposerSection>

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

        {state.showInviteBox && (
          <ComposerSection
            label={
              // The roster labels itself (#1416); only the duel needs a label.
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
                /* INK: these chips sit on transparent, i.e. the chassis
                 * composite `-term-dim` misses (#2485). */
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
          {/* One at a time: a hidden textarea is still a tab stop. */}
          {tab === "write" ? (
            <BodyTextarea
              praxis={praxis}
              controlsLocked={state.controlsLocked}
              setBody={state.setBody}
              proposalConfirmArmed={state.proposalConfirmArmed}
              confirmProposalEdit={state.confirmProposalEdit}
              skin={{
                /* Re-points the disabled pair so a locked field isn't a pale
                   slab on the black chassis (#2574). Not `sg-control-off`,
                   which is the band's ground. Inert until `aria-disabled`. */
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
                pickFromGooglePhotos={state.pickFromGooglePhotos}
                skin={{
                  buttonStyle: termLabel({
                    cursor: "pointer",
                    /* Translucent so the scanline shows through (#1828). */
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
                /* Re-points the disabled pair to the terminal's panel/dim
                   (#2573): the house off-white would be the loudest thing on
                   the black chassis. Inert until `:disabled`. */
                className: "sg-control-off",
                idleLabel: t("editPraxis.composer.submit"),
                busyLabel: t("editPraxis.composer.submitBusy"),
                // Class, not inline `animation:`, for reduced motion (#1003).
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
                    fontFamily: FACE,
                    fontSize: "var(--text-xl)",
                    letterSpacing: "0.1em",
                    frame: BORDER,
                    color: CTA_INK,
                    background: CTA_BG,
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
