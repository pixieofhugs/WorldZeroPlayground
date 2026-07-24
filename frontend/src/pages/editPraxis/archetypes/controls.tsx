/**
 * Lightly skinned, accessible control primitives shared by all archetypes.
 * Archetypes still own their own visual treatment for the *outer* containers
 * (paperclips, customs stamps, sticky notes); these are the inner essentials
 * that must always render: file picker, member chips, search dropdown.
 */
import { useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { factionCssVar, factionName } from "../../../utils/factions";
import type { PraxisType } from "../../../api/praxis";
import MarkdownPreview from "../blocks/MarkdownPreview";
import { applyMarkdown } from "../blocks/markdownToolbar";
import type { MarkdownCommand } from "../blocks/markdownToolbar";
import type { EditPraxisState } from "../useEditPraxis";
import { CollabRoster, deriveCollabGate } from "../../../components/collab/CollabRoster";
import { collabCopy } from "../../../components/collab/collabCopy";

export interface InviteSearchSkin {
  inputBg?: string;
  inputColor?: string;
  inputBorder?: string;
  fontFamily?: string;
  dropdownBg?: string;
  dropdownBorder?: string;
  pillBg?: string;
  pillColor?: string;
  acceptedBg?: string;
  acceptedColor?: string;
  pendingBg?: string;
  pendingColor?: string;
  placeholder?: string;
}

export function InviteSearch({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin: InviteSearchSkin;
}) {
  const { t } = useTranslation("forms");
  const praxis = state.praxis!;
  // Duel mode reuses this same box as a one-opponent challenge picker (#311):
  // picking issues a challenge; once attached, the opponent shows as a chip and
  // the search input is hidden (a duel has exactly one opponent).
  const duelMode = state.duelMode;
  const challengeAttached = duelMode && praxis.duel_id != null;
  const onPick = duelMode ? state.sendChallenge : state.sendInvite;
  // Cast progress drives the roster + hides "invite another" once weaving starts (#591).
  const castCount = praxis.members.filter((m) => m.has_submitted).length;
  // A non-creator collab member can drop out from here (#958) — a standalone exit
  // that doesn't require the bank-full drop-to-accept modal. The creator instead
  // deletes/drops the whole draft (DropButton), so the leave control is hidden for
  // them; duel mode has no membership to leave.
  const isCreator = praxis.created_by_id === state.currentCharacterId;
  const canLeaveCollab =
    !duelMode &&
    praxis.type === "collab" &&
    !isCreator &&
    praxis.members.some((member) => member.character_id === state.currentCharacterId);
  return (
    <div>
      <div
        style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", marginBottom: "var(--space-sm)" }}
      >
        {duelMode
          ? challengeAttached && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-xs)",
                  fontFamily: skin.fontFamily,
                  fontSize: "var(--text-md)",
                  padding: "var(--space-xs) var(--space-sm)",
                  background: skin.pendingBg ?? "transparent",
                  color: skin.pendingColor ?? "inherit",
                  border: "1px dashed currentColor",
                }}
              >
                ⚔{" "}
                {state.duel?.opponent.display_name ??
                  t("editPraxis.invite.opponentFallback")}{" "}
                <em>
                  ·{" "}
                  {state.duel?.status === "active"
                    ? t("editPraxis.invite.statusAccepted")
                    : t("editPraxis.invite.statusChallenged")}
                </em>
                {/* A still-pending challenge is withdrawn with the compact × —
                    nothing is at stake yet. */}
                {(state.duel == null || state.duel.status === "pending") && (
                  <button
                    type="button"
                    onClick={() => void state.cancelDuel()}
                    aria-label={t("editPraxis.invite.cancelChallengeAria")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "inherit",
                      cursor: "pointer",
                      fontSize: "var(--text-xl)",
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                )}
                {/* Once accepted, either participant can still dissolve the duel
                    neutrally (#956) — the backend recalculates both sides back to
                    solo scoring, no forfeit. It's a heavier action than the ×, so
                    it's a labelled button behind a confirm (state.dissolveDuel). */}
                {state.duel?.status === "active" && (
                  <button
                    type="button"
                    onClick={() => void state.dissolveDuel()}
                    aria-label={t("editPraxis.invite.dissolveDuelAria")}
                    style={{
                      background: "transparent",
                      border: "1px solid currentColor",
                      color: "inherit",
                      cursor: "pointer",
                      fontFamily: skin.fontFamily,
                      fontSize: "var(--text-sm)",
                      lineHeight: 1,
                      padding: "var(--space-xs) var(--space-sm)",
                      marginLeft: "var(--space-xs)",
                    }}
                  >
                    {t("editPraxis.invite.dissolveDuelLabel")}
                  </button>
                )}
              </span>
            )
          : [
              // Live cast-status roster replaces the flat member pills (#591).
              <div key="roster" style={{ flex: "1 1 100%" }}>
                <CollabRoster
                  members={praxis.members}
                  currentCharacterId={state.currentCharacterId}
                  factionSlug={praxis.task_faction_slug}
                  taskPointValue={praxis.task_point_value}
                  onKick={state.kickMember}
                />
              </div>,
              ...praxis.invites
                .filter((invite) => invite.status === "pending")
                .map((invite) => (
                  <span
                    key={`i-${invite.id}`}
                    style={{
                      fontFamily: skin.fontFamily,
                      fontSize: "var(--text-md)",
                      padding: "var(--space-xs) var(--space-sm)",
                      background: skin.pendingBg ?? "transparent",
                      color: skin.pendingColor ?? "inherit",
                      border: "1px dashed currentColor",
                    }}
                  >
                    {invite.invitee_display_name}{" "}
                    <em>· {t("editPraxis.invite.statusPending")}</em>
                    {/* Inviter rescinds a still-pending invite (#421). */}
                    <button
                      type="button"
                      onClick={() => void state.cancelInvite(invite.id)}
                      aria-label={t("editPraxis.invite.rescindInviteAria", {
                        name: invite.invitee_display_name,
                      })}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "inherit",
                        cursor: "pointer",
                        fontSize: "var(--text-xl)",
                        lineHeight: 1,
                        padding: 0,
                        marginLeft: "var(--space-xs)",
                      }}
                    >
                      ×
                    </button>
                  </span>
                )),
            ]}
      </div>
      {!challengeAttached && (duelMode || castCount === 0) && (
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={state.inviteQuery}
          onChange={(event) => state.setInviteQuery(event.target.value)}
          placeholder={
            skin.placeholder ??
            (duelMode
              ? t("editPraxis.invite.searchPlaceholderDuel")
              : t("editPraxis.invite.searchPlaceholder"))
          }
          aria-label={
            duelMode
              ? t("editPraxis.invite.searchAriaDuel")
              : t("editPraxis.invite.searchAria")
          }
          style={{
            width: "100%",
            fontFamily: skin.fontFamily,
            fontSize: "var(--text-lg)",
            padding: "var(--space-sm) var(--space-md)",
            background: skin.inputBg ?? "transparent",
            color: skin.inputColor ?? "inherit",
            border: skin.inputBorder ?? "1px solid currentColor",
            outline: "none",
          }}
          onFocus={() => {
            if (state.inviteResults.length > 0) state.setInviteOpen(true);
          }}
          onBlur={() => setTimeout(() => state.setInviteOpen(false), 200)}
        />
        {state.inviteOpen && state.inviteResults.length > 0 && (
          <div
            role="listbox"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 10,
              background: skin.dropdownBg ?? "var(--color-bg-surface)",
              border: skin.dropdownBorder ?? "1px solid var(--color-border)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {state.inviteResults.map((character) => (
              <button
                key={character.id}
                type="button"
                disabled={state.inviting}
                onMouseDown={() => void onPick(character)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-sm)",
                  width: "100%",
                  padding: "var(--space-sm) var(--space-md)",
                  background: "transparent",
                  border: "none",
                  cursor: state.inviting ? "wait" : "pointer",
                  textAlign: "left",
                  fontFamily: skin.fontFamily,
                  fontSize: "var(--text-lg)",
                  color: skin.inputColor ?? "inherit",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: factionCssVar(character.faction_slug, "light"),
                    border: `1px solid ${factionCssVar(character.faction_slug, "border")}`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontWeight: 700 }}>
                  {character.display_name}
                </span>
                <span style={{ marginLeft: "auto", fontSize: "var(--text-sm)", opacity: 0.7 }}>
                  {factionName(character.faction_slug)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      )}
      {canLeaveCollab && (
        <button
          type="button"
          onClick={() => void state.leaveCollab()}
          className="font-body eyebrow hover:underline"
          style={{
            display: "block",
            marginTop: "var(--space-sm)",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "var(--color-text-tertiary)",
          }}
        >
          {t("editPraxis.leaveAction")}
        </button>
      )}
    </div>
  );
}

