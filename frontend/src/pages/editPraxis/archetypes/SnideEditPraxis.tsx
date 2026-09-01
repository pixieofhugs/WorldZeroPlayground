/**
 * S.N.I.D.E. edit praxis — composer v2 (#1184, epic #1179; design project
 * c491945e, `Snide Edit Praxis.dc.html`, the `snide` row of `SKINS`).
 *
 * The same page `DefaultEditPraxis` draws, wearing SNIDE's dress: THE FLYPOSTED
 * WALL ITSELF since #2177, where it used to be a xerox sheet flyposted to one.
 * Every region, every control and every word is shared (ADR-0065); what belongs
 * to this file is the frame, the type, the ornament and the marks.
 *
 * ## The dress
 *
 * **Geometry — radius 0, borderW 0.** SNIDE is the one skin that draws no card
 * border at all, so the sheet is a hard-cornered rectangle with nothing around
 * it: what separates it from the page is the stock and the grain. The shared
 * sheet's default 10px radius is overridden here rather than inherited.
 *
 * **Masthead** — a near-black bar carrying the wordmark in acid, a dashed acid
 * rule that flexes to fill, and the stage word. All three are ornament: the bar
 * is `aria-hidden`, because the stage is announced once, by the status row
 * underneath it. The zine says DRAFT twice on purpose; a screen reader hears it
 * once.
 *
 * **Ground** — nothing on that layer since #2177. It was the photocopier raster,
 * flush with the sheet, drawn on a stock that had none of its own; the wall
 * carries a raster AND a scanline, and a second 1px/3px stripe over those is
 * moiré rather than xerox. (The design kit draws the raster because it draws the
 * xerox stock: "Grain only; the tape strips are dropped". Both moved together.)
 * The dress still names its `ground` slot for the skins that use it — the layer
 * clips inside the stock because `ComposerSheet` owns the `overflow: hidden`,
 * so a ground here is the COLUMN's and never the viewport's (#1028, the trap six
 * of eight task-detail skins fell into).
 *
 * **Rule** — the censor stripe, a solid redaction bar rather than a hairline,
 * struck ONCE above the footer (#1707) rather than between the sections.
 *
 * **The mark** is the hand-drawn blob, struck through with a check in pen. It is
 * NOT `RingMark` — that block is a ring with its middle punched out, and this
 * design's mark is a splat. Since #1828 it is the WAITING surface's alone: the
 * compose row reads `Draft` by itself, and the slip's points blob is gone in
 * favour of the shared `ScoreStamp`, which dispatches to `SnideScoreStamp` —
 * the same acid numeral, carrying the praxis's real total.
 *
 * **Submit** — a full-bleed acid bar, not an inline button, and since #1828 it
 * comes off the shared affordance rather than out of this file: `<ComposerFooter
 * band>` plus `composerBandStyle`, which negates the sheet's own insets. The
 * hand-rolled version here missed two things the design draws — the 1.5px top
 * rule in the sheet's frame, and a bottom bleed (it dropped the content
 * column's bottom padding instead, which is a different geometry).
 *
 * ## Colour
 *
 * Every value is a `--faction-snide-*` token, so the ground flips through the
 * `[data-theme="dark"]` cascade with no `dark ?` branch anywhere below. Two
 * families are deliberately kept apart: `-composer-*` is the SHEET'S ink (it
 * flips), and `-acid`/`-ink`/`-pink` are the PRESS (they do not). Type printed
 * on an acid ground reads the press's ink in both themes — paper-white on acid
 * green measures 1.2:1.
 *
 * **THE STOCK IS THE WALL, AND THAT REVERSES WHAT THIS BLOCK USED TO SAY.**
 * It read "the sheet is xerox stock by day, photocopier black by night", drawn
 * from `-composer-sheet` — a sheet flyposted TO the wall. The owner's ruling on
 * #2177 is that S.N.I.D.E. wears ONE ground across its three authoring and
 * reading surfaces, so the composer wears the wall itself ({@link WALL}, drawn
 * once in `factionMarks/snideAtoms`). Restoring the separate stock is drift, not
 * a fix. `-composer-sheet` survives for the one block that still needs an opaque
 * stock of its own — the invite dropdown, a floating list the raster must not
 * read through.
 *
 * **THE SWAP IS THE SMALL HALF; THE INKS ARE THE WORK.** This is the only one of
 * the three surfaces carrying form fields and placeholder text, and every tier
 * was measured on flat stock. The wall is a ramp with an acid wash off one
 * corner and a pink one off the other, and this page is tall enough to put its
 * footer inside the pink one — where `-composer-muted` read 4.23:1 and
 * `-composer-faint` 3.64:1. Both are walked in index.css, along with the error
 * banner's alarm; all four readings of the ground, in both themes, are pinned in
 * `factionContrast.test.ts` (SNIDE_WALL_PAIRS). What did NOT need walking is
 * every block that already sits on `FIELD`: an input, the task slip, the panels.
 * A field ground under type is this ruling working, not failing.
 *
 * ## Type
 *
 * Anton for the title tier, Special Elite for body and labels, both read from
 * the faction's font tokens. The label geometry (uppercase, 0.14em, the label
 * tier) comes from `composerLabelStyle`; this file supplies only the face.
 *
 * ## Motion
 *
 * One: `ep-pulse`, slowed, on the masthead's dashed rule — the flicker of a
 * tube light over the flyposting. The keyframe is in `index.css` behind the
 * shared reduced-motion guard, reached by class; an inline `animation:` would
 * bypass that guard (#1003).
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

interface Props {
  state: EditPraxisState;
}

/* THE STOCK the invite dropdown floats on — the one block that still needs an
 * opaque sheet of its own now the page's ground is the wall (#2177). It flips
 * with the theme like everything else here, so nothing below branches on it. */
