/**
 * `EditPraxisState` — the composer's contract (#1392), read by every archetype,
 * the waiting surface and the dispatcher. Type-only; re-exported by
 * `useEditPraxis.ts`.
 */
import type {
  MediaItemOut,
  PraxisOut,
  PraxisType,
} from "../../api/praxis";
import type { DuelDetailOut } from "../../api/duel";
import type { ConfirmRequest } from "../../components/confirm/composerConfirms";
import type { TaskOut } from "../../api/tasks";
import type { CharacterOut } from "../../api/characters";
import type { EditPraxisPhase } from "./editPraxisPhase";
import type { CrewNudgeResult } from "./useComposerRoster";

export interface EditPraxisState {
  // Routing / loading
  loading: boolean;
  /** Which face the composer wears (ADR-0059). */
  phase: EditPraxisPhase;
  praxis: PraxisOut | null;
  task: TaskOut | null;
  error: string;
  setError: (value: string) => void;

  // Title / body
  title: string;
  setTitle: (value: string) => void;
  body: string;
  setBody: (value: string) => void;

  // Media
  media: MediaItemOut[];
  fileError: string;
  /** Browsed or dropped — one path for both (#3077). */
  handleFileChange: (files: File[]) => void;
  /** Google Photos source (#559); the signal abandons the pick. */
  pickFromGooglePhotos: (signal: AbortSignal) => Promise<void>;
  removeMedia: (item: MediaItemOut) => Promise<void>;

  // Image edit stage (#514): images go through ImageEditModal one at a time;
  // video/audio skip it. `pendingImage` is null when the queue is empty.
  pendingImage: File | null;
  confirmImageEdit: (blob: Blob) => Promise<void>;
  cancelImageEdit: () => void;
  /** The modal's `onError` (#1545): reports onto `fileError`, naming the file. */
  reportImageError: (reason: string) => void;

  // Mode switching
  switchingMode: PraxisType | null;
  changeMode: (next: PraxisType) => Promise<void>;

  // Invites (collab) / challenge (duel) — shared search box
  inviteQuery: string;
  setInviteQuery: (value: string) => void;
  inviteResults: CharacterOut[];
  inviteOpen: boolean;
  setInviteOpen: (value: boolean) => void;
  inviting: boolean;
  sendInvite: (character: CharacterOut) => Promise<void>;
  cancelInvite: (inviteId: number) => Promise<void>;
  /** Remove another member from the collab (#959) — target is a character id. */
  kickMember: (memberId: number) => Promise<void>;
  /**
   * Poke the player this praxis waits on (#1083), by character id. For a duel
   * the write targets the rival's praxis. Refreshes so cooldown state is the server's.
   */
  nudge: (characterId: number) => Promise<void>;
  /** Poke the whole waiting crew in one request (#1418); the server picks recipients. */
  nudgeCrew: () => Promise<void>;
  /**
   * Result of the last crew press (a 200 ≠ everyone poked; see
   * {@link CrewNudgeResult}). Outlives the button on purpose.
   */
  crewNudge: CrewNudgeResult | null;

  // Duel challenge (#311) — selecting duel attaches a challenge to this praxis;
  // the praxis stays type='solo' and gains a duel_id.
  duel: DuelDetailOut | null;
  sendChallenge: (character: CharacterOut) => Promise<void>;
  /** Withdraw a still-pending challenge (challenger's composer chip ×). */
  cancelDuel: () => Promise<void>;
  /** Dissolve an active duel back to solo scoring, no forfeit (#956); asks first. */
  dissolveDuel: () => Promise<void>;

  // Metatasks (seal stack + Section-D picker + Section-E remove, #933)
  metatasks: TaskOut[];
  appliedMetatasks: Set<number>;
  /** The applied metatasks as full rows, rendered as the editable seal stack. */
  appliedMetataskList: TaskOut[];
  applyingMetatask: number | null;
  /** Seal a not-yet-applied metatask onto the praxis; closes the picker. */
  addMetatask: (mt: TaskOut) => Promise<void>;

  /** The neutral Section-D seal picker is open. */
  metataskPickerOpen: boolean;
  openMetataskPicker: () => void;
  closeMetataskPicker: () => void;

