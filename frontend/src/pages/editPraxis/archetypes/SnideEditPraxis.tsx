/**
 * S.N.I.D.E. edit-praxis composer (#1184). The sheet IS the flyposted wall
 * ({@link WALL}, #2177 — one ground across S.N.I.D.E.'s authoring surfaces;
 * restoring a separate stock is drift). Layout, controls and copy are shared
 * (ADR-0065); this file is dress only. Radius 0, no border.
 *
 * No `ground` layer: the wall brings its own raster and scanline, and a third
 * stripe is moiré. The masthead is `aria-hidden` (the status row announces the
 * stage). The blob mark is the waiting surface's alone (#1828).
 *
 * `-composer-*` is the sheet's ink (flips); `-acid`/`-ink`/`-pink` are the
 * press (invariant) — type on acid always takes the press ink. The wall's pink
 * corner forced `-composer-muted`/`-faint` to be walked in index.css; pinned in
 * `factionContrast.test.ts` (SNIDE_WALL_PAIRS).
 *
 * Motion: `ep-pulse` on the masthead rule, by class (#1003).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CSSProperties, ReactNode } from "react";
import { mediaUrl } from "../../../utils/media";
import { factionName } from "../../../utils/factions";
import { type PraxisType } from "../../../api/praxis";
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
  composerStageWord,
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
import { WALL } from "../../../components/factionMarks/snideAtoms";
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";
import Breadcrumb from "../../../components/nav/Breadcrumb";
import { factionBodyVars } from "../../../utils/factionBodyFace"

interface Props {
  state: EditPraxisState;
}

/* Opaque stock for the invite dropdown (#2177). */
const SHEET = "var(--faction-snide-wall)";
const INK = "var(--faction-snide-composer-ink)";
const MUTED = "var(--faction-snide-composer-muted)";
const FAINT = "var(--faction-snide-composer-faint)";
const FIELD = "var(--faction-snide-composer-field)";
const RULE = "var(--faction-snide-composer-rule)";
const BAR = "var(--faction-snide-composer-bar)";
/* Acid as TEXT: deep in the light half, bright on the dark stock. */
const ACID_INK = "var(--faction-snide-composer-acid-ink)";
/* Banner ink (#1231). Not `-card-alarm`: the card is black in both themes and
 * that rung reads 1.56:1 here. */
const ALARM = "var(--faction-snide-composer-alarm)";

/* The press, theme-invariant: acid as a fill, PRESS_INK printed on it. */
const ACID = "var(--faction-snide-acid)";
const PRESS_INK = "var(--faction-snide-ink)";
const PRESS_PAPER = "var(--faction-snide-paper)";

/* Both faces ship at 400 only, so no `fontWeight: 700` here: the browser
 * would smear a fake bold (#2487). `fontsLoaded.test.ts` holds the line. */
const TITLE_FACE = "var(--faction-snide-font-black)"; /* Archivo Black */
const BODY_FACE = "var(--faction-snide-font-type)"; /* Special Elite */

function punkLabel(overrides: CSSProperties = {}): CSSProperties {
  return composerLabelStyle({ fontFamily: BODY_FACE, ...overrides });
}

const BLOB_PATH =
  "M6 28 C4 13 20 4 42 3 C62 2 88 6 89 24 C90 40 86 63 54 69 C28 74 9 52 6 28 Z";

interface BlobProps {
  width: number;
  height: number;
  /** Draw the check. */
  struck?: boolean;
  children?: ReactNode;
}

function SnideBlob({ width, height, struck = false, children }: BlobProps) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width,
        height,
        flexShrink: 0,
        transform: "rotate(-5deg)",
      }}
    >
      <svg
        aria-hidden
        viewBox="0 0 94 72"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <path d={BLOB_PATH} fill={ACID} />
        {/* No strike-through: it would read "cancelled" (#1830). */}
        {struck && (
          <polyline
            points="28,36 41,50 66,22"
            fill="none"
            stroke={PRESS_INK}
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      {children}
    </span>
  );
}

