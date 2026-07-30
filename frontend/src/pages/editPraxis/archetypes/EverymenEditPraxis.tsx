/**
 * The Everymen — edit praxis, composer v2 (#1187, epic #1179; design project
 * c491945e, `Everymen Edit Praxis.dc.html`, the `everymen` row of `SKINS`).
 *
 * The union's WORK ORDER: a red masthead plate flanked by two counter-rotating
 * cogs, poster rays fanning from behind it over a gold and an olive corner glow,
 * dashed red rules between every region, a rubber-stamp points seal, and a
 * full-width report bar for the cast. Bebas Neue carries every headline and
 * label; Courier Prime carries everything read.
 *
 * ## The layout is not this file's (ADR-0065 §1)
 *
 * masthead → status row → the task slip → title → how it was done → the mode
 * block → write-up → proof → footer, in that order, every region from
 * `shared.tsx`, every control from `controls.tsx` through its `*Skin` prop. This
 * file brings frame, type, ornament and motion and nothing else — no forked
 * control, no re-ordered region, no word of its own.
 *
 * ## One responsive component, no mobile twin (ADR-0065 §2)
 *
 * `useComposerSizes()` picks the size set; there is one tree at two widths, and
 * `pages/editPraxis/mobileArchetypes/EverymenEditPraxis` went with the
 * `mobileEditPraxis` surface in #1181. Mobile stacks with flow — no fixed-px
 * grid anywhere below (SPEC-faction-ui-profile §1a).
 *
 * ## Copy is the shared neutral set (ADR-0065 §3)
 *
 * The union voice this composer used to speak — `WORK REPORT №0055`, `THE CREW`,
 * `THE JOB`, `PROOF OF WORK`, `★ STAMP & FILE ★`, `VOID THE REPORT` — is
 * deleted with this issue, and the archetype reads `editPraxis.composer.*` like
 * every other skin. `editPraxis.everymen.collab` SURVIVES: that block is
 * `collabCopy`'s override table, a different resolver that also feeds
 * `CollabRoster` on `/praxis/:id`, and it is pinned by `collabCopy.test.ts`.
 *
 * The masthead plate is the one place the design puts words on the dress, and
 * the design's own word there is faction voice (`FILE YOUR REPORT`), which
 * ADR-0065's rejected alternative names outright — "a deliberately designed set
 * of near-synonyms is still the catalog the neutral rule exists to delete". So
 * the plate carries what `EverymenTaskDetail`'s masthead carries under the
 * identical neutral-copy rule (ADR-0057): the faction's NAME, a shared datum out
 * of `factions:names.*` rather than a per-surface vocabulary. Dress kept, voice
 * dropped.
 *
 * ## Colour
 *
 * Almost all of it is the `--everymen-*` family and the `-bill-` / `-sheet-`
 * roles the v2 task card and task detail already minted; only the sheet's frame
 * needed a name (`--faction-everymen-composer-frame`). Two pairings decide where
 * red may be ink:
 *
 * - The SHEET is `--everymen-paper`, on which `--faction-everymen-sheet-accent`
 *   pays only 4.49:1 (index.css says so where it is declared). So on the paper,
 *   red is a rule, a fill and a stamp — never a label.
 * - Every plate — the task slip, the fields, the tiles — is
 *   `--faction-everymen-sheet-panel`, the stock that accent was MEASURED on
 *   (4.95:1 light / 5.45:1 dark). The red labels and the stamped `pts` live
 *   there and nowhere else (WORLD_ZERO_STYLE §3, "a new ground invalidates every
 *   contrast claim").
 *
 * Light/dark flips through the `[data-theme="dark"]` cascade; there is no
 * `dark ?` branch in this file.
 *
 * ## Motion
 *
 * Two cogs on the masthead, `ep-spin` against `ep-spin-rev` — the counter-turn
 * is the whole gag, and it is the only motion here. Both are CLASSES: the
 * keyframes live in `index.css` behind the shared `prefers-reduced-motion`
 * guard, and an inline `animation:` would bypass it (#1003). `index.css` needed
 * no motion edit for this skin.
 *
 * ## Not drawn as designed
 *
 * The design offers "Forfeit the duel" at the awaiting stage. It is not drawn
 * here or anywhere: #1071 decision 3 rejected that framing against ADR-0011
 * §Forfeit, and #718 had rejected it once before — at `active` (you cast, the
 * rival has not) unsubmitting is a free neutral reopen. The duel CLOCK is cut on
 * the same decision (#1071 §4: no expiry field exists to read). The awaiting
 * stage itself belongs to `PraxisWaitingSurface` and to #1189.
 */
import { useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import { factionName } from "../../../utils/factions";
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
  RingMark,
  TaskSlip,
  TitleCounter,
  composerLabelStyle,
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
import { MetataskSealStack } from "../MetataskSealStack";
import { isWaitingStage, type EditPraxisState } from "../useEditPraxis";

interface Props {
  state: EditPraxisState;
}

/* ── The sheet's palette. Named for the ROLE each plays in the design's skin row.
 *    See the header for which reds may be ink and on what. ── */
/** The newsprint the order is printed on — the faction's own card ground. */
const PAPER = "var(--everymen-paper)";
/** The pasted-on plate: the task slip, every field, every proof tile. */
const PANEL = "var(--faction-everymen-sheet-panel)";
/** Text ink. FLIPS with the paper — deliberately not `--everymen-ink`. */
const INK = "var(--everymen-paper-text)";
const MUTED = "var(--everymen-muted)";
/** Red as a RULE or a FILL. For red as text see {@link ACCENT}. */
const RED = "var(--everymen-red)";
/** Red as INK. Only clears AA on {@link PANEL} — never set it on {@link PAPER}. */
const ACCENT = "var(--faction-everymen-sheet-accent)";
/** What is legible printed ON a red fill. */
const ON_ACCENT = "var(--faction-everymen-on-accent)";
/** The printed rule around a plate. NOT `--everymen-ink`, which vanishes dark. */
const FRAME = "var(--everymen-frame)";
/** The sheet's own frame: the design's `border`, gold by day, deep red by night. */
const SHEET_FRAME = "var(--faction-everymen-composer-frame)";
/** The masthead bar, theme-INVARIANT: an order filed at night is the same order. */
const MAST = "var(--faction-everymen-bill-mast)";
const MAST_INK = "var(--faction-everymen-bill-mast-ink)";
/** The full-width report bar at the foot of the sheet. */
const BAR = "var(--faction-everymen-bill-cta-bg)";
const BAR_INK = "var(--faction-everymen-bill-cta-ink)";
const PAPER_DEEP = "var(--everymen-paper-deep)";
const SHADOW = "var(--faction-everymen-bill-shadow)";

const BEBAS = "var(--faction-everymen-card-font)"; /* Bebas Neue */
const COURIER = "var(--font-body)"; /* Courier Prime */

/* ── The cog, the union's one glyph on this surface. Eight teeth around a hub,
 *    generated once at module load: the arithmetic is the design's own and a
 *    hand-written path would drift from it silently. The same construction the
 *    v2 task card and task detail draw — a THIRD caller now, which by
 *    WORLD_ZERO_STYLE §6 ("the module is the enforcement") is the point at which
 *    the three should collapse into one `everymenOrnament` module. That
 *    extraction touches two shipped Everymen surfaces and is outside this
 *    issue's footprint; it is raised in the PR rather than done here. ── */
const GEAR_TEETH = 8;
const GEAR_RADIUS = 9.5;
const GEAR_TIP_LENGTH = 5;
const GEAR_TIP_HALF = 1.6;
const GEAR_ROOT_HALF = 2.6;

function buildGearPath(): string {
  const point = (radius: number, angle: number): string =>
    `${12 + radius * Math.cos(angle)},${12 + radius * Math.sin(angle)}`;
  const step = (Math.PI * 2) / GEAR_TEETH;
  const tipRadius = GEAR_RADIUS + GEAR_TIP_LENGTH;
  let path = "";
  for (let tooth = 0; tooth < GEAR_TEETH; tooth++) {
    const start = tooth * step;
    const rootBefore = point(GEAR_RADIUS, start - GEAR_ROOT_HALF / GEAR_RADIUS);
    const tipBefore = point(tipRadius, start - GEAR_TIP_HALF / tipRadius);
    const tipAfter = point(tipRadius, start + GEAR_TIP_HALF / tipRadius);
    const rootAfter = point(GEAR_RADIUS, start + GEAR_ROOT_HALF / GEAR_RADIUS);
    const nextRoot = point(
      GEAR_RADIUS,
      start + step - GEAR_ROOT_HALF / GEAR_RADIUS,
    );
    path += `${tooth === 0 ? "M" : "L"}${rootBefore}L${tipBefore}L${tipAfter}L${rootAfter}`;
    path += `A${GEAR_RADIUS},${GEAR_RADIUS} 0 0 1 ${nextRoot}`;
  }
  return `${path}Z`;
}

const GEAR_PATH = buildGearPath();

/**
 * The union cog. Ornament only — aria-hidden at every call site.
 *
 * `spin` reaches the shared `ep-spin` / `ep-spin-rev` classes rather than an
 * inline `animation:`, so the pair stills itself under `prefers-reduced-motion`
 * (#1003). `--ep-spin-dur` re-times both without a second keyframe.
 */
function Gear({
  size,
  fill,
  hole,
  spin,
  duration,
}: {
  size: number;
  fill: string;
  hole: string;
  spin?: "forward" | "reverse";
  duration?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      className={
        spin === "forward" ? "ep-spin" : spin === "reverse" ? "ep-spin-rev" : undefined
      }
      style={{
        display: "block",
        flex: "0 0 auto",
        ...(duration ? ({ "--ep-spin-dur": duration } as CSSProperties) : {}),
      }}
    >
      <path d={GEAR_PATH} fill={fill} />
      <circle cx="12" cy="12" r="3" fill={hole} />
    </svg>
  );
}

export default function EverymenEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
  const sizes = useComposerSizes();
  const [tab, setTab] = useState<ComposerTab>("write");
  const praxis = state.praxis!;
  const task = state.task;
  const slug = task?.primary_faction_slug ?? praxis.task_faction_slug;

  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];
  const modeOptions: Array<{ key: PraxisType; label: string }> = [
    { key: "solo", label: t("editPraxis.composer.modeSolo") },
    { key: "collab", label: t("editPraxis.composer.modeCollab") },
    { key: "duel", label: t("editPraxis.composer.modeDuel") },
  ];

  /** Bebas, struck in tracked caps — every label and headline on the order. */
  const stencil = (overrides: CSSProperties = {}): CSSProperties =>
    composerLabelStyle({
      fontFamily: BEBAS,
      letterSpacing: "0.16em",
      ...overrides,
    });

  /** A plate: panel stock inside the printed frame rule. Radius 0 throughout. */
  const fieldBox = {
    width: "100%",
    background: PANEL,
    color: INK,
    border: `2px solid ${FRAME}`,
    borderRadius: 0,
    padding: "var(--space-md)",
    outline: "none",
    boxSizing: "border-box",
  } as const;

  /** The broadsheet's divider — one element, drawn between every region. */
  const dashRule = (
    <ComposerRule
      style={{ height: 0, background: "transparent", borderTop: `2px dashed ${RED}` }}
    />
  );

  /* The chrome, named once and mounted twice: the composer below, and the
     waiting surface once your part is in (#1189). The same ELEMENTS both
     times, so the nameplate's counter-turning cogs and the ray burst cannot
     drift between the two stages. */
  const sheetStyle = {
    background: PAPER,
    border: `2px solid ${SHEET_FRAME}`,
    borderRadius: 0,
    boxShadow: SHADOW,
  };
  const statusMark = <Gear size={40} fill={RED} hole={PANEL} />;
  const slip = {
    style: {
      background: PANEL,
      border: `2px solid ${FRAME}`,
      borderRadius: 0,
      padding: "var(--space-lg)",
    },
    labelStyle: stencil({ color: ACCENT, letterSpacing: "0.2em" }),
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
  /* The waiting footer's affirmative control is a BUTTON, not the composer's
     full-bleed bar: the bar is the order's one irreversible act, and taking
     your own part back out is neither irreversible nor the page's subject. */
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
          /* The nameplate: cog · the paper's name · cog, on the union's red bar,
             under a 3px double rule and the printed-in shadow of its own ink. */
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
            <Gear size={16} fill={MAST_INK} hole={MAST} spin="forward" duration="26s" />
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
            <Gear size={16} fill={MAST_INK} hole={MAST} spin="reverse" duration="26s" />
          </ComposerMasthead>
  );
  const ground = (
          /* Poster rays fanning from behind the masthead, a gold glow in one
             corner and an olive one in the other, all masked away from the copy.
             Anchored (inset 0, unanimated): the burst's origin is the masthead,
             and a drifting layer would walk it off the plate. */
          <ComposerGround
            inset={0}
            background={
              "radial-gradient(40% 32% at 100% 0, var(--faction-everymen-bill-glow-gold), transparent 70%),"
              + " radial-gradient(44% 38% at 0 100%, var(--faction-everymen-bill-glow-olive), transparent 70%),"
              + " repeating-conic-gradient(from 0deg at 50% 8%, var(--faction-everymen-bill-ray) 0 5.2deg, transparent 5.2deg 10.4deg)"
            }
            style={{
              /* Alpha, not colour: a mask reads only the channel, so black here
                 is "keep" and transparent is "drop" (the same literal the v2
                 task card's mask carries). */
              WebkitMaskImage:
                "radial-gradient(130% 70% at 50% 8%, #000 40%, transparent 92%)",
              maskImage:
                "radial-gradient(130% 70% at 50% 8%, #000 40%, transparent 92%)",
            }}
          />
  );

  const dress: ComposerDress = {
    accent: ACCENT,
    pageStyle: { fontFamily: COURIER, color: INK },
    breadcrumbInk: MUTED,
    sheetStyle,
    masthead,
    ground,
    rule: () => dashRule,
    mark: statusMark,
    statusStyle: stencil({ color: INK, letterSpacing: "0.2em" }),
    metaStyle: { color: MUTED },
    labelStyle: stencil({ color: INK, letterSpacing: "0.2em" }),
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
          inkColor={MUTED}
        />
      }
    >
      <ComposerSheet
        sizes={sizes}
        style={sheetStyle}
        masthead={masthead}
        ground={ground}
      >
        {/* Draft · saved just now, with a cog turning at the end of the row. */}
        <ComposerStatusRow
          status={t("editPraxis.composer.statusDraft")}
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

        {/* The job reference slip, on plate stock with the stamped points seal. */}
        <TaskSlip
          praxis={praxis}
          task={task}
          {...slip}
          mark={
            <RingMark
              size={76}
              inset={4}
              ring="transparent"
              inner="transparent"
              style={{
                boxSizing: "border-box",
                borderRadius: "50%",
                border: `2px solid ${RED}`,
                boxShadow: `inset 0 0 0 3px ${PANEL}, inset 0 0 0 4px ${RED}`,
              }}
            >
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-xs)",
                }}
              >
                <span
                  style={{
                    fontFamily: BEBAS,
                    fontSize: "var(--text-title)",
                    lineHeight: 0.8,
                    color: ACCENT,
                  }}
                >
                  {task?.point_value ?? 0}
                </span>
                <span style={stencil({ color: ACCENT, letterSpacing: "0.22em" })}>
                  {t("editPraxis.composer.pointsUnit")}
                </span>
              </span>
            </RingMark>
          }
        />

        <ComposerSection
          label={t("editPraxis.composer.titleLabel")}
          htmlFor="composer-title"
          rule={dashRule}
          meta={<TitleCounter length={state.title.length} color={MUTED} />}
          labelStyle={stencil({ color: INK, letterSpacing: "0.2em" })}
        >
          <TitleField
            state={state}
            skin={{
              id: "composer-title",
              placeholder: t("editPraxis.composer.titlePlaceholder"),
              inputStyle: {
                ...fieldBox,
                fontFamily: BEBAS,
                letterSpacing: "0.02em",
              },
            }}
          />
        </ComposerSection>

        {/* How it was done — hidden once the mode can no longer change, per the
            house rule that an unusable control is not drawn disabled. */}
        {!state.controlsLocked && (
          <ComposerSection
            label={t("editPraxis.composer.modeLabel")}
            rule={dashRule}
            labelStyle={stencil({ color: INK, letterSpacing: "0.2em" })}
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
                allowedModes,
                renderOption: (option, { active, disabled, onSelect }) => (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={active}
                    onClick={onSelect}
                    disabled={disabled && !active}
                    style={stencil({
                      cursor: disabled ? "not-allowed" : "pointer",
                      padding: "var(--space-sm) var(--space-lg)",
                      borderRadius: 0,
                      background: active ? RED : PANEL,
                      color: active ? ON_ACCENT : INK,
                      border: `2px solid ${FRAME}`,
                      boxShadow: active ? `4px 4px 0 ${FRAME}` : "none",
                    })}
                  >
                    {option.label}
                  </button>
                ),
              }}
            />
          </ComposerSection>
        )}

        {/* The mode block: the crew roster, or the duel pair. One control draws
            both — `InviteSearch` switches on `state.duelMode`. */}
        {state.showInviteBox && (
          <ComposerSection
            label={
              state.duelMode
                ? t("editPraxis.composer.opponentLabel")
                : t("editPraxis.composer.collaboratorsLabel", {
                    count: praxis.members.length,
                  })
            }
            rule={dashRule}
            labelStyle={stencil({ color: INK, letterSpacing: "0.2em" })}
          >
            <InviteSearch
              state={state}
              skin={{
                fontFamily: COURIER,
                inputBg: PANEL,
                inputColor: INK,
                inputBorder: `2px solid ${FRAME}`,
                dropdownBg: PANEL,
                dropdownBorder: `2px solid ${FRAME}`,
                acceptedBg: RED,
                acceptedColor: ON_ACCENT,
                pendingColor: INK,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { color: MUTED },
              }}
            />
          </ComposerSection>
        )}

        {state.showSealStack && (
          <ComposerSection
            label={t("editPraxis.composer.sealsLabel")}
            rule={dashRule}
            labelStyle={stencil({ color: INK, letterSpacing: "0.2em" })}
          >
            <MetataskSealStack state={state} />
          </ComposerSection>
        )}

        {/* Write-up — the tabs sit in the section's meta slot, so the label row
            reads `Write-up … [Write|Preview]` as the design draws it. */}
        <ComposerSection
          label={t("editPraxis.composer.writeUpLabel")}
          htmlFor="composer-body"
          rule={dashRule}
          labelStyle={stencil({ color: INK, letterSpacing: "0.2em" })}
          meta={
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
          }
        >
          {/* Mounted one at a time: a hidden textarea is still a tab stop and
              would put the body in the DOM twice. */}
          {tab === "write" ? (
            <>
              <BodyTextarea
                state={state}
                skin={{
                  id: "composer-body",
                  rows: 9,
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
              <div
                style={stencil({
                  color: MUTED,
                  fontFamily: COURIER,
                  letterSpacing: "0.12em",
                  marginTop: "var(--space-sm)",
                })}
              >
                {t("editPraxis.composer.wordCount", { words: state.wordCount })}
              </div>
            </>
          ) : (
            <BodyPreview
              state={state}
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
          rule={dashRule}
          labelStyle={stencil({ color: INK, letterSpacing: "0.2em" })}
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
                state={state}
                skin={{
                  buttonStyle: stencil({
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-sm)",
                    cursor: "pointer",
                    background: "transparent",
                    border: `2px dashed ${RED}`,
                    borderRadius: 0,
                    padding: "var(--space-lg) var(--space-xl)",
                    color: INK,
                  }),
                  buttonLabel: t("editPraxis.composer.proofButton"),
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

        <ErrorBanner message={state.error} />

        {dashRule}

        {/* [Cancel] … [Submit] — the global order from #646, stacked so the cast
            reads as a BAR rather than an inline button (the design's
            `barSubmit`). The exits keep their own row above it. */}
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
              <SaveDraftButton state={state} skin={{ style: { color: MUTED } }} />
              <DropButton
                state={state}
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
            </div>
          }
          end={
            <PublishButton
              state={state}
              skin={{
                idleLabel: t("editPraxis.composer.submit"),
                busyLabel: t("editPraxis.composer.submitBusy"),
                style: {
                  ...primaryStyle,
                  width: "100%",
                  cursor: state.submitting ? "wait" : "pointer",
                  borderTop: `2px solid ${FRAME}`,
                  padding: "var(--space-md) var(--space-lg)",
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

/** One filed proof, stamped onto a plate and pinned to the order. */
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
