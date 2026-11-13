/**
 * Cozy Coven composer (#1188): the shared layout in Coven's dress — turning-cat
 * masthead over a twinkle field, glow-and-lavender ground with the wheel's cat
 * and a hat scatter, one braid closing the sheet, a full-bleed cast band.
 *
 * Copy is the neutral `editPraxis.composer.*` set (ADR-0065 §3); the only other
 * word is the masthead's `factionName()` (ADR-0038), lowercased by style.
 * Colour via `--faction-coven-slip-*`, `-ward-*` and `-cast-*`; motion by class
 * only (`.ep-twinkle`, `.cvn-wheel`) so the reduced-motion guard applies (#1003).
 * One responsive tree (ADR-0065 §2). No forfeit, no duel clock (#1071).
 */
import { useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import MediaArt from "../blocks/MediaArt";
import { CovenCat } from "../../../components/factionMarks/covenSlip";
import { CovenSigil } from "../../../components/sigil/CovenSigil";
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
import { factionName } from "../../../utils/factions";
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";
import Breadcrumb from "../../../components/nav/Breadcrumb";
import { factionBodyVars } from "../../../utils/factionBodyFace"

interface Props {
  state: EditPraxisState;
}

/* Surface faces, not Coven's `card-font` (WORLD_ZERO_STYLE §4). */
const DISPLAY = "var(--font-faction-witch)"; /* Grenze Gotisch — title */
const CHROME = "var(--font-faction-script)"; /* Caveat — body + label */

const SHEET = "var(--faction-coven-ward-card)";
/* Error ink (#1231): neutral `--color-danger` misses AA here in light (4.23:1). */
const ALARM = "var(--faction-coven-card-alarm)";
const FIELD = "var(--faction-coven-ward-page)";
const INK = "var(--faction-coven-slip-ink)";
const SOFT = "var(--faction-coven-slip-soft)";
const LABEL = "var(--faction-coven-slip-label)";
/* Ornament and rules ONLY: 4.44:1 on FIELD misses for small text (#1295). */
const DEEP = "var(--faction-coven-slip-deep)";
const PINK = "var(--faction-coven-slip-pk)"; /* the design's accent */
const GOLD = "var(--faction-coven-slip-gold)";
const BORDER = "var(--faction-coven-slip-border)";
const CTA_INK = "var(--faction-coven-slip-cta-ink)";
const CTA_BAND =
  "linear-gradient(180deg, var(--faction-coven-slip-cta-from), var(--faction-coven-slip-cta-to))";
/** Green once your part is in. */
const CAST_BAND =
  "linear-gradient(180deg, var(--faction-coven-cast-from), var(--faction-coven-cast-to))";
const CAST_INK = "var(--faction-coven-slip-cta-ink)";

/** Ornament geometry (WORLD_ZERO_STYLE §4a). */
const MAST_CAT = 30;

const RADIUS = 14;
const FIELD_RADIUS = 10;
const EDGE = `1.5px solid ${GOLD}`;
const RULE = `1.5px solid ${BORDER}`;

/** A four-point star, centred on (x, y) with arm length r. */
function starPath(x: number, y: number, r: number): string {
  const long = r * 2.6;
  return `M${x} ${y - long} l${r} ${long} ${long} ${r} -${long} ${r} -${r} ${long} -${r} -${long} -${long} -${r} ${long} -${r} z`;
}

/** `.cvn-braid` owns the strands' pigments (index.css). */
function Braid({ style }: { style?: CSSProperties }) {
  return (
    <span aria-hidden className="cvn-braid" style={{ minWidth: 20, ...style }} />
  );
}

/* No pentagram anywhere (#2746): a small star is still the retired badge
   (owner ruling — do not re-open). */

/**
 * Stars only in the OUTER thirds: x < 105 or > 375 of 480 (#1983). x is a
 * fraction of the band (`preserveAspectRatio="none"`) while the wordmark is
 * fixed-size, so a central star slides under the lettering on narrow viewports.
 * At 375px the row spans 145…335. If the wordmark grows, WIDEN the exclusion
 * (`covenTwinkleClearBand.test.tsx`).
 */
function TwinkleField() {
  const stars: [number, number, number][] = [
    [22, 22, 2.4],
    [62, 52, 1.4],
    [96, 18, 1.8],
    [388, 46, 2],
    [424, 24, 1.4],
    [462, 50, 1.7],
  ];
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 480 72"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      {stars.map(([x, y, r]) => (
        <path
          key={`${x}-${y}`}
          d={starPath(x, y, r)}
          fill={GOLD}
          opacity={0.75}
        />
      ))}
    </svg>
  );
}

