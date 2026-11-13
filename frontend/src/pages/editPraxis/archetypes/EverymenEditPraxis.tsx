/**
 * The Everymen edit-praxis composer (#1187): the union's WORK ORDER — red
 * masthead plate between counter-rotating cogs, ray burst, one dashed rule,
 * full-width report bar. Bebas Neue for labels, Courier Prime for reading.
 * Layout, controls and copy are shared (ADR-0065); this file is dress only.
 * The masthead shows the faction NAME, not the design's faction-voice words.
 *
 * Red as ink only on `--faction-everymen-sheet-panel` (measured there);
 * on `--everymen-paper` it pays 4.49:1, so there it is rule/fill/stamp only.
 *
 * Cogs spin via CSS classes behind `prefers-reduced-motion` (#1003); never an
 * inline `animation:`. "Forfeit the duel" and the duel clock are deliberately
 * not drawn (#1071).
 */
import { useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import { factionName } from "../../../utils/factions";
import MediaArt from "../blocks/MediaArt";
import { pickArtKey } from "../blocks/useMediaArt";
import {
  ComposerFooter,
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
import { EverymenCog } from "../../../components/factionMarks/everymenCogs";
import { MetataskSealStack } from "../../../components/metataskSeal/MetataskSealStack";
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";
import Breadcrumb from "../../../components/nav/Breadcrumb";
import { factionRoleVars } from "../../../utils/factionRoles";
import { factionBodyVars } from "../../../utils/factionBodyFace";

interface Props {
  state: EditPraxisState;
}

const PAPER = "var(--everymen-paper)";
/* Banner ink: neutral `--color-danger` misses AA on this paper (#1231). */
const ALARM = "var(--faction-everymen-card-alarm)";
const PANEL = "var(--faction-everymen-sheet-panel)";
/** Flips with the paper; not `--everymen-ink`. */
const INK = "var(--everymen-paper-text)";
/* `-quiet`, not `-muted`: muted misses AA on the `.em-burst` wash in light
 * (#2485). Aliases muted in dark. */
const MUTED = "var(--everymen-quiet)";
/** Red as rule/fill. For red text see {@link ACCENT}. */
const RED = "var(--everymen-red)";
/** Red as ink: AA only on {@link PANEL}, never on {@link PAPER}. */
const ACCENT = "var(--faction-everymen-sheet-accent)";
const ON_ACCENT = "var(--faction-everymen-on-accent)";
/** Not `--everymen-ink`, which vanishes in dark. */
const FRAME = "var(--everymen-frame)";
const SHEET_FRAME = "var(--faction-everymen-composer-frame)";
/** Theme-invariant. */
const MAST = "var(--faction-everymen-bill-mast)";
const MAST_INK = "var(--faction-everymen-bill-mast-ink)";
const BAR = "var(--faction-everymen-bill-cta-bg)";
const BAR_INK = "var(--faction-everymen-bill-cta-ink)";
const PAPER_DEEP = "var(--everymen-paper-deep)";
const SHADOW = "var(--faction-everymen-bill-shadow)";

const BEBAS = "var(--ev-compose-face)"; /* Bebas Neue */
const COURIER = "var(--faction-everymen-body-font)"; /* Courier Prime */

/** The design's cog period (#1830). */
const COG_PERIOD = "22s";

export default function EverymenEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
  const sizes = useComposerSizes();
  const [tab, setTab] = useState<ComposerTab>("write");
  const praxis = state.praxis!;
  const task = state.task;
  const slug = task?.primary_faction_slug ?? praxis.task_faction_slug;

  const modeOptions: Array<{ key: PraxisType; label: string }> = [
    { key: "solo", label: t("editPraxis.composer.modeSolo") },
    { key: "collab", label: t("editPraxis.composer.modeCollab") },
    { key: "duel", label: t("editPraxis.composer.modeDuel") },
  ];

  /** Bebas tracked caps. The design's 13px label (one size above the other
   *  kits, #1828) rounds up to --text-xl; 0.2em tracking per design (#1830). */
  const stencil = (overrides: CSSProperties = {}): CSSProperties =>
    composerLabelStyle({
      fontFamily: BEBAS,
      fontSize: "var(--text-xl)",
      letterSpacing: "0.2em",
      ...overrides,
    });

  const fieldBox = {
    width: "100%",
    background: PANEL,
    color: INK,
    border: `2px solid ${FRAME}`,
    borderRadius: 0,
    padding: "var(--space-md)",
    boxSizing: "border-box",
  } as const;

  /** Drawn ONCE, above the footer (#1707); regions are separated by gap. */
  const dashRule = (
    <ComposerRule
      style={{ height: 0, background: "transparent", borderTop: `2px dashed ${RED}` }}
    />
  );

  /* Shared by composer and waiting surface (#1189) so the stages can't drift. */
  const sheetStyle = {
    background: PAPER,
    border: `2px solid ${SHEET_FRAME}`,
    borderRadius: 0,
    boxShadow: SHADOW,
  };
  /* Waiting hero mark: sheet accent, turning forward (#1830). A mark, not
     type, so the accent's 4.49:1 on paper doesn't govern it. */
  const statusMark = (
    <EverymenCog
      size={40}
      fill={ACCENT}
      hub={PANEL}
      spin="forward"
      duration={COG_PERIOD}
    />
  );
  const slip = {
    style: {
      background: PANEL,
      border: `2px solid ${FRAME}`,
      /* Must follow the `border` shorthand, which would erase it (#1706). */
      borderLeft: `2px solid ${ACCENT}`,
      borderRadius: 0,
      padding: "var(--space-lg)",
    },
    labelStyle: stencil({ color: ACCENT }),
    titleStyle: {
      fontFamily: BEBAS,
      textTransform: "uppercase" as const,
      letterSpacing: "0.01em",
      lineHeight: 0.96,
      color: INK,
    },
    descriptionStyle: { fontFamily: COURIER, color: MUTED },
    pillStyle: stencil({ color: ACCENT, borderRadius: 0 }),
  };
  /* A button, not the full-bleed bar: the bar is reserved for the cast. */
  const primaryStyle = stencil({
    background: BAR,
    color: BAR_INK,
    border: "none",
    borderRadius: 0,
    padding: "var(--space-md) var(--space-xl)",
    letterSpacing: "0.22em",
    textAlign: "center",
  });
  const masthead = (
          <ComposerMasthead
            background={MAST}
            style={{
              height: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-sm)",
              padding: sizes.isMobile
                ? "var(--space-sm) var(--space-lg)"
                : "var(--space-md) var(--space-lg)",
              borderBottom: `3px double ${BAR}`,
              boxShadow: `inset 0 -6px 0 -4px ${PAPER_DEEP}`,
            }}
          >
            <EverymenCog size={16} fill={MAST_INK} hub={MAST} spin="forward" duration={COG_PERIOD} />
            <span
              style={{
                fontFamily: BEBAS,
                fontSize: "var(--text-content)",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                lineHeight: 1,
                color: MAST_INK,
              }}
            >
              {factionName(slug)}
            </span>
            <EverymenCog size={16} fill={MAST_INK} hub={MAST} spin="reverse" duration={COG_PERIOD} />
          </ComposerMasthead>
  );
  const ground = (
          /* The faction's one shared ornament (#2195). Not a `ComposerGround`:
             `.em-burst` already positions itself inset-0, pointer-events none. */
          <div aria-hidden className="em-burst" />
  );

  const dress: ComposerDress = {
    accent: ACCENT,
    alarm: ALARM,
    // Root of both stages, so the role map reaches everything (#2676).
    pageStyle: {
      ...factionBodyVars("everymen"), ...factionRoleVars("everymen", "ev-compose"),
      fontFamily: COURIER,
      color: INK,
    },
    sheetStyle,
    masthead,
    ground,
    rule: () => dashRule,
    mark: statusMark,
    statusStyle: stencil({ color: INK }),
    metaStyle: { color: MUTED },
    labelStyle: stencil({ color: INK }),
    slip,
    panelStyle: {
      background: PANEL,
      border: `2px solid ${FRAME}`,
      borderRadius: 0,
    },
    headingStyle: {
      fontFamily: BEBAS,
      textTransform: "uppercase",
      letterSpacing: "0.01em",
      color: INK,
    },
    bodyStyle: { fontFamily: COURIER, color: MUTED },
    quietStyle: { fontFamily: COURIER, color: MUTED },
    primaryStyle,
    quietButtonStyle: stencil({ color: MUTED }),
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
              inputStyle: {
                ...fieldBox,
                fontFamily: BEBAS,
                letterSpacing: "0.02em",
              },
            }}
          />
        </ComposerSection>

        {!state.controlsLocked && (
          <ComposerSection
            label={t("editPraxis.composer.modeLabel")}
            rule={false}
            labelStyle={stencil({ color: INK })}
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
                    /* Active = the kit's CTA fill, not a red block (#1830). */
                    style={stencil({
                      cursor: disabled ? "not-allowed" : "pointer",
                      padding: "var(--space-sm) var(--space-lg)",
                      borderRadius: 0,
                      background: active ? BAR : PANEL,
                      color: active ? BAR_INK : INK,
                      border: `2px solid ${active ? BAR : FRAME}`,
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
            labelStyle={stencil({ color: INK })}
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
                fontFamily: COURIER,
                inputBg: PANEL,
                inputColor: INK,
                inputBorder: `2px solid ${FRAME}`,
                dropdownBg: PANEL,
                dropdownBorder: `2px solid ${FRAME}`,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { color: MUTED },
                /* Square chips, like every other plate. */
                collab: { radius: 0, quiet: MUTED },
              }}
            />
          </ComposerSection>
        )}

        {state.showSealStack && (
          <ComposerSection
            label={t("editPraxis.composer.metatasksLabel")}
            rule={false}
            labelStyle={stencil({ color: INK })}
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
          labelStyle={stencil({ color: INK })}
          meta={
            <span style={composerMetaCluster}>
              <span
                style={stencil({
                  color: MUTED,
                  fontFamily: COURIER,
                  letterSpacing: "0.12em",
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
                    stencil({
                      padding: "var(--space-xs) var(--space-sm)",
                      borderRadius: 0,
                      border: `2px solid ${active ? FRAME : "transparent"}`,
                      background: active ? PANEL : "transparent",
                      color: active ? INK : MUTED,
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
                  background: PANEL,
                  color: INK,
                  border: `2px solid ${FRAME}`,
                  borderRadius: 0,
                  fontFamily: BEBAS,
                },
                textareaStyle: {
                  ...fieldBox,
                  resize: "vertical",
                  minHeight: 200,
                  lineHeight: 1.6,
                  fontFamily: COURIER,
                  padding: "var(--space-md) var(--space-lg)",
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
                  padding: "var(--space-md) var(--space-lg)",
                },
                markdownStyle: { fontFamily: COURIER, lineHeight: 1.6, color: INK },
                emptyState: (
                  <p
                    style={{
                      fontFamily: COURIER,
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
          labelStyle={stencil({ color: INK })}
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
                <ProofSlip
                  key={item.id}
                  caption={filename}
                  onRemove={() => void state.removeMedia(item)}
                >
                  {item.type === "image" ? (
                    <img
                      src={src}
                      alt=""
                      style={{ width: "100%", height: 104, objectFit: "cover" }}
                    />
                  ) : item.type === "video" ? (
                    <video
                      src={src}
                      style={{ width: "100%", height: 104, objectFit: "cover" }}
                    />
                  ) : (
                    <MediaArt
                      art={pickArtKey(filename, "audio")}
                      width={128}
                      height={104}
                    />
                  )}
                </ProofSlip>
              );
            })}
            {!state.controlsLocked && (
              <FilePicker
                fileError={state.fileError}
                handleFileChange={state.handleFileChange}
                pickFromGooglePhotos={state.pickFromGooglePhotos}
                skin={{
                  buttonStyle: stencil({
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-sm)",
                    cursor: "pointer",
                    /* Translucent so the burst shows through (#1828). */
                    background: composerDropGround(PANEL),
                    border: `2px dashed ${RED}`,
                    borderRadius: 0,
                    padding: "var(--space-2xl) var(--space-lg)",
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    color: INK,
                  }),
                  helperText: t("editPraxis.composer.proofHelper"),
                  helperStyle: {
                    fontFamily: COURIER,
                    fontSize: "var(--text-content)",
                    color: MUTED,
                    maxWidth: 280,
                    lineHeight: 1.5,
                    marginTop: "var(--space-sm)",
                  },
                }}
              />
            )}
          </div>
        </ComposerSection>

        <ErrorBanner message={state.error} style={{ color: ALARM }} />

        {dashRule}

        {/* [Cancel] … [Submit] (#646), the cast as a full bar. */}
        <ComposerFooter
          band
          start={
            <>
              <SaveDraftButton
                controlsLocked={state.controlsLocked}
                submitting={state.submitting}
                switchingMode={state.switchingMode}
                saveDraft={state.saveDraft}
                skin={{ style: { color: MUTED } }}
              />
              <DropButton
                praxis={praxis}
                currentCharacterId={state.currentCharacterId}
                cancel={state.cancel}
                skin={{
                  style: stencil({
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
                    fontFamily: BEBAS,
                    fontSize: "var(--text-content)",
                    letterSpacing: "0.22em",
                    /* The sheet's frame, not the panels' `--everymen-frame`. */
                    frame: SHEET_FRAME,
                    color: BAR_INK,
                    background: BAR,
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

interface ProofSlipProps {
  children: ReactNode;
  caption: string;
  onRemove: () => void;
}

function ProofSlip({ children, caption, onRemove }: ProofSlipProps) {
  const { t } = useTranslation("forms");
  return (
    <div
      style={{
        position: "relative",
        width: 140,
        background: PANEL,
        border: `2px solid ${FRAME}`,
        borderRadius: 0,
        boxShadow: `3px 3px 0 ${FRAME}`,
        padding: "var(--space-xs)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", height: 104, overflow: "hidden" }}>{children}</div>
      <div
        style={{
          fontFamily: COURIER,
          fontSize: "var(--text-md)",
          color: INK,
          marginTop: "var(--space-xs)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {caption}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("media.removeAria", { name: caption })}
        style={{
          position: "absolute",
          top: -9,
          right: -9,
          width: 22,
          height: 22,
          background: RED,
          border: `2px solid ${FRAME}`,
          borderRadius: 0,
          color: ON_ACCENT,
          fontSize: "var(--text-lg)",
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