export default function SnideEditPraxis({ state }: Props) {
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
    border: `1px solid ${RULE}`,
    borderRadius: 0,
    padding: "var(--space-md)",
    boxSizing: "border-box",
  } as const;

  /* Struck once, above the footer (#1707). */
  const censorStripe = <ComposerRule style={{ height: 10, background: BAR }} />;

  /* Shared by composer and waiting surface (#1189) so the stages can't drift. */
  const sheetStyle = { background: WALL, borderRadius: 0 };
  const statusMark = <SnideBlob width={52} height={40} struck />;
  const slip = {
    style: {
      background: FIELD,
      border: `1px solid ${RULE}`,
      /* Must follow the `border` shorthand, which would erase it (#1706). */
      borderLeft: `2px solid ${ACID_INK}`,
      borderRadius: 0,
      padding: "var(--space-lg)",
    },
    labelStyle: { color: MUTED },
    titleStyle: {
      fontFamily: TITLE_FACE,
      color: INK,
      letterSpacing: "0.02em",
    },
    descriptionStyle: { color: MUTED },
    pillStyle: { color: MUTED, borderRadius: 0 },
  } as const;
  /* A button, not the full-bleed bar: the bar is reserved for the cast. */
  const primaryStyle = punkLabel({
    padding: "var(--space-md) var(--space-xl)",
    border: "none",
    borderRadius: 0,
    background: ACID,
    color: PRESS_INK,
    fontFamily: TITLE_FACE,
    letterSpacing: "0.2em",
  });
  const masthead = (
          <ComposerMasthead
            background={BAR}
            style={{ height: "auto", padding: "var(--space-sm) var(--space-lg)" }}
          >
            {/* Ornament: the status row announces the stage. */}
            <span
              aria-hidden
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-md)",
              }}
            >
              <span
                style={{
                  fontFamily: TITLE_FACE,
                  // eslint-disable-next-line local/no-raw-style-values -- ornament wordmark at its drawn optical size (§4a).
                  fontSize: 20,
                  lineHeight: 1,
                  letterSpacing: "0.06em",
                  color: ACID,
                  whiteSpace: "nowrap",
                }}
              >
                {factionName("snide")}
              </span>
              <span
                className="ep-pulse"
                style={{
                  flex: 1,
                  height: 6,
                  background: `repeating-linear-gradient(90deg, ${ACID} 0 6px, transparent 6px 10px)`,
                  ...({ "--ep-pulse-dur": "3.6s" } as CSSProperties),
                }}
              />
              <span
                style={punkLabel({
                  color: PRESS_PAPER,
                  letterSpacing: "0.2em",
                  whiteSpace: "nowrap",
                })}
              >
                {composerStageWord(state)}
              </span>
            </span>
          </ComposerMasthead>
  );
  /* No `ground`: the wall has its own raster (#2177). */

  const dress: ComposerDress = {
    accent: ACID_INK,
    alarm: ALARM,
    pageStyle: { ...factionBodyVars("snide"), fontFamily: BODY_FACE, color: INK },
    sheetStyle,
    masthead,
    rule: () => censorStripe,
    mark: statusMark,
    statusStyle: { color: INK, letterSpacing: "0.2em" },
    metaStyle: { color: FAINT },
    labelStyle: { color: MUTED },
    slip,
    panelStyle: {
      background: FIELD,
      border: `1px solid ${RULE}`,
      borderRadius: 0,
    },
    headingStyle: { fontFamily: TITLE_FACE, color: INK, letterSpacing: "0.02em" },
    bodyStyle: { color: MUTED },
    quietStyle: { color: FAINT },
    primaryStyle,
    quietButtonStyle: { color: FAINT },
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
      <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead}>
        {/* `composerStageWord`, so it can't contradict the masthead. */}
        <ComposerStatusRow
          status={composerStageWord(state)}
          statusStyle={dress.statusStyle}
        />

        <TaskSlip praxis={praxis} task={task} {...slip} />

        <ComposerSection rule={false}>
          <TitleField
            title={state.title}
            setTitle={state.setTitle}
            skin={{
              placeholder: t("editPraxis.composer.titlePlaceholder"),
              inputStyle: { ...fieldBox, fontFamily: TITLE_FACE },
            }}
          />
        </ComposerSection>

        {!state.controlsLocked && (
          <ComposerSection
            label={t("editPraxis.composer.modeLabel")}
            rule={false}
            labelStyle={{ color: MUTED }}
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
                    style={punkLabel({
                      cursor: disabled ? "not-allowed" : "pointer",
                      padding: "var(--space-sm) var(--space-lg)",
                      borderRadius: 0,
                      background: active ? ACID : FIELD,
                      color: active ? PRESS_INK : MUTED,
                      border: `1px solid ${active ? ACID : RULE}`,
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
            rule={false}
            label={
              // The roster labels itself (#1416); only the duel needs a label.
              state.duelMode
                ? t("editPraxis.composer.opponentLabel")
                : undefined
            }
            labelStyle={{ color: MUTED }}
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
                fontFamily: BODY_FACE,
                inputBg: FIELD,
                inputColor: INK,
                inputBorder: `1px solid ${RULE}`,
                dropdownBg: SHEET,
                dropdownBorder: `1px solid ${RULE}`,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { color: FAINT, fontFamily: BODY_FACE },
                /* The one skin overriding the roster's inks (#2269): on the
                 * wall, `-card-*` inks fail (1.24:1), so wall-measured
                 * `-composer-*`/`-note-*` tokens. Acid is a fill only (1.35:1
                 * as type); accent text takes the pink ink. */
                collab: {
                  radius: 0,
                  quiet: MUTED,
                  accent: ACID,
                  onAccent: PRESS_INK,
                  accentInk: "var(--faction-snide-note-pink-ink)",
                  notice: "var(--faction-snide-wall-notice)",
                  credit: "var(--faction-snide-wall-credit)",
                  ground: "var(--faction-snide-wall)",
                },
              }}
            />
          </ComposerSection>
        )}

        {state.showSealStack && (
          <ComposerSection
            label={t("editPraxis.composer.metatasksLabel")}
            rule={false}
            labelStyle={{ color: MUTED }}
          >
            <MetataskSealStack
              appliedMetataskList={state.appliedMetataskList}
              canSealMetatask={state.canSealMetatask}
              requestRemoveMetatask={state.requestRemoveMetatask}
              openMetataskPicker={state.openMetataskPicker}
            />
          </ComposerSection>
        )}

        <ComposerSection
          rule={false}
          labelStyle={{ color: MUTED }}
          meta={
            <span style={composerMetaCluster}>
              <span
                style={punkLabel({
                  color: FAINT,
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
                    punkLabel({
                      padding: "var(--space-xs) var(--space-sm)",
                      borderRadius: 0,
                      border: `1px solid ${active ? RULE : "transparent"}`,
                      background: active ? FIELD : "transparent",
                      color: active ? INK : FAINT,
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
                  border: `1px solid ${RULE}`,
                  borderRadius: 0,
                },
                textareaStyle: {
                  ...fieldBox,
                  resize: "vertical",
                  minHeight: 180,
                  lineHeight: 1.7,
                  fontFamily: BODY_FACE,
                },
              }}
            />
          ) : (
            <BodyPreview
              body={state.body}
              skin={{
                wrapperStyle: { ...fieldBox, minHeight: 180 },
                markdownStyle: {
                  fontFamily: BODY_FACE,
                  lineHeight: 1.7,
                  color: INK,
                },
                emptyState: (
                  <p
                    style={{
                      fontFamily: BODY_FACE,
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
          labelStyle={{ color: MUTED }}
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
                  buttonStyle: punkLabel({
                    cursor: "pointer",
                    /* Translucent so the raster shows through (#1828). */
                    background: composerDropGround(FIELD),
                    border: `1px dashed ${RULE}`,
                    borderRadius: 0,
                    padding: "var(--space-2xl) var(--space-lg)",
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    color: MUTED,
                  }),
                  helperText: t("editPraxis.composer.proofHelper"),
                  helperStyle: {
                    fontFamily: BODY_FACE,
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

        {censorStripe}

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
                skin={{ style: { color: FAINT, fontFamily: BODY_FACE } }}
              />
              <DropButton
                praxis={praxis}
                currentCharacterId={state.currentCharacterId}
                cancel={state.cancel}
                skin={{
                  style: punkLabel({
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
                  ...composerBandStyle(sizes, {
                    fontFamily: TITLE_FACE,
                    fontSize: "var(--text-content)",
                    letterSpacing: "0.2em",
                    /* The sheet has no border, so the rule ink. */
                    frame: RULE,
                    background: ACID,
                    color: PRESS_INK,
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
  children: ReactNode;
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
        border: `1px solid ${RULE}`,
        borderRadius: 0,
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
          borderRadius: 0,
          background: ACID,
          border: "none",
          color: PRESS_INK,
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
