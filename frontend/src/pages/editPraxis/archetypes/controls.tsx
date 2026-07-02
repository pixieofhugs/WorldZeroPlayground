/**
 * Lightly skinned, accessible control primitives shared by all archetypes.
 * Archetypes still own their own visual treatment for the *outer* containers
 * (paperclips, customs stamps, sticky notes); these are the inner essentials
 * that must always render: file picker, member chips, search dropdown.
 */
import { useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import LevelPill from "../../../components/ui/LevelPill";
import { factionCssVar, factionName } from "../../../utils/factions";
import type { PraxisType } from "../../../api/praxis";
import MarkdownPreview from "../blocks/MarkdownPreview";
import type { EditPraxisState } from "../useEditPraxis";

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
  const praxis = state.praxis!;
  // Duel mode reuses this same box as a one-opponent challenge picker (#311):
  // picking issues a challenge; once attached, the opponent shows as a chip and
  // the search input is hidden (a duel has exactly one opponent).
  const duelMode = state.duelMode;
  const challengeAttached = duelMode && praxis.duel_id != null;
  const onPick = duelMode ? state.sendChallenge : state.sendInvite;
  return (
    <div>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}
      >
        {duelMode
          ? challengeAttached && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: skin.fontFamily,
                  fontSize: 11,
                  padding: "4px 10px",
                  background: skin.pendingBg ?? "transparent",
                  color: skin.pendingColor ?? "inherit",
                  border: "1px dashed currentColor",
                }}
              >
                ⚔ {state.duel?.opponent.display_name ?? "opponent"}{" "}
                <em>
                  · {state.duel?.status === "active" ? "accepted" : "challenged"}
                </em>
                {/* Only a pending challenge can be withdrawn (backend forbids
                    cancelling an accepted duel). */}
                {(state.duel == null || state.duel.status === "pending") && (
                  <button
                    type="button"
                    onClick={() => void state.cancelDuel()}
                    aria-label="cancel challenge"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "inherit",
                      cursor: "pointer",
                      fontSize: 14,
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </span>
            )
          : [
              ...praxis.members
                .filter(
                  (member) => member.character_id !== state.currentCharacterId,
                )
                .map((member) => (
                  <span
                    key={`m-${member.id}`}
                    style={{
                      fontFamily: skin.fontFamily,
                      fontSize: 11,
                      padding: "4px 10px",
                      background: skin.acceptedBg ?? "var(--color-success)",
                      color: skin.acceptedColor ?? "var(--color-text-on-accent)",
                    }}
                  >
                    {member.character_display_name}
                  </span>
                )),
              ...praxis.invites
                .filter((invite) => invite.status === "pending")
                .map((invite) => (
                  <span
                    key={`i-${invite.id}`}
                    style={{
                      fontFamily: skin.fontFamily,
                      fontSize: 11,
                      padding: "4px 10px",
                      background: skin.pendingBg ?? "transparent",
                      color: skin.pendingColor ?? "inherit",
                      border: "1px dashed currentColor",
                    }}
                  >
                    {invite.invitee_display_name} <em>· pending</em>
                  </span>
                )),
            ]}
      </div>
      {!challengeAttached && (
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={state.inviteQuery}
          onChange={(event) => state.setInviteQuery(event.target.value)}
          placeholder={
            skin.placeholder ??
            (duelMode
              ? "search an opponent to challenge"
              : "search player name or @handle")
          }
          aria-label={duelMode ? "search an opponent" : "search players to invite"}
          style={{
            width: "100%",
            fontFamily: skin.fontFamily,
            fontSize: 13,
            padding: "8px 12px",
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
                  gap: 8,
                  width: "100%",
                  padding: "8px 12px",
                  background: "transparent",
                  border: "none",
                  cursor: state.inviting ? "wait" : "pointer",
                  textAlign: "left",
                  fontFamily: skin.fontFamily,
                  fontSize: 12,
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
                <span style={{ marginLeft: "auto", fontSize: 9, opacity: 0.7 }}>
                  {factionName(character.faction_slug)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
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
            fontSize: 11,
            color: skin.errorColor ?? "var(--color-danger)",
            marginTop: 8,
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
  return (
    <button
      type="button"
      onClick={() => void state.cancel()}
      style={skin?.style}
    >
      {skin?.label ?? "drop task"}
    </button>
  );
}

export interface MetataskListSkin {
  containerStyle?: CSSProperties;
  rowStyle?: (selected: boolean) => CSSProperties;
  titleColor?: string;
  descColor?: string;
  pointsActiveColor?: string;
  pointsIdleColor?: string;
}

export function MetatasksList({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin: MetataskListSkin;
}) {
  return (
    <div style={skin.containerStyle}>
      {state.metaTasks.map((mt) => {
        const selected = state.appliedMetatasks.has(mt.id);
        const busy = state.applyingMetatask === mt.id;
        return (
          <button
            key={mt.id}
            type="button"
            disabled={busy}
            onClick={() => void state.toggleMetatask(mt)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              width: "100%",
              cursor: busy ? "wait" : "pointer",
              textAlign: "left",
              ...(skin.rowStyle ? skin.rowStyle(selected) : {}),
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                flexShrink: 0,
                border: `2px solid ${skin.titleColor ?? "currentColor"}`,
                background: selected
                  ? (skin.titleColor ?? "currentColor")
                  : "transparent",
                marginTop: 2,
              }}
              aria-hidden
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: skin.titleColor }}>
                {mt.title}
              </div>
              {mt.description && (
                <div style={{ fontSize: 10, color: skin.descColor }}>
                  {mt.description}
                </div>
              )}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: selected
                  ? (skin.pointsActiveColor ?? "var(--color-success)")
                  : (skin.pointsIdleColor ?? "inherit"),
                whiteSpace: "nowrap",
              }}
            >
              +{mt.point_value} pts
            </span>
            {mt.level_required > 0 && <LevelPill level={mt.level_required} />}
          </button>
        );
      })}
    </div>
  );
}

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
    <input
      type="text"
      maxLength={200}
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
}

export function BodyTextarea({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin: BodyTextareaSkin;
}) {
  return (
    <textarea
      value={state.body}
      onChange={(event) => state.setBody(event.target.value)}
      rows={skin.rows}
      placeholder={skin.placeholder}
      style={skin.textareaStyle}
    />
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
      <MarkdownPreview
        source={state.body}
        className={skin.markdownClassName ?? "markdown-preview"}
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
  return (
    <button
      type="button"
      onClick={() => void state.publish()}
      disabled={state.submitting || state.switchingMode !== null}
      style={skin.style}
    >
      {skin.ornament}
      {state.submitting ? skin.busyLabel : skin.idleLabel}
    </button>
  );
}

