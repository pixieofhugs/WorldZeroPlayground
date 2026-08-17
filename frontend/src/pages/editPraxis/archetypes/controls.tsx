/**
 * Lightly skinned, accessible control primitives shared by all archetypes.
 * Archetypes still own their own visual treatment for the *outer* containers
 * (paperclips, customs stamps, sticky notes); these are the inner essentials
 * that must always render: file picker, member chips, search dropdown.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Compartment } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import { factionCssVar, factionName } from "../../../utils/factions";
import type { PraxisType } from "../../../api/praxis";
import type { DuelSideOut } from "../../../api/duel";
import MarkdownPreview from "../blocks/MarkdownPreview";
import { applyMarkdown, minimalReplacement } from "../blocks/markdownToolbar";
import type { MarkdownCommand } from "../blocks/markdownToolbar";
import { usePraxisRoom, ROOM_TITLE_KEY } from "../praxisRoom";
import { composerWritable } from "../roomSeal";
import { paintedAwareness } from "../roomPresence";
import {
  BODY_EDITOR_BASE_THEME,
  BODY_EDITOR_HOST_STYLE,
} from "./bodyEditorTheme";
import type { EditPraxisState } from "../useEditPraxis";
import { duelSides } from "../../../components/duel/shared";
import { CollabRoster, deriveCollabGate } from "../../../components/collab/CollabRoster";
import { collabCopy } from "../../../components/collab/collabCopy";
import { RosterAvatar } from "../../../components/collab/RosterAvatar";
import FactionAvatar from "../../../components/avatar/FactionAvatar";
import HoldoutPublishNotice from "../blocks/HoldoutPublishNotice";

/** The pair's monogram, against 34 on a roster row and 28 on a waiting side. */
const DUEL_PAIR_AVATAR_SIZE = 52;

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

/**
 * One side of the compose-stage duel pair (#1417).
 *
 * The circle is `RosterAvatar` at 52 rather than a third avatar idiom, and it
 * takes the SIDE's own faction — a duel is the one surface two factions share,
 * and the monogram is who is speaking. That is the same call the waiting
 * surface's `SideAvatar` makes at 28.
 *
 * The filing word is `duelPill*`, the pair the waiting surface already speaks:
 * one fact, one wording. The design labelled these "Submitted" / "Not yet
 * submitted", which is the same fact in a second vocabulary — and this composer
 * and that surface are two stages of one screen.
 */
function DuelPairSide({
  side,
  mine,
  factionSlug,
  accent,
  quiet,
}: {
  side: DuelSideOut;
  mine?: boolean;
  factionSlug: string | null | undefined;
  accent: string;
  quiet: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1" style={{ minWidth: 0 }}>
      <RosterAvatar
        name={side.display_name}
        size={DUEL_PAIR_AVATAR_SIZE}
        background={factionCssVar(side.faction_slug, "light")}
        borderColor={factionCssVar(side.faction_slug, "border")}
      />
      <span
        className="font-body text-[13px]"
        style={{
          maxWidth: 140,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontWeight: 700,
        }}
      >
        {side.display_name}
      </span>
      <span
        className="label-caption"
        style={{ color: side.is_submitted ? accent : quiet }}
      >
        {mine && (
          <>
            {collabCopy(factionSlug, "you")}
            {" · "}
          </>
        )}
        {collabCopy(
          factionSlug,
          side.is_submitted ? "duelPillSubmitted" : "duelPillWriting",
        )}
      </span>
    </div>
  );
}

/**
 * The compose-stage duel: a status badge over the two sides facing each other
 * across a `vs` (#1417), replacing the single inline chip that carried the same
 * facts on one line.
 *
 * KEEPS THE TWO CONTROLS. The design's static mock drew neither the rescind nor
 * the dissolve, which is a fact about a mock and not a decision to delete the
 * only ways out of a challenge.
 *
 * The pair itself needs the duel DETAIL, which is fetched separately and whose
 * failure `useComposerDuel` deliberately swallows — so `duel == null` alongside
 * a `duel_id` is reachable, and the badge and the rescind are drawn without it.
 * A player who cannot see who they challenged must still be able to take the
 * challenge back.
 */
