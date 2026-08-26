/**
 * The Everymen — edit praxis, composer v2 (#1187, epic #1179; design project
 * c491945e, `Everymen Edit Praxis.dc.html`, the `everymen` row of `SKINS`).
 *
 * The union's WORK ORDER: a red masthead plate flanked by two counter-rotating
 * cogs, poster rays fanning from behind it over a gold and an olive corner glow,
 * one dashed red rule above the footer, a rubber-stamp points seal, and a
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
 * every other skin. `editPraxis.everymen.collab` survived this issue — it was
 * `collabCopy`'s override table rather than composer copy — but #1812 then
 * deleted all eight of those: collab submission status speaks one vocabulary on
 * every faction. `collabCopy.test.ts` pins the absence.
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
 * is the whole gag — and a third on the waiting surface's hero mark, forward,
 * which the design turns too (#1830). All three are CLASSES: the keyframes live
 * in `index.css` behind the shared `prefers-reduced-motion` guard, and an
 * inline `animation:` would bypass it (#1003). `index.css` needed no motion
 * edit for this skin; the period comes through `--ep-spin-dur` ({@link
 * COG_PERIOD}).
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

interface Props {
  state: EditPraxisState;
}

/* ── The sheet's palette. Named for the ROLE each plays in the design's skin row.
 *    See the header for which reds may be ink and on what. ── */
/** The newsprint the order is printed on — the faction's own card ground. */
const PAPER = "var(--everymen-paper)";
/* The error banner's ink (#1231). The banner sits straight on the sheet, and
 * the neutral `--color-danger` under its own veil misses AA there in light
 * (3.47:1 on this ground); this is #1449's alarm rung, already measured
 * on paper. The veil and the edge stay neutral — ADR-0061. */
const ALARM = "var(--faction-everymen-card-alarm)";
/** The pasted-on plate: the task slip, every field, every proof tile. */
const PANEL = "var(--faction-everymen-sheet-panel)";
/** Text ink. FLIPS with the paper — deliberately not `--everymen-ink`. */
const INK = "var(--everymen-paper-text)";
/* THE QUIET RUNG IS `--everymen-quiet`, NOT `--everymen-muted` (#2485). The
 * sheet mounts `.em-burst` — two corner glows and the ray fan — so the stock
 * under a label is the washed paper, not the bare token. Measured on that
 * composite the muted brown reads 4.26:1 under the gold corner and 4.09:1 under
 * the olive in LIGHT, where it is 5.09 flat; `--everymen-quiet` is #1173's
 * sibling rung, minted for "the muted role, one stock further down", and clears
 * both (4.78 / 4.58). In dark it ALIASES `--everymen-muted`, so nothing moves at
 * night — right, because the wash lifts a dark ground and muted already cleared
 * there. `EverymenCreateCharacter` shipped this swap on the same burst (#2352)
 * and `everymenCreateCharacterContrast.test.ts` records the refusal.
 *
 * The name still reads MUTED because that is the ROLE it plays in the design's
 * skin row; what changed is which rung of the family answers for it here. */
const MUTED = "var(--everymen-quiet)";
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

const BEBAS = "var(--ev-compose-face)"; /* Bebas Neue */
const COURIER = "var(--font-body)"; /* Courier Prime */

