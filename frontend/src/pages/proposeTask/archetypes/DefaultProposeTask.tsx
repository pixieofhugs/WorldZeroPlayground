/**
 * Unaffiliated (`default` ≡ `na`) proposing a task — REBUILT ON THE COMPOSER
 * CHASSIS (#2993, owner ruling 2026-09-01).
 *
 * ## The chassis is the composer's, not a second one
 *
 * `ComposerPage` / `ComposerSheet` / `ComposerSection` / `ComposerFooter` out of
 * `pages/editPraxis/archetypes/shared.tsx` — the same blocks the other seven
 * propose kits have mounted since #2538, and the same rebuild
 * `DefaultCreateCharacter` (#2992) and `DefaultEditCharacter` (#2991) took on
 * their own surfaces. This file used to hand-author the whole page: a bare
 * `.sidebar-card` inside a `maxWidth: 760` div, with the four inline-style
 * builders of `proposeTask/factionSurfaces.ts` painting the card frame, the
 * name field, the metatask box and the submit pill from the selected slug at
 * runtime. **That module is deleted with this rebuild** — this was its only
 * importer.
 *
 * **This is not a merge.** One file per faction still stands (ADR-0065 §"What
 * this ADR does not do", ADR-0090 §Tree, `frontend/CLAUDE.md`): what is
 * forbidden is a single component with a runtime skin table rendering nine
 * trees. This file keeps its own tree, its own dress and its own ground, and
 * stops re-authoring a sheet, a section and a footer from scratch.
 *
 * **The dress is na's own and is not new.** `DefaultEditPraxis` has shipped this
 * kit on this chassis since #1181 — ADR-0065 calls that file "the REFERENCE
 * implementation of the layout contract the seven faction skins inherit" — so
 * every token below is one the na kit already reads on this ground. NO DESIGN
 * WAS DRAWN FOR THIS AND NONE WAS NEEDED, which is the finding
 * `DefaultCreateCharacter` and `CovenProposeTask` each record for their own.
 *
 * ## The order, and why the chips moved INSIDE the sheet
 *
 * `heading → target faction → name → description → worth & level → metatask →
 * notes → preview → footer`, which is the tree six kits already draw
 * (Coven, Ephemerists, Singularity, S.N.I.D.E., UA, WoW):
 * `ComposerSheet → heading → ComposerSection(label=factionLabel) → radiogroup`.
 *
 * The chips used to sit OUTSIDE the `<form>` entirely, above the card, and
 * `EverymenProposeTask`'s header still cites that placement as the reason for
 * its own ("the pick is what the card then wears, so it cannot live inside the
 * thing it dresses"). Six kits disprove it by shipping. #2995 moves Everymen in
 * and owns the reserved masthead head that lands every kit's first section at
 * the same offset; this file only had to put the row in the right place in the
 * tree (#2995's own note on this issue).
 *
 * It stays a wrapping `role="radiogroup"` of `Chip`s rather than a `ChipRow`:
 * that shell scrolls horizontally behind a hidden scrollbar and would bury
 * three of the eight options (S.N.I.D.E.'s and WoW's headers record the same).
 *
 * ## The furniture survives, in its existing role — with one exception (#2993)
 *
 * `Breadcrumb` (the shared trail, #2102/#2973, in `ComposerPage`'s one slot),
 * `FilterLevelNodes`, `Chip` + `FactionSigil`, the metatask proposal block, the
 * unaffiliated target option, base points and the notes field. Each is a shared
 * component and none of them was re-drawn: `metataskProposal`, `proposalNotes`,
 * `proposeTaskBreadcrumb` and `unaffiliatedOption` are the suites that say so.
 *
 * **`PageTitle` is the exception, and the reasons are at its call site.** The
 * issue's census listed it as furniture to keep; the chassis' own rhythm
 * contract and this sheet's ground say otherwise, and the six kits that draw an
 * inline `h1` at `sizes.titleSize` are what this page draws now. No propose kit
 * mounts `PageTitle` and neither na character form does.
 *
 * **The 240px rainbow bar under the title is GONE, and that is #2520's ruling
 * rather than a trim.** na's spectrum is the SHEET's static 3px frame now — the
 * same `border-box` idiom `DefaultTaskCard`, `DefaultPraxisCard`, `DefaultSeal`
 * and `DefaultEditPraxis` all wear — so a second rainbow rule six pixels under
 * the title would be the second ornament that ruling removed from the composer.
 * The one hairline on the page is `ComposerRule`, immediately above the footer
 * (#1707).
 *
 * ## Three wells, and two of them are a CONTRAST fix rather than a decoration
 *
 * `Chip` and `FilterLevelNodes` are app chrome: they paint `--color-bg-surface`
 * with `--color-text-primary` / `--color-text-secondary`, and `Chip` fades an
 * unselected pill to 0.88. On the app page that is measured and fine; on na's
 * aurora-washed sheet the unselected chip label reads **3.55:1 in dark** and the
 * inactive level node 4.08:1, both under AA — the aurora's screen blend lifts
 * the night sheet at its peaks, and a translucent white pill lifts it again.
 * Neither component takes a style hook, and repainting a shared control to fix
 * one page is what `CovenProposeTask`'s header refuses to do.
 *
 * So both rows sit on the na dress's own OPAQUE well
 * (`--faction-default-composer-field`), which the aurora never reaches: the
 * unselected chip label lands at 6.11 / 5.46 and the inactive node at 8.51 /
 * 6.59. `__tests__/naProposeTaskContrast.test.ts` carries every row, in both
 * cascades, modelled per aurora stop.
 *
 * **The third well is the live preview chit, and it is one plate rather than
 * two idioms.** It needs the opaque stock on its own account — its bonus line
 * is `--color-success`, the quietest ink on this page, which reads 8.97 / 9.42
 * on the field against 6.36 / 5.89 bare on the washed sheet — and drawing it in
 * a different frame from the two rows above it would put two plate treatments
 * on one sheet. `wellStyle` is declared once and spread three times.
 *
 * ## The inks are na's family, because the GROUND changed
 *
 * Three of this page's inks could not come with it, and each is a real fix
 * rather than a preference:
 *
 *  - `--color-danger` (the over-length message) misses AA on this sheet — 3.37:1
 *    in light — and takes `--faction-default-card-alarm` (5.80 / 5.40), which is
 *    #1302 / #1449's rule for a functional ink inside a faction frame.
 *  - `.warning-text` (`--color-warning`, the counter APPROACHING its cap) misses
 *    it too at 3.51:1, and takes `--faction-default-card-notice` (4.95 / 6.14).
 *    #1609's two-tier split is kept exactly — approach is a notice, the cap is
 *    an alarm — in na's own family rather than the app's.
 *  - the global `--color-text-*` tiers are gone, and the
 *    `.eslint-legacy-faction-ink.txt` line they bought went with them. That
 *    entry was an argument about a GROUND (see `eslint.config.js`), and this
 *    file has left it.
 *
 * The tokens themselves are not declared here. They are the na composer dress
 * (`editPraxis/archetypes/defaultComposerDress`), which the two na character
 * forms read as well — three files had been keeping three copies of one set,
 * and the copies had drifted on the one value that is an accessibility floor.
 * THE TIER SPLIT IS BY GROUND, NOT BY LOUDNESS (#2485): FAINT is the ink for
 * the aurora-WASHED sheet and MUTED the ink for the opaque well on top of it.
 *
 * ## Focus is the sheet's, and this file may not switch it off (#2266)
 *
 * Every field carries `data-composer-field` and none of them declares
 * `outline`. The ring is one rule in `index.css` drawn in `currentColor`, so it
 * inherits the measurement each field's own ink already has — and an inline
 * `outline: none` beats any stylesheet, which is how eight create plates
 * shipped with no focus indicator at all. A suppression with nothing in its
 * place is the defect (`WORLD_ZERO_STYLE.md`).
 *
 * ## This kit is only ever na's own dress now
 *
 * `ProposeTask.tsx` dispatches on the TARGET faction, and all seven known
 * factions plus Albescent hold a `proposeTask` row — so this archetype is on
 * screen only for `na`, for Albescent, for a cleared pick and for an
 * unregistered slug, and `isKnownFaction(factionSlug)` is false in every one of
 * them. The old file still branched a card frame, a field face, a tick box and a
 * submit pill on that dead condition. Those arms are deleted: the page paints
 * na's family, full stop. What still reads a slug is the CHIP ROW, where the
 * slug is each chip's own and the tints are seven different factions' — that is
 * the row's whole point and it stays.
 *
 * ## One responsive tree, no phone twin
 *
 * `useComposerSizes()` picks the size set (ADR-0065 §2) and there is one tree at
 * two widths. Nothing below is a fixed-px layout grid
 * (SPEC-faction-ui-profile §1a).
 *
 * ## The one motion
 *
 * `ep-drift` wanders the aurora, and it is a CLASS: the keyframes live in
 * `index.css` behind the shared `prefers-reduced-motion` guard, and an inline
 * `animation:` would bypass it (#1003). Nothing on this page is classed for
 * `.alb-moves` to grab — see `AlbescentProposeTask`, which stays a pass-through
 * by decision rather than by accident.
 *
 * ## Presentation only
 *
 * `useProposeTask` is the single source of state for all nine archetypes.
 * Nothing here touches the submit path, the payload or the metatask/standard
 * branch — `planProposalSubmission` reads the fields it always did, and
 * `proposalNotes.test.tsx` still owns that seam. The login and eligibility gates
 * live in the dispatcher, above every archetype.
 */
