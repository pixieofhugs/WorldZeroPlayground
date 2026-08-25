/**
 * Unaffiliated (`default` ≡ `na` ≡ Albescent) edit praxis — composer v2 (#1181,
 * epic #1179; design project c491945e, `Unaffiliated Edit Praxis.dc.html`,
 * `faction="default"`).
 *
 * This is the REFERENCE implementation of the layout contract the seven faction
 * skins inherit (ADR-0065). It is not a placeholder: `default` ≡ `na` ≡
 * Unaffiliated is one visual identity (ADR-0039/0046/0048), so this IS the
 * Unaffiliated composer and the fall-through every undressed faction renders.
 *
 * **ADR-0065 §4 said Albescent registers nothing here.** That was true while the
 * two kits were pixel-identical, and #2404 ended it: the owner's ruling is that
 * the rainbow in Albescent's borders moves. Since #2505 (epic #2496) Albescent
 * registers `AlbescentEditPraxis`, which renders THIS component whole and hands
 * one `aria-hidden` span to the `ornament` slot below. The design's `SKINS`
 * table is still right that the two rows are the same dress — the delta is
 * motion at the sheet's edge and nothing else, which is why the slot takes a
 * layer instead of the archetype taking a fork.
 *
 * ## The layout, in order
 *
 * status row (`Draft` · `Saved just now`) → the task slip (title,
 * level pill, description, points mark) → `Title` → `How it was done` → the mode
 * block (the collaborator roster, or the duel pair) → `Write-up` (Write /
 * Preview) → `Proof` → footer (`Save draft` … `Submit`).
 *
 * Every region comes from `shared.tsx`, and the footer keeps the global
 * `[Cancel] … [Submit]` order settled in #646. A skin varies neither the order
 * nor the presence of a region — only its dress.
 *
 * **The rule is a footer mark, not a section divider (#1707).** Every section
 * passes `rule={false}`; the one rule on the page sits immediately above the
 * footer, and the regions are parted by the content column's own `gap` — which
 * is `ComposerSheet`'s, so the rhythm cannot drift between skins. Eight
 * composers had read the shared `rule` slot as "draw one per section", and a
 * ladder of six or seven ornaments is most of what made them read heavier than
 * the design. `dress.rule` survives for `PraxisWaitingSurface`, which is a
 * different page.
 *
 * ## One responsive component, no mobile twin (ADR-0065 §2)
 *
 * `useComposerSizes()` picks the size set; there is one tree at two widths.
 * `pages/editPraxis/mobileArchetypes/` and the `mobileEditPraxis` manifest
 * surface were retired outright with this issue — superseded by a committed
 * design, not held dormant (ADR-0063's terms, which §2 adopts over
 * ADR-0056/0058's). Mobile stacks with flow; there is no fixed-px grid anywhere
 * below (SPEC-faction-ui-profile §1a).
 *
 * ## Copy and dress
 *
 * Copy is the one neutral shared `editPraxis.composer.*` set (ADR-0065 §3) —
 * the design's own header states the rule outright, and this page is doubly
 * neutral because `na` IS the unaffiliated identity, so the shared set is
 * already its voice. Every faction skin reads these same keys and introduces
 * none of its own.
 *
 * Dress is na's alone and lives entirely in `--faction-default-*` tokens, so it
 * flips light/dark through the `[data-theme="dark"]` cascade with no `dark ?`
 * branch anywhere in the file. Every hex in `edit-praxis.jsx` is a design-side
 * literal; none of them appear here.
 *
 * ## The one motion
 *
 * `ep-drift` wanders the aurora. It is a CLASS: the keyframes live in
 * `index.css` behind the shared `prefers-reduced-motion` guard, and an inline
 * `animation:` would bypass that guard (#1003).
 *
 * `ep-edge` walked the masthead's spectrum band until #2520 took the band off —
 * na's spectrum is the sheet's STATIC 3px frame now, which is what lets the
 * epic's "Albescent = na + motion" be true on this page rather than aspirational
 * (the society's travelling edge had been a second moving rainbow beside na's
 * own). It joins the other five `ep*` keyframes that ship unused, for the skins.
 *
 * ## Reused, not rebuilt
 *
 * `useEditPraxis` and its whole state surface · every control in `controls.tsx`
 * · `MetataskSealStack` · `CollabRoster` (inside `InviteSearch`) ·
 * `MarkdownPreview` · `Breadcrumb` · save-draft (#1081). This issue changed the
 * dress and the layout, not the behaviour.
 *
 * ## Not drawn as designed
 *
 * The design offers "Forfeit the duel" at the awaiting stage. It is not drawn,
 * here or anywhere: #1071 decision 3 rejected that framing against ADR-0011
 * §Forfeit — at `active` (you cast, the rival has not) unsubmitting is a free
 * neutral reopen, and #718 had already rejected it once. The duel CLOCK is cut
 * for the same reason (#1071 decision 4: no expiry field exists to read). The
 * awaiting stage itself belongs to `PraxisWaitingSurface` and to #1189.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mediaUrl } from "../../../utils/media";
import {
  factionSpectrumSheet,
  UNAFFILIATED_FACTION_SLUG,
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
   * One ornament layer, mounted INSIDE the sheet (#2505, epic #2496).
   *
   * The epic's wrapper pattern is "a sibling span, or a slot on `DefaultX` when
   * light must clip to the sheet", and the composer is squarely the second case:
   * the sheet's `overflow: hidden` is what enforces #1028 — no composer ornament
   * may reach the viewport — so a layer hung off a wrapper OUTSIDE this
   * component would paint the page, which is the exact failure six task-detail
   * skins shipped and the clip exists to prevent.
   *
   * Optional and undressed by default, so na renders byte-identically: the only
   * caller is `AlbescentEditPraxis`, and the only thing it passes is a
   * decorative, `aria-hidden` span. It rides in the `ground` slot, after na's
   * own aurora and before the masthead, so it stacks above the wash and below
   * the content column without a z-index of its own.
   *
   * The WAITING stage does not take it. That surface is a different page
   * (`PraxisWaitingSurface`, #1189) with its own dress, and dressing it is not
   * this issue.
   */
  ornament?: React.ReactNode;
}

