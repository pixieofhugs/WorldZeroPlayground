/**
 * Unaffiliated (`default` ≡ `na` ≡ Albescent) composer (#1181) — the REFERENCE
 * layout every faction skin inherits (ADR-0065). Albescent renders this whole
 * and passes one `ornament` (#2505).
 *
 * Layout: status row → task slip → Title → mode → roster/duel → Write-up →
 * Proof → footer (`[Cancel] … [Submit]`, #646). Regions come from `shared.tsx`;
 * a skin varies only dress. One rule, above the footer (#1707); sections are
 * parted by `ComposerSheet`'s gap. One responsive tree (ADR-0065 §2).
 *
 * Copy is the neutral `editPraxis.composer.*` set (ADR-0065 §3). Dress is
 * `--faction-default-*` tokens only. `ep-drift` is a class so the
 * reduced-motion guard applies (#1003).
 *
 * "Forfeit the duel" and the duel clock are not drawn (#1071 decisions 3–4,
 * ADR-0011 §Forfeit).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mediaUrl } from "../../../utils/media";
import {
  factionSpectrumSheet,
} from "../../../utils/factions";
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
  RingMark,
  TaskSlip,
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
  /**
   * One ornament layer INSIDE the sheet, so its `overflow: clip` keeps it off
   * the viewport (#1028). Rides the `ground` slot after the aurora: above the
   * wash, below content, no z-index. Not used by the waiting stage.
   */
  ornament?: React.ReactNode;
}

/* Named for the design ROLE, not the colour; `ink` doubles as `accent`. */
const SHEET = "var(--na-edit-praxis-paper)";
/* Error ink (#1231): neutral `--color-danger` misses AA here in light (4.41:1). */
const ALARM = "var(--faction-default-card-alarm)";
const FIELD = "var(--faction-default-composer-field)";
const INK = "var(--na-edit-praxis-ink)";
/* Tiers split by GROUND, not loudness (#2485): FAINT (4.72/4.71 on the aurora
 * composite) is the LOUDER one, for type on the washed sheet; MUTED is for the
 * opaque field (6.05/5.23). Pick by what is behind the type. */
const MUTED = "var(--na-edit-praxis-quiet)";
const FAINT = "var(--faction-default-composer-faint)";
const BORDER = "var(--faction-default-border)";
const HAIR = "var(--faction-default-composer-hair)";
const ON_ACCENT = "var(--faction-default-on-accent)";
const RING = "var(--faction-default-rainbow-conic)";

/* Title/body face is Lora (--font-display); labels are --font-body (Courier
 * Prime) via composerLabelStyle. The names read backwards on purpose. */
const TITLE_FACE = "var(--font-display)";

const labelStyle = { color: FAINT };
const panelStyle = {
  background: FIELD,
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
};
const primaryStyle = composerLabelStyle({
  border: "none",
  borderRadius: 10,
  padding: "var(--space-md) var(--space-xl)",
  color: ON_ACCENT,
  background: INK,
  fontWeight: 700,
});

/* One element for both the composer and the waiting surface (#1189). */
const ground = (
  <ComposerGround
    background="var(--faction-default-aurora)"
    opacity="var(--faction-default-aurora-opacity)"
    filter="var(--faction-default-aurora-filter)"
    mixBlendMode="var(--faction-default-aurora-blend)"
    animated
  />
);
/* The frame is the spectrum (#2520): transparent border, ramp in the border box
   via the helper (it must append to all three background lists). The sheet's
   clip is at the padding box, so the aurora can't paint over the frame. */
const sheetStyle = {
  border: "3px solid transparent",
  ...factionSpectrumSheet(),
  boxShadow: "0 16px 40px -24px var(--color-cast-shadow)",
};
const statusMark = (
  <RingMark size={44} inset={5} ring={RING} inner={FIELD} spin />
);
const slip = {
  style: {
    background: FIELD,
    /* No left ink bar on na (#2520); dressed skins keep theirs. */
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: "var(--space-lg)",
  },
  labelStyle: { color: FAINT },
  titleStyle: { fontFamily: TITLE_FACE, fontStyle: "italic", color: INK },
  descriptionStyle: { color: MUTED },
  pillStyle: { color: MUTED },
} as const;

/** na's dress for `PraxisWaitingSurface`; exported so tests use a real dress. */
export const DEFAULT_COMPOSER_DRESS: ComposerDress = {
  accent: INK,
  alarm: ALARM,
  /* Role map (#2672) on `pageStyle`, which both stages mount. Pinned to na:
     the aurora ground takes no slug, so the ink can't either (#2361). */
  pageStyle: {
    ...factionRoleVars("na", "na-edit-praxis"),
    fontFamily: TITLE_FACE,
    color: INK,
  },
  sheetStyle,
  ground,
  rule: () => <ComposerRule style={{ background: HAIR }} />,
  mark: statusMark,
  statusStyle: { color: INK, fontWeight: 700 },
  metaStyle: { color: FAINT },
  labelStyle,
  slip,
  panelStyle,
  headingStyle: { fontFamily: TITLE_FACE, color: INK },
  /* Drawn inside `panelStyle` (opaque field), so MUTED. */
  bodyStyle: { color: MUTED },
  quietStyle: { color: FAINT },
  primaryStyle,
  quietButtonStyle: { color: FAINT },
};

