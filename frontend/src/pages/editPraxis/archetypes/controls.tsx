/**
 * Lightly skinned, accessible control primitives shared by all archetypes.
 * Archetypes still own their own visual treatment for the *outer* containers
 * (paperclips, customs stamps, sticky notes); these are the inner essentials
 * that must always render: file picker, member chips, search dropdown.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import { Compartment, EditorState, Prec, Transaction } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import { factionCssVar, factionName } from "../../../utils/factions";
import { useFormFactor } from "../../../hooks/useFormFactor";
import type { PraxisType } from "../../../api/praxis";
import type { DuelSideOut } from "../../../api/duel";
import MarkdownPreview from "../blocks/MarkdownPreview";
import { applyMarkdown, minimalReplacement } from "../blocks/markdownToolbar";
import type { MarkdownCommand } from "../blocks/markdownToolbar";
import { usePraxisRoom, ROOM_TITLE_KEY } from "../praxisRoom";
import { composerWritable } from "../roomSeal";
import { proposalIsLive } from "../proposalGuard";
import { paintedAwareness } from "../roomPresence";
import {
  BODY_EDITOR_BASE_THEME,
  BODY_EDITOR_HOST_STYLE,
} from "./bodyEditorTheme";
import type { EditPraxisState } from "../useEditPraxis";
import { duelSides } from "../../../components/duel/shared";
import { CollabRoster, deriveCollabGate } from "../../../components/collab/CollabRoster";
import type { CollabSkin } from "../../../components/collab/CollabRoster";
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
  placeholder?: string;
  /**
   * The collab block's dress (#2269, #2267) — the roster, the `+ invite` chip
   * and the duel pair, all of which are drawn INSIDE this control and none of
   * which had a way to be dressed.
   *
   * It REPLACES `pillBg` / `pillColor` / `acceptedBg` / `acceptedColor` /
   * `pendingBg` / `pendingColor`, which were the pre-#1416 invite chips' dress.
   * #1416 absorbed those chips into the roster's four-state pill and nothing
   * ever read the six fields again — eight archetypes went on filling values
   * that reached no pixel. The pill they described is the pill `CollabSkin`
   * dresses, so this is the same six facts arriving where they are painted,
   * plus the type, the corner and the two tiers the chips never had.
   */
  collab?: CollabSkin;
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
 * and the face is who is speaking. That is the same call the waiting
 * surface's `SideAvatar` makes at 28.
 *
 * It draws the side's PORTRAIT and falls back to the monogram (#2128): this is
 * the surface the report screenshotted, two initials where two faces belong.
 * `DuelSideOut.avatar_url` was already on the wire; the pair just never read it.
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
        avatarUrl={side.avatar_url}
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
  // The roster's two tiers, from the SAME skin the roster now takes (#2267).
  // These used to read `factionCssVar(praxis.task_faction_slug, …)` — the ink of
  // whichever faction owns the TASK, on whichever ground the VIEWER's composer
  // paints, which is two unmeasured answers at once. `factionSlug` stays for the
  // COPY below: a duel's words are the task's voice, and that is a different
  // question from what colour they are printed in.
  // Not `--color-text-tertiary` either: this block is mounted on eight faction
  // grounds, and the neutral tertiary is the ink that failed on the dark ones.
  const accent = skin.collab?.accentInk ?? skin.collab?.accent ?? "currentColor";
  const quiet = skin.collab?.quiet ?? "currentColor";
  const accepted = duel?.status === "active";
  // A still-pending challenge is withdrawn with the compact × — nothing is at
  // stake yet.
  const canRescind = duel == null || duel.status === "pending";
  return (
    <div
      // The nightly duel spec's proof that a challenge attached (#2453). It used
      // to read the badge's WORDS — `getByText('challenged')` — which #1417
      // rewrote to "Challenge sent" on 2026-08-01, and the spec has been red
      // there ever since. The pair only mounts once `praxis.duel_id` is set, so
      // its presence is the fact the spec is actually asserting.
      data-testid="composer-duel-pair"
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
  // The face comes free from the field every skin already sets, so eight
  // archetypes do not restate it; `collab.fontFamily` stays as the override for
  // a skin whose roster speaks in a different voice from its invite box.
  const collabSkin: CollabSkin = { fontFamily: skin.fontFamily, ...skin.collab };
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
                  // The composer is the ONE roster mount that is not on the
                  // faction's card sheet, so it is the one that hands in a
                  // dress (#2269). The praxis-detail and waiting mounts pass
                  // none and keep the `card-*` family they are measured on.
                  skin={collabSkin}
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
          the roster, and it wears the roster's own quiet tier and corner (#2267,
          #2269). It used to paint `factionCssVar(praxis.task_faction_slug,
          "card-muted")` into BOTH the border and the label: the TASK's faction
          rather than the sheet's, at a tier measured against that faction's CARD
          rather than this composer's ground. On S.N.I.D.E.'s light wall the pair
          measured 1.24:1 — a ghost box holding ghost text, which is the
          screenshot the issue was filed from. `borderRadius: 4` was hardcoded
          beside them on a composer whose every field is square; the corner comes
          from the skin now, which is the ruling #2269 carries. */}
      {!duelMode && !pickerOpen && (
        <button
          type="button"
          // The disclosure the collab invite search sits behind since #1417 —
          // and the step the nightly collab spec walked straight past, filling
          // an input that had not been rendered for three weeks (#2453).
          data-testid="composer-invite-open"
          onClick={() => setPickerOpen(true)}
          // A title, not an aria-label: the visible words are already the
          // button's name, and an aria-label would replace them for a screen
          // reader while leaving a voice-control user asking for a control whose
          // name they cannot see.
          title={t("editPraxis.invite.addDescription")}
          className="label-caption"
          style={{
            padding: "var(--space-xs) var(--space-md)",
            borderRadius: collabSkin.radius ?? 4,
            // `currentColor` is the fallback for the same reason the invite
            // input's border below takes it: it is whatever ink this composer
            // already pairs with this ground, so an archetype that forgets the
            // rung gets a legible chip rather than an invisible one. All eight
            // shipped skins pass a measured value.
            border: `1px dashed ${collabSkin.quiet ?? "currentColor"}`,
            background: "transparent",
            color: collabSkin.quiet ?? "currentColor",
            cursor: "pointer",
            fontFamily: collabSkin.fontFamily,
          }}
        >
          {t("editPraxis.invite.addAction")}
        </button>
      )}
      {searchOpen && (
      <div style={{ position: "relative" }}>
        <input
          type="text"
          // The composer's shared focus ring selects on this (#2266). See the
          // rule in index.css for why it is one attribute rather than a class
          // and why the ring is `currentColor`.
          data-composer-field
          // One box, two jobs (collab invite / duel opponent), and the two
          // aria-labels that tell them apart are catalog copy. The nightly
          // reaches for the box itself (#2453).
          data-testid="composer-invite-search"
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
  /**
   * Optional since #2089, and unset by all eight composers: the words depend on
   * the FORM FACTOR, not on the faction. Desktop offers a drag target ("Drop a
   * photo of the work / or browse files"); a phone cannot drag between apps, so
   * the drag half is noise there and the label says only what a tap does. All
   * eight passed the same catalog key, so the choice is made once below — the
   * override stays for a faction that later wants its own voice, the way
   * `DropButton` and `SaveDraftButton` in this file already do.
   */
  buttonLabel?: string;
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
  const { t } = useTranslation("forms");
  const mobile = useFormFactor() === "mobile";
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={skin.containerStyle}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={skin.buttonStyle}
      >
        {skin.buttonLabel ??
          t(
            mobile
              ? "editPraxis.composer.proofButtonMobile"
              : "editPraxis.composer.proofButton",
          )}
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
   *
   * No shipped skin passes this since #2179 took the visible label off all eight
   * sheets. It stays as the seam a skin with its OWN drawn heading would use,
   * and it is the switch below: an id means something else names this field.
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
  const { t } = useTranslation("forms");
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
      // A praxis cannot be published without a title, and until #2093 nothing
      // said so before the submit failed. This carries the STATE, which is what
      // a screen reader announces and what a drawn asterisk could never do. No
      // `<form>` wraps the composer — publish is an onClick — so this adds no
      // browser bubble and changes no validation path.
      //
      // #2179 reverses #2093's VISIBLE half and ONLY that half: the label came
      // off the screen, so this attribute and `errors.titleRequired` (printed by
      // `ErrorBanner` on submit) are now the whole of the constraint. Take
      // either away and #2093 comes straight back.
      required
      id={skin.id}
      // #2179 moved the field's NAME into the placeholder, which is not a name:
      // it is gone the moment the field has text, and placeholder-as-name is
      // unevenly supported. So the catalog key that WAS the visible label is the
      // accessible name — the same route `bodyContentAttributes` takes for the
      // write-up since #2085, and an `id` means the same thing here as there:
      // some skin drew its own `<label htmlFor>`, so this must not name it twice
      // from a second string that can drift.
      aria-label={
        skin.ariaLabel ??
        (skin.id ? undefined : t("editPraxis.composer.titleLabel"))
      }
      className="content-text"
      // The composer's shared focus ring selects on this (#2266) — one rule in
      // index.css for all eight skins, in place of the eight inline
      // `outline: none` declarations that used to sit in every `fieldBox`.
      data-composer-field
      // The required field the nightly has to fill before it can publish
      // anything (#2453) — its accessible name is `titleLabel` when a skin draws
      // no label of its own and `skin.ariaLabel` when one does, so there is no
      // one string to reach for.
      data-testid="praxis-title"
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
 *
 * The editor ALWAYS comes back named, by one of three routes. #2085 took the
 * visible `Write-up` heading off all eight sheets as redundant, and the heading
 * was also the element `aria-labelledby` pointed at — so a skin that now passes
 * neither an id nor a name is the ordinary case, not an edge one, and it falls
 * back to the same catalog key the heading used to print. The placeholder is
 * NOT an accessible name, which is the half of #2085's argument that was wrong.
 */
export function bodyContentAttributes(
  skin: Pick<BodyTextareaSkin, "id" | "ariaLabel">,
): Record<string, string> {
  const attributes: Record<string, string> = { spellcheck: "true" };
  // `<label for>` does nothing for a contenteditable div, so a section label
  // reaches the editor as `aria-labelledby` instead (ComposerSection gives that
  // label its id).
  if (skin.id) attributes["aria-labelledby"] = `${skin.id}-label`;
  if (skin.ariaLabel) attributes["aria-label"] = skin.ariaLabel;
  // Neither: no heading row exists to borrow a name from. `i18n.t` rather than
  // the hook because this is a pure value the editor is BUILT from — the same
  // reason the function is exported at all.
  else if (!skin.id)
    attributes["aria-label"] = i18n.t("forms:editPraxis.composer.writeUpLabel");
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

/**
 * How long a connecting room may stay quiet before the composer stops saying
 * "opening…" and says it is not coming (#2557).
 *
 * `PraxisRoom.unreachable` is the honest signal and it stays the primary one:
 * the provider stopped retrying, so nothing further will happen in that room.
 * But y-websocket only reaches that verdict after exhausting its own backoff,
 * and the tail before it is exactly where a player sits in front of a field
 * that takes no keystroke. This is a floor on how long "…" is allowed to be the
 * whole answer, not a second theory about the socket.
 *
 * Generous against a slow seed (the round trip is normally well under a second)
 * and still in seconds rather than in the tail. `bodyUnavailableDress.test.ts`
 * ratchets the upper bound, which is the direction this can rot in.
 */
export const ROOM_SEED_GRACE_MS = 8000;

/**
 * The write-up box's dress while the room has not seeded (#2557).
 *
 * The editor is `editable.of(false)` until the seed lands — correct, ADR-0073
 * rule 1 — and `contenteditable="false"` leaves the content div unfocusable, so
 * a click puts no caret in it and no keystroke reaches any handler. What was
 * wrong was that the box went on looking exactly as ready as a live one. This
 * is the announcement to match the refusal.
 *
 * `cursor` is inherited and `@codemirror/view`'s base theme declares none, so
 * the one declaration here reaches `.cm-content` — the element the pointer is
 * really over — without a themed rule that would have to be reconfigured.
 *
 * `opacity` and not an ink: the ink is the skin's, eight times over, and a
 * neutral picked here would be unreachable from the root a faction frame
 * repoints (#1819). Dimming the whole box costs no token and follows every
 * skin's ground and rule for free. WCAG 1.4.3 exempts inactive components from
 * the contrast floor, and this box is inactive in the strongest sense the
 * platform has.
 *
 * ponytail: one ratio for all eight skins in both themes, unmeasured in a
 * browser (this harness has none) — "reads as unavailable without reading as
 * broken" is an eyeball question. If one ground turns out wrong, the upgrade is
 * a `--composer-unavailable-opacity` custom property in `index.css` that a skin
 * may repoint, not eight literals here.
 */
const BODY_UNAVAILABLE_STYLE: CSSProperties = {
  cursor: "not-allowed",
  opacity: 0.6,
};

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
  // same thing. `seeded` is "not yet" — the document has not arrived. Locked is
  // "not here" — the praxis is moderated, which since #1164 is the only state
  // that still renders a composer read-only. #1745's freeze was a third, and it
  // is gone (ADR-0079): the room takes writes in every status a member can
  // reach. The rule is one line in `roomSeal.ts`, where the harness can call it.
  const writable = composerWritable(seeded, state.controlsLocked);
  const setBodyRef = useRef(state.setBody);
  setBodyRef.current = state.setBody;
  // The live proposal's guard (#1811, ADR-0079), read through a ref so the
  // editor is reconfigured by nothing and rebuilt by nothing when it flips.
  // The filter below runs at dispatch time and reads it then.
  const proposalGuardRef = useRef({
    armed: state.proposalConfirmArmed,
    ask: state.confirmProposalEdit,
  });
  proposalGuardRef.current = {
    armed: state.proposalConfirmArmed,
    ask: state.confirmProposalEdit,
  };

  const contentAttributes = useMemo(
    () => bodyContentAttributes(skin),
    [skin.id, skin.ariaLabel],
  );

  // The room exists but has not told us what the praxis says yet. Everything
  // the player can see about that state hangs off this one flag — see the host
  // and the notice below.
  const awaitingRoom = ytext !== null && !seeded;
  // The notice is the field's accessible description AND where a click on the
  // dead box sends focus, so it needs a stable id of its own: `skin.id` is
  // optional (#2085 took the visible heading off all eight sheets) and cannot
  // be relied on for one.
  const noticeId = useId();
  const noticeRef = useRef<HTMLParagraphElement>(null);

  // "Not coming" in seconds rather than in y-websocket's retry tail (#2557).
  // See ROOM_SEED_GRACE_MS. Reset on re-entry — a new praxis opens a new room,
  // which has waited for nothing yet.
  const [seedGraceElapsed, setSeedGraceElapsed] = useState(false);
  useEffect(() => {
    if (!awaitingRoom) return;
    setSeedGraceElapsed(false);
    const timer = setTimeout(() => setSeedGraceElapsed(true), ROOM_SEED_GRACE_MS);
    return () => clearTimeout(timer);
  }, [awaitingRoom]);

  // Two states, one line. The room has either not arrived yet or is not going
  // to (#1804), and the difference matters entirely to the person waiting: "…"
  // is worth sitting through and the other is not. `unreachable` is the
  // provider's own verdict; the grace above is a deadline on reaching one.
  const waitingNotice = t(
    room?.unreachable || seedGraceElapsed
      ? "editPraxis.composer.bodyUnreachable"
      : "editPraxis.composer.bodyConnecting",
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
        // The first keystroke after a proposal goes live asks once (ADR-0079).
        //
        // A transaction filter and not the `editable` compartment, though that
        // is the seam the issue named: `EditorView.editable.of(false)` renders
        // `contenteditable="false"` and leaves the content div unfocusable, so
        // the keystroke that is supposed to raise the question never reaches
        // any handler and the player is silently blocked — the exact failure
        // ADR-0079 removed the freeze to end. Dropping the transaction instead
        // keeps the editor editable and focused: the edit does not land, no
        // half-state is left behind, and the very next keystroke asks again.
        //
        // `userEvent` is what separates this member's edit from a co-author's.
        // `y-codemirror.next` applies remote updates with `view.dispatch({
        // changes, annotations: [ySyncAnnotation…] })` and no user event, so a
        // filter that dropped those would desync the CRDT. Every local path
        // carries one — typing (`input.type`), paste, drop, delete, and the
        // markdown toolbar, which states its own below.
        EditorState.transactionFilter.of((tr) => {
          if (!tr.docChanged) return tr;
          if (tr.annotation(Transaction.userEvent) === undefined) return tr;
          if (!proposalGuardRef.current.armed) return tr;
          proposalGuardRef.current.ask();
          return [];
        }),
        // Undo reaches the document through Yjs rather than through a
        // transaction of its own, so it arrives at the filter above wearing no
        // user event. Caught here instead, at higher precedence than
        // `yUndoManagerKeymap` above — returning false when disarmed falls
        // straight through to it, so nothing changes when no proposal is live.
        Prec.high(
          keymap.of(
            ["Mod-z", "Mod-y", "Mod-Shift-z"].map((key) => ({
              key,
              run: () => {
                if (!proposalGuardRef.current.armed) return false;
                proposalGuardRef.current.ask();
                return true;
              },
            })),
          ),
        ),
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
  // `BodyPreview`, and since #2086 took the word count out, nothing
  // else. Since #1743 no client
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
      // Says this edit is the player's, which is what the live-proposal filter
      // dispatches on (#1811). Without it a toolbar press would slip past the
      // confirm and cancel everyone's countdown in silence.
      userEvent: "input",
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

  // The editor is read-only until the room seeds (#1742, re-derived in #1743 —
  // see `PraxisRoom.seeded` for the reason that outlived the retired `PUT`), so
  // the toolbar is a set of controls the player cannot use: hidden, not drawn
  // disabled. It would not merely look wrong — `dispatch` writes past
  // `editable`, so a press here would put markdown into a document still
  // waiting for its seed. (`awaitingRoom` itself is derived up with the notice
  // it drives.)

  return (
    <div>
      {skin.hideToolbar || awaitingRoom || state.controlsLocked ? null : (
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
        // The refusal, said out loud (#2557). `aria-disabled` and not
        // `disabled`: this is a div, and the thing actually refusing is the
        // `contenteditable="false"` pane CodeMirror builds inside it — so this
        // is the announcement, never the enforcement. The style is what stops
        // the box looking as ready as a live one.
        aria-disabled={awaitingRoom || undefined}
        // The notice under the box is the field's description while there is
        // one, so the reason is reachable to a screen reader without hunting
        // for a caption.
        aria-describedby={awaitingRoom ? noticeId : undefined}
        // Hover is the earliest moment the reason can be given, and `title` is
        // the platform's own answer — no new component, no CSS, no dependency.
        //
        // ponytail: a native tooltip is delayed, unstyled and absent on touch,
        // where the dimmed box and the `not-allowed` cursor plus the notice are
        // what remain. The upgrade is a real inline explainer owned by the
        // style seam, not a hand-rolled popover here.
        title={awaitingRoom ? waitingNotice : undefined}
        // And a click is answered instead of swallowed. Focus lands on the
        // notice, which is a live region — so the reason is spoken, scrolled to
        // and (for a keyboard route in) ringed, rather than the click doing
        // nothing whatsoever. `onClick` fires on the host even though the pane
        // inside it cannot take focus, because the pane is not disabled in the
        // form sense: it is merely not editable.
        onClick={awaitingRoom ? () => noticeRef.current?.focus() : undefined}
        className="content-text"
        style={{
          ...BODY_EDITOR_HOST_STYLE,
          ...skin.textareaStyle,
          ...(awaitingRoom ? BODY_UNAVAILABLE_STYLE : null),
        }}
      />
      {awaitingRoom && (
        // `role="status"` (a polite live region) so the connecting → unreachable
        // swap is announced rather than repainting silently under someone who
        // has looked away. `tabIndex={-1}` makes it a focus TARGET without
        // making it a tab stop — #693 keeps Tab running title → body.
        <p
          ref={noticeRef}
          id={noticeId}
          role="status"
          tabIndex={-1}
          className="label-caption"
        >
          {waitingNotice}
        </p>
      )}
      {/* Said where it is felt, to the member most likely to be reading it: the
          one who has NOT approved, kept on the ordinary composer while a
          countdown runs (#1164). Nothing here is a refusal — the room takes the
          keystroke and the confirm is what makes cancelling the window
          deliberate (ADR-0079) — so it names the consequence and offers no exit,
          because typing IS the exit.

          Gated on the PRAXIS, not on `proposalConfirmArmed`. The latch is about
          the dialog, which fires once; this line is about the state, which is
          still true afterwards and is what the member is deciding against. */}
      {proposalIsLive(state.praxis) && (
        <div style={{ marginTop: "var(--space-xs)" }}>
          {/* The ink is the class's and only the class's (#1819): an inline
              `color` here beats `--label-ink`, and the three near-black sheets
              have no light-cascade neutral that could serve them. */}
          <p className="label-caption">
            {t("editPraxis.composer.bodyProposalLive")}
          </p>
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
/* The title precondition, shared by the composer's two primaries (#2484).      */
/* -------------------------------------------------------------------------- */

/**
 * A praxis cannot be published without a title, and the composer only ever said
 * so after the fact. `publish()` dismisses the seal dialog on its first line and
 * refuses on its second (#718), so the refusal rendered in `ErrorBanner` at the
 * foot of a long sheet — announced, but off-screen from where the player just
 * pressed. Owner ruling on #2484: remove the dead end rather than report it
 * better. The primary is dead while there is nothing to publish, so the seal
 * sheet is never reachable in a state that must be refused.
 *
 * The hook is deliberately untouched. `setDuelSealOpen(false)`-then-validate
 * stays exactly as #718 wrote it — its reasoning is not reversed, the branch it
 * was written for simply stops being reachable — and the server's own
 * `title.trim()` refusal stays too. This is an affordance, not a validation
 * move, and it is derived here rather than added to `EditPraxisState` because
 * `state.title` is already on it and nothing else needs to know.
 *
 * Untitled is the NORMAL entry state, not a slip: `handleSignup` posts a task id
 * and a type, and `accept_duel` mints the opponent's side with no title at all.
 * So for a duel or a collab this is a required step added to the main path,
 * which is why the reason is drawn (below) rather than implied — a dead control
 * with no explanation is worse than the silent failure it replaces.
 */
function publishNeedsTitle(state: EditPraxisState): boolean {
  return !state.title.trim();
}

/**
 * A fixed id, not `useId`. Both primaries are invoked as plain functions by
 * their tests — the harness has no DOM and runs no effects — so neither may take
 * a hook. One id is enough for the same reason one `data-testid` is: exactly one
 * composer primary is on screen at a time.
 */
const PUBLISH_NEEDS_TITLE_ID = "composer-publish-needs-title";

/**
 * The reason, drawn beside the control it disables and pointed at from it.
 *
 * `role="status"` because the line appears and disappears as the title box is
 * filled and cleared, and a disabled button is out of the tab order — so
 * `aria-describedby` alone would reach only a reader browsing the page, never
 * one tabbing through it.
 *
 * `width: 100%` gives it its own line in the footer's wrapping row and in
 * `CollabSignals`' signal row, and costs nothing in the column seven skins lay
 * their band out in. Same move `HoldoutPublishNotice` makes with `flex 1 1 100%`.
 * The ink is `label-caption`'s and only the class's (#1819): an inline `color`
 * beats `--label-ink`, and three of the nine sheets are near-black.
 */
function PublishNeedsTitleNotice() {
  return (
    <p
      id={PUBLISH_NEEDS_TITLE_ID}
      role="status"
      className="label-caption"
      style={{ width: "100%", margin: 0 }}
    >
      {i18n.t("forms:editPraxis.composer.publishNeedsTitle")}
    </p>
  );
}

/**
 * The house disabled dress (#2486/#2573), reached by adding the class and
 * nothing else — no opacity, no second token family.
 *
 * Only while the TITLE gate is what holds the control. The busy and
 * mode-switching disables predate this and dress themselves (several skins set
 * `cursor: wait` on the submitting button); folding them in would repaint a
 * state this issue was not asked about.
 */
function offClassName(skinClassName: string | undefined, off: boolean): string | undefined {
  if (!off) return skinClassName;
  return skinClassName ? `${skinClassName} control-off` : "control-off";
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
  const duelPullBack =
    state.isPublished &&
    state.duelMode &&
    (state.duel?.status === "active" || state.duel?.status === "pending");
  if (state.isPublished && !duelPullBack) return null;
  // A multi-member collab has three things to say, not one (ADR-0079), so it
  // gets its own control below rather than a fourth relabelling of this button.
  if (!duelPullBack && praxis?.type === "collab" && praxis.members.length > 1) {
    return <CollabSignals state={state} skin={skin} />;
  }
  // Neutral wording, deliberately: no forfeit language and no consequence
  // dialog before the duel settles (#718 rejected that framing once already;
  // `praxisDetail/__tests__/duelForfeitWarning.test.tsx` is the standing guard).
  // Shared voice, like every line `collabCopy` resolves since #1812.
  const idleLabel = duelPullBack
    ? collabCopy(praxis?.task_faction_slug, "duelPullBackAction")
    : skin.idleLabel;
  // A duel side asks before it casts (#718): the button opens the seal
  // confirmation, whose confirm calls this same `publish()`. Only once an
  // opponent is actually attached — duel mode with an empty opponent slot casts
  // as an ordinary solo praxis, so there is nothing to warn about. Once cast,
  // the same button reverses it through `pullBack` and asks nothing.
  const sealsADuel = state.duelMode && state.duel != null;
  const onClick = duelPullBack
    ? state.pullBack
    : sealsADuel
      ? async () => state.requestDuelSeal()
      : state.publish;
  // Every branch of this button but ONE publishes: the solo cast calls
  // `publish()` outright, and the duel's `requestDuelSeal()` opens the sheet
  // whose confirm is that same `publish()` — so the gate belongs on both, or the
  // seal sheet stays reachable from an untitled composer. `duelPullBack` is the
  // exception and stays live: reopening a side that is already cast has nothing
  // to do with the title, and it is the moderated composer's only way back into
  // the text a moderator just asked the author to fix (#1177).
  const needsTitle = !duelPullBack && publishNeedsTitle(state);
  const button = (
    <button
      type="button"
      // The composer's one primary action, whatever it currently says (#2453).
      // Its label is three different strings by state and has moved twice —
      // "Seal it" in #954, the shared "Submit" after #1676 — so the nightly duel
      // spec presses the SLOT. `CollabSignals` carries the same id for the same
      // reason; between them exactly one is on screen at a time.
      data-testid="composer-primary"
      // The notice below is this control's description while there is one, so
      // the reason is reachable without hunting the sheet for a caption.
      aria-describedby={needsTitle ? PUBLISH_NEEDS_TITLE_ID : undefined}
      onClick={() => void onClick()}
      disabled={needsTitle || state.submitting || state.switchingMode !== null}
      className={offClassName(skin.className, needsTitle)}
      style={skin.style}
    >
      {skin.ornament}
      {state.submitting ? skin.busyLabel : idleLabel}
      {skin.trailingOrnament}
    </button>
  );
  // The bare button when there is nothing to explain, so a titled composer's
  // footer is byte-identical to what every archetype already lays out (and the
  // hookless test seam keeps reading `onClick` straight off the return).
  if (!needsTitle) return button;
  return (
    <>
      <PublishNeedsTitleNotice />
      {button}
    </>
  );
}

/**
 * The quiet twin of `PublishButton`'s dressed primary — the composer's existing
 * link idiom, already used by the mode block's "leave collab" and by the body
 * field's own inline exits.
 *
 * `--link-ink` and not the global secondary: these sit on the archetype's own
 * sheet, and three of the nine are near-black, where an unset neutral leaves the
 * words unreachable (#1636/#1819).
 */
const SECONDARY_SIGNAL_STYLE: CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--link-ink)",
  textDecoration: "underline",
  cursor: "pointer",
};

/**
 * A multi-member collab's footer: **Done**, **Propose** / **Approve**, and
 * **Withdraw proposal** (ADR-0079, #1811).
 *
 * One button used to say all three things, and its effect matched none of them.
 * Each of these says exactly one:
 *
 *  - **Done** — "my part is finished". Social, reversible, gates nothing, warns
 *    about nothing. A toggle, and `aria-pressed` is what makes it one: the
 *    label names the state it is in, so a screen reader is not left inferring
 *    the flag from two different words for the same button.
 *  - **Propose** — "I think we're ready". The only one that asks first, because
 *    it starts a clock on everybody else and silence is consent.
 *  - **Approve** — "I'm happy with this text". A vote on the live proposal, so
 *    it is drawn only while there is one to vote on, and only for a member who
 *    has not. `publish()` unchanged: Propose and Approve are one endpoint that
 *    the server tells apart by state.
 *  - **Withdraw proposal** — for the member who has read the draft and has no
 *    edit to make. Any member, not just the proposer (ADR-0013).
 *
 * **Hidden, never disabled.** Propose and Approve are mutually exclusive by
 * construction — a window is open or it is not — and Withdraw has nothing to
 * withdraw while the crew is drafting.
 *
 * The WORDS are shared across all nine factions (ADR-0079's exception to
 * ADR-0065): they are a mechanical fact a player must read correctly in order
 * to act. The DRESS is the archetype's, and arrives as the same
 * {@link PublishButtonSkin} the single button wears.
 */
export function CollabSignals({
  state,
  skin,
}: {
  state: EditPraxisState;
  skin: PublishButtonSkin;
}) {
  const praxis = state.praxis;
  if (!praxis) return null;
  const slug = praxis.task_faction_slug;
  const gate = deriveCollabGate(praxis.members, state.currentCharacterId);
  const proposalLive = proposalIsLive(praxis);
  const iAmDone = praxis.members.some(
    (member) =>
      member.character_id === state.currentCharacterId && member.is_done,
  );
  const busy = state.submitting || state.switchingMode !== null;
  // The last approval outstanding, so the button can say what pressing it does
  // instead of leaving the player to count the roster.
  const finalApproval = gate.castCount === gate.memberCount - 1;
  const primaryLabel = proposalLive
    ? collabCopy(slug, finalApproval ? "approveFinalAction" : "approveAction")
    : collabCopy(slug, "proposeAction");
  // The publishing one of the three, and only that one (#2484). Propose asks
  // first and then calls `publish()`; Approve calls it outright — one endpoint
  // the server tells apart by state — so both need a title to send. **Done** is
  // a social toggle and **Withdraw proposal** takes one back; neither publishes,
  // and neither goes dead because the write-up has not been named yet.
  const needsTitle = publishNeedsTitle(state);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={iAmDone}
        title={collabCopy(slug, "doneDescription")}
        onClick={() => void state.markDone(!iAmDone)}
        disabled={busy}
        className="label-caption"
        style={SECONDARY_SIGNAL_STYLE}
      >
        {collabCopy(slug, iAmDone ? "doneUndoAction" : "doneAction")}
      </button>
      {(!proposalLive || !gate.iCast) && (
        <button
          type="button"
          // Same slot id as `PublishButton`'s primary (#2453) — one of the two
          // renders, never both. `data-collab-signal` names WHICH act the press
          // performs, because Propose and Approve are one button distinguished
          // only by wording, and wording is what the nightly must stop reading.
          data-testid="composer-primary"
          data-collab-signal={proposalLive ? "approve" : "propose"}
          // What pressing it would do, until there is a reason it cannot be
          // pressed — a description of a live act on a dead control is worse
          // than none.
          title={
            needsTitle
              ? i18n.t("forms:editPraxis.composer.publishNeedsTitle")
              : collabCopy(
                  slug,
                  proposalLive ? "approveDescription" : "proposeDescription",
                )
          }
          aria-describedby={needsTitle ? PUBLISH_NEEDS_TITLE_ID : undefined}
          onClick={() => void (proposalLive ? state.publish() : state.propose())}
          disabled={needsTitle || busy}
          className={offClassName(skin.className, needsTitle)}
          style={skin.style}
        >
          {skin.ornament}
          {state.submitting ? skin.busyLabel : primaryLabel}
          {skin.trailingOrnament}
        </button>
      )}
      {proposalLive && (
        <button
          type="button"
          title={collabCopy(slug, "withdrawDescription")}
          onClick={() => void state.pullBack()}
          disabled={busy}
          className="label-caption"
          style={SECONDARY_SIGNAL_STYLE}
        >
          {collabCopy(slug, "withdrawAction")}
        </button>
      )}
      {/* Under the row rather than over it: two of these three signals are still
          live, so the line explains the one that is not instead of heading the
          group. It only exists while the button it describes does. */}
      {needsTitle && (!proposalLive || !gate.iCast) && <PublishNeedsTitleNotice />}
    </div>
  );
}