export interface FilePickerSkin {
  buttonStyle: CSSProperties;
  buttonLabel: string;
  errorColor?: string;
  helperText?: string;
  helperStyle?: CSSProperties;
}

export function FilePicker({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin: FilePickerSkin;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={skin.buttonStyle}
      >
        {skin.buttonLabel}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        onChange={state.handleFileChange}
        style={{ display: "none" }}
      />
      {skin.helperText && <div style={skin.helperStyle}>{skin.helperText}</div>}
      {state.fileError && (
        <p
          style={{
            fontSize: "var(--text-md)",
            color: skin.errorColor ?? "var(--color-danger)",
            marginTop: "var(--space-sm)",
          }}
        >
          {state.fileError}
        </p>
      )}
    </div>
  );
}

export interface DropButtonSkin {
  style?: CSSProperties;
  label?: string;
}

export function DropButton({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin?: DropButtonSkin;
}) {
  const { t } = useTranslation("forms");
  return (
    <button
      type="button"
      onClick={() => void state.cancel()}
      style={skin?.style}
    >
      {skin?.label ?? t("editPraxis.dropTask")}
    </button>
  );
}

/* The editable seal stack (#933) lives in `../MetataskSealStack` — deliberately
 * OUTSIDE this module so `controls.tsx` never imports MetaTaskSeal (and through
 * it the faction registry). See that file's header for why the cycle matters. */