export default function DefaultEditPraxis({ state, ornament }: Props) {
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
    background: FIELD,
    color: INK,
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: "var(--space-md)",
    boxSizing: "border-box",
  } as const;
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
        dress={DEFAULT_COMPOSER_DRESS}
      />
    );
  }

  return (
    <ComposerPage
      sizes={sizes}
      style={DEFAULT_COMPOSER_DRESS.pageStyle}
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
        ground={
          ornament ? (
            <>
              {ground}
              {ornament}
            </>
          ) : (
            ground
          )
        }
      >
        <ComposerStatusRow
          status={t("editPraxis.composer.statusDraft")}
          statusStyle={DEFAULT_COMPOSER_DRESS.statusStyle}
        />

        <TaskSlip praxis={praxis} task={task} {...slip} />

        {/* No visible label (#2179); `TitleField` owns placeholder + a11y name. */}
        <ComposerSection rule={false}>
          <TitleField
            title={state.title}
            setTitle={state.setTitle}
            skin={{
              placeholder: t("editPraxis.composer.titlePlaceholder"),
              inputStyle: {
                ...fieldBox,
                fontFamily: TITLE_FACE,
                fontStyle: "italic",
              },
            }}
          />
        </ComposerSection>

        {/* Hidden, not disabled, once the mode is locked. */}
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
                      cursor: disabled ? "not-allowed" : "pointer",
                      padding: "var(--space-sm) var(--space-lg)",
                      borderRadius: 999,
                      background: active ? INK : FIELD,
                      color: active ? ON_ACCENT : MUTED,
                      border: `1px solid ${active ? INK : BORDER}`,
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
              // The roster labels itself (#1416); only the duel needs one.
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
                fontFamily: TITLE_FACE,
                inputBg: FIELD,
                inputColor: INK,
                inputBorder: `1px solid ${BORDER}`,
                dropdownBg: SHEET,
                dropdownBorder: `1px solid ${BORDER}`,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { color: FAINT },
                /* FAINT: the `+ invite` chip is transparent, on the washed
                 * sheet (#2485). Handing it in stops it reading the TASK's
                 * faction (#2269). */
                collab: { radius: 10, quiet: FAINT },
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

        {/* Write-up: no heading (#2085); meta row is autosave + tabs, and wraps
            on phones. The editor names itself (`bodyContentAttributes`). */}
        <ComposerSection
          rule={false}
          labelStyle={labelStyle}
          meta={
            <span style={composerMetaCluster}>
              <span style={{ color: FAINT }}>
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
                      padding: "var(--space-xs) var(--space-sm)",
                      borderRadius: 999,
                      border: `1px solid ${active ? BORDER : "transparent"}`,
                      background: active ? FIELD : "transparent",
                      color: active ? INK : FAINT,
                    }),
                }}
              />
            </span>
          }
        >
          {/* One panel at a time: a hidden textarea is still a tab stop. */}
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
                  fontFamily: TITLE_FACE,
                },
              }}
            />
          ) : (
            <BodyPreview
              body={state.body}
              skin={{
                wrapperStyle: {
                  ...fieldBox,
                  minHeight: 180,
                },
                markdownStyle: { fontFamily: TITLE_FACE, lineHeight: 1.7, color: INK },
                emptyState: (
                  <p
                    style={{
                      fontFamily: TITLE_FACE,
                      fontStyle: "italic",
                      fontSize: "var(--text-content)",
                      color: FAINT,
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
                pickFromGooglePhotos={state.pickFromGooglePhotos}
                skin={{
                  buttonStyle: composerLabelStyle({
                    cursor: "pointer",
                    /* Translucent, so the aurora reads through it (#1828). */
                    background: composerDropGround(FIELD),
                    border: `1px dashed ${BORDER}`,
                    borderRadius: 10,
                    padding: "var(--space-2xl) var(--space-lg)",
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    /* On the aurora, so FAINT (#2485). */
                    color: FAINT,
                  }),
                  helperText: t("editPraxis.composer.proofHelper"),
                  helperStyle: {
                    fontFamily: TITLE_FACE,
                    fontStyle: "italic",
                    fontSize: "var(--text-content)",
                    color: FAINT,
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

        <ComposerFooter
          start={
            <>
              <SaveDraftButton
                controlsLocked={state.controlsLocked}
                submitting={state.submitting}
                switchingMode={state.switchingMode}
                saveDraft={state.saveDraft}
                skin={{ style: { color: FAINT } }}
              />
              <DropButton
                praxis={praxis}
                currentCharacterId={state.currentCharacterId}
                cancel={state.cancel}
                skin={{
                  style: composerLabelStyle({
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    color: FAINT,
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

function MediaTile({ children, caption, onRemove }: MediaTileProps) {
  const { t } = useTranslation("forms");
  return (
    <div
      style={{
        position: "relative",
        background: FIELD,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
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
          border: `1px solid ${BORDER}`,
          color: INK,
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
