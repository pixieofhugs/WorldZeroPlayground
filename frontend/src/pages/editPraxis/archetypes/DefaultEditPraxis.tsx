/**
 * Unaffiliated (`default` ≡ `na` ≡ Albescent) edit praxis — composer v2 (#1181,
 * epic #1179; design project c491945e, `Unaffiliated Edit Praxis.dc.html`,
 * `faction="default"`).
 *
 * This is the REFERENCE implementation of the layout contract the seven faction
 * skins inherit (ADR-0065). It is not a placeholder: `default` ≡ `na` ≡
 * Unaffiliated is one visual identity (ADR-0039/0046/0048), so this IS the
 * Unaffiliated composer and the fall-through every undressed faction renders.
 * **Albescent registers nothing here and falls through to it** — in the design's
 * `SKINS` table the two rows are the same `chrome: 'spectrum', aurora: true`
 * with identical fonts, differing only in a card ground; that is not a skin.
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
  Breadcrumb,
  ComposerFooter,
  ComposerGround,
  ComposerMasthead,
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
} from "./shared";
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
import type { EditPraxisState } from "../useEditPraxis";

interface Props {
  state: EditPraxisState;
}

/* The na kit runs entirely on the global --faction-default-* tokens, so it flips
 * light/dark through the cascade. Named for the ROLE each plays in the design's
 * skin row rather than for its colour — `ink` is the design's `ink` and its
 * `accent`, which are the same value in both themes. */
const SHEET = "var(--faction-default-card-bg)";
const FIELD = "var(--faction-default-composer-field)";
const INK = "var(--faction-default-card-text)";
const MUTED = "var(--faction-default-card-muted)";
const FAINT = "var(--faction-default-composer-faint)";
const BORDER = "var(--faction-default-border)";
const HAIR = "var(--faction-default-composer-hair)";
const ON_ACCENT = "var(--faction-default-on-accent)";
/* The seven wedges, for both marks. */
const RING = "var(--faction-default-ring)";
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

export default function DefaultEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
  const sizes = useComposerSizes();
  const [tab, setTab] = useState<ComposerTab>("write");
  const praxis = state.praxis!;
  const task = state.task;

  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];
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
    outline: "none",
    boxSizing: "border-box",
  } as const;

  return (
    <div style={{ fontFamily: TITLE_FACE, color: INK }}>
      <div
        style={{
          maxWidth: sizes.maxWidth,
          margin: "0 auto",
          padding: "var(--space-lg) var(--space-lg) 0",
        }}
      >
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
        />
      </div>

      <ComposerSheet
        sizes={sizes}
        style={{
          background: SHEET,
          border: `1px solid ${BORDER}`,
          boxShadow: "0 16px 40px -24px rgba(0,0,0,0.5)",
        }}
        masthead={<ComposerMasthead background={BAND} animated />}
        ground={
          <ComposerGround
            background="var(--faction-default-aurora)"
            opacity="var(--faction-default-aurora-opacity)"
            filter="var(--faction-default-aurora-filter)"
            mixBlendMode="var(--faction-default-aurora-blend)"
            animated
          />
        }
      >
        {/* Draft · Saved just now, with the spectrum status mark. */}
        <ComposerStatusRow
          status={t("editPraxis.composer.statusDraft")}
          meta={
            state.autosaveAt
              ? t("editPraxis.composer.statusSaved", {
                  ago: formatAutosave(state.autosaveAt),
                })
              : t("editPraxis.composer.statusUnsaved")
          }
          statusStyle={{ color: INK, fontWeight: 700 }}
          metaStyle={{ color: FAINT }}
          mark={<RingMark size={44} inset={5} ring={RING} inner={FIELD} spin />}
        />

        {/* The task reference slip, on the field ground with the points mark. */}
        <TaskSlip
          praxis={praxis}
          task={task}
          style={{
            background: FIELD,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "var(--space-lg)",
          }}
          labelStyle={{ color: FAINT }}
          titleStyle={{ fontFamily: TITLE_FACE, fontStyle: "italic", color: INK }}
          descriptionStyle={{ color: MUTED }}
          pillStyle={{ color: MUTED }}
          mark={
            <RingMark
              size={84}
              inset={4}
              ring={RING}
              inner={SHEET}
              ringOpacity={0.9}
              spin
            >
              <span
                style={{
                  fontFamily: TITLE_FACE,
                  fontSize: "var(--text-title)",
                  lineHeight: 1,
                  color: INK,
                }}
              >
                {task?.point_value ?? 0}
              </span>
            </RingMark>
          }
        />

        <ComposerSection
          label={t("editPraxis.composer.titleLabel")}
          htmlFor="composer-title"
          meta={<TitleCounter length={state.title.length} color={FAINT} />}
          labelStyle={{ color: MUTED }}
        >
          <TitleField
            state={state}
            skin={{
              id: "composer-title",
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
                allowedModes,
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
              state.duelMode
                ? t("editPraxis.composer.opponentLabel")
                : t("editPraxis.composer.collaboratorsLabel", {
                    count: praxis.members.length,
                  })
            }
            labelStyle={{ color: MUTED }}
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
                acceptedBg: INK,
                acceptedColor: ON_ACCENT,
                placeholder: t("editPraxis.composer.invitePlaceholder"),
                leaveStyle: { color: FAINT },
              }}
            />
          </ComposerSection>
        )}

        {state.showSealStack && (
          <ComposerSection
            label={t("editPraxis.composer.sealsLabel")}
            labelStyle={{ color: MUTED }}
          >
            <MetataskSealStack state={state} />
          </ComposerSection>
        )}

        {/* Write-up — the tabs sit in the section's meta slot, so the label row
            reads `Write-up … [Write|Preview]` exactly as the design draws it. */}
        <ComposerSection
          label={t("editPraxis.composer.writeUpLabel")}
          htmlFor="composer-body"
          labelStyle={{ color: MUTED }}
          meta={
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
          }
        >
          {/* Both panels are mounted only one at a time: a hidden textarea would
              still be a tab stop and still be submitted by a form, and drawing
              both would put the body in the DOM twice. */}
          {tab === "write" ? (
            <>
              <BodyTextarea
                state={state}
                skin={{
                  id: "composer-body",
                  rows: 8,
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
              <div
                style={composerLabelStyle({
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
                  buttonStyle: composerLabelStyle({
                    cursor: "pointer",
                    background: "transparent",
                    border: `1px dashed ${BORDER}`,
                    borderRadius: 10,
                    padding: "var(--space-lg) var(--space-xl)",
                    color: MUTED,
                  }),
                  buttonLabel: t("editPraxis.composer.proofButton"),
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

        <ErrorBanner message={state.error} />

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
                style: composerLabelStyle({
                  cursor: state.submitting ? "wait" : "pointer",
                  border: "none",
                  borderRadius: 10,
                  padding: "var(--space-md) var(--space-xl)",
                  color: ON_ACCENT,
                  background: INK,
                  fontWeight: 700,
                }),
              }}
            />
          }
        />
      </ComposerSheet>
    </div>
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