/* The na kit runs entirely on the global --faction-default-* tokens, so it flips
 * light/dark through the cascade. Named for the ROLE each plays in the design's
 * skin row rather than for its colour — `ink` is the design's `ink` and its
 * `accent`, which are the same value in both themes. */
const SHEET = "var(--edit-praxis-paper, var(--faction-default-card-bg))";
/* The error banner's ink (#1231). The banner sits straight on the sheet, and
 * the neutral `--color-danger` under its own veil misses AA there in light
 * (4.41:1 on this ground); this is #1449's alarm rung, already measured
 * on paper. The veil and the edge stay neutral — ADR-0061. */
const ALARM = "var(--faction-default-card-alarm)";
const FIELD = "var(--faction-default-composer-field)";
const INK = "var(--edit-praxis-ink, var(--faction-default-card-text))";
/* THE TIER SPLIT ON THIS SHEET IS BY GROUND, NOT BY LOUDNESS (#2485).
 *
 * `ground` below washes the seven-stop aurora under the whole content column,
 * so nothing drawn straight on the sheet sits on the token it was measured
 * against. On that composite BOTH quiet rungs were under AA — `-card-muted`
 * 4.30 light / 3.27 dark, `-composer-faint` 3.45 / 2.88 — and #2485 lifted the
 * composer's own token (its only consumer is this file) to 4.72 / 4.71 rather
 * than move `-card-muted`, which is the na CARD's prose ink with a dozen
 * readers of its own.
 *
 * The consequence is worth stating out loud, because the names now read
 * backwards: FAINT is the LOUDER of the two. It is the ink for the WASHED
 * SHEET; `MUTED` is the ink for the opaque `--faction-default-composer-field`
 * laid on top of it, where it reads 6.05 / 5.23 and is right. If you are
 * choosing between them, ask what is behind the type, not how quiet it should
 * sound.
 *
 * Nothing INSIDE the textarea was ever at risk — the field is opaque, so a
 * player's own words never met the wash. It is the labels, the hints and the
 * quiet buttons around it that paid. */
