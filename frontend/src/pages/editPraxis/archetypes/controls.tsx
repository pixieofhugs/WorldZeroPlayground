/**
 * Lightly skinned, accessible control primitives shared by all archetypes.
 * Archetypes own the outer containers; these are the inner essentials.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import { Compartment, EditorState, Prec, Transaction } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import { factionCssVar, factionName } from "../../../utils/factions";
import { useFormFactor } from "../../../hooks/useFormFactor";
import { useAuth } from "../../../auth/AuthContext";
import type { PraxisOut, PraxisType } from "../../../api/praxis";
import type { DuelSideOut } from "../../../api/duel";
import MarkdownPreview from "../blocks/MarkdownPreview";
import { applyMarkdown, minimalReplacement } from "../blocks/markdownToolbar";
import type { MarkdownCommand } from "../blocks/markdownToolbar";
import { usePraxisRoom, ROOM_TITLE_KEY } from "../praxisRoom";
import { composerWritable } from "../roomSeal";
import { isFileDrag } from "../strayFileDrop";
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
  /** Dress for the roster, `+ invite` chip and duel pair drawn inside this control (#2269). */
  collab?: CollabSkin;
  /** The block wrapping the chips/roster, the search box and the leave link. */
  containerStyle?: CSSProperties;
  /** Each row inside the invite/challenge dropdown. */
  dropdownItemStyle?: CSSProperties;
  /** The "leave collab" link at the foot of the block. */
  leaveStyle?: CSSProperties;
}

/**
 * One side of the compose-stage duel pair (#1417). The avatar takes the SIDE's
 * own faction (a duel is the one surface two factions share). The filing word
 * reuses the waiting surface's `duelPill*` copy: one fact, one wording.
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
 * The compose-stage duel: a status badge over the two sides across a `vs` (#1417).
 * Keeps rescind and dissolve even though the design mock omits them: they are
 * the only ways out. `duel` can be null with a `duel_id` set (`useComposerDuel`
 * swallows fetch failure), so badge and rescind render without it.
 */