/**
 * Hat scatter in percentages so it reflows (#2746). A tilt (-24°…+22°) is fine;
 * a hat has an up, so never a full turn. 9px is below `CovenSigil`'s 15px floor,
 * fine for fill-only texture at 0.22.
 */
const GLYPHS: { left: string; top: string; size: number; turn: number }[] = [
  { left: "8%", top: "14%", size: 15, turn: -12 },
  { left: "78%", top: "9%", size: 11, turn: 18 },
  { left: "26%", top: "38%", size: 9, turn: 6 },
  { left: "91%", top: "44%", size: 14, turn: -24 },
  { left: "14%", top: "63%", size: 12, turn: 15 },
  { left: "64%", top: "72%", size: 10, turn: -8 },
  { left: "38%", top: "88%", size: 13, turn: 22 },
  { left: "86%", top: "82%", size: 9, turn: -16 },
];

function GlyphScatter() {
  return (
    <>
      {GLYPHS.map((glyph) => (
        <span
          key={`${glyph.left}-${glyph.top}`}
          aria-hidden
          style={{
            position: "absolute",
            left: glyph.left,
            top: glyph.top,
            transform: `rotate(${glyph.turn}deg)`,
            opacity: 0.22,
          }}
        >
          <CovenSigil size={glyph.size} color={DEEP} />
        </span>
      ))}
    </>
  );
}

