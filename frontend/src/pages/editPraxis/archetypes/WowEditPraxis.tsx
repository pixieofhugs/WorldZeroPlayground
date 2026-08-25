/**
 * Warriors of Whimsy — THE WRIT, WOW's edit-praxis composer (#1183, epic #1179;
 * design project c491945e, `Warrior of Whimsy Edit Praxis.dc.html`, the `wow`
 * row of that file's `SKINS` table).
 *
 * A quest is ISSUED by decree, proof is RECORDED in the chronicle (ADR-0050,
 * #899) — and this is the page the chronicle is WRITTEN on, before the ink is
 * dry. `WowTaskDetail` is the parchment field the decree is posted on,
 * `WowPraxisDetail` is the finished entry; this is the writing desk between
 * them, and it wears the same three things all three share: a barber ribbon at
 * the head, a gilt frame, and one wavy gold→plum rule closing the sheet.
 *
 * ## What this file owns, and what it does not (ADR-0065)
 *
 * The LAYOUT and the API are `shared.tsx`'s and `controls.tsx`'s; only DRESS is
 * here. The regions and their order —
 *
 *   masthead → status row → the task slip → title → how it was done →
 *   mode block (roster or duel pair) → write-up → proof → footer
 *
 * — are the layout contract's and are not varied, and every control is composed
 * through its `*Skin` prop rather than forked. `DefaultEditPraxis` is the
 * reference implementation of the same page; the diff between the two files is
 * the whole of WOW's identity on this surface.
 *
 * One responsive component: `useComposerSizes()` picks the size set and
 * `sizes.isMobile` scales the two corner ornaments. There is no mobile twin —
 * `mobileEditPraxis` retired outright with #1181 (ADR-0065 §2).
 *
 * ## Copy — none of its own (ADR-0065 §3)
 *
 * Every string comes from the shared neutral `editPraxis.composer.*` block. The
 * knightly vocabulary this page used to carry — *The Squire's Writ*, *Title of
 * thy Chronicle*, *Seal & Publish*, *Discard the Writ* — is **deleted**, not
 * relocated: `editPraxis.wow.*` is gone from `forms.json` with this issue. WOW
 * was also the one faction with no `editPraxis.wow.collab` override table (it
 * reads the shared tier for every roster key, which `collabCopy.test.ts` pins by
 * name), so nothing had to be held back from the deletion.
 *
 * ## The dress
 *
 * - **Type.** MedievalSharp for the title face (`--faction-wow-card-font`), Lora
 *   for body and labels (`--faction-wow-body-font`) — WOW's two faces, §3. Note
 *   that the label face is the BODY one here, which is why every `labelStyle`
 *   passes `fontFamily`: `composerLabelStyle` defaults to Courier Prime.
 * - **Geometry.** radius 6, borders 1.5px, and the border takes gold — the
 *   sheet, the fields, the slip and the plaque are all framed in the same gilt.
 *   TWO gilts, strictly: see {@link RULE} for the quiet half and where it goes.
 * - **Masthead.** The 7px gold/plum barber ribbon, straight off
 *   `--faction-wow-quest-ribbon` (the composed token the quest decree already
 *   ships: `0 11px` gold, `11px 22px` plum, which is the design's band exactly).
 *   Decorative, so `aria-hidden` — the shared masthead's default.
 * - **Ground.** A bunch of googly balloons floating at the bottom-right, and
 *   nothing else: the dashed gold ring that used to turn at the top-right is
 *   dropped with #1830, because #1828 gave the bottom edge to the full-bleed
 *   cast band and the design answers it by lifting the balloons clear and
 *   leaving them alone on the layer. The bunch lives on `ComposerGround`, which
 *   the sheet CLIPS — the site background still shows around the column and no
 *   ornament here can reach the viewport (#1028).
 * - **Rule.** The zigzag: `Zig`, from the faction's one ornament module. Drawn
 *   ONCE, above the footer (#1707) — the design calls its rule once and lets
 *   whitespace separate the regions; six zigzags made a ladder of the sheet.
 *   `dress.rule` still takes a key, because the waiting surface asks for its
 *   own instance and two `<linearGradient>`s may not share an id.
 * - **Points mark.** A plaque struck at -2.5deg in a 2px gold frame: the figure
 *   in burnt gold beside a gold ✦, with the unit in plum italic beneath.
 * - **Status mark.** A ✦ in the title face, at gold.
 * - **Submit.** An inline gold button with a trailing ✦.
 *
 * Every ornament comes from `components/factionMarks/wowOrnament.tsx`, the faction's
 * one primitive set (§6/#849). This file draws no balloon and no rule of its own.
 *
 * ## Two WOW rules that are load-bearing, not taste (§3)
 *
 * - **The gilt is theme-invariant and is never an ink.**
 *   `--faction-wow-chronicle-gold` measures 2.24:1 on the cream, so it frames,
 *   rules and fills and never sets text. Where gold has to be READ — the plaque's
 *   figure, the submit button's label — the pairing is a different token:
 *   `--faction-wow-stamp-total` as ink, `--faction-wow-on-gold` (7.64:1 on the
 *   gold, both themes) on the fill. There is no `dark ?` anywhere below; the flip
 *   is the `[data-theme="dark"]` cascade's. That was `-on-fill` until #2068 gave
 *   the spine hue a plum, at which point `-on-fill` had to go white in light and
 *   white on this gold is 2.47:1 — one ink, two grounds of opposite polarity, so
 *   the gold role took its own name at the value it always had.
 * - **`--faction-wow-card-muted` is legible on the CREAM and not on the PANEL.**
 *   4.77:1 on `--faction-wow-card-bg`, 4.25:1 on `--faction-wow-chronicle-panel`
 *   — a pairing, not a property (§3, #1028). So the muted ink is spent only on
 *   the sheet, and quiet text that lands on a parchment field takes
 *   `--faction-wow-accent-deep` instead (5.32:1 on the cream, 4.74:1 on the
 *   panel — the one ink measured on both chronicle grounds). That is also why
 *   the task slip sits on the SHEET's cream inside a gold frame rather than on
 *   the darker panel: the task's own description is content at the floor, and
 *   the frame is what makes it a plate.
 *
 * ## Motion
 *
 * `.wow-balloon-bunch` and `.wow-balloon-eye`, both inside the bunch — the
 * page's only two since the turning ring went (#1830). Both are CLASSES whose
 * keyframes live in `index.css` behind the shared `prefers-reduced-motion`
 * guard; an inline `animation:` would bypass it (#1003). Nothing here carries
 * state, so the page reads correctly stilled.
 *
 * ## Not drawn as designed
 *
 * The design offers "Forfeit the duel" at the awaiting stage. It is not drawn
 * here or anywhere: #1071 decision 3 rejected that framing against ADR-0011
 * §Forfeit — at `active` (you cast, the rival has not) unsubmitting is a free
 * neutral reopen, and #718 had already rejected it once. The duel CLOCK is cut
 * for the same reason (#1071 decision 4: there is no expiry field to read). The
 * awaiting stage itself belongs to `PraxisWaitingSurface` and to #1189.
 *
 * The design's marks are a plaque and a glyph, so neither reaches for the shared
 * `RingMark`: that block is the shared GEOMETRY for the two mark slots, not a
 * requirement that a skin's marks be rings. Both slots take a `ReactNode`.
 */
import { useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { factionRoleVars } from "../../../utils/factionRoles";
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

/* ── WOW's two faces (§3) ── */
/**
 * MedievalSharp — the chronicle's display hand.
 *
 * THE FIVE CORE ROLES ARE ASKED FOR BY NAME (#2674). `dress.pageStyle` below
 * spreads `factionRoleVars('wow', 'wow-edit-praxis')`, and `ComposerPage` puts
 * that object straight on its root element — so the prefix is declared on the
 * page this file dresses without a prop being added to a shared block, which
 * would be tree work rather than paint.
 *
 * Every read carries today's token as its fallback. The palette below that is
 * NOT a role stays exactly where it is: the alarm rung, the inset parchment
 * plate, the plate's own quiet register, the label olive, the plum FILL and its
 * ink are this surface's extras, each one measured against a ground the core
 * vocabulary does not name (decision 07).
 */
const MED = "var(--wow-edit-praxis-face, var(--faction-wow-card-font))";
/** Lora — body AND label on this surface, per the design's type row. */
const LORA = "var(--faction-wow-body-font)";

/* ── The chronicle palette. Every one a shipped --faction-wow-* token. ── */
/** The sheet: cream parchment by day, the deep ground by night. */
const SHEET = "var(--wow-edit-praxis-paper, var(--faction-wow-card-bg))";
/* The error banner's ink (#1231). The banner sits straight on the sheet, and
 * the neutral `--color-danger` under its own veil misses AA there in light
 * (4.08:1 on this ground); this is #1449's alarm rung, already measured
 * on paper. The veil and the edge stay neutral — ADR-0061. */
const ALARM = "var(--faction-wow-card-alarm)";
/** The inset parchment plate every editable field is set on. */
const FIELD = "var(--faction-wow-chronicle-panel)";
/** Body ink. 14:1 on both grounds. */
const INK = "var(--wow-edit-praxis-ink, var(--faction-wow-card-text))";
/** Quiet ink — CREAM ONLY. See the pairing note in the header. */
const MUTED = "var(--wow-edit-praxis-quiet, var(--faction-wow-card-muted))";
/**
 * The same quiet register on the PLATE. `--faction-wow-card-muted` is measured
 * against the cream card and is 4.24:1 on the inset parchment — which is why
 * #1173 minted this sibling for the duel seal's stakes panel (4.86:1 there).
 * Every slot below that lands on {@link FIELD} takes it: `bodyStyle` and
 * `quietStyle` render INSIDE `panelStyle` on the waiting surface, so the plate
 * is their ground, not the cream. Found by #1232's contrast rows.
 */
const PANEL_QUIET = "var(--faction-wow-chronicle-quiet)";
/** The label/eyebrow ink, the one measured on BOTH chronicle grounds. */
const LABEL = "var(--faction-wow-accent-deep)";
/** Plum as INK — the one member of this palette that flips with the theme. */
const PLUM = "var(--wow-edit-praxis-accent, var(--faction-wow-card-accent))";
/** Plum as a SURFACE. Theme-invariant, with its own AA ink below. */
const PLUM_FILL = "var(--faction-wow-plum-surface)";
const ON_PLUM = "var(--faction-wow-on-plum)";
/** Frame + rule gold. Theme-invariant, and never an ink. */
const GOLD = "var(--faction-wow-chronicle-gold)";
/**
 * The QUIET gold — the same gilt at 40% (#1830).
 *
 * The design's skin row carries two: `frame` (solid {@link GOLD}) for the edges
 * that make a plate — the sheet, the fields, the slip, the active chip — and
 * `border` for the edges that only suggest one, the inactive mode chip and the
 * proof drop zone. Drawing both at full gilt gave a chip you had not chosen and
 * a zone you had not filled the same weight of frame as the writ itself.
 */
const RULE = "var(--faction-wow-rule)";
/** Burnt gold that is legible AS TEXT — the plaque's figure. */
const GOLD_INK = "var(--faction-wow-stamp-total)";
/** The AA ink for anything printed ON the gold. */
const ON_GOLD = "var(--faction-wow-on-gold)";

/** The band along the head of the writ: gold 0-11px, plum 11-22px. */
const RIBBON = "var(--faction-wow-quest-ribbon)";
/** A whole page's lift rather than a card's — the sheet is the page here. */
const SHEET_SHADOW = "var(--faction-wow-detail-shadow)";

/**
 * The corner ornament's geometry. Illustration, not layout, so raw pixels
 * (§4a) — and the only thing `sizes.isMobile` decides on this page, because the
 * layout itself stacks with flow at every width.
 *
 * The bunch sits INSIDE the sheet now, not tucked under its corner: #1828 gave
 * the cast a full-bleed band along the bottom edge, and the design's ground row
 * lifts the balloons clear of it (`bottom: 76` desktop / `66` mobile, `right:
 * 10`) rather than letting the band crop them. The dashed gold ring that used
 * to turn in the opposite corner went at the same time — *"Balloons only,
 * lifted clear of the submit band; the dashed ring is dropped"* (#1830).
 */
const ORNAMENT = {
  desktop: { bunch: 96, bottom: 76 },
  mobile: { bunch: 66, bottom: 66 },
} as const;

/** Lora label ink on the cream. Every label row on the sheet takes this. */
const LABEL_STYLE: CSSProperties = { fontFamily: LORA, color: LABEL };

/**
 * The design's quiet register: Lora italic, sentence case. Applied to the label
 * tier's meta slots, so it overrides `composerLabelStyle`'s uppercasing.
 */
const QUIET_STYLE: CSSProperties = {
  fontFamily: LORA,
  fontStyle: "italic",
  textTransform: "none",
  letterSpacing: "0.02em",
  /* The plate's quiet ink rather than the cream's: this style is `quietStyle`,
     which the waiting surface sets inside `panelStyle`. It also serves
     `metaStyle` on the cream, where it reads 5.45:1 — one ink for both grounds
     beats two that have to be kept apart by slot. */
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

  /** A parchment field in a gilt frame — every editable control's ground. */
  const fieldBox = {
    width: "100%",
    background: FIELD,
    color: INK,
    border: `1.5px solid ${GOLD}`,
    borderRadius: 6,
    padding: "var(--space-md)",
    boxSizing: "border-box",
  } as const;

  /* The chrome, named once and mounted twice: the composer below, and the
     waiting surface once your part is in (#1189). The same ELEMENTS both
     times, so the ribbon, the turning ring and the balloons cannot drift
     between the two stages. */
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
        // eslint-disable-next-line local/no-raw-style-values -- ornament: the writ's ✦ device at the design's own optical size, not a type tier (§4a).
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
      /* The design left-rules the slip in the accent (#1706). It sits AFTER the
         border shorthand on purpose: a shorthand spread last would erase it. */
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
            {/* The crowd, standing clear of the cast's band. Held below full
                strength so the footer's words stay first. */}
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
      ...factionRoleVars("wow", "wow-edit-praxis"),
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
    /* On the PLATE, not the cream — `panelStyle` above is its ground. */
    bodyStyle: { fontFamily: LORA, color: PANEL_QUIET },
    quietStyle: QUIET_STYLE,
    primaryStyle,
    quietButtonStyle: QUIET_STYLE,
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
        {/* `Draft`, alone (#1828) — the autosave line moved to the write-up
            header and the ✦ is the waiting surface's beat. */}
        <ComposerStatusRow
          status={t("editPraxis.composer.statusDraft")}
          statusStyle={dress.statusStyle}
        />

        {/* The task slip, on the sheet's cream inside a gold frame — the ground
            the muted ink and the task's own description were measured on. Its
            mark is the shared ScoreStamp (#1828), which for WOW is the struck
            plaque this file used to draw a second, unscored copy of. */}
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
              inputStyle: { ...fieldBox, fontFamily: MED },
            }}
          />
        </ComposerSection>

        {/* How it was done — hidden once the mode can no longer change, per the
            house rule that an unusable control is not drawn disabled. */}
        {!state.controlsLocked && (
          <ComposerSection
            label={t("editPraxis.composer.modeLabel")}
            rule={false}
            labelStyle={LABEL_STYLE}
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
                    style={composerLabelStyle({
                      fontFamily: MED,
                      cursor: disabled ? "not-allowed" : "pointer",
                      padding: "var(--space-sm) var(--space-lg)",
                      borderRadius: 6,
                      background: active ? PLUM_FILL : FIELD,
                      color: active ? ON_PLUM : LABEL,
                      /* Solid gilt only on the mode you are IN; the rest take
                         the quiet gold (#1830). */
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

        {/* The mode block: the collaborator roster, or the duel pair. One
            control draws both — `InviteSearch` switches on `state.duelMode`. */}
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
            labelStyle={LABEL_STYLE}
          >
            <InviteSearch
              state={state}
              skin={{
                fontFamily: LORA,
                inputBg: FIELD,
                inputColor: INK,
                inputBorder: `1.5px solid ${GOLD}`,
                dropdownBg: SHEET,
                dropdownBorder: `1.5px solid ${GOLD}`,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { fontFamily: LORA, color: LABEL },
                /* The chronicle's 6px corner, the one `fieldBox` takes. This
                 * composer IS the chronicle card's sheet, so the roster keeps
                 * the `card-*` inks #694 measured on it and only the corner,
                 * the face and the quiet tier are handed in. */
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
            <MetataskSealStack state={state} />
          </ComposerSection>
        )}

        {/* Write-up — the tabs and the autosave line ride the label row's meta
            slot, and since #2085 that slot is the whole row: the `Write-up`
            heading said nothing the box's own placeholder does not. The editor
            keeps its accessible name from `bodyContentAttributes`. */}
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
          {/* One panel at a time: a hidden textarea is still a tab stop and
              still submits, and drawing both puts the body in the DOM twice. */}
          {tab === "write" ? (
            <BodyTextarea
              state={state}
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
              state={state}
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
                      // The panel, not the cream — LABEL is the ink measured
                      // on it (4.74:1); MUTED would be 4.25:1 here.
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
                state={state}
                skin={{
                  buttonStyle: composerLabelStyle({
                    fontFamily: MED,
                    cursor: "pointer",
                    /* Translucent, so the balloons read through the drop zone
                       (#1828), and dashed in the QUIET gold: an empty zone is
                       an invitation, not a plate (#1830). */
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

        {/* [Cancel] … [Submit] — the global order from #646, with the cast as a
            full-bleed band flush to the sheet's bottom edge (#1828). */}
        <ComposerFooter
          band
          start={
            <>
              <SaveDraftButton
                state={state}
                skin={{ style: { fontFamily: LORA, color: LABEL } }}
              />
              <DropButton
                state={state}
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
              state={state}
              skin={{
                idleLabel: t("editPraxis.composer.submit"),
                busyLabel: t("editPraxis.composer.submitBusy"),
                trailingOrnament: <span aria-hidden>✦</span>,
                style: {
                  ...composerBandStyle(sizes, {
                    /* The band is the one control WOW letters in its DISPLAY
                       face — the design's `band.font: 'title'`. Design band: 16
                       / 400 / 0.14em; 16 falls between --text-xl (14) and
                       --text-content (18) and takes the louder rung, which is
                       also what keeps the writ's cast bigger than every other
                       skin's (§4a). */
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

/** One attached proof: a gilt-framed thumbnail on the parchment field. */
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