const SHEET = "var(--faction-snide-composer-sheet)";
const INK = "var(--faction-snide-composer-ink)";
const MUTED = "var(--faction-snide-composer-muted)";
const FAINT = "var(--faction-snide-composer-faint)";
const FIELD = "var(--faction-snide-composer-field)";
const RULE = "var(--faction-snide-composer-rule)";
const BAR = "var(--faction-snide-composer-bar)";
/* Acid as TEXT: deep in the light half, bright on the dark stock. */
const ACID_INK = "var(--faction-snide-composer-acid-ink)";
/* The error banner's ink (#1231), and the one skin in the set that could not
 * take `--faction-snide-card-alarm`: the CARD is photocopier-black in both
 * themes (§6) so that rung is pinned bright and reads 1.56:1 on the light
 * xerox stock, while THIS ground flips. Walked again with the ground in #2177:
 * 4.67:1 in the wall's pink corner, 6.21:1 at the top of the ramp, 5.83:1 dark,
 * all under the neutral veil — which, per ADR-0061, stays neutral. */
const ALARM = "var(--faction-snide-composer-alarm)";

/* THE PRESS — theme-invariant pigments. `ACID` is acid as a DRAWN THING (the
 * masthead rule, the blobs, the submit bar), and `PRESS_INK` is the near-black
 * that prints on it in either theme. Pairing acid with the sheet's ink instead
 * would put paper-white type on acid green under [data-theme="dark"]. */
const ACID = "var(--faction-snide-acid)";
const PRESS_INK = "var(--faction-snide-ink)";
const PRESS_PAPER = "var(--faction-snide-paper)";