/* -------------------------------------------------------------------------- */
/* TitleField — the single 200-char title input.                              */
/* The archetype owns every surrounding ornament (labels, counters, ransom    */
/* previews); this control only owns the value/onChange binding so no         */
/* archetype re-implements it.                                                */
/* -------------------------------------------------------------------------- */
export interface TitleFieldSkin {
  inputStyle: CSSProperties;
  placeholder?: string;
}

export function TitleField({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin: TitleFieldSkin;
}) {
  return (
    // The role class owns the type size; the skin keeps font/colour/ornament
    // only (§4a). Inline style wins over class, so the size lands as soon as the
    // skin stops setting fontSize.
    <input
      type="text"
      maxLength={200}
      className="content-text"
      value={state.title}
      onChange={(event) => state.setTitle(event.target.value)}
      placeholder={skin.placeholder}
      style={skin.inputStyle}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* BodyTextarea — the body textarea bound to state.body / state.setBody.       */
/* Kept separate from BodyPreview so archetypes that wrap the textarea in      */
/* bespoke chrome (line-number gutters, etc.) can still consume the shared     */
/* binding.                                                                    */
/* -------------------------------------------------------------------------- */
export interface BodyTextareaSkin {
  textareaStyle: CSSProperties;
  rows?: number;
  placeholder?: string;
  /** Optional override for the toolbar wrapper (e.g. archetype spacing). */
  toolbarStyle?: CSSProperties;
  /** Optional override for each toolbar button. */
  toolbarButtonStyle?: CSSProperties;
}

// Toolbar buttons in render order. Each glyph is referenced through
// `button.glyph` (an identifier expression, not JSX text) so it never trips
// i18next/no-literal-string; the accessible name comes from the t() labelKey.
const BODY_TOOLBAR_BUTTONS = [
  { command: "bold", glyph: "B", labelKey: "editPraxis.toolbar.bold" },
  { command: "italic", glyph: "I", labelKey: "editPraxis.toolbar.italic" },
  {
    command: "strikethrough",
    glyph: "S",
    labelKey: "editPraxis.toolbar.strikethrough",
  },
  { command: "heading", glyph: "H", labelKey: "editPraxis.toolbar.heading" },
  {
    command: "unorderedList",
    glyph: "•",
    labelKey: "editPraxis.toolbar.unorderedList",
  },
  {
    command: "orderedList",
    glyph: "1.",
    labelKey: "editPraxis.toolbar.orderedList",
  },
  { command: "link", glyph: "🔗", labelKey: "editPraxis.toolbar.link" },
  { command: "blockquote", glyph: "❝", labelKey: "editPraxis.toolbar.blockquote" },
  {
    command: "inlineCode",
    glyph: "</>",
    labelKey: "editPraxis.toolbar.inlineCode",
  },
  { command: "codeBlock", glyph: "{ }", labelKey: "editPraxis.toolbar.codeBlock" },
  { command: "table", glyph: "▦", labelKey: "editPraxis.toolbar.table" },
] as const satisfies ReadonlyArray<{
  command: MarkdownCommand;
  glyph: string;
  labelKey: string;
}>;

export function BodyTextarea({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin: BodyTextareaSkin;
}) {
  const { t } = useTranslation("forms");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const runCommand = (command: MarkdownCommand) => {
    const el = textareaRef.current;
    if (!el) return;
    const result = applyMarkdown(command, {
      text: state.body,
      selectionStart: el.selectionStart,
      selectionEnd: el.selectionEnd,
    });
    state.setBody(result.text);
    // Restore the caret/selection after React commits the new value.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const buttonStyle: CSSProperties = {
    minWidth: 26,
    padding: "var(--space-xs) var(--space-sm)",
    fontSize: "var(--text-lg)",
    fontWeight: 700,
    lineHeight: 1.2,
    background: "var(--color-bg-surface)",
    color: "var(--color-text-secondary)",
    border: "1px solid var(--color-border)",
    cursor: "pointer",
    ...skin.toolbarButtonStyle,
  };

  return (
    <div>
      <div
        role="toolbar"
        aria-label={t("editPraxis.toolbar.label")}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-xs)",
          marginBottom: "var(--space-sm)",
          ...skin.toolbarStyle,
        }}
      >
        {BODY_TOOLBAR_BUTTONS.map((button) => (
          <button
            key={button.command}
            type="button"
            // #693: keep the formatting buttons out of the natural tab order so
            // Tab runs title → body instead of stopping on all eleven glyphs.
            // Every command is also typeable as plain markdown, so keyboard
            // users lose no capability. (Roving tabindex was considered and
            // declined: it still leaves a tab stop between title and body.)
            tabIndex={-1}
            onClick={() => runCommand(button.command)}
            aria-label={t(button.labelKey)}
            style={buttonStyle}
          >
            {button.glyph}
          </button>
        ))}
      </div>
      {/* Role class owns the size; the skin gives up only fontSize (§4a). */}
      <textarea
        ref={textareaRef}
        className="content-text"
        value={state.body}
        onChange={(event) => state.setBody(event.target.value)}
        rows={skin.rows}
        placeholder={skin.placeholder}
        style={skin.textareaStyle}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* BodyPreview — the live markdown preview block. Owns the `state.body.trim()` */
/* guard (renders nothing until the body has content) and reuses the shared    */
/* MarkdownPreview block component. The archetype supplies the bespoke wrapper, */
/* eyebrow label, and markdown typography via the skin.                        */
/* -------------------------------------------------------------------------- */
export interface BodyPreviewSkin {
  wrapperStyle?: CSSProperties;
  label?: ReactNode;
  markdownClassName?: string;
  markdownStyle?: CSSProperties;
}

export function BodyPreview({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin: BodyPreviewSkin;
}) {
  if (!state.body.trim()) return null;
  return (
    <div style={skin.wrapperStyle}>
      {skin.label}
      {/* content-text owns the body's type size (the largest player-written
          prose on the site); the skin's markdownStyle keeps only font/colour.
          The literal class lives on TitleField/BodyTextarea so Tailwind emits
          it even though this one is assembled. */}
      <MarkdownPreview
        source={state.body}
        className={`content-text ${skin.markdownClassName ?? "markdown-preview"}`}
        style={skin.markdownStyle}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ModePicker — the solo/collab/duel selector. Owns the lock/hide guards so no */
/* archetype re-implements them: it filters to allowed modes, hides every      */
/* non-active option once the mode is locked, computes the disabled flag, and  */
/* wires the confirm-then-switch onClick. The archetype supplies its option    */
/* metadata and renders each option's bespoke button via `renderOption` —      */
/* arrangement stays the faction's identity (ADR-0016).                        */
/* -------------------------------------------------------------------------- */
export interface ModeOptionRenderArgs {
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
  index: number;
}

export interface ModePickerSkin<O extends { key: PraxisType }> {
  containerStyle?: CSSProperties;
  options: O[];
  /** The task's allowed modes. Typed as `string[]` to match TaskOut.allowed_modes;
   * each option whose `key` is present is rendered. */
  allowedModes: readonly string[];
  renderOption: (option: O, args: ModeOptionRenderArgs) => ReactNode;
}

export function ModePicker<O extends { key: PraxisType }>({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin: ModePickerSkin<O>;
}) {
  const praxis = state.praxis!;
  return (
    <div style={skin.containerStyle}>
      {skin.options
        .filter((option) =>
          // Duel isn't in task.allowed_modes (it's issued via challenge, ADR-0011);
          // it's gated on the viewer's level instead (#311). Hide, don't disable.
          option.key === "duel"
            ? state.duelChipVisible
            : skin.allowedModes.includes(option.key),
        )
        .map((option, index) => {
          // A duel side stays type='solo' + duel_id, so the duel chip's active
          // state is driven by duelMode, not praxis.type.
          const active =
            option.key === "duel"
              ? state.duelMode
              : praxis.type === option.key && !state.duelMode;
          const disabled =
            state.modeIsLocked || state.switchingMode !== null;
          if (state.modeIsLocked && !active) return null;
          return skin.renderOption(option, {
            active,
            disabled,
            index,
            onSelect: () => {
              if (!disabled) void state.changeMode(option.key);
            },
          });
        })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PublishButton — renders nothing once published and is disabled while        */
/* saving / submitting / switching mode. The archetype arranges it inside its   */
/* bespoke file bar and supplies faction-voiced labels via skin. (The old       */
/* Save Draft button was removed in #297 — autosave persists title/body and     */
/* media uploads on pick, so no manual draft-save control is needed.)           */
/* -------------------------------------------------------------------------- */
export interface PublishButtonSkin {
  style: CSSProperties;
  idleLabel: ReactNode;
  busyLabel: ReactNode;
  ornament?: ReactNode;
}

export function PublishButton({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin: PublishButtonSkin;
}) {
  if (state.isPublished) return null;
  // Multi-member collabs cast (and pull back) through this same footer button
  // (#646). The consensus gate decides the action and the faction-voiced idle
  // label; the busy label stays the archetype's mode-agnostic present participle.
  const praxis = state.praxis;
  const collab =
    praxis?.type === "collab" && praxis.members.length > 1
      ? deriveCollabGate(praxis.members, state.currentCharacterId)
      : null;
  const idleLabel =
    collab && praxis
      ? collabCopy(
          praxis.task_faction_slug,
          collab.iCast
            ? "pullBackAction"
            : collab.castCount === collab.memberCount - 1
              ? "castFinalAction"
              : "castAction",
        )
      : skin.idleLabel;
  // A duel side asks before it casts (#718): the button opens the seal
  // confirmation, whose confirm calls this same `publish()`. Only once an
  // opponent is actually attached — duel mode with an empty opponent slot casts
  // as an ordinary solo praxis, so there is nothing to warn about.
  const sealsADuel = state.duelMode && state.duel != null;
  const onClick = collab?.iCast
    ? state.pullBack
    : sealsADuel
      ? async () => state.requestDuelSeal()
      : state.publish;
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={state.submitting || state.switchingMode !== null}
      style={skin.style}
    >
      {skin.ornament}
      {state.submitting ? skin.busyLabel : idleLabel}
    </button>
  );
}