  /** The metatask awaiting peel-off confirmation (Section E), or null. */
  metataskRemovalTarget: TaskOut | null;
  /** A seal's × asks first: this opens the confirm for that metatask. */
  requestRemoveMetatask: (taskId: number) => void;
  /** Confirm the peel — removes the metatask and drops it from the stack. */
  confirmRemoveMetatask: () => Promise<void>;
  cancelRemoveMetatask: () => void;

  // Save / publish / drop
  submitting: boolean;
  /**
   * **Approve**, and every other mode's seal (`POST /praxes/{id}/submit`). The
   * server tells Propose from Approve by state (ADR-0079).
   */
  publish: () => Promise<void>;
  /** **Done** (ADR-0079): social, reversible, gates nothing. Takes the value. */
  markDone: (isDone: boolean) => Promise<void>;
  /** **Propose** (ADR-0079): {@link publish} behind a confirm. */
  propose: () => Promise<void>;
  /**
   * The third exit (#1081): navigation only, to the player's profile (`/tasks`
   * without a character). The room persists the text (ADR-0073).
   */
  saveDraft: () => Promise<void>;
  /**
   * **Withdraw proposal** on a collab (a group act: clears every approval), or
   * a duel side's neutral reopen (#1077, ADR-0079).
   */
  pullBack: () => Promise<void>;
  /**
   * The waiting surface's "edit the write-up" (ADR-0059), via `pullBack`. Asks
   * first on a collab (it cancels the countdown); a duel side does not.
   */
  reopenForEdit: () => Promise<void>;
  /** Leave a collab, creator included (#958, ADR-0013). `cancel` deletes it. */
  leaveCollab: () => Promise<void>;
  cancel: () => Promise<void>;

  /** One-shot success screen for the member whose cast closed the gate (#591). */
  collabSuccess: boolean;
  /** Manual continue from the success screen → the praxis detail page. */
  continueFromCollabSuccess: () => void;

  /** Duel seal confirmation is up (#718); confirming calls `publish()`. */
  duelSealOpen: boolean;
  /** PublishButton's duel-mode action: open the dialog instead of publishing. */
  requestDuelSeal: () => void;
  /** Dismiss the dialog without casting. */
  cancelDuelSeal: () => void;

  /**
   * The pending confirm, or null (#1082). One `ConfirmDialog` in
   * `EditPraxis.tsx` serves it; see `askConfirm` in `useComposerConfirm`.
   */
  pendingConfirm: ConfirmRequest | null;
  /** The dialog's affirmative button — resumes the handler that asked. */
  acceptConfirm: () => void;
  /** Escape, backdrop, or "Never mind" — the handler returns without acting. */
  dismissConfirm: () => void;

  /** When the room last took any update (#1743): the "Saved …" line. */
  autosaveAt: Date | null;
  /** The `PraxisRoomProvider`'s `onUpdate`; nothing else calls it. */
  setAutosaveAt: (value: Date | null) => void;

  /**
   * ADR-0012 window length in days (`collab_auto_submit_days`), null until
   * `/game-config` lands. Used for the holdout's countdown (#1164).
   */
  autoSubmitDays: number | null;

  /**
   * A proposal is live and this member hasn't agreed to cancel it by typing
   * (ADR-0079, #1811). The body filter drops own edits and asks instead; not a
   * freeze. Rule in `proposalGuard.ts`. Always false for solo and duel.
   */
  proposalConfirmArmed: boolean;
  /** Ask once per proposal; fire-and-forget (the keystroke is already dropped). */
  confirmProposalEdit: () => void;

  // Derived locked-state flags
  isPublished: boolean;
  /** Read-only; in practice only a moderated (hidden/failed) praxis (#1164). */
  controlsLocked: boolean;
  modeIsLocked: boolean;
  /** Show the invite/challenge box: collab members, or an open duel pane. */
  showInviteBox: boolean;
  /** The viewer can add/remove seals (eligible + solo + still editable). */
  canSealMetatask: boolean;
  /** Render the seal stack at all: can seal, or read-only applied seals exist. */
  showSealStack: boolean;
  /** The duel chip is selected (a challenge is attached or the pane is open). */
  duelMode: boolean;
  /** The duel chip is available to this viewer (level ≥ duel_level_required). */
  duelChipVisible: boolean;

  // Identity helpers
  currentCharacterId: number | null;
}