function DuelPair({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin: InviteSearchSkin;
}) {
  const { t } = useTranslation("forms");
  const praxis = state.praxis!;
  const duel = state.duel;
  // The sides name the OTHER player, not the fixed `opponent` ROLE — accepting a
  // challenge puts the viewer's own praxis in that role, which is what used to
  // print the viewer's own name as the rival (#1226). `praxis.created_by_id` is
  // the viewer here: a duel side's composer only ever shows its own praxis.
  const sides = duel ? duelSides(duel, praxis.created_by_id) : null;
  const factionSlug = praxis.task_faction_slug;
  // The same measured-per-faction card inks the roster reads on this same sheet
  // (#694). Not `--color-text-tertiary`: this block is mounted on eight faction
  // grounds, and the neutral tertiary is the ink that failed on the dark ones.
  const accent = factionCssVar(factionSlug, "card-accent");
  const quiet = factionCssVar(factionSlug, "card-muted");
  const accepted = duel?.status === "active";
  // A still-pending challenge is withdrawn with the compact × — nothing is at
  // stake yet.
  const canRescind = duel == null || duel.status === "pending";
  return (
    <div
      className="flex flex-col items-center gap-3"
      style={{ flex: "1 1 100%", fontFamily: skin.fontFamily }}
    >
      <span
        className="label-caption"
        style={{
          padding: "var(--space-xs) var(--space-sm)",
          borderRadius: 4,
          border: `1px ${accepted ? "solid" : "dashed"} ${accepted ? accent : quiet}`,
          color: accepted ? accent : quiet,
        }}
      >
        {accepted
          ? t("editPraxis.invite.statusAccepted")
          : t("editPraxis.invite.statusChallenged")}
      </span>
      {sides && (
        <div className="flex items-center justify-center gap-4">
          <DuelPairSide
            side={sides.me}
            mine
            factionSlug={factionSlug}
            accent={accent}
            quiet={quiet}
          />
          <span className="label-caption" style={{ color: quiet }}>
            {t("editPraxis.invite.duelVersus")}
          </span>
          <DuelPairSide
            side={sides.foe}
            factionSlug={factionSlug}
            accent={accent}
            quiet={quiet}
          />
        </div>
      )}
      {(canRescind || accepted) && (
        <div className="flex items-center gap-2">
          {canRescind && (
            <button
              type="button"
              onClick={() => void state.cancelDuel()}
              aria-label={t("editPraxis.invite.cancelChallengeAria")}
              style={{
                background: "transparent",
                border: "none",
                color: quiet,
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
              neutrally (#956) — the backend recalculates both sides back to solo
              scoring, no forfeit. It's a heavier action than the ×, so it's a
              labelled button behind a confirm (state.dissolveDuel). */}
          {accepted && (
            <button
              type="button"
              onClick={() => void state.dissolveDuel()}
              aria-label={t("editPraxis.invite.dissolveDuelAria")}
              className="label-caption"
              style={{
                background: "transparent",
                border: `1px solid ${quiet}`,
                borderRadius: 4,
                color: quiet,
                cursor: "pointer",
                padding: "var(--space-xs) var(--space-sm)",
              }}
            >
              {t("editPraxis.invite.dissolveDuelLabel")}
            </button>
          )}
        </div>
      )}
    </div>
  );
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
  // The one roster mount that sits inside a room, and so the only one that can
  // say who is here (#1744). Every other mount — the eight detail pages, the
  // waiting surface — passes nothing and draws no dot at all.
  const room = usePraxisRoom();
  // The invite search is behind the `+ invite` chip (#1417) rather than sitting
  // permanently open across a whole row of the composer. Local state, because it
  // is a disclosure and nothing outside this control has an opinion about it.
  const [pickerOpen, setPickerOpen] = useState(false);
  // Duel mode reuses this same box as a one-opponent challenge picker (#311):
  // picking issues a challenge; once attached, the pair replaces it and the
  // search input is hidden (a duel has exactly one opponent).
  const duelMode = state.duelMode;
  const challengeAttached = duelMode && praxis.duel_id != null;
  const onPick = duelMode ? state.sendChallenge : state.sendInvite;
  // No chip in duel mode: choosing an opponent is the whole purpose of the pane
  // the player just opened, so hiding the picker behind a disclosure would put a
  // click in front of the one thing there is to do. The chip is the collab's,
  // where the roster is what the region is for and inviting is an addition to
  // it — which is where the design draws it.
  const searchOpen = !challengeAttached && (duelMode || pickerOpen);
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
          ? challengeAttached && <DuelPair state={state} skin={skin} />
          : (
              // Live status roster replaces the flat member pills (#591) and,
              // since #1416, the pending-invite chips that used to sit beside
              // it. This mount used to withhold `invites` on the grounds that
              // the chips below already named them — but the chips WERE the
              // second place, and a declined invite had no first one. The roster
              // now draws invited and declined as rows of its own and carries
              // the rescind × the chips owned, so "one fact, one place" is
              // finally true rather than merely asserted.
              <div style={{ flex: "1 1 100%" }}>
                <CollabRoster
                  praxisType={praxis.type}
                  members={praxis.members}
                  invites={praxis.invites}
                  currentCharacterId={state.currentCharacterId}
                  factionSlug={praxis.task_faction_slug}
                  taskPointValue={praxis.task_point_value}
                  presentCharacterIds={room?.present}
                  onKick={state.kickMember}
                  onRescindInvite={state.cancelInvite}
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
              </div>
            )}
      </div>
      {/* The chip the search hides behind (#1417) — dashed, muted, at the end of
          the roster. Its ink is the faction's own `card-muted`, the same one the
          roster rows read on this same sheet: the neutral tertiary is the ink
          that failed on the dark grounds (#694). No skin field for it — like the
          Leave link and SaveDraftButton below, this is a mechanics affordance
          rather than a faction gesture. */}
      {!duelMode && !pickerOpen && (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          // A title, not an aria-label: the visible words are already the
          // button's name, and an aria-label would replace them for a screen
          // reader while leaving a voice-control user asking for a control whose
          // name they cannot see.
          title={t("editPraxis.invite.addDescription")}
          className="label-caption"
          style={{
            padding: "var(--space-xs) var(--space-md)",
            borderRadius: 4,
            border: `1px dashed ${factionCssVar(praxis.task_faction_slug, "card-muted")}`,
            background: "transparent",
            color: factionCssVar(praxis.task_faction_slug, "card-muted"),
            cursor: "pointer",
            fontFamily: skin.fontFamily,
          }}
        >
          {t("editPraxis.invite.addAction")}
        </button>
      )}
      {searchOpen && (
      <div style={{ position: "relative" }}>
        <input
          type="text"
          // Opened by the chip, so it takes the caret with it — the click that
          // asked for a search box is not also a request to go and find it.
          autoFocus={pickerOpen}
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
              boxShadow: "var(--dropdown-shadow)",
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {state.inviteResults.map((character) => (
              <button
                key={character.id}
                type="button"
                disabled={state.inviting}
                onMouseDown={() => {
                  // Back to the chip once somebody is asked: the roster below
                  // grows their row, and the next invite is another click on it.
                  setPickerOpen(false);
                  void onPick(character);
                }}
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
                {/* Who this row IS, not merely what they are called (#1962).
                    Display names are not unique — two lives called "Pixie" drew
                    the same row twice — so the handle rides along, and the dot
                    that used to sit here becomes the portrait. `FactionAvatar`
                    rather than a fourth circle idiom: it is what the @mention
                    typeahead already draws in exactly this shape (avatar ·
                    name · @handle), and it falls back to the monogram when
                    nobody has uploaded a portrait. */}
                <FactionAvatar character={character} size="sm" />
                <span
                  style={{
                    fontWeight: 700,
                    // The name yields first when the row runs out of width: it
                    // is the ambiguous half, and truncating the handle would
                    // take away the very thing that separates the namesakes.
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {character.display_name}
                </span>
                <span style={{ opacity: 0.7, whiteSpace: "nowrap" }}>
                  @{character.username}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "var(--text-lg)",
                    opacity: 0.7,
                    whiteSpace: "nowrap",
                  }}
                >
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
          className="font-body label-caption hover:underline"
          style={{
            display: "block",
            marginTop: "var(--space-sm)",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            // No `color` here: `.label-caption` already paints `--label-ink`,
            // and restating it inline is the fork #1783 ruled on — an inline
            // value the class can no longer reach, so a frame that repoints the
            // seam on its own root stops being able to move this link (#1819).
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
/* simply stop for the night. The click writes nothing — the text is already in */
/* the room (#1743) — it just lands on the player's own profile, where their    */
/* in_progress praxes are listed.                                               */
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
  // A cast or moderated praxis has no draft to keep — the room refuses a change
  // in the same states, and the archetype is read-only in them. Hide rather
  // than disable, as everywhere else.
  if (state.controlsLocked) return null;
  return (
    <button
      type="button"
      onClick={() => void state.saveDraft()}
      // Not while a publish or a mode switch is in flight: both end up writing
      // the same fields, and both change where the player should be sent.
      disabled={state.submitting || state.switchingMode !== null}
      className={skin?.className ?? "font-body label-caption hover:underline"}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        // `--label-ink`, not the neutral it defaults to: a skin may pass its own
        // `className` here, so this cannot lean on `.label-caption` the way the
        // leave link above does — but it must still read the seam a faction
        // frame repoints on its own root (#1819).
        color: "var(--label-ink)",
        ...skin?.style,
      }}
    >
      {skin?.label ?? t("editPraxis.saveDraft")}
    </button>
  );
}

/* The editable seal stack (#933) lives in `../../../components/metataskSeal/MetataskSealStack` — deliberately
 * OUTSIDE this module so `controls.tsx` never imports MetataskSeal (and through
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

/**
 * How long a title sits still before it is published to the room (#1742).
 *
 * The title is one **last-write-wins** map key, not co-edited text: 200
 * characters interleaved character-by-character between two people produces
 * garbage more often than it helps (ADR-0073). Publishing on a debounce and on
 * blur, rather than on every keystroke, is what keeps a co-author's typing from
 * arriving inside yours.
 */
const TITLE_PUBLISH_DEBOUNCE_MS = 600;

export function TitleField({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin: TitleFieldSkin;
}) {
  const room = usePraxisRoom();
  const meta = room?.meta ?? null;
  const inputRef = useRef<HTMLInputElement>(null);
  const publishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read through refs so the observer below can be installed once per room
  // rather than re-subscribed on every keystroke.
  const setTitleRef = useRef(state.setTitle);
  setTitleRef.current = state.setTitle;
  const titleRef = useRef(state.title);
  titleRef.current = state.title;

  const publish = (value: string) => {
    if (publishTimerRef.current) clearTimeout(publishTimerRef.current);
    publishTimerRef.current = null;
    // The key may not exist yet — nothing seeds it server-side — so this is
    // also what creates it. Writing the same value again would still broadcast.
    if (meta && meta.get(ROOM_TITLE_KEY) !== value) meta.set(ROOM_TITLE_KEY, value);
  };

  // Remote title → the box.
  useEffect(() => {
    if (!meta) return;
    const apply = () => {
      const remote = meta.get(ROOM_TITLE_KEY);
      // ABSENT is "no remote value yet", never "remote cleared the title":
      // #1740 seeds only `body`, so the key arrives with the first co-author to
      // edit a title and not before.
      if (remote === undefined || remote === titleRef.current) return;
      // Never while the player is in the field. Last-write-wins is fine between
      // edits and unbearable during one.
      if (inputRef.current !== null && document.activeElement === inputRef.current) {
        return;
      }
      setTitleRef.current(remote);
    };
    meta.observe(apply);
    apply();
    return () => meta.unobserve(apply);
  }, [meta]);

  useEffect(
    () => () => {
      if (publishTimerRef.current) clearTimeout(publishTimerRef.current);
    },
    [],
  );

  return (
    // The role class owns the type size; the skin keeps font/colour/ornament
    // only (§4a). Inline style wins over class, so the size lands as soon as the
    // skin stops setting fontSize.
    <input
      ref={inputRef}
      type="text"
      maxLength={200}
      id={skin.id}
      aria-label={skin.ariaLabel}
      className="content-text"
      value={state.title}
      onChange={(event) => {
        const next = event.target.value;
        state.setTitle(next);
        if (publishTimerRef.current) clearTimeout(publishTimerRef.current);
        publishTimerRef.current = setTimeout(
          () => publish(next),
          TITLE_PUBLISH_DEBOUNCE_MS,
        );
      }}
      onBlur={(event) => publish(event.target.value)}
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
  /**
   * The body's box. Dresses the editor's host (#1742) exactly as it dressed the
   * `<textarea>` before it — ground, rule, radius, padding, min-height, ink,
   * face — and everything inheritable reaches CodeMirror's own DOM from there.
   * See `bodyEditorTheme.ts` for the two rules that make that true.
   */
  textareaStyle: CSSProperties;
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

/**
 * The attributes the body editor puts on its own content element (#1978).
 *
 * Exported, and pure, because it is the seam a DOM-less harness can reach: the
 * editor is built inside an effect that never runs here, but this value can be
 * handed to `EditorView.contentAttributes` and read back off an
 * `EditorState`. Same move `bodyEditorTheme.ts` makes for the theme.
 *
 * `spellcheck` is the reason this is a function at all. `@codemirror/view`
 * hard-codes `spellcheck: "false"` on `.cm-content` (it is a code editor by
 * birth), and `contentAttributes` is merged over those defaults, so this facet
 * is the only place that decision can be reversed. A `<textarea>` had it for
 * free; when #1742 moved the write-up into the room it silently lost it. This
 * is the long-form prose a player is judged on — it gets the browser's
 * dictionary back. Note that is an authoring aid, not an accessibility
 * affordance; the `aria-*` entries below are the accessibility half and are
 * unrelated.
 */
export function bodyContentAttributes(
  skin: Pick<BodyTextareaSkin, "id" | "ariaLabel">,
): Record<string, string> {
  const attributes: Record<string, string> = { spellcheck: "true" };
  // `<label for>` does nothing for a contenteditable div, so the section's
  // label reaches the editor as `aria-labelledby` instead (ComposerSection
  // gives that label its id).
  if (skin.id) attributes["aria-labelledby"] = `${skin.id}-label`;
  if (skin.ariaLabel) attributes["aria-label"] = skin.ariaLabel;
  return attributes;
}

// Toolbar buttons in render order. Each glyph is referenced through
// `button.glyph` (an identifier expression, not JSX text) so it never trips
// i18next/no-literal-string; the accessible name comes from the t() labelKey.
//
// SEVEN, not eleven (#1706). The design draws bold, italic, heading, quote,
// bullets, numbers and link, and the four it leaves out — strikethrough, inline
// code, code block, table — are the four a player is least likely to reach for
// on a write-up about a real-world act. Cutting them costs no capability: the
// toolbar is already optional (`hideToolbar` below) and every command it fires
// is also typeable as plain markdown, which is the same argument #693 made when
// it took the buttons out of the tab order. `applyMarkdown` still implements the
// four — the toolbar is one caller of that vocabulary, not its definition.
const BODY_TOOLBAR_BUTTONS = [
  { command: "bold", glyph: "B", labelKey: "editPraxis.toolbar.bold" },
  { command: "italic", glyph: "I", labelKey: "editPraxis.toolbar.italic" },
  { command: "heading", glyph: "H", labelKey: "editPraxis.toolbar.heading" },
  { command: "blockquote", glyph: "❝", labelKey: "editPraxis.toolbar.blockquote" },
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
  const room = usePraxisRoom();
  const ytext = room?.body ?? null;
  const seeded = room?.seeded ?? false;
  // Stable for the room's whole life (it lives beside `body` in one state
  // object), so listing it as an editor dependency cannot cause a rebuild.
  const awareness = room?.awareness ?? null;
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Stable across the editor's life; reconfigured rather than remounted.
  const editableSlot = useRef(new Compartment()).current;
  // Two separate reasons the editor may refuse a keystroke, and they are not the
  // same thing. `seeded` is "not yet" — the document has not arrived. Frozen is
  // "not now" — it has arrived and is sealed for the whole group until somebody
  // reopens it (#1745). The server drops the update messages either way; this
  // only stops the member typing into a void. The rule itself is one line in
  // `roomSeal.ts`, where the harness can call it (#1931).
  const writable = composerWritable(seeded, state.documentFrozen);
  const setBodyRef = useRef(state.setBody);
  setBodyRef.current = state.setBody;

  const contentAttributes = useMemo(
    () => bodyContentAttributes(skin),
    [skin.id, skin.ariaLabel],
  );

  // ---- The editor, bound to the ROOM's text (never seeded from here) ----
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !ytext) return;
    const view = new EditorView({
      // The room's current text, which is empty until the server's seed lands.
      // Deliberately not `state.body`: a client that writes the praxis body
      // into the document ends up merging a second copy of it (ADR-0073).
      doc: ytext.toString(),
      parent: host,
      extensions: [
        // Prose, not code: wrap long lines the way the textarea did.
        EditorView.lineWrapping,
        keymap.of([...yUndoManagerKeymap, ...defaultKeymap]),
        cmPlaceholder(skin.placeholder ?? ""),
        BODY_EDITOR_BASE_THEME,
        editableSlot.of(EditorView.editable.of(writable)),
        EditorView.contentAttributes.of(contentAttributes),
        // Co-authors' carets and selections, each in their own faction's hue
        // (#1744). PAINTED, never raw: `y-codemirror.next` interpolates the
        // remote's `user.color` straight into a style attribute, so the wire
        // carries a faction slug and `paintedAwareness` derives the colour —
        // see `roomPresence.ts`.
        //
        // No `praxisType` gate. The plugin skips `clientid ===
        // awareness.doc.clientID`, so a solo author alone in their own room
        // draws nothing by construction — which is also the honest rule for a
        // collab that happens to have one member online.
        yCollab(ytext, awareness == null ? null : paintedAwareness(awareness)),
      ],
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only the bound text, its awareness channel and the placeholder rebuild
    // the editor. Everything else below reconfigures it in place — a rebuild
    // would drop the caret and the undo history mid-sentence. `awareness`
    // arrives and departs with `ytext`, so it never rebuilds anything on its
    // own. The placeholder is a translated string, so it changes exactly once,
    // on a language switch, where a rebuild costs nothing: the text itself
    // lives in the room, not in the editor.
  }, [ytext, awareness, skin.placeholder]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: editableSlot.reconfigure(EditorView.editable.of(writable)),
    });
  }, [writable, editableSlot]);

  // ---- The room's text → `state.body` ----
  //
  // One direction only, and now the ONLY direction: `state.body` feeds
  // `BodyPreview` and the word count, and nothing else. Since #1743 no client
  // write exists to feed, so there is not even a reason to be tempted — and
  // nothing may push `state.body` back into the document, or the praxis would
  // seed the room it is supposed to be seeded BY.
  useEffect(() => {
    if (!ytext) return;
    const mirror = () => setBodyRef.current(ytext.toString());
    ytext.observe(mirror);
    return () => ytext.unobserve(mirror);
  }, [ytext]);

  const runCommand = (command: MarkdownCommand) => {
    const view = viewRef.current;
    if (!view) return;
    const text = view.state.doc.toString();
    const selection = view.state.selection.main;
    const result = applyMarkdown(command, {
      text,
      selectionStart: selection.from,
      selectionEnd: selection.to,
    });
    // The narrowest edit that gets there, not a whole-document replacement: in
    // a CRDT the latter deletes every character a co-author is standing on and
    // leaves the deletions behind as tombstones.
    view.dispatch({
      changes: minimalReplacement(text, result.text),
      selection: { anchor: result.selectionStart, head: result.selectionEnd },
    });
    view.focus();
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

  // The room exists but has not told us what the praxis says yet. The editor is
  // read-only until it does (#1742, re-derived in #1743 — see `PraxisRoom.seeded`
  // for the reason that outlived the retired `PUT`), so the toolbar is a set of
  // controls the player cannot use: hidden, not drawn disabled. It would not
  // merely look wrong — `dispatch` writes past `editable`, so a press here would
  // put markdown into a document still waiting for its seed.
  const awaitingRoom = ytext !== null && !seeded;

  return (
    <div>
      {skin.hideToolbar || awaitingRoom || state.documentFrozen ? null : (
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
            // Tab runs title → body instead of stopping on every glyph.
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
      {/* The editor's host. CodeMirror builds its own DOM inside this on mount,
          which is why the box is empty in a server render — and why the binding
          itself is not observable in this DOM-less harness (#1742).
          Role class owns the size; the skin gives up only fontSize (§4a). */}
      <div
        ref={hostRef}
        id={skin.id}
        data-composer-body
        className="content-text"
        style={{ ...BODY_EDITOR_HOST_STYLE, ...skin.textareaStyle }}
      />
      {awaitingRoom && (
        <p className="label-caption">
          {/* Two states, one line. The room has either not arrived yet or has
              stopped trying (#1804), and the difference matters entirely to the
              person waiting: "…" is worth sitting through, and the other is
              not. Left silent, a refused room is an editor that will never
              accept a keystroke and never says why. */}
          {t(
            room?.unreachable
              ? "editPraxis.composer.bodyUnreachable"
              : "editPraxis.composer.bodyConnecting",
          )}
        </p>
      )}
      {/* Said where it is felt (#1745). This is the member who has just tried to
          type and found nothing happening, and the difference between a rule and
          a broken editor is entirely whether anyone told them. The way out is in
          the same breath, because `pullBack` is the only one — and it is right
          here rather than in the footer because the footer's button belongs to
          whoever has already cast, and the member most likely to be reading this
          is the holdout, who has not. */}
      {state.documentFrozen && (
        <div
          className="flex flex-col items-start gap-1"
          style={{ marginTop: "var(--space-xs)" }}
        >
          {/* Two sentences for two different members (#1931). Whoever loaded a
              praxis that was already sealed has lost nothing and is told the
              rule. Whoever was still typing when the room hung up under them
              has lost whatever they typed after that — it never reached the
              server and cannot be recovered — and being told the rule instead
              of the loss would leave them believing text they can still see on
              screen is safe. */}
          <p className="label-caption">
            {t(
              state.sealedMidEdit
                ? "editPraxis.composer.bodyFrozenMidEdit"
                : "editPraxis.composer.bodyFrozen",
            )}
          </p>
          <button
            type="button"
            className="label-caption"
            onClick={() => void state.reopenForEdit()}
            disabled={state.submitting}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              // The link seam, not the neutral it is unset to (#1636/#1819).
              // This sits one line under the frozen notice above, which reads
              // `--label-ink` through its class — leaving the global secondary
              // here would fix the sentence and leave its way out unreachable
              // on exactly the three near-black sheets that needed both.
              color: "var(--link-ink)",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            {t("editPraxis.composer.bodyFrozenAction")}
          </button>
        </div>
      )}
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
  // The allowed modes are the TASK's, computed server-side against the viewer's
  // level (`allowed_praxis_modes`). An unknown task means unknown permission, so
  // this FAILS CLOSED (#1709): no options until the task lands. Each of the
  // eight archetypes used to derive this line for itself and fall back to all
  // three modes, which handed a level-0 viewer the Collab the API would refuse.
  // Derived here, from the state the picker already holds, so there is one
  // statement of the rule and nothing left to drift.
  const allowedModes = state.task?.allowed_modes ?? [];
  return (
    <div style={skin.containerStyle}>
      {skin.options
        .filter((option) =>
          // Duel isn't in task.allowed_modes (it's issued via challenge, ADR-0011);
          // it's gated on the viewer's level instead (#311). Hide, don't disable.
          option.key === "duel"
            ? state.duelChipVisible
            : allowedModes.includes(option.key),
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
   * A mark drawn AFTER the label (#1185, #1183, #1186). `ornament` leads; several
   * v2 designs put their sign on the trailing edge instead — the Ephemerists'
   * open eye follows the word rather than announcing it, as does WOW's star and
   * the Singularity's block cursor.
   *
   * Two reasons this is a prop and not a style. Drawing it with
   * `flex-direction: row-reverse` off the leading slot would put the mark first
   * in the DOM and launder a layout decision through a style. And the label is
   * not a place to put one either: this control relabels itself in three states
   * — the collab consensus gate and the duel pull-back both replace `idleLabel`
   * via `collabCopy` below, and the busy state replaces it again — while a
   * trailing mark is chrome that belongs to the button in all of them.
   *
   * Additive and optional — a skin passing nothing renders byte-identically.
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
  // The one published state that keeps its footer button (#1077) — but NOT for
  // the reason #1077 wrote it, and #1177 is the record of that. DO NOT DELETE
  // THIS BRANCH as unreachable; read the next three paragraphs first.
  //
  // What no longer reaches here: the ORDINARY cast. A duel side that casts goes
  // to `submitted` while the duel is still unsettled, and since #1080/ADR-0059
  // that derives `waiting`, so every archetype swaps in `PraxisWaitingSurface`
  // (#1189 moved that swap into the archetypes) before this footer is built. The
  // waiting surface carries the pull-back itself, through the same
  // `duelPullBackAction` key and the same `pullBack()`.
  //
  // What DOES reach here: the MODERATED composer. `deriveEditPraxisPhase` tests
  // `moderation_status` BEFORE its duel and collab branches and returns
  // `composing` for `hidden`/`failed` — deliberately, because a cheerful "your
  // part is submitted" over a failed praxis would be a lie. Moderation never
  // touches `status` (`update_praxis_moderation` sets only the moderation
  // fields), so such a praxis is still `submitted` and `isPublished` is still
  // true. `hidden` never mounts at all — `can_view_praxis` 404s it for everyone
  // including the author — which leaves `failed` as the live case: a duel side
  // whose entry a moderator failed while the duel is `active` or `pending`.
  //
  // That is the case most worth serving, not least. The waiting surface refuses
  // to render, the composer is locked, and this button is the way back into the
  // text the author was just told to fix. Pulling back stays free and neutral:
  // `unsubmit_praxis` marks a forfeit only for a *settled* duel (ADR-0011
  // §Forfeit), so the praxis returns to `in_progress` with
  // `forfeited_by_character_id` still NULL and the duel untouched — the promise
  // the seal dialog made on the way in (`duelSeal.reopenNote`). Listed, not
  // negated: `settled`/`resolved` are where forfeit begins and belong to the
  // detail page, and a `declined` challenge leaves an ordinary published solo
  // praxis, which stays unpublishable-back.
  //
  // The `collab?.iCast` route below survives by the identical mechanism — a
  // `failed` multi-member collab also short-circuits to `composing` — so the two
  // halves live or die together. Both are covered in `PublishButton.test.tsx`.
  const duelPullBack =
    state.isPublished &&
    state.duelMode &&
    (state.duel?.status === "active" || state.duel?.status === "pending");
  if (state.isPublished && !duelPullBack) return null;
  // Multi-member collabs cast (and pull back) through this same footer button
  // (#646). The consensus gate decides the action and the idle label; the busy
  // label stays the archetype's mode-agnostic present participle.
  const collab =
    praxis?.type === "collab" && praxis.members.length > 1
      ? deriveCollabGate(praxis.members, state.currentCharacterId)
      : null;
  // Neutral wording, deliberately: no forfeit language and no consequence
  // dialog before the duel settles (#718 rejected that framing once already;
  // `praxisDetail/__tests__/duelForfeitWarning.test.tsx` is the standing guard).
  // Shared voice, like every line `collabCopy` resolves since #1812.
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