const MUTED = "var(--edit-praxis-quiet, var(--faction-default-card-muted))";
const FAINT = "var(--faction-default-composer-faint)";
const BORDER = "var(--faction-default-border)";
const HAIR = "var(--faction-default-composer-hair)";
const ON_ACCENT = "var(--faction-default-on-accent)";
/* The seven wedges, for both marks. */
const RING = "var(--faction-default-rainbow-conic)";
/* THE MASTHEAD BAND IS GONE (#2520). It was the `-loop` cut of the spectrum,
 * walked by `.ep-edge` for every player — so na's composer carried a MOVING
 * rainbow, and Albescent's travelling sheet edge (#2505) was not a delta on it
 * but a second one. The spectrum is the sheet's 3px frame now, static, which is
 * the idiom the task card, the praxis card and the seal all wear. `.ep-edge`
 * and `@keyframes epEdge` stay declared in index.css beside the five other
 * composer motions no skin reads yet; that block says outright that an unread
 * motion there is the point of it. */

/* The design's title + body face is Lora (--font-display); its label face is
 * Courier Prime (--font-body), which is what composerLabelStyle already
 * defaults to. The token names read backwards here and that is not a mistake —
 * --font-body is the site's Courier Prime. */
const TITLE_FACE = "var(--font-display)";

const labelStyle = { color: FAINT };
const panelStyle = {
  background: FIELD,
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
};
/* The submit button's paint, minus the busy cursor the composer adds. */
const primaryStyle = composerLabelStyle({
  border: "none",
  borderRadius: 10,
  padding: "var(--space-md) var(--space-xl)",
  color: ON_ACCENT,
  background: INK,
  fontWeight: 700,
});

/* The chrome, named once and mounted twice: the composer below, and the
   waiting surface once your part is in (#1189). The same ELEMENT both times,
   not two constructions of the same idea, so na's drifting aurora cannot drift
   apart between the two stages. */
const ground = (
  <ComposerGround
    background="var(--faction-default-aurora)"
    opacity="var(--faction-default-aurora-opacity)"
    filter="var(--faction-default-aurora-filter)"
    mixBlendMode="var(--faction-default-aurora-blend)"
    animated
  />
);
/* THE SHEET'S FRAME IS THE SPECTRUM (#2520) — a 3px transparent border with the
   ramp painted into the border box under it, which is the same `border-box`
   idiom `DefaultTaskCard`, `DefaultPraxisCard` and `DefaultSeal` wear. Only the
   width is stated here; the composition belongs to the helper, because the ramp
   has to be appended to all three of the sheet's background lists and saying
   that at a fourth call site is how one of them gets the arity wrong.

   `ComposerSheet`'s own `overflow: hidden` clips at the PADDING box, so the
   aurora at `inset: -30%` cannot paint over the frame — the ring stays spectrum
   all the way round, and Albescent's travelling `.alb-composer-edge` still sits
   a pixel inside it. */
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
    /* The 2px left ink bar #1706 put here came off with the masthead band
       (#2520): the design's na column rules this page ONCE, at the sheet's own
       spectrum frame. The seven dressed skins keep theirs — `composerRule`
       asserts that from the other side. */
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: "var(--space-lg)",
  },
  labelStyle: { color: FAINT },
  titleStyle: { fontFamily: TITLE_FACE, fontStyle: "italic", color: INK },
  descriptionStyle: { color: MUTED },
  pillStyle: { color: MUTED },
} as const;

/**
 * The na kit's dress, handed to `PraxisWaitingSurface` once your part is in
 * (#1189). Exported because it is also the fall-through every unregistered slug
 * renders, so a test that asserts on the shared surface asserts on a REAL dress
 * rather than a fixture invented for the occasion.
 */
