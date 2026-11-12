/**
 * Ephemerists composer — the valley plate (#1185): dress over the shared layout
 * (`DefaultEditPraxis` is the contract, ADR-0065 §1). Night-sky masthead under a
 * cavetto cornice, a gravity-well ground with an ochre margin rule, an ankh
 * octagon for the stage, an open eye after the cast. One responsive tree
 * (ADR-0065 §2); fixed numbers are ornament geometry.
 *
 * No faction copy (ADR-0065 §3, #1812). Marks come from `components/factionMarks`
 * (WORLD_ZERO_STYLE §6); not `RingMark`, because the marks are octagons. The one
 * motion is `.eph-cornice-glow`, gated in CSS.
 *
 * Colour: `--faction-ephemerists-plate-*`, THEME-INVARIANT by design (#1627,
 * #1636) — no dark tokens, no `dark ?`. `-brass` is never an ink; quiet type is
 * `-quiet`. Never mix with the codex `--eph-*` (ADR-0055). The error ink is the
 * alarm rung, not the design's ochre, which misses AA.
 *
 * No forfeit, no duel clock (#1071, ADR-0011 §Forfeit).
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
import { factionBodyVars } from "../../../utils/factionBodyFace"

interface Props {
  state: EditPraxisState;
}

/* The cast's pair; no other plate surface has a primary button. */
const CTA = "var(--faction-ephemerists-plate-cta-bg)";
/* Error ink (#1231): neutral `--color-danger` misses AA here in light (3.31:1). */
const ALARM = "var(--faction-ephemerists-card-alarm)";
const CTA_INK = "var(--faction-ephemerists-plate-cta-ink)";

/* Ornament geometry (WORLD_ZERO_STYLE §4a). `EPH_BAND` is a floor (#1634),
 * matching the praxis-detail masthead. */
const EPH_BAND = { desktop: 84, mobile: 68 };
/** Nominal sheet width (= `useComposerSizes`); the well is off the RIGHT edge. */
const GRAVITY_WIDTH = { desktop: 720, mobile: 360 };
/** Overruns any sheet height; the sheet's clip decides. */
const GRAVITY_HEIGHT = 2400;
const MARGIN_RULE = { desktop: 22, mobile: 13 };
const STATUS_MARK = 44;
const SUBMIT_SIGN = 17;
const STATUS_SIGN = 24;

