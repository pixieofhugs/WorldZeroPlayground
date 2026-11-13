/**
 * Warriors of Whimsy — THE WRIT, WOW's edit-praxis composer (#1183): barber
 * ribbon, gilt frame, one zigzag rule, balloons on the ground. Layout,
 * controls and copy are shared (ADR-0065); this file is dress only. Every
 * ornament comes from `factionMarks/wowOrnament.tsx` (#849).
 *
 * Lora is the label face here, so every label style passes `fontFamily`.
 *
 * Load-bearing pairings (§3):
 * - The gilt `--faction-wow-chronicle-gold` is theme-invariant and never ink
 *   (2.24:1 on cream). Gold to be read uses `--faction-wow-stamp-total`; ink
 *   on the gold fill is `--faction-wow-on-gold`.
 * - `--faction-wow-card-muted` passes on the cream but not the panel; quiet
 *   text on a field takes `--faction-wow-accent-deep`. That's also why the
 *   task slip sits on cream.
 *
 * Motion is class-only behind `prefers-reduced-motion` (#1003). No forfeit,
 * no duel clock (#1071).
 */
import { useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import MediaArt from "../blocks/MediaArt";
import { pickArtKey } from "../blocks/useMediaArt";
import { BalloonBunch, Zig } from "../../../components/factionMarks/wowOrnament";
import {
  ComposerFooter,
  ComposerGround,
  ComposerMasthead,
  ComposerPage,
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
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";
import Breadcrumb from "../../../components/nav/Breadcrumb";

interface Props {
  state: EditPraxisState;
}

/** MedievalSharp, via the role map (#2674). */
const MED = "var(--wow-edit-praxis-face)";
const LORA = "var(--faction-wow-body-font)";

const SHEET = "var(--wow-edit-praxis-paper)";
/* Banner ink: neutral `--color-danger` misses AA on this sheet (#1231). */
const ALARM = "var(--faction-wow-card-alarm)";
const FIELD = "var(--faction-wow-chronicle-panel)";
const INK = "var(--wow-edit-praxis-ink)";
/** Quiet ink, CREAM ONLY (see header). */
const MUTED = "var(--wow-edit-praxis-quiet)";
/** Quiet ink for anything on {@link FIELD}, incl. the waiting surface's
 *  `bodyStyle`/`quietStyle` inside `panelStyle` (#1232). */
const PANEL_QUIET = "var(--faction-wow-accent-deep)";
/** Measured on both chronicle grounds. */
const LABEL = "var(--faction-wow-accent-deep)";
/** Plum as ink; flips with the theme. */
const PLUM = "var(--wow-edit-praxis-accent)";
/** Plum as a surface; theme-invariant. */
const PLUM_FILL = "var(--faction-wow-plum-surface)";
const ON_PLUM = "var(--faction-wow-on-plum)";
/** Theme-invariant, never an ink. */
const GOLD = "var(--faction-wow-chronicle-gold)";
/** The quiet gilt (#1830): edges that only suggest a plate (inactive chip,
 *  drop zone). Solid {@link GOLD} for real plates. */
const RULE = "var(--faction-wow-rule)";
const GOLD_INK = "var(--faction-wow-stamp-total)";
const ON_GOLD = "var(--faction-wow-on-gold)";

const RIBBON = "var(--faction-wow-quest-ribbon)";
const SHEET_SHADOW = "var(--faction-wow-detail-shadow)";

/** Balloon geometry in raw px (§4a), lifted clear of the cast band (#1830). */
const ORNAMENT = {
  desktop: { bunch: 96, bottom: 76 },
  mobile: { bunch: 66, bottom: 66 },
} as const;

const LABEL_STYLE: CSSProperties = { fontFamily: LORA, color: LABEL };

/** Lora italic, sentence case: overrides `composerLabelStyle`'s uppercasing. */
const QUIET_STYLE: CSSProperties = {
  fontFamily: LORA,
  fontStyle: "italic",
  textTransform: "none",
  letterSpacing: "0.02em",
  /* Plate ink: also used as `quietStyle` inside `panelStyle`. */
  color: PANEL_QUIET,
};

export default function WowEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
  const sizes = useComposerSizes();
  const ornament = ORNAMENT[sizes.isMobile ? "mobile" : "desktop"];
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
    background: FIELD,
    color: INK,
    border: `1.5px solid ${GOLD}`,
    borderRadius: 6,
    padding: "var(--space-md)",
    boxSizing: "border-box",
  } as const;

  /* Shared by composer and waiting surface (#1189) so the stages can't drift. */
  const sheetStyle = {
    background: SHEET,
    border: `1.5px solid ${GOLD}`,
    borderRadius: 6,
    boxShadow: SHEET_SHADOW,
  };
  const masthead = <ComposerMasthead background={RIBBON} height={7} />;
  const statusMark = (
    <span
      aria-hidden
      style={{
        fontFamily: MED,
        // eslint-disable-next-line local/no-raw-style-values -- ornament ✦ at its drawn optical size (§4a).
        fontSize: 34,
        lineHeight: 1,
        color: GOLD,
      }}
    >
      ✦
    </span>
  );
  const slip = {
    style: {
      background: SHEET,
      border: `1.5px solid ${GOLD}`,
      /* Must follow the `border` shorthand, which would erase it (#1706). */
      borderLeft: `2px solid ${PLUM}`,
      borderRadius: 6,
      padding: "var(--space-lg)",
    },
    labelStyle: LABEL_STYLE,
    titleStyle: { fontFamily: MED, color: INK },
    descriptionStyle: {
      fontFamily: LORA,
      fontStyle: "italic",
      color: MUTED,
    },
    pillStyle: LABEL_STYLE,
  } as const;
  const primaryStyle = composerLabelStyle({
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-sm)",
    fontFamily: MED,
    border: `1.5px solid ${GOLD_INK}`,
    borderRadius: 6,
    padding: "var(--space-md) var(--space-xl)",
    color: ON_GOLD,
    background: GOLD,
  });
  const ground = (
          <ComposerGround inset={0}>
            <BalloonBunch
              size={ornament.bunch}
              style={{
                position: "absolute",
                right: 10,
                bottom: ornament.bottom,
                opacity: 0.55,
              }}
            />
          </ComposerGround>
  );

  const dress: ComposerDress = {
    accent: PLUM,
    alarm: ALARM,
    pageStyle: {
      ...factionBodyVars("wow"), ...factionRoleVars("wow", "wow-edit-praxis"),
      fontFamily: LORA,
      color: INK,
    },
    sheetStyle,
    masthead,
    ground,
    rule: (key) => <Zig id={key} />,
    mark: statusMark,
    statusStyle: { fontFamily: MED, color: INK },
    metaStyle: QUIET_STYLE,
    labelStyle: LABEL_STYLE,
    slip,
    panelStyle: {
      background: FIELD,
      border: `1.5px solid ${GOLD}`,
      borderRadius: 6,
    },
    headingStyle: { fontFamily: MED, color: INK },
    /* Rendered on the plate (`panelStyle`), not the cream. */
    bodyStyle: { fontFamily: LORA, color: PANEL_QUIET },
    quietStyle: QUIET_STYLE,
    primaryStyle,
    quietButtonStyle: QUIET_STYLE,
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
              inputStyle: { ...fieldBox, fontFamily: MED },
            }}
          />
        </ComposerSection>

        {!state.controlsLocked && (
          <ComposerSection
            label={t("editPraxis.composer.modeLabel")}
            rule={false}
            labelStyle={LABEL_STYLE}
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
                      fontFamily: MED,
                      cursor: disabled ? "not-allowed" : "pointer",
                      padding: "var(--space-sm) var(--space-lg)",
                      borderRadius: 6,
                      background: active ? PLUM_FILL : FIELD,
                      color: active ? ON_PLUM : LABEL,
                      /* Solid gilt only when active (#1830). */
                      border: `1.5px solid ${active ? GOLD : RULE}`,
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
            labelStyle={LABEL_STYLE}
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
                fontFamily: LORA,
                inputBg: FIELD,
                inputColor: INK,
                inputBorder: `1.5px solid ${GOLD}`,
                dropdownBg: SHEET,
                dropdownBorder: `1.5px solid ${GOLD}`,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { fontFamily: LORA, color: LABEL },
                /* This IS the card sheet, so the roster keeps its `card-*`
                 * inks (#694). */
                collab: { radius: 6, quiet: MUTED },
              }}
            />
          </ComposerSection>
        )}

        {state.showSealStack && (
          <ComposerSection
            label={t("editPraxis.composer.metatasksLabel")}
            rule={false}
            labelStyle={LABEL_STYLE}
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
          labelStyle={LABEL_STYLE}
          meta={
            <span style={composerMetaCluster}>
              <span style={composerLabelStyle(QUIET_STYLE)}>
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
                      fontFamily: MED,
                      padding: "var(--space-xs) var(--space-sm)",
                      borderRadius: 6,
                      border: `1.5px solid ${active ? GOLD : "transparent"}`,
                      background: active ? FIELD : "transparent",
                      color: active ? INK : LABEL,
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
                  background: FIELD,
                  color: INK,
                  border: `1.5px solid ${GOLD}`,
                  borderRadius: 6,
                  fontFamily: LORA,
                },
                textareaStyle: {
                  ...fieldBox,
                  resize: "vertical",
                  minHeight: 200,
                  lineHeight: 1.7,
                  fontFamily: LORA,
                },
              }}
            />
          ) : (
            <BodyPreview
              body={state.body}
              skin={{
                wrapperStyle: {
                  ...fieldBox,
                  minHeight: 200,
                  padding: "var(--space-lg)",
                },
                markdownStyle: {
                  fontFamily: LORA,
                  lineHeight: 1.7,
                  color: INK,
                },
                emptyState: (
                  <p
                    style={{
                      fontFamily: LORA,
                      fontStyle: "italic",
                      fontSize: "var(--text-content)",
                      // On the panel: MUTED would be 4.25:1.
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
          labelStyle={LABEL_STYLE}
        >
          <div
            style={{
              display: "flex",
              gap: "var(--space-lg)",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {state.media.map((item) => {
              const filename = item.file_path.split("/").pop() ?? item.file_path;
              const src = mediaUrl(item.file_path);
              return (
                <ProofTile
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
                </ProofTile>
              );
            })}
            {!state.controlsLocked && (
              <FilePicker
                fileError={state.fileError}
                handleFileChange={state.handleFileChange}
                pickFromGooglePhotos={state.pickFromGooglePhotos}
                skin={{
                  buttonStyle: composerLabelStyle({
                    fontFamily: MED,
                    cursor: "pointer",
                    /* Translucent (#1828); quiet gilt, not a plate (#1830). */
                    background: composerDropGround(FIELD),
                    border: `1.5px dashed ${RULE}`,
                    borderRadius: 6,
                    padding: "var(--space-2xl) var(--space-lg)",
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    color: LABEL,
                  }),
                  helperText: t("editPraxis.composer.proofHelper"),
                  helperStyle: {
                    fontFamily: LORA,
                    fontStyle: "italic",
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

        <ErrorBanner message={state.error} style={{ color: ALARM }} />

        <Zig id="footer" />

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
                skin={{ style: { fontFamily: LORA, color: LABEL } }}
              />
              <DropButton
                praxis={praxis}
                currentCharacterId={state.currentCharacterId}
                cancel={state.cancel}
                skin={{
                  style: composerLabelStyle({
                    fontFamily: LORA,
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
                trailingOrnament: <span aria-hidden>✦</span>,
                style: {
                  ...composerBandStyle(sizes, {
                    /* The one control in the display face, per design. */
                    fontFamily: MED,
                    fontSize: "var(--text-content)",
                    letterSpacing: "0.14em",
                    frame: GOLD,
                    color: ON_GOLD,
                    background: GOLD,
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

interface ProofTileProps {
  children: React.ReactNode;
  caption: string;
  onRemove: () => void;
}

function ProofTile({ children, caption, onRemove }: ProofTileProps) {
  const { t } = useTranslation("forms");
  return (
    <div
      style={{
        position: "relative",
        background: FIELD,
        border: `1.5px solid ${GOLD}`,
        borderRadius: 6,
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
          background: PLUM_FILL,
          border: `1px solid ${GOLD}`,
          color: ON_PLUM,
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