import { useTranslation } from "react-i18next";
import Breadcrumb from "../../../components/nav/Breadcrumb";
import FilterLevelNodes from "../../../components/ui/FilterLevelNodes";
import { Chip } from "../../../components/ui/ChipRow";
import FactionSigil from "../../../components/sigil/FactionSigil";
import { useGameConfig } from "../../../hooks/useGameConfig";
import {
  factionCssVar,
  factionFill,
  factionName,
  getAllFactions,
  isKnownFaction,
  sortFactionsByRainbowOrder,
} from "../../../utils/factions";
import {
  ComposerFooter,
  ComposerPage,
  ComposerRule,
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerLabelStyle,
  useComposerSizes,
} from "../../editPraxis/archetypes/shared";
import {
  ALARM,
  EDGE,
  FAINT,
  FIELD,
  HAIR,
  INK,
  MUTED,
  TITLE_FACE,
  composerGround,
  fieldBox,
  labelStyle,
  primaryStyle,
  sheetStyle,
} from "../../editPraxis/archetypes/defaultComposerDress";
import {
  UNAFFILIATED_FACTION_SLUG,
  type ProposeTaskState,
} from "../useProposeTask";

const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

/* The caps the fields enforce. `schemas.task` stays the authority and still
   rejects an over-long body; these are stated as literals for the same reason
   every other propose kit states them. */
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;
const NOTES_MAX = 2000;
/* #1609's approach rung: the counter turns NOTICE before it turns ALARM. */
const TITLE_NOTICE = 180;
const DESCRIPTION_NOTICE = 4500;

