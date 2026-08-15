/**
 * S.N.I.D.E. edit praxis — composer v2 (#1184, epic #1179; design project
 * c491945e, `Snide Edit Praxis.dc.html`, the `snide` row of `SKINS`).
 *
 * The same page `DefaultEditPraxis` draws, wearing SNIDE's dress: a xerox sheet
 * flyposted to the wall. Every region, every control and every word is shared
 * (ADR-0065); what belongs to this file is the frame, the type, the ornament and
 * the marks.
 *
 * ## The dress
 *
 * **Geometry — radius 0, borderW 0.** SNIDE is the one skin that draws no card
 * border at all, so the sheet is a hard-cornered rectangle with nothing around
 * it: what separates it from the page is the stock, the grain and the tape. The
 * shared sheet's default 10px radius is overridden here rather than inherited.
 *
 * **Masthead** — a near-black bar carrying the wordmark in acid, a dashed acid
 * rule that flexes to fill, and the stage word. All three are ornament: the bar
 * is `aria-hidden`, because the stage is announced once, by the status row
 * underneath it. The zine says DRAFT twice on purpose; a screen reader hears it
 * once.
 *
 * **Ground** — the photocopier raster plus two tape strips, both running off the
 * sheet's edge. They can only do that because `ComposerSheet` owns the
 * `overflow: hidden` clip: the ground is the COLUMN's, never the viewport's
 * (#1028, the trap six of eight task-detail skins fell into).
 *
 * **Section rule** — the censor stripe, a solid redaction bar rather than a
 * hairline.
 *
 * **The two marks** are one hand-drawn blob at two sizes: the points blob with
 * its numeral and `PTS` caption, and the status blob with a check struck through
 * in pen. They are NOT `RingMark` — that block is a ring with its middle punched
 * out, and this design's mark is a splat. They are passed through the same two
 * mark SLOTS (`TaskSlip.mark`, `ComposerStatusRow.mark`), which is the seam that
 * matters.
 *
 * **Submit** — a full-bleed acid bar, not an inline button. The shared
 * `ComposerFooter` already expressed it: its `style` prop turns the row into a
 * stretched column, and the sheet's bottom padding is dropped so the bar can
 * land flush on the sheet's edge. No footer was forked and no bar helper added.
 *
 * ## Colour
 *
 * Every value is a `--faction-snide-*` token, so the sheet flips through the
 * `[data-theme="dark"]` cascade with no `dark ?` branch anywhere below. Two
 * families are deliberately kept apart: `-composer-*` is the SHEET (it flips),
 * and `-acid`/`-ink`/`-pink` are the PRESS (they do not). Type printed on an
 * acid ground reads the press's ink in both themes — paper-white on acid green
 * measures 1.2:1.
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
  Breadcrumb,
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
  TitleCounter,
  composerLabelStyle,
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
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";

interface Props {
  state: EditPraxisState;
}

/* THE SHEET — flips with the theme (xerox stock by day, photocopier black by
 * night), so nothing below branches on it. */
const SHEET = "var(--faction-snide-composer-sheet)";
const INK = "var(--faction-snide-composer-ink)";
const MUTED = "var(--faction-snide-composer-muted)";
const FAINT = "var(--faction-snide-composer-faint)";
const FIELD = "var(--faction-snide-composer-field)";
const RULE = "var(--faction-snide-composer-rule)";
const BAR = "var(--faction-snide-composer-bar)";
const GRAIN = "var(--faction-snide-composer-grain)";
/* Acid as TEXT: deep in the light half, bright on the dark stock. */
const ACID_INK = "var(--faction-snide-composer-acid-ink)";
/* The error banner's ink (#1231), and the one skin in the set that could not
 * take `--faction-snide-card-alarm`: the CARD is photocopier-black in both
 * themes (§6) so that rung is pinned bright and reads 1.56:1 on the light
 * xerox stock, while THIS sheet flips. 4.97:1 light / 5.83:1 dark under the
 * neutral veil, which — per ADR-0061 — stays neutral. */