/** The cogs' period, the design's own 22s. It had drifted to 26 (#1830). The
 *  cog itself is {@link EverymenCog}, shared since #2121 — this surface is the
 *  only one that turns it, so the timing stays here with the callers. */
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

  /**
   * Bebas, struck in tracked caps — every label and headline on the order.
   *
   * The size is the Everymen's own (#1828): the design draws this kit's label at
   * 13 where the other seven sit at 12, and `composerLabelStyle`'s 12 is a
   * default rather than a ceiling. 13 falls between --text-lg and --text-xl and
   * takes the louder rung, because being a size larger than the rest of the site
   * IS the distinction here (§4a — a token names a tier, so the number lands
   * where it lands).
   *
   * The tracking is the design's `label.spacing` of 0.2em (#1830). It used to
   * default to 0.16em with the loud slots — the labels, the status word, the
   * slip — overriding back up, which left the quiet ones (mode chips, write-up
   * tabs, picker, exits, slip pill) stencilled a step tighter than the row they
   * sat in. The masthead wordmark still says 0.16em, out of its own line in the
   * design; it is chrome on the plate, not a label on the paper.
   */
  const stencil = (overrides: CSSProperties = {}): CSSProperties =>
    composerLabelStyle({
      fontFamily: BEBAS,
      fontSize: "var(--text-xl)",
      letterSpacing: "0.2em",
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
    boxSizing: "border-box",
  } as const;

  /**
   * The broadsheet's rule — one element, drawn ONCE, above the footer (#1707).
   * The design calls its rule once and separates the regions with the sheet's
   * own gap; seven dashed reds read as a form to be filled in, not a work order.
   */
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
  /* The waiting surface's hero mark: `gear(40, accent, field, 1)` in the design
     row — the SHEET accent rather than the rule red, on the panel stock, and
     turning forward like the pair on the nameplate. It was drawn in `--everymen-
     red` and stilled; a cog that has stopped is the one thing this metaphor
     cannot say on a page whose whole message is that the work is in hand
     (#1830). It is a mark on a plate, not type, so the accent's 4.49:1 on the
     paper is not the measurement that governs it. */
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
      /* The design left-rules the slip in the accent (#1706). It sits AFTER the
         border shorthand on purpose: a shorthand spread last would erase it. */
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
          /* The faction's ONE ornament (#2195). The work order transcribed the
             bill's burst with its own origin (50% 8%) and its own mask — one of
             the nine Everymen geometries the owner collapsed, and one of the two
             the epic's survey missed. It mounts the shared drawing now.

             Not a `ComposerGround`: that component's job is the position, the
             inset and the drift, and `.em-burst` already carries an anchored
             inset-0 layer with `pointer-events: none`. The composer never
             stands on a faction backdrop, so it wears the ornament always and
             takes no alternation branch. */
          <div aria-hidden className="em-burst" />
  );

  const dress: ComposerDress = {
    accent: ACCENT,
    alarm: ALARM,
    // `pageStyle` is the root of BOTH stages — the composer page here and the
    // shared waiting surface the dress is handed to — so declaring the role map
    // in it reaches everything this archetype draws (#2676).
    pageStyle: {
      ...factionRoleVars("everymen", "ev-compose"),
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
        {/* `Draft`, alone (#1828). The autosave line moved to the write-up
            header; the cog is the waiting surface's beat. */}
        <ComposerStatusRow
          status={t("editPraxis.composer.statusDraft")}
          statusStyle={dress.statusStyle}
        />

        {/* The job reference slip, on plate stock. Its mark is the shared
            ScoreStamp (#1828) — the Everymen's own rubber-stamp roundel by
            dispatch, so the seal no longer changes shape when you file. */}
        <TaskSlip praxis={praxis} task={task} {...slip} />

        {/* No visible label since #2179, which reverses #2093's VISIBLE
            half: the placeholder carries the field's name on screen and
            `titleLabel` carries it in the accessible tree. Both live in
            `TitleField`, so there is nothing per-faction here. */}
        <ComposerSection rule={false}>
          <TitleField
            state={state}
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

        {/* How it was done — hidden once the mode can no longer change, per the
            house rule that an unusable control is not drawn disabled. */}
        {!state.controlsLocked && (
          <ComposerSection
            label={t("editPraxis.composer.modeLabel")}
            rule={false}
            labelStyle={stencil({ color: INK })}
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
                    /* The chosen mode takes the kit's CTA fill, which for the
                       Everymen is the report bar's near-black — the design's
                       control dress says a faction's active state is "its CTA
                       fill … never a generic accent block", and a red block
                       under an offset shadow was the union's one irreversible
                       act restated on a control that only chooses how you file
                       (#1830). */
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

        {/* The mode block: the crew roster, or the duel pair. One control draws
            both — `InviteSearch` switches on `state.duelMode`. */}
        {state.showInviteBox && (
          <ComposerSection
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
            rule={false}
            labelStyle={stencil({ color: INK })}
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
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { color: MUTED },
                /* The broadsheet is set in square rules, and `fieldBox` is
                 * already `borderRadius: 0`; the collab chips were the one
                 * region still rounding itself. `MUTED` IS
                 * `--faction-everymen-card-muted` (index.css aliases the two),
                 * so the roster's ink is unchanged and only the `+ invite`
                 * chip stops reading the task's faction. */
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
            <MetataskSealStack state={state} />
          </ComposerSection>
        )}

        {/* Write-up — the tabs and the autosave line sit in the section's meta
            slot, and since #2085 that slot is the whole row: the `Write-up`
            heading said nothing the box's own placeholder does not. The editor
            keeps its accessible name from `bodyContentAttributes`. */}
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
          {/* Mounted one at a time: a hidden textarea is still a tab stop and
              would put the body in the DOM twice. */}
          {tab === "write" ? (
            <BodyTextarea
              state={state}
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
                state={state}
                skin={{
                  buttonStyle: stencil({
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-sm)",
                    cursor: "pointer",
                    /* Translucent, so the ray burst reads through the drop zone
                       (#1828). */
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

        {/* [Cancel] … [Submit] — the global order from #646, stacked so the cast
            reads as a BAR rather than an inline button (the design's
            `barSubmit`). The exits keep their own row above it. */}
        <ComposerFooter
          band
          start={
            <>
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
            </>
          }
          end={
            <PublishButton
              state={state}
              skin={{
                idleLabel: t("editPraxis.composer.submit"),
                busyLabel: t("editPraxis.composer.submitBusy"),
                style: {
                  ...composerBandStyle(sizes, {
                    /* Design band: 15 / 400 / 0.22em in the label face, which
                       for the Everymen IS Bebas. 15 takes --text-content so the
                       band still outranks this kit's own labels. */
                    fontFamily: BEBAS,
                    fontSize: "var(--text-content)",
                    letterSpacing: "0.22em",
                    /* The SHEET's frame — gold in light, red-deep in dark — and
                       NOT `--everymen-frame`, which is the ink the panels are
                       ruled in. */
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