/* NEITHER FACE HAS A SECOND CUT, SO NOTHING HERE SETS A WEIGHT (#2487). Anton
 * and Special Elite both ship at 400 and only 400. `pageStyle` puts Special
 * Elite on the whole surface, so a `fontWeight: 700` anywhere below — the status
 * word, the active mode chip, the media tile's close button, which is where all
 * three sat — was never a heavier cut: the browser had none to reach for and
 * smeared the one it had. On a typewriter face that reads as a bad photocopy of
 * the type rather than emphasis, which is exactly the register this dress is
 * trying NOT to be an accident of. Emphasis comes off what the faces do support
 * — the acid ground, the ink tier, tracking, case, size. `fontsLoaded.test.ts`
 * holds the line. */
const TITLE_FACE = "var(--faction-snide-font-impact)"; /* Anton */
const BODY_FACE = "var(--faction-snide-font-type)"; /* Special Elite */

/** The label tier with SNIDE's face on it — geometry shared, face local. */
function punkLabel(overrides: CSSProperties = {}): CSSProperties {
  return composerLabelStyle({ fontFamily: BODY_FACE, ...overrides });
}

/** One spray-can splat, drawn once and cut at two sizes. */
const BLOB_PATH =
  "M6 28 C4 13 20 4 42 3 C62 2 88 6 89 24 C90 40 86 63 54 69 C28 74 9 52 6 28 Z";

interface BlobProps {
  width: number;
  height: number;
  /** Strike the blob through — the draft's unfinished check. */
  struck?: boolean;
  children?: ReactNode;
}