/* THE DRESS IS THE SHARED ONE (#2993). Every ink, the sheet's spectrum frame,
   the aurora and the field box come from
   `editPraxis/archetypes/defaultComposerDress` — the same set
   `DefaultCreateCharacter` and `DefaultEditCharacter` read, because all three
   stand on the same stock. Three copies of it had already drifted apart on the
   one value that is an accessibility floor; see that module's header.

   THE COUNTER'S APPROACH RUNG IS THIS SURFACE'S ALONE and stays here: no other
   na form has a field that warns before it stops accepting text (#1609), so
   exporting the token would be a shared name with one reader. Not
   `--color-warning`, which measures 3.51:1 on this sheet — the rows are in
   `__tests__/naProposeTaskContrast.test.ts`. */
const NOTICE = "var(--faction-default-card-notice)";

/* THE WELL THE THREE APP-CHROME BLOCKS STAND ON — the chip row, the level row
   and the live preview chit. Same stock and same edge as a field box, because
   it is the same plate: the two control rows need it for contrast (see the
   header) and the chit takes it so the three plates on this sheet read as one
   idiom rather than as two. */
const wellStyle = {
  background: FIELD,
  border: `1px solid ${EDGE}`,
  borderRadius: 10,
  padding: "var(--space-md)",
} as const;

