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
import HoldoutPublishNotice from "../blocks/HoldoutPublishNotice";

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
  /* ── Widened for the v2 layout (#1181) ──
   * The mode block is the one region whose contents a skin cannot reach at all
   * through the fields above: the roster, the dropdown rows and the leave link
   * are drawn inside this control, and before these three every faction that
   * wanted them dressed would have had to fork it. Additive and optional, so
   * every existing caller is unchanged. */
  /** The block wrapping the chips/roster, the search box and the leave link. */
  containerStyle?: CSSProperties;
  /** Each row inside the invite/challenge dropdown. */
  dropdownItemStyle?: CSSProperties;
  /** The "leave collab" link at the foot of the block. */
  leaveStyle?: CSSProperties;
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
  // Any collab member can drop out from here (#958) — a standalone exit that
  // doesn't require the bank-full drop-to-accept modal. That includes whoever
  // started it: a collab is co-owned by its members and `created_by_id` is only
  // the historical "who started it" fact, carrying no powers over the others
  // (ADR-0013, #1074). The backend's `leave_praxis` has always agreed — it checks
  // membership and nothing else. Leaving and deleting are different acts, not two
  // labels for one: you leave and the crew carries on, whereas Delete (DropButton)
  // destroys the praxis with everyone's work in it, so that one stays the
  // creator's alone. Duel mode has no membership to leave.
  const canLeaveCollab =
    !duelMode &&
    praxis.type === "collab" &&
    praxis.members.some((member) => member.character_id === state.currentCharacterId);
  return (
    <div style={skin.containerStyle}>
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
                {/* The ADR-0012 countdown, for the holdout only (#1164). It
                    renders itself to nothing for every other viewer and for a
                    collab nobody has submitted into, so it is mounted
                    unconditionally here — one mount covers all sixteen composer
                    skins, which is the same reason the roster sits here. */}
                <HoldoutPublishNotice
                  members={praxis.members}
                  currentCharacterId={state.currentCharacterId}
                  factionSlug={praxis.task_faction_slug}
                  submitProposedAt={praxis.submit_proposed_at}
                  autoSubmitDays={state.autoSubmitDays}
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
                  ...skin.dropdownItemStyle,
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
          // Spelling out the outcome next to a delete control that reads
          // superficially similar: this one only removes you (#1074).
          title={collabCopy(praxis.task_faction_slug, "leaveDescription")}
          className="font-body eyebrow hover:underline"
          style={{
            display: "block",
            marginTop: "var(--space-sm)",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "var(--color-text-tertiary)",
            ...skin.leaveStyle,
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
  /** The wrapper around button + helper + error (#1181). */
  containerStyle?: CSSProperties;
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
    <div style={skin.containerStyle}>
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
  className?: string;
}

export function DropButton({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin?: DropButtonSkin;
}) {
  const { t } = useTranslation("forms");
  const praxis = state.praxis;
  const isCollab = praxis?.type === "collab";
  // Deleting destroys the praxis for the whole crew, so it stays the creator's
  // alone — the backend is the authority (`delete_praxis`), this only declines to
  // draw a control the viewer could never use. Every other member's exit is
  // Leave, which is now theirs too (#1074, ADR-0013).
  const isCreator = praxis?.created_by_id === state.currentCharacterId;
  if (isCollab && !isCreator) return null;
  // With other people's parts inside it, the archetype's "drop task" label
  // undersells what the button does. Both the label and the consequence come
  // from collabCopy, so a faction may voice them; the shared default carries the
  // warning if it doesn't.
  const crewAtStake = isCollab && praxis.members.length > 1;
  const label = crewAtStake
    ? collabCopy(praxis.task_faction_slug, "deleteAction")
    : (skin?.label ?? t("editPraxis.dropTask"));
  return (
    <button
      type="button"
      onClick={() => void state.cancel()}
      title={
        crewAtStake
          ? collabCopy(praxis.task_faction_slug, "deleteDescription")
          : undefined
      }
      className={skin?.className}
      style={skin?.style}
    >
      {label}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* SaveDraftButton — the composer's third exit (#1081): keep the draft, leave.  */
/*                                                                              */
/* Publish files the praxis and Drop destroys it; until now there was no way to */
/* simply stop for the night. The click flushes the queued autosave and lands   */
/* on the player's own profile, where their in_progress praxes are listed.      */
/*                                                                              */
/* Deliberately unskinned by default, like the collab Leave link above: this is */
/* a mechanics affordance, not a faction gesture, and the shared neutral        */
/* treatment keeps a wide 16-archetype footprint to one line per footer. The    */
/* optional skin is the escape hatch if a faction later wants its own voice.    */
/*                                                                              */
/* Nothing here asks first — saving a draft destroys nothing, so a confirm      */
/* would be ceremony. (The composer has `askConfirm` for the ones that do.)     */
/* -------------------------------------------------------------------------- */
export interface SaveDraftButtonSkin {
  style?: CSSProperties;
  label?: string;
  /** Replaces the shared classes rather than adding to them (#1181). */
  className?: string;
}

export function SaveDraftButton({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin?: SaveDraftButtonSkin;
}) {
  const { t } = useTranslation("forms");
  // A cast or moderated praxis has no draft to save — the autosave effect sits
  // the same states out, and the archetype is read-only in them. Hide rather
  // than disable, as everywhere else.
  if (state.controlsLocked) return null;
  return (
    <button
      type="button"
      onClick={() => void state.saveDraft()}
      // Not while a publish or a mode switch is in flight: both end up writing
      // the same fields, and both change where the player should be sent.
      disabled={state.submitting || state.switchingMode !== null}
      className={skin?.className ?? "font-body eyebrow hover:underline"}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        color: "var(--color-text-tertiary)",
        ...skin?.style,
      }}
    >
      {skin?.label ?? t("editPraxis.saveDraft")}
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
  /**
   * Wire the section's label to this input (#1181). The v2 layout draws its
   * labels as `ComposerSection` headings rather than as `<label>`s wrapping the
   * control, so the field needs an id for `htmlFor` to point at — pass the same
   * string to both and the input gets a real accessible name.
   */
  id?: string;
  /** For a skin whose label is a drawn mark rather than words. */
  ariaLabel?: string;
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
      id={skin.id}
      aria-label={skin.ariaLabel}
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
  /** Same seam as TitleFieldSkin.id — pairs with ComposerSection's `htmlFor`. */
  id?: string;
  ariaLabel?: string;
  /**
   * Draw the textarea without the markdown toolbar (#1181).
   *
   * For a skin whose write-up region is tight — a phone at the narrow end, a
   * design that puts the formatting affordances somewhere else. It costs the
   * player no capability: every toolbar command is also typeable as plain
   * markdown, which is the same argument #693 made when it took the buttons out
   * of the tab order.
   */
  hideToolbar?: boolean;
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
      {skin.hideToolbar ? null : (
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
      )}
      {/* Role class owns the size; the skin gives up only fontSize (§4a). */}
      <textarea
        ref={textareaRef}
        id={skin.id}
        aria-label={skin.ariaLabel}
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
/* WriteUpTabs — the Write / Preview segmented control (#1181).                */
/*                                                                            */
/* Promoted from the retired `mobileArchetypes/shared.tsx`, where it was the   */
/* phone's answer to a textarea and a preview competing for one narrow column. */
/* The v2 designs draw it at BOTH widths, and there is one component now, so   */
/* it belongs beside the two controls it switches between.                     */
/*                                                                            */
/* It owns the a11y wiring — tablist / tab / aria-selected — and nothing else; */
/* each skin paints the pill through `buttonStyle`. Its copy is the neutral    */
/* shared set (ADR-0065 §3), which is what the old `editPraxis.mobile.*` block */
/* became.                                                                     */
/* -------------------------------------------------------------------------- */
export type ComposerTab = "write" | "preview";

export interface WriteUpTabsSkin {
  containerStyle?: CSSProperties;
  buttonStyle?: (active: boolean) => CSSProperties;
}

export function WriteUpTabs({
  tab,
  setTab,
  skin,
}: {
  tab: ComposerTab;
  setTab: (next: ComposerTab) => void;
  skin: WriteUpTabsSkin;
}) {
  const { t } = useTranslation("forms");
  const options: { key: ComposerTab; label: string }[] = [
    { key: "write", label: t("editPraxis.composer.tabWrite") },
    { key: "preview", label: t("editPraxis.composer.tabPreview") },
  ];
  return (
    <div
      role="tablist"
      aria-label={t("editPraxis.composer.tabsAria")}
      style={{ display: "flex", ...skin.containerStyle }}
    >
      {options.map((option) => {
        const active = tab === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setTab(option.key)}
            style={{
              cursor: "pointer",
              ...(skin.buttonStyle ? skin.buttonStyle(active) : {}),
            }}
          >
            {option.label}
          </button>
        );
      })}
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
  /**
   * What to draw when the body is still empty (#1181).
   *
   * Historically this control rendered nothing at all on an empty body, which is
   * right when the preview sits BELOW the textarea — there is nothing to say and
   * the editor is right there. The v2 layout puts preview behind a TAB, and a
   * tab that renders an empty panel reads as broken rather than as empty. A skin
   * that draws the preview inline still passes nothing and keeps the old
   * behaviour.
   */
  emptyState?: ReactNode;
}

export function BodyPreview({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin: BodyPreviewSkin;
}) {
  if (!state.body.trim()) {
    return skin.emptyState == null ? null : (
      <div style={skin.wrapperStyle}>
        {skin.label}
        {skin.emptyState}
      </div>
    );
  }
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
/* PublishButton — renders nothing once published (with one duel exception,     */
/* below) and is disabled while saving / submitting / switching mode. The       */
/* archetype arranges it inside its bespoke file bar and supplies faction-voiced */
/* labels via skin. (The old Save Draft button was removed in #297 — autosave    */
/* persists title/body and media uploads on pick, so no manual draft-save        */
/* control is needed.)                                                          */
/* -------------------------------------------------------------------------- */
export interface PublishButtonSkin {
  style: CSSProperties;
  /** For reaching a CSS class — an ep-* motion, a shared utility (#1181). */
  className?: string;
  idleLabel: ReactNode;
  busyLabel: ReactNode;
  ornament?: ReactNode;
  /**
   * Drawn AFTER the label; `ornament` is drawn before it (#1186).
   *
   * The Singularity composer's submit is a terminal prompt, so its block cursor
   * has to trail the word rather than lead it. Folding it into `idleLabel`
   * would have lost it in every state this control relabels for itself — the
   * collab consensus gate and the duel pull-back both replace `idleLabel` with
   * `collabCopy`, and the busy state replaces it too, while the cursor is
   * chrome that belongs to the button in all of them. Additive and optional, so
   * every existing caller is byte-identical.
   */
  trailingOrnament?: ReactNode;
}

export function PublishButton({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin: PublishButtonSkin;
}) {
  const praxis = state.praxis;
  // The one published state that keeps its footer button (#1077). A duel side
  // that casts goes straight to `submitted` while the duel is still unsettled —
  // `active` (accepted, and the rival has not answered, because a second cast
  // settles it: `maybe_settle_duel`) or `pending` (cast before the rival even
  // accepted). Both are the same trap: the entry is author-only until the duel
  // completes (#999), the composer is locked, and there is no way back into it.
  //
  // Pulling back from either is a free, neutral reopen. `unsubmit_praxis` marks
  // a forfeit only for a *settled* duel (ADR-0011 §Forfeit), so the praxis just
  // returns to `in_progress` with `forfeited_by_character_id` still NULL and the
  // duel untouched — the promise the seal dialog already made on the way in
  // (`duelSeal.reopenNote`). Listed, not negated: `settled`/`resolved` are where
  // forfeit begins and belong to the detail page, and a `declined` challenge
  // leaves an ordinary published solo praxis, which stays unpublishable-back.
  const duelPullBack =
    state.isPublished &&
    state.duelMode &&
    (state.duel?.status === "active" || state.duel?.status === "pending");
  if (state.isPublished && !duelPullBack) return null;
  // Multi-member collabs cast (and pull back) through this same footer button
  // (#646). The consensus gate decides the action and the faction-voiced idle
  // label; the busy label stays the archetype's mode-agnostic present participle.
  const collab =
    praxis?.type === "collab" && praxis.members.length > 1
      ? deriveCollabGate(praxis.members, state.currentCharacterId)
      : null;
  // Neutral wording, deliberately: no forfeit language and no consequence
  // dialog before the duel settles (#718 rejected that framing once already;
  // `praxisDetail/__tests__/duelForfeitWarning.test.tsx` is the standing guard).
  // Shared voice for now, like the other mechanics lines in
  // `SHARED_DEFAULT_COLLAB_KEYS`.
  const idleLabel = duelPullBack
    ? collabCopy(praxis?.task_faction_slug, "duelPullBackAction")
    : collab && praxis
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
  // as an ordinary solo praxis, so there is nothing to warn about. Once cast,
  // the same button reverses it through `pullBack` and asks nothing.
  const sealsADuel = state.duelMode && state.duel != null;
  const onClick =
    duelPullBack || collab?.iCast
      ? state.pullBack
      : sealsADuel
        ? async () => state.requestDuelSeal()
        : state.publish;
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={state.submitting || state.switchingMode !== null}
      className={skin.className}
      style={skin.style}
    >
      {skin.ornament}
      {state.submitting ? skin.busyLabel : idleLabel}
      {skin.trailingOrnament}
    </button>
  );
}