export const DEFAULT_COMPOSER_DRESS: ComposerDress = {
  accent: INK,
  alarm: ALARM,
  /* The role map (#2672) rides `pageStyle`, which is the one style BOTH stages
     mount — the composer page and the waiting surface — so the three consts
     above resolve on either. Pinned to na: `ground` washes the aurora under
     everything here and takes no slug, and an ink may not leave a ground that
     cannot follow (#2361, #2669). `{}` today; the prefix is the name a dresser
     reaches this surface by. */
  pageStyle: {
    ...factionRoleVars(UNAFFILIATED_FACTION_SLUG, "edit-praxis"),
    fontFamily: TITLE_FACE,
    color: INK,
  },
  sheetStyle,
  /* No `masthead` since #2520 — the slot is optional, and na's band is the
     sheet's own spectrum frame now. */
  ground,
  rule: () => <ComposerRule style={{ background: HAIR }} />,
  mark: statusMark,
  statusStyle: { color: INK, fontWeight: 700 },
  metaStyle: { color: FAINT },
  labelStyle,
  slip,
  panelStyle,
  headingStyle: { fontFamily: TITLE_FACE, color: INK },
  /* The waiting surface draws this inside `panelStyle`, i.e. on the opaque
     field — the one ground in this dress the aurora never reaches — so prose
     keeps the card's own rung (6.05 / 5.23). */
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
  /* Your part is in, so the composer is not a composer any more (ADR-0059).
     Same page, same sheet, same ornament — a different stage. */
  if (isWaitingStage(state.phase)) {
    return <PraxisWaitingSurface state={state} dress={DEFAULT_COMPOSER_DRESS} />;
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
        {/* `Draft`, alone (#1828). The autosave line moved to the write-up
            header and the spectrum mark is the waiting surface's beat. */}
        <ComposerStatusRow
          status={t("editPraxis.composer.statusDraft")}
          statusStyle={DEFAULT_COMPOSER_DRESS.statusStyle}
        />

        {/* The task reference slip, on the field ground. Its mark is the shared
            ScoreStamp (#1828) — the spectrum ring the composer used to draw here
            changed shape the instant you pressed Submit. */}
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
                fontFamily: TITLE_FACE,
                fontStyle: "italic",
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
            labelStyle={labelStyle}
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
            labelStyle={labelStyle}
          >
            <InviteSearch
              state={state}
              skin={{
                fontFamily: TITLE_FACE,
                inputBg: FIELD,
                inputColor: INK,
                inputBorder: `1px solid ${BORDER}`,
                dropdownBg: SHEET,
                dropdownBorder: `1px solid ${BORDER}`,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { color: FAINT },
                /* na's sheet IS `--faction-default-card-bg`, so the roster's
                 * card-family fallbacks are already measured on it (#2269's
                 * ruling) and only the corner and the quiet tier are handed in.
                 * `FAINT` and not `MUTED` since #2485: the dashed `+ invite` chip
                 * is drawn on TRANSPARENT, so its ground is the aurora-washed
                 * sheet rather than the flat token the card family was measured
                 * against. Handing it in is still what stops the chip reading the
                 * TASK's faction. */
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
            <MetataskSealStack state={state} />
          </ComposerSection>
        )}

        {/* Write-up — the tabs sit in the section's meta slot, so the row reads
            `saved a moment ago [Write|Preview]`. The heading itself is gone
            (#2085: the placeholder already says what the box is for) and so is
            the word count (#2086), leaving the autosave line #1828 moved up
            here; the cluster still WRAPS on a phone's header row. The editor
            names itself — see `bodyContentAttributes`. */}
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
          {/* Both panels are mounted only one at a time: a hidden textarea would
              still be a tab stop and still be submitted by a form, and drawing
              both would put the body in the DOM twice. */}
          {tab === "write" ? (
            <BodyTextarea
              state={state}
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
              state={state}
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
                state={state}
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
                    /* The drop ground is TRANSLUCENT — the comment above says so
                     * — which puts this label on the aurora, not on the field.
                     * FAINT is the sheet's rung (#2485). */
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

        {/* [Cancel] … [Submit] — the global order from #646. Submit is an inline
            button with no ornament; the bar treatments belong to the skins that
            draw one. */}
        <ComposerFooter
          start={
            <>
              <SaveDraftButton state={state} skin={{ style: { color: FAINT } }} />
              <DropButton
                state={state}
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
              state={state}
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

/** One already-uploaded proof item, on the composer's field ground. */
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