const ALARM = "var(--faction-snide-composer-alarm)";

/* THE PRESS — theme-invariant pigments. `ACID` is acid as a DRAWN THING (the
 * masthead rule, the blobs, the submit bar), and `PRESS_INK` is the near-black
 * that prints on it in either theme. Pairing acid with the sheet's ink instead
 * would put paper-white type on acid green under [data-theme="dark"]. */
const ACID = "var(--faction-snide-acid)";
const PRESS_INK = "var(--faction-snide-ink)";
const PRESS_PAPER = "var(--faction-snide-paper)";
const HOT_PINK = "var(--faction-snide-pink)";

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
        {struck && (
          <>
            <polyline
              points="28,36 41,50 66,22"
              fill="none"
              stroke={PRESS_INK}
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="10"
              y1="58"
              x2="84"
              y2="15"
              stroke={HOT_PINK}
              strokeWidth={6}
              strokeLinecap="round"
            />
          </>
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
    outline: "none",
    boxSizing: "border-box",
  } as const;

  /* The censor stripe, this skin's section divider. Every section gets its own
   * (the shared block draws a hairline otherwise). */
  const censorStripe = <ComposerRule style={{ height: 10, background: BAR }} />;

  /* The submit bar's bleed: the sheet's own side padding, negated. Not a value
   * off the scale — the same token, running the other way, which is the only
   * way a child of a padded column reaches its parent's edge. */
  const sidePad = sizes.isMobile ? "var(--space-lg)" : "var(--space-2xl)";

  /* The chrome, named once and mounted twice: the composer below, and the
     waiting surface once your part is in (#1189). The same ELEMENTS both
     times, so the acid bar, the raster and the tape cannot drift between the
     two stages. The masthead's stage word travels with them — it reads
     SUBMITTED, not DRAFT, once your part is filed. */
  /* radius 0, borderW 0 — the sheet has no edge but its own stock. */
  const sheetStyle = { background: SHEET, borderRadius: 0 };
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
  const ground = (
          <ComposerGround
            background={`repeating-linear-gradient(0deg, ${GRAIN} 0 1px, transparent 1px 3px)`}
            /* Flush, not overhanging: the raster is printed on the sheet, and
               only the tape is allowed to run off it. */
            inset={0}
          >
            <span
              className="snide-tape"
              style={{
                width: 110,
                height: 26,
                right: -26,
                top: 64,
                transform: "rotate(-38deg)",
                opacity: 0.75,
              }}
            />
            <span
              className="snide-tape"
              style={{
                width: 96,
                height: 22,
                left: -30,
                bottom: 96,
                transform: "rotate(34deg)",
                opacity: 0.6,
              }}
            />
          </ComposerGround>
  );

  const dress: ComposerDress = {
    accent: ACID_INK,
    alarm: ALARM,
    pageStyle: { fontFamily: BODY_FACE, color: INK },
    sheetStyle,
    masthead,
    ground,
    rule: () => censorStripe,
    mark: statusMark,
    statusStyle: { color: INK, fontWeight: 700, letterSpacing: "0.2em" },
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
    return <PraxisWaitingSurface state={state} dress={dress} />;
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
        />
      }
    >
      <ComposerSheet
        sizes={sizes}
        style={sheetStyle}
        /* Bottom padding goes to the full-bleed submit bar below. */
        contentStyle={{ paddingBottom: 0 }}
        masthead={masthead}
        ground={ground}
      >
        <ComposerStatusRow
          status={composerStageWord(state)}
          meta={
            state.autosaveAt
              ? t("editPraxis.composer.statusSaved", {
                  ago: formatAutosave(state.autosaveAt),
                })
              : t("editPraxis.composer.statusUnsaved")
          }
          statusStyle={dress.statusStyle}
          metaStyle={dress.metaStyle}
          mark={statusMark}
        />

        <TaskSlip
          praxis={praxis}
          task={task}
          {...slip}
          mark={
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-xs)",
                flexShrink: 0,
              }}
            >
              <SnideBlob width={94} height={72}>
                <span
                  style={{
                    position: "relative",
                    fontFamily: TITLE_FACE,
                    fontSize: "var(--text-title)",
                    lineHeight: 1,
                    color: PRESS_INK,
                  }}
                >
                  {task?.point_value ?? 0}
                </span>
              </SnideBlob>
              <span style={punkLabel({ color: ACID_INK, letterSpacing: "0.2em" })}>
                {t("editPraxis.composer.pointsUnit")}
              </span>
            </span>
          }
        />

        <ComposerSection
          label={t("editPraxis.composer.titleLabel")}
          htmlFor="composer-title"
          rule={false}
          meta={<TitleCounter length={state.title.length} color={FAINT} />}
          labelStyle={{ color: MUTED }}
        >
          <TitleField
            state={state}
            skin={{
              id: "composer-title",
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
              state={state}
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
                      fontWeight: active ? 700 : 400,
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
              state={state}
              skin={{
                fontFamily: BODY_FACE,
                inputBg: FIELD,
                inputColor: INK,
                inputBorder: `1px solid ${RULE}`,
                dropdownBg: SHEET,
                dropdownBorder: `1px solid ${RULE}`,
                acceptedBg: ACID,
                acceptedColor: PRESS_INK,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { color: FAINT, fontFamily: BODY_FACE },
              }}
            />
          </ComposerSection>
        )}

        {state.showSealStack && (
          <ComposerSection
            label={t("editPraxis.composer.sealsLabel")}
            rule={false}
            labelStyle={{ color: MUTED }}
          >
            <MetataskSealStack state={state} />
          </ComposerSection>
        )}

        <ComposerSection
          label={t("editPraxis.composer.writeUpLabel")}
          htmlFor="composer-body"
          rule={false}
          labelStyle={{ color: MUTED }}
          meta={
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
          }
        >
          {/* One panel at a time: a hidden textarea is still a tab stop and
              still submits, and drawing both puts the body in the DOM twice. */}
          {tab === "write" ? (
            <>
              <BodyTextarea
                state={state}
                skin={{
                  id: "composer-body",
                  rows: 8,
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
              <div
                style={punkLabel({
                  color: FAINT,
                  marginTop: "var(--space-sm)",
                  letterSpacing: "0.06em",
                })}
              >
                {t("editPraxis.composer.wordCount", { words: state.wordCount })}
              </div>
            </>
          ) : (
            <BodyPreview
              state={state}
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
                state={state}
                skin={{
                  buttonStyle: punkLabel({
                    cursor: "pointer",
                    background: "transparent",
                    border: `1px dashed ${RULE}`,
                    borderRadius: 0,
                    padding: "var(--space-2xl) var(--space-lg)",
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    color: MUTED,
                  }),
                  buttonLabel: t("editPraxis.composer.proofButton"),
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
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: "var(--space-lg)",
          }}
          start={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-lg)",
                flexWrap: "wrap",
              }}
            >
              <SaveDraftButton
                state={state}
                skin={{ style: { color: FAINT, fontFamily: BODY_FACE } }}
              />
              <DropButton
                state={state}
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
            </div>
          }
          end={
            <PublishButton
              state={state}
              skin={{
                idleLabel: t("editPraxis.composer.submit"),
                busyLabel: t("editPraxis.composer.submitBusy"),
                style: punkLabel({
                  display: "block",
                  width: "auto",
                  /* The bleed: the sheet's own side padding, negated, so the bar
                     reaches both edges of a padded column. */
                  marginLeft: `calc(-1 * ${sidePad})`,
                  marginRight: `calc(-1 * ${sidePad})`,
                  padding: "var(--space-lg) var(--space-xl)",
                  border: "none",
                  borderRadius: 0,
                  background: ACID,
                  color: PRESS_INK,
                  fontFamily: TITLE_FACE,
                  /* A bar the width of the sheet set at the label tier reads as
                     a rule rather than as the page's one irreversible action. */
                  fontSize: "var(--text-content)",
                  letterSpacing: "0.24em",
                  cursor: state.submitting ? "wait" : "pointer",
                }),
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
