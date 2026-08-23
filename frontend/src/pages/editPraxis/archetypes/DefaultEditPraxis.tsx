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
 * masthead → status row (`Draft` · `Saved just now`) → the task slip (title,
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
 * ## The two motions
 *
 * `ep-edge` walks the masthead's spectrum band, `ep-drift` wanders the aurora.
 * Both are CLASSES: the keyframes live in `index.css` behind the shared
 * `prefers-reduced-motion` guard, and an inline `animation:` would bypass that
 * guard (#1003). The other five `ep*` keyframes ship unused, for the skins.
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
const SHEET = "var(--faction-default-card-bg)";
/* The error banner's ink (#1231). The banner sits straight on the sheet, and
 * the neutral `--color-danger` under its own veil misses AA there in light
 * (4.41:1 on this ground); this is #1449's alarm rung, already measured
 * on paper. The veil and the edge stay neutral — ADR-0061. */
const ALARM = "var(--faction-default-card-alarm)";
const FIELD = "var(--faction-default-composer-field)";
const INK = "var(--faction-default-card-text)";
const MUTED = "var(--faction-default-card-muted)";
const FAINT = "var(--faction-default-composer-faint)";
const BORDER = "var(--faction-default-border)";
const HAIR = "var(--faction-default-composer-hair)";
const ON_ACCENT = "var(--faction-default-on-accent)";
/* The seven wedges, for both marks. */
const RING = "var(--faction-default-rainbow-conic)";
/* The masthead band is the LOOP cut, not the seven-stop bar ramp the design
 * literal shows. `ep-edge` walks background-position across a 300%-wide band, so
 * the paint has to tile: the bar ramp's red-at-0% meets magenta-at-100% and
 * shows a hard seam every cycle, which is the exact failure the `-loop` token's
 * own docstring exists to describe. Same spectrum, cut for this geometry. */
const BAND = "var(--faction-default-rainbow-loop)";

/* The design's title + body face is Lora (--font-display); its label face is
 * Courier Prime (--font-body), which is what composerLabelStyle already
 * defaults to. The token names read backwards here and that is not a mistake —
 * --font-body is the site's Courier Prime. */
const TITLE_FACE = "var(--font-display)";

const labelStyle = { color: MUTED };
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
   waiting surface once your part is in (#1189). These are the same ELEMENTS
   both times, not two constructions of the same idea, so na's spectrum band
   and drifting aurora cannot drift apart between the two stages. */
const masthead = <ComposerMasthead background={BAND} animated />;
const ground = (
  <ComposerGround
    background="var(--faction-default-aurora)"
    opacity="var(--faction-default-aurora-opacity)"
    filter="var(--faction-default-aurora-filter)"
    mixBlendMode="var(--faction-default-aurora-blend)"
    animated
  />
);
const sheetStyle = {
  background: SHEET,
  border: `1px solid ${BORDER}`,
  boxShadow: "0 16px 40px -24px var(--color-cast-shadow)",
};
const statusMark = (
  <RingMark size={44} inset={5} ring={RING} inner={FIELD} spin />
);
const slip = {
  style: {
    background: FIELD,
    border: `1px solid ${BORDER}`,
    /* The design left-rules the slip in the accent (#1706). It sits AFTER the
       border shorthand on purpose: a shorthand spread last would erase it. */
    borderLeft: `2px solid ${INK}`,
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
  pageStyle: { fontFamily: TITLE_FACE, color: INK },
  sheetStyle,
  masthead,
  ground,
  rule: () => <ComposerRule style={{ background: HAIR }} />,
  mark: statusMark,
  statusStyle: { color: INK, fontWeight: 700 },
  metaStyle: { color: FAINT },
  labelStyle,
  slip,
  panelStyle,
  headingStyle: { fontFamily: TITLE_FACE, color: INK },
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
        masthead={masthead}
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
                 * `MUTED` is that fallback stated out loud, which is what the
                 * `+ invite` chip needs to stop reading the TASK's faction. */
                collab: { radius: 10, quiet: MUTED },
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
                    color: MUTED,
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