function DuelPair({
  praxis,
  duel,
  cancelDuel,
  dissolveDuel,
  skin,
}: Pick<EditPraxisState, "duel" | "cancelDuel" | "dissolveDuel"> & {
  /** Non-null: the pair only mounts once a challenge is attached. */
  praxis: PraxisOut;
  skin: InviteSearchSkin;
}) {
  const { t } = useTranslation("forms");
  // Sides relative to the viewer, not the `opponent` role (#1226): a duel
  // composer only shows the viewer's own praxis.
  const sides = duel ? duelSides(duel, praxis.created_by_id) : null;
  const factionSlug = praxis.task_faction_slug;
  // Ink from the skin (#2267), never the task's faction; `factionSlug` is for COPY only.
  const accent = skin.collab?.accentInk ?? skin.collab?.accent ?? "currentColor";
  const quiet = skin.collab?.quiet ?? "currentColor";
  const accepted = duel?.status === "active";
  const canRescind = duel == null || duel.status === "pending";
  return (
    <div
      // Nightly duel spec's proof a challenge attached (#2453).
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
              onClick={() => void cancelDuel()}
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
          {/* Accepted duels dissolve neutrally back to solo scoring (#956);
              heavier than ×, so labelled and confirmed. */}
          {accepted && (
            <button
              type="button"
              onClick={() => void dissolveDuel()}
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
  praxis,
  duel,
  duelMode,
  currentCharacterId,
  autoSubmitDays,
  inviteQuery,
  setInviteQuery,
  inviteResults,
  inviteOpen,
  setInviteOpen,
  inviting,
  sendInvite,
  sendChallenge,
  cancelInvite,
  kickMember,
  leaveCollab,
  cancelDuel,
  dissolveDuel,
  skin,
}: Pick<
  EditPraxisState,
  | "duel"
  | "duelMode"
  | "currentCharacterId"
  | "autoSubmitDays"
  | "inviteQuery"
  | "setInviteQuery"
  | "inviteResults"
  | "inviteOpen"
  | "setInviteOpen"
  | "inviting"
  | "sendInvite"
  | "sendChallenge"
  | "cancelInvite"
  | "kickMember"
  | "leaveCollab"
  | "cancelDuel"
  | "dissolveDuel"
> & {
  /** Non-null: every archetype mounts this below its own praxis guard. */
  praxis: PraxisOut;
  skin: InviteSearchSkin;
}) {
  const { t } = useTranslation("forms");
  // The only roster mount inside a room, so the only one with presence dots (#1744).
  const room = usePraxisRoom();
  // Invite search hides behind the `+ invite` chip (#1417).
  const [pickerOpen, setPickerOpen] = useState(false);
  // Duel mode reuses the box as a one-opponent picker (#311); once attached
  // the pair replaces it.
  const challengeAttached = duelMode && praxis.duel_id != null;
  const onPick = duelMode ? sendChallenge : sendInvite;
  // No chip in duel mode: picking an opponent is the pane's whole purpose.
  const searchOpen = !challengeAttached && (duelMode || pickerOpen);
  // Any member, creator included, can leave (#958; ADR-0013: co-owned). Leaving
  // is not deleting: Delete (DropButton) stays the creator's alone.
  const canLeaveCollab =
    !duelMode &&
    praxis.type === "collab" &&
    praxis.members.some((member) => member.character_id === currentCharacterId);
  // `collab.fontFamily` overrides when the roster's voice differs from the box's.
  const collabSkin: CollabSkin = { fontFamily: skin.fontFamily, ...skin.collab };
  return (
    <div style={skin.containerStyle}>
      <div
        style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", marginBottom: "var(--space-sm)" }}
      >
        {duelMode
          ? challengeAttached && (
              <DuelPair
                praxis={praxis}
                duel={duel}
                cancelDuel={cancelDuel}
                dissolveDuel={dissolveDuel}
                skin={skin}
              />
            )
          : (
              // The roster owns invited/declined rows and the rescind × (#1416).
              <div style={{ flex: "1 1 100%" }}>
                <CollabRoster
                  praxisType={praxis.type}
                  members={praxis.members}
                  invites={praxis.invites}
                  currentCharacterId={currentCharacterId}
                  factionSlug={praxis.task_faction_slug}
                  taskPointValue={praxis.task_point_value}
                  presentCharacterIds={room?.present}
                  // Only roster mount off the card sheet, so it hands in a dress (#2269).
                  skin={collabSkin}
                  onKick={kickMember}
                  onRescindInvite={cancelInvite}
                />
                {/* ADR-0012 holdout countdown (#1164); renders nothing for
                    everyone else, so mounted unconditionally. */}
                <HoldoutPublishNotice
                  members={praxis.members}
                  currentCharacterId={currentCharacterId}
                  factionSlug={praxis.task_faction_slug}
                  submitProposedAt={praxis.submit_proposed_at}
                  autoSubmitDays={autoSubmitDays}
                />
              </div>
            )}
      </div>
      {/* The `+ invite` chip (#1417), in the roster's quiet tier and corner
          from the skin (#2267, #2269), never the task's faction. */}
      {!duelMode && !pickerOpen && (
        <button
          type="button"
          data-testid="composer-invite-open"
          onClick={() => setPickerOpen(true)}
          // title, not aria-label: the visible words stay the name for voice control.
          title={t("editPraxis.invite.addDescription")}
          className="label-caption"
          style={{
            padding: "var(--space-xs) var(--space-md)",
            borderRadius: collabSkin.radius ?? 4,
            // `currentColor`: a skin that forgets the rung still gets a legible chip.
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
          // Shared focus ring (#2266; see index.css).
          data-composer-field
          data-testid="composer-invite-search"
          // Opened by the chip, so it takes the caret.
          autoFocus={pickerOpen}
          value={inviteQuery}
          onChange={(event) => setInviteQuery(event.target.value)}
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
            if (inviteResults.length > 0) setInviteOpen(true);
          }}
          onBlur={() => setTimeout(() => setInviteOpen(false), 200)}
        />
        {inviteOpen && inviteResults.length > 0 && (
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
            {inviteResults.map((character) => (
              <button
                key={character.id}
                type="button"
                disabled={inviting}
                onMouseDown={() => {
                  // Back to the chip; the roster grows their row.
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
                  cursor: inviting ? "wait" : "pointer",
                  textAlign: "left",
                  fontFamily: skin.fontFamily,
                  fontSize: "var(--text-lg)",
                  color: skin.inputColor ?? "inherit",
                  ...skin.dropdownItemStyle,
                }}
              >
                {/* Display names aren't unique, so the handle rides along (#1962);
                    same shape as the @mention typeahead. */}
                <FactionAvatar character={character} size="sm" />
                <span
                  style={{
                    fontWeight: 700,
                    // The name truncates first; the handle disambiguates namesakes.
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
          onClick={() => void leaveCollab()}
          // Unlike delete, this only removes you (#1074).
          title={collabCopy(praxis.task_faction_slug, "leaveDescription")}
          className="font-body label-caption hover:underline"
          style={{
            display: "block",
            marginTop: "var(--space-sm)",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            // No inline `color`: `.label-caption` paints `--label-ink`, which a
            // frame repoints (#1819).
            ...skin.leaveStyle,
          }}
        >
          {t("editPraxis.leaveAction")}
        </button>
      )}
    </div>
  );
}

interface FilePickerSkin {
  buttonStyle: CSSProperties;
  /** Override only; default wording depends on form factor, not faction (#2089). */
  buttonLabel?: string;
  errorColor?: string;
  helperText?: string;
  helperStyle?: CSSProperties;
  /** The wrapper around button + helper + error (#1181). */
  containerStyle?: CSSProperties;
}

/**
 * Makes the Proof control a drop target (#3077). Drags without files stay the
 * browser's. Pure for DOM-less tests (`__tests__/proofDrop.test.tsx`).
 */
export function proofDropHandlers(onFiles: (files: File[]) => void) {
  return {
    // Without this the browser never fires `drop` here at all.
    onDragOver: (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    onDrop: (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      // Only `items` reveals a folder (#3135); retype it so the tray refuses it
      // (typeless would let its extension pass, #3172).
      const folders = new Set(
        Array.from(event.dataTransfer.items ?? [])
          .map((item) => item.webkitGetAsEntry?.())
          .filter((entry) => entry?.isDirectory)
          .map((entry) => entry!.name),
      );
      const files = Array.from(event.dataTransfer.files).map((file) =>
        folders.has(file.name) ? new File([], file.name, { type: "inode/directory" }) : file,
      );
      // A file-typed drag with no files (image from another tab, #3135) is not a pick.
      if (files.length > 0) onFiles(files);
    },
  };
}

/**
 * "Add from Google Photos" (#559), for Google sign-ins only (the 403 is the real
 * guard). Unskinned. While a pick is open the same button cancels it.
 */
export function GooglePhotosButton({
  provider,
  pick,
}: {
  provider: string | undefined;
  pick: ((signal: AbortSignal) => Promise<void>) | undefined;
}) {
  const { t } = useTranslation("praxis");
  const [abort, setAbort] = useState<AbortController | null>(null);
  // A closed composer abandons a pick still open.
  useEffect(() => () => abort?.abort(), [abort]);
  if (provider !== "google" || !pick) return null;
  return (
    <button
      type="button"
      className="font-body label-caption hover:underline"
      style={{
        display: "block",
        marginTop: "var(--space-sm)",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
      }}
      onClick={() => {
        if (abort) return abort.abort();
        const controller = new AbortController();
        setAbort(controller);
        // The popup opens inside `pick`, before its first await.
        void pick(controller.signal).finally(() => setAbort(null));
      }}
    >
      {abort ? t("googlePhotos.cancel") : t("googlePhotos.button")}
    </button>
  );
}

export function FilePicker({
  fileError,
  handleFileChange,
  pickFromGooglePhotos,
  skin,
}: Pick<EditPraxisState, "fileError" | "handleFileChange"> &
  Partial<Pick<EditPraxisState, "pickFromGooglePhotos">> & {
    skin: FilePickerSkin;
  }) {
  const { user } = useAuth();
  const { t } = useTranslation("forms");
  const mobile = useFormFactor() === "mobile";
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={skin.containerStyle} {...proofDropHandlers(handleFileChange)}>
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
        onChange={(event) => {
          // Copy first: clearing the value empties the live FileList, and it is
          // cleared so picking the same file twice still fires a change.
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          handleFileChange(files);
        }}
        style={{ display: "none" }}
      />
      <GooglePhotosButton provider={user?.provider} pick={pickFromGooglePhotos} />
      {skin.helperText && <div style={skin.helperStyle}>{skin.helperText}</div>}
      {fileError && (
        <p
          style={{
            fontSize: "var(--text-md)",
            color: skin.errorColor ?? "var(--color-danger)",
            marginTop: "var(--space-sm)",
          }}
        >
          {fileError}
        </p>
      )}
    </div>
  );
}

interface DropButtonSkin {
  style?: CSSProperties;
  label?: string;
  className?: string;
}

export function DropButton({
  praxis,
  currentCharacterId,
  cancel,
  skin,
}: Pick<EditPraxisState, "praxis" | "currentCharacterId" | "cancel"> & {
  skin?: DropButtonSkin;
}) {
  const { t } = useTranslation("forms");
  const isCollab = praxis?.type === "collab";
  // Delete is creator-only (backend `delete_praxis` enforces); others Leave (#1074).
  const isCreator = praxis?.created_by_id === currentCharacterId;
  if (isCollab && !isCreator) return null;
  // With others' parts inside, "drop task" undersells it; collabCopy warns.
  const crewAtStake = isCollab && praxis.members.length > 1;
  const label = crewAtStake
    ? collabCopy(praxis.task_faction_slug, "deleteAction")
    : (skin?.label ?? t("editPraxis.dropTask"));
  return (
    <button
      type="button"
      onClick={() => void cancel()}
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

/* SaveDraftButton — the third exit (#1081): keep the draft, leave. Writes
 * nothing (the text is already in the room, #1743); navigates to the profile.
 * Unskinned by default; no confirm, since nothing is destroyed. */
interface SaveDraftButtonSkin {
  style?: CSSProperties;
  label?: string;
  /** Replaces the shared classes rather than adding to them (#1181). */
  className?: string;
}

export function SaveDraftButton({
  controlsLocked,
  submitting,
  switchingMode,
  saveDraft,
  skin,
}: Pick<
  EditPraxisState,
  "controlsLocked" | "submitting" | "switchingMode" | "saveDraft"
> & {
  skin?: SaveDraftButtonSkin;
}) {
  const { t } = useTranslation("forms");
  // A cast or moderated praxis has no draft to keep.
  if (controlsLocked) return null;
  return (
    <button
      type="button"
      onClick={() => void saveDraft()}
      // Publish and mode switch write the same fields and also navigate.
      disabled={submitting || switchingMode !== null}
      className={skin?.className ?? "font-body label-caption hover:underline"}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        // Explicit `--label-ink`: a skin `className` may drop `.label-caption` (#1819).
        color: "var(--label-ink)",
        ...skin?.style,
      }}
    >
      {skin?.label ?? t("editPraxis.saveDraft")}
    </button>
  );
}

/* The seal stack (#933) lives in `components/metataskSeal/MetataskSealStack`,
 * outside this module to avoid an import cycle (see its header). */

/* TitleField — the 200-char title input; archetypes own the ornament. */
interface TitleFieldSkin {
  inputStyle: CSSProperties;
  placeholder?: string;
  /** Pairs with `ComposerSection`'s `htmlFor` (#1181); an id means a label names the field. */
  id?: string;
  /** For a skin whose label is a drawn mark rather than words. */
  ariaLabel?: string;
}

/**
 * Debounce before the title is published to the room (#1742). The title is one
 * last-write-wins map key, not co-edited text (ADR-0073).
 */
const TITLE_PUBLISH_DEBOUNCE_MS = 600;

export function TitleField({
  title,
  setTitle,
  skin,
}: Pick<EditPraxisState, "title" | "setTitle"> & {
  skin: TitleFieldSkin;
}) {
  const { t } = useTranslation("forms");
  const room = usePraxisRoom();
  const meta = room?.meta ?? null;
  const inputRef = useRef<HTMLInputElement>(null);
  const publishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs so the observer installs once per room.
  const setTitleRef = useRef(setTitle);
  setTitleRef.current = setTitle;
  const titleRef = useRef(title);
  titleRef.current = title;

  const publish = (value: string) => {
    if (publishTimerRef.current) clearTimeout(publishTimerRef.current);
    publishTimerRef.current = null;
    // Also creates the key. Same-value writes would still broadcast.
    if (meta && meta.get(ROOM_TITLE_KEY) !== value) meta.set(ROOM_TITLE_KEY, value);
  };

  // Remote title → the box.
  useEffect(() => {
    if (!meta) return;
    const apply = () => {
      const remote = meta.get(ROOM_TITLE_KEY);
      // Absent means "no remote value yet", not "cleared" (#1740 seeds only `body`).
      if (remote === undefined || remote === titleRef.current) return;
      // Never while the player is in the field.
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
    // Role class owns type size; skin keeps font/colour/ornament (§4a).
    <input
      ref={inputRef}
      type="text"
      maxLength={200}
      // Announces the requirement (#2093); with `errors.titleRequired` it is the
      // whole constraint now the visible label is gone (#2179). No `<form>`, so
      // no browser bubble.
      required
      id={skin.id}
      // Placeholder is not a name (#2179); same route as `bodyContentAttributes`.
      aria-label={
        skin.ariaLabel ??
        (skin.id ? undefined : t("editPraxis.composer.titleLabel"))
      }
      className="content-text"
      // Shared focus ring (#2266).
      data-composer-field
      // Nightly hook (#2453): the accessible name varies by skin.
      data-testid="praxis-title"
      value={title}
      onChange={(event) => {
        const next = event.target.value;
        setTitle(next);
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

/* BodyTextarea — the body editor, bound to `body` / `setBody`. */
interface BodyTextareaSkin {
  /** Dresses the editor host; inheritable styles reach CodeMirror (see `bodyEditorTheme.ts`). */
  textareaStyle: CSSProperties;
  /**
   * Appended host class, only for re-pointing a custom property a stylesheet
   * reads (Singularity's `sg-composer-off`, #2574). Not a general dress seam.
   */
  className?: string;
  placeholder?: string;
  /** Optional override for the toolbar wrapper (e.g. archetype spacing). */
  toolbarStyle?: CSSProperties;
  /** Optional override for each toolbar button. */
  toolbarButtonStyle?: CSSProperties;
  /** Same seam as TitleFieldSkin.id — pairs with ComposerSection's `htmlFor`. */
  id?: string;
  ariaLabel?: string;
  /** Omit the markdown toolbar (#1181); every command is typeable markdown. */
  hideToolbar?: boolean;
}

/**
 * Attributes on the body editor's content element (#1978). Pure and exported so
 * DOM-less tests can read them off an `EditorState`.
 *
 * `@codemirror/view` hard-codes `spellcheck: "false"`; this facet is the only
 * place to reverse it. The editor is always named: id → labelledby, else
 * ariaLabel, else the catalog `writeUpLabel` (placeholder is not a name, #2085).
 */
export function bodyContentAttributes(
  skin: Pick<BodyTextareaSkin, "id" | "ariaLabel">,
): Record<string, string> {
  const attributes: Record<string, string> = { spellcheck: "true" };
  // `<label for>` does nothing for a contenteditable div.
  if (skin.id) attributes["aria-labelledby"] = `${skin.id}-label`;
  if (skin.ariaLabel) attributes["aria-label"] = skin.ariaLabel;
  // `i18n.t`, not the hook: this is a pure value.
  else if (!skin.id)
    attributes["aria-label"] = i18n.t("forms:editPraxis.composer.writeUpLabel");
  return attributes;
}

// Toolbar buttons in render order. Glyphs go through `button.glyph` so they
// don't trip i18next/no-literal-string. Seven, per the design (#1706);
// `applyMarkdown` still implements the other four commands.
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
 * How long a connecting room may stay quiet before the composer says it is not
 * coming (#2557). `PraxisRoom.unreachable` stays primary, but y-websocket only
 * reaches it after its full backoff. `bodyUnavailableDress.test.ts` caps this.
 */
export const ROOM_SEED_GRACE_MS = 8000;

/**
 * The write-up box's dress while the room has not seeded (#2557). Never dim it
 * with opacity: measured, it halves placeholder contrast on every skin (#2574).
 * The ground swap lives in `index.css` (`[data-composer-body][aria-disabled]`).
 * `cursor` must be inline: it inherits into `.cm-content`.
 */
const BODY_UNAVAILABLE_STYLE: CSSProperties = {
  cursor: "not-allowed",
};

export function BodyTextarea({
  praxis,
  controlsLocked,
  setBody,
  proposalConfirmArmed,
  confirmProposalEdit,
  skin,
}: Pick<
  EditPraxisState,
  | "praxis"
  | "controlsLocked"
  | "setBody"
  | "proposalConfirmArmed"
  | "confirmProposalEdit"
> & {
  skin: BodyTextareaSkin;
}) {
  const { t } = useTranslation("forms");
  const room = usePraxisRoom();
  const ytext = room?.body ?? null;
  const seeded = room?.seeded ?? false;
  // Stable for the room's life, so as a dependency it never rebuilds the editor.
  const awareness = room?.awareness ?? null;
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const editableSlot = useRef(new Compartment()).current;
  // Unseeded = "not yet"; locked = moderated (ADR-0079). Rule in `roomSeal.ts`.
  const writable = composerWritable(seeded, controlsLocked);
  const setBodyRef = useRef(setBody);
  setBodyRef.current = setBody;
  // Live-proposal guard (#1811), a ref so flipping it never touches the editor.
  const proposalGuardRef = useRef({
    armed: proposalConfirmArmed,
    ask: confirmProposalEdit,
  });
  proposalGuardRef.current = {
    armed: proposalConfirmArmed,
    ask: confirmProposalEdit,
  };

  const contentAttributes = useMemo(
    () => bodyContentAttributes(skin),
    [skin.id, skin.ariaLabel],
  );

  const awaitingRoom = ytext !== null && !seeded;
  // Own id: the notice is the description and click target; `skin.id` is optional.
  const noticeId = useId();
  const noticeRef = useRef<HTMLParagraphElement>(null);

  // See ROOM_SEED_GRACE_MS; resets per room.
  const [seedGraceElapsed, setSeedGraceElapsed] = useState(false);
  useEffect(() => {
    if (!awaitingRoom) return;
    setSeedGraceElapsed(false);
    const timer = setTimeout(() => setSeedGraceElapsed(true), ROOM_SEED_GRACE_MS);
    return () => clearTimeout(timer);
  }, [awaitingRoom]);

  // Connecting vs. not coming (#1804).
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
      // Never the composer's `body`: writing it in would merge a second copy (ADR-0073).
      doc: ytext.toString(),
      parent: host,
      extensions: [
        EditorView.lineWrapping,
        keymap.of([...yUndoManagerKeymap, ...defaultKeymap]),
        cmPlaceholder(skin.placeholder ?? ""),
        BODY_EDITOR_BASE_THEME,
        editableSlot.of(EditorView.editable.of(writable)),
        // First keystroke after a proposal goes live asks once (ADR-0079). A
        // filter, not `editable`: non-editable is unfocusable and the keystroke
        // would never reach a handler. Remote Yjs updates carry no `userEvent`,
        // so they pass; every local path (incl. the toolbar) sets one.
        EditorState.transactionFilter.of((tr) => {
          if (!tr.docChanged) return tr;
          if (tr.annotation(Transaction.userEvent) === undefined) return tr;
          if (!proposalGuardRef.current.armed) return tr;
          proposalGuardRef.current.ask();
          return [];
        }),
        // Undo goes through Yjs with no user event, so catch it here, above
        // `yUndoManagerKeymap`; false falls through when disarmed.
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
        // Co-authors' carets in faction hues (#1744). Painted, never raw: the
        // plugin interpolates `user.color` into a style attribute (see
        // `roomPresence.ts`). No praxisType gate: own client is skipped.
        yCollab(ytext, awareness == null ? null : paintedAwareness(awareness)),
      ],
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only these rebuild (a rebuild drops caret and undo); all else reconfigures.
    // The placeholder changes only on a language switch.
  }, [ytext, awareness, skin.placeholder]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: editableSlot.reconfigure(EditorView.editable.of(writable)),
    });
  }, [writable, editableSlot]);

  // Room text → `body` (feeds BodyPreview), one way only: pushing `body` back
  // would seed the room from the client.
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
    // Narrowest edit: a whole-doc replace would delete under co-authors' feet.
    view.dispatch({
      changes: minimalReplacement(text, result.text),
      selection: { anchor: result.selectionStart, head: result.selectionEnd },
      // Required by the live-proposal filter (#1811).
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

  // Toolbar hidden until seeded: `dispatch` writes past `editable` (#1742).
  return (
    <div>
      {skin.hideToolbar || awaitingRoom || controlsLocked ? null : (
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
            // #693: Tab runs title → body; roving tabindex would still add a stop.
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
      {/* CodeMirror builds its DOM here on mount, so it is empty in SSR (#1742).
          Role class owns the size (§4a). */}
      <div
        ref={hostRef}
        id={skin.id}
        data-composer-body
        // Announcement only (#2557); CodeMirror's non-editable pane enforces.
        aria-disabled={awaitingRoom || undefined}
        aria-describedby={awaitingRoom ? noticeId : undefined}
        // ponytail: native tooltip is delayed and absent on touch; upgrade is an
        // inline explainer owned by the style seam.
        title={awaitingRoom ? waitingNotice : undefined}
        // A click focuses the live-region notice instead of doing nothing.
        onClick={awaitingRoom ? () => noticeRef.current?.focus() : undefined}
        className={skin.className ? `content-text ${skin.className}` : "content-text"}
        style={{
          ...BODY_EDITOR_HOST_STYLE,
          ...skin.textareaStyle,
          ...(awaitingRoom ? BODY_UNAVAILABLE_STYLE : null),
        }}
      />
      {awaitingRoom && (
        // Live region announces connecting → unreachable; tabIndex -1 is a
        // focus target, not a tab stop (#693).
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
      {/* Warns a non-approver that editing cancels the countdown (#1164,
          ADR-0079). Gated on the praxis state, not the one-shot confirm latch. */}
      {proposalIsLive(praxis) && (
        <div style={{ marginTop: "var(--space-xs)" }}>
          {/* No inline color: it would beat `--label-ink` (#1819). */}
          <p className="label-caption">
            {t("editPraxis.composer.bodyProposalLive")}
          </p>
        </div>
      )}
    </div>
  );
}

/* WriteUpTabs — Write / Preview control (#1181). Owns the tablist a11y wiring
 * only; skins paint via `buttonStyle`. Neutral shared copy (ADR-0065 §3). */
export type ComposerTab = "write" | "preview";

interface WriteUpTabsSkin {
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

/* BodyPreview — live markdown preview; renders nothing for an empty body. */
interface BodyPreviewSkin {
  wrapperStyle?: CSSProperties;
  label?: ReactNode;
  markdownClassName?: string;
  markdownStyle?: CSSProperties;
  /** Drawn for an empty body (#1181): an empty preview TAB reads as broken. */
  emptyState?: ReactNode;
}

export function BodyPreview({
  body,
  skin,
}: Pick<EditPraxisState, "body"> & {
  skin: BodyPreviewSkin;
}) {
  if (!body.trim()) {
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
      {/* content-text owns type size. Its literal also appears on TitleField so
          Tailwind emits it despite this assembled string. */}
      <MarkdownPreview
        source={body}
        className={`content-text ${skin.markdownClassName ?? "markdown-preview"}`}
        style={skin.markdownStyle}
      />
    </div>
  );
}

/* ModePicker — solo/collab/duel selector. Owns filtering, lock/hide and the
 * confirm-then-switch; archetypes render each option (ADR-0016). */
interface ModeOptionRenderArgs {
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
  index: number;
}

interface ModePickerSkin<O extends { key: PraxisType }> {
  containerStyle?: CSSProperties;
  options: O[];
  renderOption: (option: O, args: ModeOptionRenderArgs) => ReactNode;
}

export function ModePicker<O extends { key: PraxisType }>({
  praxis,
  task,
  duelMode,
  duelChipVisible,
  modeIsLocked,
  switchingMode,
  changeMode,
  skin,
}: Pick<
  EditPraxisState,
  | "task"
  | "duelMode"
  | "duelChipVisible"
  | "modeIsLocked"
  | "switchingMode"
  | "changeMode"
> & {
  /** Non-null: every archetype mounts this below its own praxis guard. */
  praxis: PraxisOut;
  skin: ModePickerSkin<O>;
}) {
  // Server-computed per viewer level; fails closed until the task lands (#1709).
  const allowedModes = task?.allowed_modes ?? [];
  return (
    <div style={skin.containerStyle}>
      {skin.options
        .filter((option) =>
          // Duel isn't in task.allowed_modes (it's issued via challenge, ADR-0011);
          // it's gated on the viewer's level instead (#311). Hide, don't disable.
          option.key === "duel"
            ? duelChipVisible
            : allowedModes.includes(option.key),
        )
        .map((option, index) => {
          // A duel side stays type='solo' + duel_id, so the duel chip's active
          // state is driven by duelMode, not praxis.type.
          const active =
            option.key === "duel"
              ? duelMode
              : praxis.type === option.key && !duelMode;
          const disabled =
            modeIsLocked || switchingMode !== null;
          if (modeIsLocked && !active) return null;
          return skin.renderOption(option, {
            active,
            disabled,
            index,
            onSelect: () => {
              if (!disabled) void changeMode(option.key);
            },
          });
        })}
    </div>
  );
}

/**
 * Title precondition for both primaries (#2484): the primary is disabled, with
 * the reason drawn, rather than refusing off-screen after the press. Untitled is
 * the normal entry state (signup and `accept_duel` mint no title). Affordance
 * only; the hook's and server's validation stay.
 */
function publishNeedsTitle(title: string): boolean {
  return !title.trim();
}

/** Fixed, not `useId`: tests call the primaries as plain hookless functions. */
const PUBLISH_NEEDS_TITLE_ID = "composer-publish-needs-title";

/**
 * The reason beside the disabled control. `role="status"`: a disabled button is
 * out of tab order, so describedby alone misses keyboard users. No inline color
 * (#1819).
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
 * House disabled dress (#2486/#2573), for the title gate only; busy states
 * dress themselves.
 */
function offClassName(skinClassName: string | undefined, off: boolean): string | undefined {
  if (!off) return skinClassName;
  return skinClassName ? `${skinClassName} control-off` : "control-off";
}

/* PublishButton — nothing once published (one duel exception, below); disabled
 * while busy or untitled. Archetypes supply placement and labels. */
export interface PublishButtonSkin {
  style: CSSProperties;
  /** For reaching a CSS class — an ep-* motion, a shared utility (#1181). */
  className?: string;
  idleLabel: ReactNode;
  busyLabel: ReactNode;
  ornament?: ReactNode;
  /**
   * Mark drawn after the label (#1185). Not baked into the label: the label is
   * replaced in pull-back, collab and busy states; the mark persists.
   */
  trailingOrnament?: ReactNode;
}

export function PublishButton({
  praxis,
  currentCharacterId,
  isPublished,
  duel,
  duelMode,
  title,
  submitting,
  switchingMode,
  publish,
  propose,
  pullBack,
  markDone,
  requestDuelSeal,
  skin,
}: Pick<
  EditPraxisState,
  | "praxis"
  | "currentCharacterId"
  | "isPublished"
  | "duel"
  | "duelMode"
  | "title"
  | "submitting"
  | "switchingMode"
  | "publish"
  | "propose"
  | "pullBack"
  | "markDone"
  | "requestDuelSeal"
> & {
  skin: PublishButtonSkin;
}) {
  // NOT unreachable (#1177): a moderator-FAILED duel side still `submitted`
  // renders the composer (phase is `composing`, waiting surface refuses), and
  // this is the author's only way back to fix the text. Ordinary casts go to
  // `PraxisWaitingSurface` instead. Pull-back is neutral before settlement
  // (ADR-0011 §Forfeit); statuses listed, not negated, so settled/resolved stay out.
  const duelPullBack =
    isPublished &&
    duelMode &&
    (duel?.status === "active" || duel?.status === "pending");
  if (isPublished && !duelPullBack) return null;
  // A multi-member collab has three signals (ADR-0079).
  if (!duelPullBack && praxis?.type === "collab" && praxis.members.length > 1) {
    return (
      <CollabSignals
        praxis={praxis}
        currentCharacterId={currentCharacterId}
        title={title}
        submitting={submitting}
        switchingMode={switchingMode}
        publish={publish}
        propose={propose}
        pullBack={pullBack}
        markDone={markDone}
        skin={skin}
      />
    );
  }
  // Neutral, no forfeit language (#718; guarded by duelForfeitWarning.test.tsx).
  const idleLabel = duelPullBack
    ? collabCopy(praxis?.task_faction_slug, "duelPullBackAction")
    : skin.idleLabel;
  // With an opponent attached, a duel side confirms via the seal sheet (#718).
  const sealsADuel = duelMode && duel != null;
  const onClick = duelPullBack
    ? pullBack
    : sealsADuel
      ? async () => requestDuelSeal()
      : publish;
  // Both publish paths are gated; pull-back is not (#1177).
  const needsTitle = !duelPullBack && publishNeedsTitle(title);
  const button = (
    <button
      type="button"
      // Nightly presses the slot, not the label (#2453); shared with CollabSignals.
      data-testid="composer-primary"
      aria-describedby={needsTitle ? PUBLISH_NEEDS_TITLE_ID : undefined}
      onClick={() => void onClick()}
      disabled={needsTitle || submitting || switchingMode !== null}
      className={offClassName(skin.className, needsTitle)}
      style={skin.style}
    >
      {skin.ornament}
      {submitting ? skin.busyLabel : idleLabel}
      {skin.trailingOrnament}
    </button>
  );
  // Bare button when titled: tests read `onClick` straight off the return.
  if (!needsTitle) return button;
  return (
    <>
      <PublishNeedsTitleNotice />
      {button}
    </>
  );
}

/** Link-style secondary; `--link-ink` because some sheets are near-black (#1819). */
const SECONDARY_SIGNAL_STYLE: CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--link-ink)",
  textDecoration: "underline",
  cursor: "pointer",
};

/**
 * Multi-member collab footer (ADR-0079, #1811):
 *  - **Done**: social toggle (`aria-pressed`), gates nothing.
 *  - **Propose**: asks first; starts a clock where silence is consent.
 *  - **Approve**: drawn only during a live proposal, for a non-approver. Same
 *    `publish()` endpoint as Propose; the server tells them apart.
 *  - **Withdraw proposal**: any member (ADR-0013).
 *
 * Inapplicable signals are hidden. The title precondition DISABLES instead
 * (#2484): deliberate exception to "hide unusable controls", since hiding would
 * leave an untitled collab with no primary. Don't "fix" it in a sweep.
 * Words are shared across factions (ADR-0079); dress is the skin's.
 */
export function CollabSignals({
  praxis,
  currentCharacterId,
  title,
  submitting,
  switchingMode,
  publish,
  propose,
  pullBack,
  markDone,
  skin,
}: Pick<
  EditPraxisState,
  | "praxis"
  | "currentCharacterId"
  | "title"
  | "submitting"
  | "switchingMode"
  | "publish"
  | "propose"
  | "pullBack"
  | "markDone"
> & {
  skin: PublishButtonSkin;
}) {
  if (!praxis) return null;
  const slug = praxis.task_faction_slug;
  const gate = deriveCollabGate(praxis.members, currentCharacterId);
  const proposalLive = proposalIsLive(praxis);
  const iAmDone = praxis.members.some(
    (member) =>
      member.character_id === currentCharacterId && member.is_done,
  );
  const busy = submitting || switchingMode !== null;
  const finalApproval = gate.castCount === gate.memberCount - 1;
  const primaryLabel = proposalLive
    ? collabCopy(slug, finalApproval ? "approveFinalAction" : "approveAction")
    : collabCopy(slug, "proposeAction");
  // Only the publishing signal is title-gated (#2484).
  const needsTitle = publishNeedsTitle(title);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={iAmDone}
        title={collabCopy(slug, "doneDescription")}
        onClick={() => void markDone(!iAmDone)}
        disabled={busy}
        className="label-caption"
        style={SECONDARY_SIGNAL_STYLE}
      >
        {collabCopy(slug, iAmDone ? "doneUndoAction" : "doneAction")}
      </button>
      {(!proposalLive || !gate.iCast) && (
        <button
          type="button"
          // Slot id shared with PublishButton (#2453); the signal names the act.
          data-testid="composer-primary"
          data-collab-signal={proposalLive ? "approve" : "propose"}
          title={
            needsTitle
              ? i18n.t("forms:editPraxis.composer.publishNeedsTitle")
              : collabCopy(
                  slug,
                  proposalLive ? "approveDescription" : "proposeDescription",
                )
          }
          aria-describedby={needsTitle ? PUBLISH_NEEDS_TITLE_ID : undefined}
          onClick={() => void (proposalLive ? publish() : propose())}
          disabled={needsTitle || busy}
          className={offClassName(skin.className, needsTitle)}
          style={skin.style}
        >
          {skin.ornament}
          {submitting ? skin.busyLabel : primaryLabel}
          {skin.trailingOrnament}
        </button>
      )}
      {proposalLive && (
        <button
          type="button"
          title={collabCopy(slug, "withdrawDescription")}
          onClick={() => void pullBack()}
          disabled={busy}
          className="label-caption"
          style={SECONDARY_SIGNAL_STYLE}
        >
          {collabCopy(slug, "withdrawAction")}
        </button>
      )}
      {/* Below the row: it explains the one dead signal, not the group. */}
      {needsTitle && (!proposalLive || !gate.iCast) && <PublishNeedsTitleNotice />}
    </div>
  );
}