/** An `Octagon` path, not a `clipPath`: a clip can't carry the brass border. */
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

  const label = { fontFamily: CAPS, fontWeight: 500, letterSpacing: "0.24em" };
  const sectionLabel = { ...label, color: CAPTION };
  /** Drawn ONCE, above the footer (#1707): the brass hairline alone (#2210). */
  const composerRule = <ComposerRule style={{ background: BRASS, opacity: 0.5 }} />;

  const fieldBox = {
    width: "100%",
    background: INNER,
    color: INK,
    border: `1.5px solid ${LINE}`,
    borderRadius: 0,
    padding: "var(--space-md)",
    boxSizing: "border-box",
  } as const;

  /* Shared by the composer and the waiting surface (#1189). */
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
      /* After the `border` shorthand, or it would be erased (#1706). */
      borderLeft: `2px solid ${BRASS}`,
      borderRadius: 0,
      padding: "var(--space-lg)",
    },
    labelStyle: { ...label, color: QUIET },
    titleStyle: { fontFamily: CAPS, color: INK, lineHeight: 1.2 },
    descriptionStyle: { fontFamily: READING, color: QUIET },
    pillStyle: { ...label, color: QUIET, borderRadius: 0 },
  } as const;
  /* Waiting-stage CTA as a bare style: the dress has no class seam (#2146).
     ponytail: add `primaryClassName` to `ComposerDress` + one `??` in
     `PraxisWaitingSurface`; until then this enclosure doesn't flip with theme. */
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
            {/* Sky wash; plate tokens, so it doesn't flip with theme (#1830). */}
            <ComposerMasthead
              height={EPH_BAND[factor]}
              background={`linear-gradient(180deg, color-mix(in srgb, var(--faction-ephemerists-plate-band) 82%, ${BRASS_LIGHT}) 0%, var(--faction-ephemerists-plate-band) 100%)`}
              style={{
                // `style` spreads after `height`, so this relaxes it to a floor.
                height: "auto",
                minHeight: EPH_BAND[factor],
                overflow: "hidden",
                color: BAND_INK,
              }}
            >
              {/* No colophon: the full-bleed cast band (#1828) leaves no room
                  below it (#2124). */}
              <EphemeristsMasthead
                slug={praxis.task_faction_slug}
                scale={sizes.isMobile ? "card" : "page"}
                seed={`praxis:${praxis.id}`}
              />
            </ComposerMasthead>
            <Cornice glow />
          </>
  );
  const ground = (
          <ComposerGround inset={0} style={{ overflow: "hidden" }}>
            {/* NOT lined paper — see `GravityField` (#1830). */}
            <GravityField
              width={GRAVITY_WIDTH[factor]}
              height={GRAVITY_HEIGHT}
            />
            {/* Ochre margin rule, outside the content inset. */}
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
    /* Link (#1636) and label (#1800) inks on the root both stages mount, as
       `.eph-plate-sheet` does: the defaults miss AA on the plate (2.60:1 link,
       2.01:1 label). The page under the sheet is the APP's ground, where QUIET
       is 2.64:1, so no `.label-*` may mount there (`factionContrast.test.ts`). */
    pageStyle: { ...factionBodyVars("ephemerists"),
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

        {/* No visible label (#2179); `TitleField` owns placeholder + a11y name. */}
        <ComposerSection rule={false}>
          <TitleField
            title={state.title}
            setTitle={state.setTitle}
            skin={{
              placeholder: t("editPraxis.composer.titlePlaceholder"),
              inputStyle: { ...fieldBox, fontFamily: CAPS },
            }}
          />
        </ComposerSection>

        {/* Hidden, not disabled, once the mode is locked. */}
        {!state.controlsLocked && (
          <ComposerSection
            rule={false}
            label={t("editPraxis.composer.modeLabel")}
            labelStyle={sectionLabel}
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

        {state.showInviteBox && (
          <ComposerSection
            rule={false}
            label={
              // The roster labels itself (#1416); only the duel needs one.
              state.duelMode
                ? t("editPraxis.composer.opponentLabel")
                : undefined
            }
            labelStyle={sectionLabel}
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
                fontFamily: READING,
                inputBg: INNER,
                inputColor: INK,
                inputBorder: `1.5px solid ${LINE}`,
                dropdownBg: INNER,
                dropdownBorder: `1.5px solid ${BRASS}`,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { fontFamily: READING, color: QUIET },
                /* Square, like `fieldBox` (owner ruling, #2269). */
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
            <MetataskSealStack
              appliedMetataskList={state.appliedMetataskList}
              canSealMetatask={state.canSealMetatask}
              requestRemoveMetatask={state.requestRemoveMetatask}
              openMetataskPicker={state.openMetataskPicker}
            />
          </ComposerSection>
        )}

        {/* Write-up: no heading (#2085); the editor names itself
            (`bodyContentAttributes`). */}
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
                  lineHeight: 1.85,
                  fontFamily: READING,
                },
              }}
            />
          ) : (
            <BodyPreview
              body={state.body}
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
                fileError={state.fileError}
                handleFileChange={state.handleFileChange}
                pickFromGooglePhotos={state.pickFromGooglePhotos}
                skin={{
                  buttonStyle: composerLabelStyle({
                    ...label,
                    cursor: "pointer",
                    /* Translucent, so the ground reads through (#1828). */
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

        {composerRule}

        <ComposerFooter
          band
          start={
            <>
              <SaveDraftButton
                controlsLocked={state.controlsLocked}
                submitting={state.submitting}
                switchingMode={state.switchingMode}
                saveDraft={state.saveDraft}
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
                praxis={praxis}
                currentCharacterId={state.currentCharacterId}
                cancel={state.cancel}
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
              {/* Leading strip only (#2067): the full-bleed band's negative
                  bottom margin (#1828) would pull a trailing one over it. */}
              <EphemeristsNotationBand side="top" seed={`praxis:${praxis.id}`} />
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
                  /* `.eph-cta` owns ground and ink; don't restate them (#2146). */
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
                      /* Design band: 12 / 500 / 0.24em (12 = --text-lg). */
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