/**
 * The blob behind both marks. The design draws it at 94×72 for the points and
 * smaller for the status; the aspect is the same, so one path serves both.
 */
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
        {/* Acid fill, press-ink tick, and nothing else. The hot-pink bar that
            used to cross the blob is not in the design's mark — a strike-through
            reads as "cancelled" on the one mark that says your part is IN
            (#1830). */}
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

  /* Every field is a block cut from the sheet: square corners, a drawn hairline,
   * one shade off the stock so it reads inset rather than painted on. */
  const fieldBox = {
    width: "100%",
    background: FIELD,
    color: INK,
    border: `1px solid ${RULE}`,
    borderRadius: 0,
    padding: "var(--space-md)",
    boxSizing: "border-box",
  } as const;

  /* The censor stripe, this skin's rule. Struck once, above the footer (#1707):
   * the design calls its rule there and lets whitespace part the regions, and
   * five redaction bars redacted the page's rhythm along with its sections. */
  const censorStripe = <ComposerRule style={{ height: 10, background: BAR }} />;

  /* The chrome, named once and mounted twice: the composer below, and the
     waiting surface once your part is in (#1189). The same ELEMENTS both
     times, so the acid bar and the raster cannot drift between the
     two stages. The masthead's stage word travels with them — it reads
     SUBMITTED, not DRAFT, once your part is filed. */
  /* radius 0, borderW 0 — the sheet has no edge but its own stock, and the
     stock is the wall (#2177). */
  const sheetStyle = { background: WALL, borderRadius: 0 };
  const statusMark = <SnideBlob width={52} height={40} struck />;
  const slip = {
    style: {
      background: FIELD,
      border: `1px solid ${RULE}`,
      /* The design left-rules the slip in the accent (#1706). It sits AFTER the
         border shorthand on purpose: a shorthand spread last would erase it. */
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
  /* The waiting footer's affirmative control is a BUTTON, not the composer's
     full-bleed bar: the bar is the sheet's one irreversible act, and taking
     your own part back out is neither irreversible nor the page's subject. */
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
            {/* Ornament, and hidden as such: the stage word is announced by the
                status row, and a masthead that announced itself would put the
                faction's chrome ahead of the page's first real content. */}
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
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: the wordmark is a poster face at its drawn optical size, not a tier of the text scale (§4a).
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
  /* NO SECOND RASTER (#2177). This was `<ComposerGround>` printing a 1px/3px
     stripe flush on the stock, which the stock did not have. The wall brings its
     own raster and its own scanline, and a third stripe over those two is moiré
     rather than xerox — the same call the praxis card's dot tooth got in that
     ruling. The dress's `ground` slot is optional (#1153's rule: a skin that
     passes nothing renders as if the slot did not exist), so the surface loses a
     layer rather than gaining an empty one. */

  const dress: ComposerDress = {
    accent: ACID_INK,
    alarm: ALARM,
    pageStyle: { fontFamily: BODY_FACE, color: INK },
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
      <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead}>
        {/* The stage word, alone (#1828). It is `composerStageWord` rather than
            the bare `Draft` key because SNIDE also prints it in the masthead,
            and the two must not contradict each other. */}
        <ComposerStatusRow
          status={composerStageWord(state)}
          statusStyle={dress.statusStyle}
        />

        {/* The task slip. Its mark is the shared ScoreStamp (#1828) — the
            press's own acid numeral by dispatch, over the praxis's real total
            rather than the task's bare figure. */}
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
              inputStyle: { ...fieldBox, fontFamily: TITLE_FACE },
            }}
          />
        </ComposerSection>

        {/* Hidden once the mode can no longer change — an unusable control is
            not drawn disabled. */}
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

        {/* The mode block: the collaborator roster, or the duel pair. */}
        {state.showInviteBox && (
          <ComposerSection
            rule={false}
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
                /* THE ONE SKIN WHOSE COMPOSER IS NOT ITS CARD SHEET, and so the
                 * only one that overrides the roster's inks (#2269, #2267).
                 *
                 * This composer wears the flyposted WALL (#2177). `snideAtoms`
                 * states the rule the wall comes with: "the inks that go on it
                 * are the `-note-*` family, which flips with it — never
                 * `-card-*`, which is pinned near-black in both themes for the
                 * slabs pasted ON the wall" (#2066). The roster and the
                 * `+ invite` chip were reading exactly that forbidden family:
                 * `--faction-snide-card-muted` is #d8d6c8, "faded newsprint
                 * grey ON INK", and on this wall it measures 1.24:1.
                 *
                 * Every value below is an existing wall-measured token — no
                 * mint, no index.css. `-composer-*` and `-note-*` are the two
                 * families `SNIDE_WALL_PAIRS` already gates against all four of
                 * this ground's readings in both themes.
                 *
                 * ACID/PRESS_INK stay the FILL pair (§ "a faction hue is a fill,
                 * not an ink") — acid is 1.35:1 as type here, so the two
                 * accent-as-TEXT sites take the pink that IS an ink instead. */
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
          {/* One panel at a time: a hidden textarea is still a tab stop and
              still submits, and drawing both puts the body in the DOM twice. */}
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
                skin={{
                  buttonStyle: punkLabel({
                    cursor: "pointer",
                    /* Translucent, so the raster reads through the drop zone
                       (#1828). */
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

        {/* The composer's ONE censor stripe (#1707). The design calls its rule
            exactly once, right above the footer; every other region is separated
            by the sheet's own gap. Five stripes redacted the page's rhythm along
            with its sections. */}
        {censorStripe}

        {/* [Cancel] … [Submit] — the global order from #646, stacked rather than
            ranged because SNIDE's cast is a bar and not a button. The exits keep
            the start, the cast keeps the end. */}
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
                    /* Design band: 15 / 400 / 0.2em in the TITLE face (Anton) —
                       a bar the width of the sheet set at the label tier reads
                       as a rule rather than as the page's one irreversible
                       action, so 15 takes --text-content. The tracking is the
                       design's 0.2em; this file had drifted to 0.24em. */
                    fontFamily: TITLE_FACE,
                    fontSize: "var(--text-content)",
                    letterSpacing: "0.2em",
                    /* The sheet's frame. SNIDE's stock has no border of its own
                       — radius 0, borderW 0 — so the band's rule takes the
                       composer's own rule ink, which is what the design's
                       `frame` resolves to for this skin. */
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

/** One already-uploaded proof item, glued to the sheet square-cornered. */
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