export default function CovenEditPraxis({ state }: Props) {
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

  /* Sealed duel side or submitted collab member: the band goes green. */
  const hasCast =
    state.isPublished ||
    praxis.members.some(
      (member) =>
        member.character_id === state.currentCharacterId && member.has_submitted,
    );

  const labelStyle: CSSProperties = { fontFamily: CHROME, color: LABEL };
  const fieldBox = {
    width: "100%",
    background: FIELD,
    color: INK,
    border: RULE,
    borderRadius: FIELD_RADIUS,
    padding: "var(--space-md)",
    boxSizing: "border-box",
  } as const;
  /* For the waiting surface; this page's one braid is the footer's (#1707). */
  const braidRule = (
    <ComposerRule>
      <Braid />
    </ComposerRule>
  );

  /* Shared by the composer and the waiting surface (#1189). */
  const sheetStyle = {
    background: SHEET,
    border: EDGE,
    borderRadius: RADIUS,
    boxShadow: "var(--faction-coven-slip-shadow)",
  };
  const statusMark = <CovenSigil size={40} color={DEEP} />;
  const slip = {
    style: {
      background: FIELD,
      border: RULE,
      /* After the `border` shorthand, or it would be erased (#1706). */
      borderLeft: `2px solid ${INK}`,
      borderRadius: FIELD_RADIUS,
      padding: "var(--space-lg)",
    },
    labelStyle,
    titleStyle: { fontFamily: DISPLAY, color: INK },
    descriptionStyle: { fontFamily: CHROME, color: SOFT },
    pillStyle: { fontFamily: CHROME, color: LABEL },
  } as const;
  /* Waiting footer: a button; the band is reserved for the irreversible cast. */
  const primaryStyle = composerLabelStyle({
    fontFamily: CHROME,
    fontSize: "var(--text-xl)",
    fontWeight: 700,
    border: "none",
    borderRadius: FIELD_RADIUS,
    padding: "var(--space-md) var(--space-xl)",
    color: CTA_INK,
    background: CTA_BAND,
  });
  const masthead = (
          <ComposerMasthead
            style={{
              height: "auto",
              padding: "var(--space-lg) var(--space-lg) var(--space-md)",
              overflow: "hidden",
            }}
          >
            <div aria-hidden style={{ position: "relative" }}>
              <TwinkleField />
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "var(--space-sm)",
                }}
              >
                {/* Turns on `.cvn-wheel`'s own tempo; no private duration (#2746).
                    `static` because `CovenCat` defaults to absolute. */}
                <CovenCat size={MAST_CAT} style={{ position: "static", flex: "0 0 auto" }} />
                <span
                  style={{
                    fontFamily: DISPLAY,
                    // eslint-disable-next-line local/no-raw-style-values -- ornament: the coven's wordmark, lettered in Grenze Gotisch.
                    fontSize: 22,
                    lineHeight: 1,
                    letterSpacing: "0.02em",
                    color: INK,
                    // The lower case is the lettering, not the word (#1910).
                    textTransform: "lowercase",
                  }}
                >
                  {factionName("coven")}
                </span>
              </div>
              <Braid style={{ marginTop: "var(--space-sm)" }} />
            </div>
          </ComposerMasthead>
  );
  const ground = (
          <>
            {/* Strength is the faction's minted `-ward-haze`, never a TSX
                number: at 0.7 every ink missed AA (#2485). */}
            <ComposerGround
              inset={0}
              opacity="var(--faction-coven-ward-haze)"
              background={`radial-gradient(62% 48% at 12% 0%, ${PINK}, transparent 70%), radial-gradient(58% 46% at 100% 100%, var(--faction-coven-slip-lav), transparent 72%)`}
            />
            {/* Own layer, so it skips the wash's opacity. 240px at 16px inset
                fits the narrowest composer; a face can't hang off-sheet (#2041). */}
            <ComposerGround inset={0}>
              <CovenCat size={240} style={{ right: 16, bottom: 16, opacity: 0.1 }} />
              <GlyphScatter />
            </ComposerGround>
          </>
  );

  const dress: ComposerDress = {
    // INK, not DEEP (#1295): the waiting surface paints `accent` as 12px text
    // on FIELD, where `slip-deep` misses (4.44:1).
    accent: INK,
    alarm: ALARM,
    pageStyle: { ...factionBodyVars("coven"), fontFamily: CHROME, color: INK },
    sheetStyle,
    masthead,
    ground,
    rule: () => braidRule,
    mark: statusMark,
    statusStyle: { fontFamily: CHROME, color: INK, fontWeight: 700 },
    metaStyle: { fontFamily: CHROME, color: LABEL },
    labelStyle,
    slip,
    panelStyle: {
      background: FIELD,
      border: RULE,
      borderRadius: FIELD_RADIUS,
    },
    headingStyle: { fontFamily: DISPLAY, color: INK },
    bodyStyle: { fontFamily: CHROME, color: SOFT },
    quietStyle: { fontFamily: CHROME, color: LABEL },
    primaryStyle,
    quietButtonStyle: { fontFamily: CHROME, color: LABEL },
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
              inputStyle: { ...fieldBox, fontFamily: DISPLAY },
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
                      fontFamily: CHROME,
                      fontWeight: 700,
                      cursor: disabled ? "not-allowed" : "pointer",
                      padding: "var(--space-sm) var(--space-lg)",
                      borderRadius: 999,
                      background: active ? CTA_BAND : FIELD,
                      color: active ? CTA_INK : LABEL,
                      border: active
                        ? "1.5px solid var(--faction-coven-slip-cta-to)"
                        : RULE,
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
                fontFamily: CHROME,
                inputBg: FIELD,
                inputColor: INK,
                inputBorder: RULE,
                dropdownBg: SHEET,
                dropdownBorder: RULE,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { color: LABEL },
                /* LABEL, not SOFT: chips are transparent, on the washed sheet,
                 * where soft is 4.46:1 dark (#2485). */
                collab: { radius: FIELD_RADIUS, quiet: LABEL },
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

        {/* Write-up: no heading (#2085); the editor names itself
            (`bodyContentAttributes`). */}
        <ComposerSection
          rule={false}
          labelStyle={labelStyle}
          meta={
            <span style={composerMetaCluster}>
              <span
                style={composerLabelStyle({
                  fontFamily: CHROME,
                  color: LABEL,
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
                      fontFamily: CHROME,
                      fontWeight: 700,
                      padding: "var(--space-xs) var(--space-sm)",
                      borderRadius: 999,
                      border: active ? RULE : "1.5px solid transparent",
                      background: active ? FIELD : "transparent",
                      // On FIELD, so INK not DEEP (#1295).
                      color: active ? INK : LABEL,
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
                  fontFamily: CHROME,
                },
                toolbarButtonStyle: {
                  background: FIELD,
                  color: INK,
                  border: RULE,
                  borderRadius: 8,
                },
              }}
            />
          ) : (
            <BodyPreview
              body={state.body}
              skin={{
                wrapperStyle: { ...fieldBox, minHeight: 180 },
                markdownStyle: {
                  fontFamily: CHROME,
                  lineHeight: 1.7,
                  color: INK,
                },
                emptyState: (
                  <p
                    style={{
                      fontFamily: CHROME,
                      fontSize: "var(--text-content)",
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
                    fontFamily: CHROME,
                    fontWeight: 700,
                    cursor: "pointer",
                    /* Translucent, so the ground reads through (#1828). */
                    background: composerDropGround(FIELD),
                    border: `1.5px dashed ${BORDER}`,
                    borderRadius: FIELD_RADIUS,
                    padding: "var(--space-2xl) var(--space-lg)",
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    color: DEEP,
                  }),
                  helperText: t("editPraxis.composer.proofHelper"),
                  helperStyle: {
                    fontFamily: CHROME,
                    fontSize: "var(--text-content)",
                    color: LABEL,
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

        {/* The composer's ONE braid (#1707). Exits then the full-bleed band
            (#646 order). */}
        <Braid />
        <ComposerFooter
          band
          start={
            <>
              <SaveDraftButton
                controlsLocked={state.controlsLocked}
                submitting={state.submitting}
                switchingMode={state.switchingMode}
                saveDraft={state.saveDraft}
                skin={{ style: { color: LABEL, fontFamily: CHROME } }}
              />
              <DropButton
                praxis={praxis}
                currentCharacterId={state.currentCharacterId}
                cancel={state.cancel}
                skin={{
                  style: composerLabelStyle({
                    fontFamily: CHROME,
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
                ornament: <Sparkle size={12} />,
                style: {
                  ...composerBandStyle(sizes, {
                    // Design band: 14 / 700 / 0.12em (14 = --text-xl).
                    fontFamily: CHROME,
                    fontSize: "var(--text-xl)",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    // A colour, not `EDGE`: `composerBandStyle` draws the rule.
                    frame: GOLD,
                    color: hasCast ? CAST_INK : CTA_INK,
                    background: hasCast ? CAST_BAND : CTA_BAND,
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

function Sparkle({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <path
        d="M12 1c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
        fill="currentColor"
      />
    </svg>
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
        border: RULE,
        borderRadius: FIELD_RADIUS,
        overflow: "hidden",
      }}
    >
      <div style={{ width: 120, height: 120, overflow: "hidden" }}>
        {children}
      </div>
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
          border: `1.5px solid ${BORDER}`,
          color: DEEP,
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