export default function DefaultProposeTask({
  state,
}: {
  state: ProposeTaskState;
}) {
  const { t } = useTranslation("forms");
  const sizes = useComposerSizes();
  const {
    canProposeMetatask,
    success,
    factions,
    title,
    setTitle,
    description,
    setDescription,
    pointValue,
    setPointValue,
    levelRequired,
    setLevelRequired,
    factionSlug,
    setFactionSlug,
    notes,
    setNotes,
    isMetatask,
    setIsMetatask,
    metaBonusValue,
    setMetaBonusValue,
    submitting,
    error,
    handleSubmit,
    handleCancel,
  } = state;

  const fname = factionName(factionSlug);

  // The #1695 admin-review window, in the era's own hours. Every line below that
  // promises it interpolates THIS, never a typed-out 48 — the day an era changes
  // the window, a hardcoded number is the site lying to the person it made the
  // promise to. `null` until `/game-config` lands, and unknown means UNDRAWN
  // rather than assumed: the doctrine `HoldoutPublishNotice` sets for
  // `collab_auto_submit_days`. In practice the Sidebar has already warmed the
  // shared cache by the time a signed-in player reaches this page.
  const adminReviewHours =
    useGameConfig()?.pending_task_admin_review_hours ?? null;

  // Unaffiliated leads the picker: it is the default, and it is a state rather
  // than a faction, so it is an extra option here rather than a registry entry
  // (ADR-0039). Everything after it comes from the API, falling back to the
  // static registry before the fetch lands, in the site's one rainbow order
  // (#352) — the chips are a spectrum, so their sequence is the spectrum's.
  const factionOptions: string[] = [
    UNAFFILIATED_FACTION_SLUG,
    ...sortFactionsByRainbowOrder(
      (factions.length > 0 ? factions : getAllFactions()).map((f) => ({
        slug: f.slug,
      })),
    ).map((f) => f.slug),
  ];

  /** The counter under a capped field: quiet, then notice, then alarm (#1609). */
  const counter = (used: number, notice: number, max: number) => (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-lg)",
      }}
    >
      <span style={{ color: used >= max ? ALARM : used >= notice ? NOTICE : FAINT }}>
        {used}/{max}
      </span>
    </div>
  );

  /** The over-length message. Only ever drawn AT the cap, so it is the alarm
      rung and not the approach — #1609's split, in na's own family. */
  const tooLong = (message: string) => (
    <span
      style={{
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-content)",
        color: ALARM,
      }}
    >
      {message}
    </span>
  );

  if (success) {
    return (
      <ComposerPage sizes={sizes} style={{ fontFamily: TITLE_FACE, color: INK }}>
        <ComposerSheet sizes={sizes} style={sheetStyle} ground={composerGround}>
          {/* The filing is told on the same sheet it was written on, rather
              than handing the proposer back to site chrome — the call
              `CovenProposeTask` makes for its own success screen. */}
          <h1
            style={{
              fontFamily: TITLE_FACE,
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: sizes.titleSize,
              lineHeight: 1.1,
              color: INK,
              margin: 0,
            }}
          >
            {isMetatask
              ? t("proposeTask.successMeta.heading")
              : t("proposeTask.successTask.heading")}
          </h1>
          {adminReviewHours !== null && (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-content)",
                color: FAINT,
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {isMetatask
                ? t("proposeTask.successMeta.body", {
                    faction: fname,
                    hours: adminReviewHours,
                  })
                : t("proposeTask.successTask.body", { hours: adminReviewHours })}
            </p>
          )}
        </ComposerSheet>
      </ComposerPage>
    );
  }

  return (
    <ComposerPage
      sizes={sizes}
      style={{ fontFamily: TITLE_FACE, color: INK }}
      /* The site's one trail (#2102), in the slot the chassis keeps for it —
         above the sheet, in the app's own neutral ink, because a breadcrumb is
         site chrome measured on the page under the sheet rather than on the
         sheet. This page was the original hand-rolled hold-out: the shared
         component could not say a trail with no task until #2973 gave it one. */
      breadcrumb={<Breadcrumb current={t("proposeTask.pageTitle")} />}
    >
      {/* A REAL `<form>`, not a bare button with an onClick: it is what makes
          Enter commit from a text field, and what gives the browser's own
          required-field behaviour something to attach to. `handleSubmit` calls
          `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin="default">
        {/* `reserveHead` (#2995): na draws no masthead, so the head it reserves
            is bare ground — the sheet's own wash, at the height the Ephemerists'
            band takes. That is the point rather than a cost: this page reskins
            live as the chips are clicked, and the row can only stand still if
            the kit with no band starts its column where the kit with the tallest
            one does. */}
        <ComposerSheet sizes={sizes} style={sheetStyle} reserveHead ground={composerGround}>
          {/* The heading the six chassis kits spell, in na's own face — NOT
              `PageTitle`, and that is a reversal of this issue's "the furniture
              survives" line for two reasons the chassis states itself.

              Its `mb-6` is a region setting its own bottom margin, which
              `ComposerSheet`'s docblock forbids in as many words: the content
              column owns the vertical rhythm, so a margin here stacks on the
              column's `gap` and this sheet's rhythm stops matching its
              siblings'. And it is app chrome — a `--color-text-primary` h1 over
              a seven-stop underline drawn in the aurora's own scalars — landing
              on the washed faction sheet with neither a well nor a measurement,
              which is the third instance of the finding the chip row and the
              level row are on wells for.

              No propose kit mounts it (`SingularityProposeTask`'s header
              refuses it by name) and neither na character form does. Same copy
              key, same tier, one less ornament: na's spectrum on this page is
              the sheet's own frame (#2520). */}
          <h1
            style={{
              fontFamily: TITLE_FACE,
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: sizes.titleSize,
              lineHeight: 1.1,
              color: INK,
              margin: 0,
              // The heading floor, the second half of #2995's offset: the chips
              // are the section directly under this block, so its height is the
              // last thing between them and the sheet's edge.
              minHeight: sizes.headingHeight,
            }}
          >
            {t("proposeTask.pageTitle")}
          </h1>

          {/* Who the task is for — and the control this page is dispatched by,
              so picking a real faction reskins the whole page to that kit. */}
          <ComposerSection
            rule={false}
            label={t("proposeTask.factionLabel")}
            labelStyle={labelStyle}
          >
            <div
              role="radiogroup"
              aria-label={t("proposeTask.factionLabel")}
              style={{
                ...wellStyle,
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-sm)",
              }}
            >
              {factionOptions.map((slug) => (
                <Chip
                  key={slug}
                  on={factionSlug === slug}
                  onClick={() => setFactionSlug(slug)}
                  tint={factionCssVar(slug)}
                  // `na` (and Albescent) have no single hue for the selected
                  // ring, so they take the spectrum frame instead (#749).
                  unaffiliated={!isKnownFaction(slug)}
                  sigilText
                >
                  {/* The slug, not a null for `na`: FactionSigil already falls
                      through to the spectrum ring for it, and passing the slug
                      is what keeps Albescent's own mark on Albescent's chip. */}
                  <FactionSigil slug={slug} size={18} />
                  <span>{factionName(slug)}</span>
                </Chip>
              ))}
            </div>
          </ComposerSection>

          {/* The task's name. Placeholder-only: the box carries its own words
              and `aria-label` repeats them, because here the visible label IS
              the accessible name (§7).

              #2598 asked for `fields.name.placeholder` to be DELETED, on the
              premise that it merely echoed a visible label. It did not: per the
              paragraph above the placeholder IS the only on-screen
              identification this field has, so deleting it would leave a sighted
              user an unlabelled box. What was actually wrong is that one field's
              wording lived in two keys that had drifted apart in case ("Task
              name" / "Task Name"). The second key is gone and both uses read the
              label — one concept, one key. Whether these fields should get a
              visible label back is a design question, and it is on the issue. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              required
              maxLength={TITLE_MAX}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              aria-label={t("proposeTask.fields.name.label")}
              placeholder={t("proposeTask.fields.name.label")}
              style={{
                ...fieldBox,
                fontFamily: TITLE_FACE,
                fontStyle: "italic",
                fontSize: "var(--text-title)",
              }}
            />
            {counter(title.length, TITLE_NOTICE, TITLE_MAX)}
            {title.length >= TITLE_MAX &&
              tooLong(t("proposeTask.fields.name.tooLong"))}
          </ComposerSection>

          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              rows={6}
              maxLength={DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              aria-label={t("proposeTask.fields.description.label")}
              placeholder={t("proposeTask.fields.description.placeholder")}
              style={{ ...fieldBox, lineHeight: 1.7 }}
            />
            {counter(description.length, DESCRIPTION_NOTICE, DESCRIPTION_MAX)}
            {description.length >= DESCRIPTION_MAX &&
              tooLong(t("proposeTask.fields.description.tooLong"))}
          </ComposerSection>

          {/* What it is worth and who may take it. One region rather than two
              sections so the pair reads as one line of the form. */}
          <ComposerSection rule={false}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-xl)",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-sm)",
                }}
              >
                <span style={composerLabelStyle(labelStyle)}>
                  {isMetatask
                    ? t("proposeTask.fields.bonusPoints.label")
                    : t("proposeTask.fields.basePoints.label")}
                </span>
                <input
                  data-composer-field
                  type="text"
                  inputMode="numeric"
                  value={isMetatask ? metaBonusValue : pointValue}
                  onChange={(e) =>
                    (isMetatask ? setMetaBonusValue : setPointValue)(
                      e.target.value.replace(/[^0-9]/g, ""),
                    )
                  }
                  disabled={submitting}
                  aria-label={
                    isMetatask
                      ? t("proposeTask.fields.bonusPoints.label")
                      : t("proposeTask.fields.basePoints.label")
                  }
                  placeholder={
                    isMetatask
                      ? t("proposeTask.fields.bonusPoints.placeholder")
                      : t("proposeTask.fields.basePoints.placeholder")
                  }
                  style={{
                    ...fieldBox,
                    width: 96,
                    fontFamily: TITLE_FACE,
                    fontSize: "var(--text-title)",
                    textAlign: "center",
                  }}
                />
                {isMetatask && (
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-lg)",
                      color: FAINT,
                    }}
                  >
                    {t("proposeTask.fields.bonusPoints.hint")}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-sm)",
                }}
              >
                <span style={composerLabelStyle(labelStyle)}>
                  {t("proposeTask.fields.minimumLevel.label")}
                </span>
                {/* The shared row, MOUNTED rather than re-drawn (#2993) — on the
                    well, for the reason the header gives: it paints the app's
                    neutrals and takes no style hook, and the aurora-washed sheet
                    is a ground they were never measured on. */}
                <div style={wellStyle}>
                  <FilterLevelNodes
                    levels={LEVEL_OPTIONS}
                    value={levelRequired}
                    onChange={setLevelRequired}
                    factionSlug={factionSlug}
                  />
                </div>
              </div>
            </div>
          </ComposerSection>

          {canProposeMetatask && (
            <ComposerSection rule={false}>
              {/* A `role="checkbox"` button, not an `<input>`: a native box is
                  tinted with `accent-color`, which takes ONE colour, and
                  unaffiliated's identity is seven of them (ADR-0039). */}
              <button
                type="button"
                role="checkbox"
                aria-checked={isMetatask}
                onClick={() => setIsMetatask(!isMetatask)}
                disabled={submitting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-sm)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  margin: 0,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 18,
                    height: 18,
                    flex: "none",
                    borderRadius: 4,
                    boxSizing: "border-box",
                    // The spectrum fills the whole box when ticked, so the
                    // border is only there to keep the two states one size.
                    border: `2px solid ${isMetatask ? "transparent" : EDGE}`,
                    ...(isMetatask
                      ? factionFill(UNAFFILIATED_FACTION_SLUG, "bar")
                      : { background: FIELD }),
                  }}
                />
                <span style={composerLabelStyle(labelStyle)}>
                  {t("proposeTask.metaToggle.label")}
                </span>
              </button>
            </ComposerSection>
          )}

          {/* Notes to the reviewing admin — hidden for metatasks, because the
              planner does not carry them on that branch (#1823). */}
          {!isMetatask && (
            <ComposerSection rule={false}>
              <textarea
                data-composer-field
                rows={3}
                maxLength={NOTES_MAX}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                aria-label={t("proposeTask.fields.notes.label")}
                placeholder={t("proposeTask.fields.notes.label")}
                style={{ ...fieldBox, lineHeight: 1.7 }}
              />
            </ComposerSection>
          )}

          {/* The task being written, live. A chit on the same WELL the two
              control rows stand on, not on the sheet: the spectrum frame it
              used to wear is the SHEET's now (#2520), and a second one around a
              panel inside it would be the same rainbow twice. The well is also
              what the bonus line needs — `--color-success` reads 8.97 / 9.42 on
              the opaque field and 6.36 / 5.89 bare on the washed sheet, and it
              is the ink with the least room on this page. */}
          {title && (
            <div
              style={{
                ...wellStyle,
                padding: "var(--space-md) var(--space-lg)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-xs)",
              }}
            >
              {/* Caption, not a heading: the faction name is interpolated in, so
                  "Task preview — University of Asthmatics — Pending" is a run of
                  prose the moment a long slug is selected (#1307). */}
              <span style={composerLabelStyle({ color: MUTED })}>
                {isMetatask
                  ? t("proposeTask.preview.metaHeading", { faction: fname })
                  : t("proposeTask.preview.taskHeading", { faction: fname })}
              </span>
              <p
                style={{
                  fontFamily: TITLE_FACE,
                  fontStyle: "italic",
                  fontSize: "var(--text-title)",
                  color: INK,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {title}
              </p>
              {description && (
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-content)",
                    color: MUTED,
                    margin: 0,
                    lineHeight: 1.5,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {description}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--space-md)",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-lg)",
                }}
              >
                {isMetatask ? (
                  <span style={{ color: "var(--color-success)" }}>
                    {t("proposeTask.preview.bonusPoints", {
                      points: metaBonusValue || "?",
                    })}
                  </span>
                ) : (
                  <span style={{ color: MUTED }}>
                    {t("proposeTask.preview.points", {
                      points: pointValue || "?",
                      // `pointValue` is the raw input string. An empty or
                      // unparseable one draws "?" and takes the PLURAL —
                      // "? points" reads, "? point" does not (#2598).
                      count: Number(pointValue) || 0,
                    })}
                  </span>
                )}
                <span style={{ color: MUTED }}>
                  {t("proposeTask.preview.level", {
                    level: levelRequired === "" ? 0 : levelRequired,
                  })}
                </span>
                {!isMetatask && (
                  <span style={{ color: MUTED }}>
                    {t("proposeTask.preview.pending")}
                  </span>
                )}
              </div>
            </div>
          )}

          <ErrorBanner message={error ?? ""} style={{ color: ALARM }} />

          {/* THE ONE RULE (#1707). Every section passes `rule={false}` and the
              regions are parted by the content column's own gap; the single
              hairline on the page sits immediately above the footer. */}
          <ComposerRule style={{ background: HAIR }} />

          {/* [Cancel] … [Submit] — the global order from #646. na keeps the
              INLINE commit button rather than the full-bleed band, which is the
              owner ruling on #1828 and the reason `band` is a per-skin flag. */}
          <ComposerFooter
            start={
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={composerLabelStyle({
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: FAINT,
                  })}
                >
                  {t("proposeTask.submit.cancel")}
                </button>
                {adminReviewHours !== null && (
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-lg)",
                      color: FAINT,
                    }}
                  >
                    {t("proposeTask.submit.note", { hours: adminReviewHours })}
                  </span>
                )}
              </>
            }
            end={
              <button
                type="submit"
                disabled={submitting}
                // `.control-off` rather than `opacity: 0.6` (#2486, #2994/#3008):
                // `opacity` composites the whole element, so the fill sinks
                // toward the sheet and the label fades over the faded fill — the
                // label loses contrast twice. The class swaps the whole fill for
                // the house neutral and hands the label a ratio measured once,
                // in `disabledControlContrast.test.ts`.
                // `submitControlOff.test.tsx` walks every registered kit for it.
                className="control-off"
                style={{ ...primaryStyle, cursor: submitting ? "wait" : "pointer" }}
              >
                {submitting
                  ? t("proposeTask.submit.busy")
                  : isMetatask
                    ? t("proposeTask.submit.meta")
                    : t("proposeTask.submit.task")}
              </button>
            }
          />
        </ComposerSheet>
      </form>
    </ComposerPage>
  );
}
