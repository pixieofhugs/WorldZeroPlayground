/**
 * `EditPraxisState` — the composer's contract, and the reason the split below
 * it is invisible.
 *
 * Nine faction archetypes, the waiting surface, the metatask seal components
 * and the dispatcher all read this one object; it is settled architecture
 * (#1392). It lives in its own module so the implementation can be composed
 * from concern-scoped sub-hooks without the interface — the part everyone
 * actually imports — sitting inside whichever file happens to assemble it.
 *
 * Type-only, and imported type-only, so it contributes nothing to any chunk.
 * `useEditPraxis.ts` re-exports both names, which is how every existing
 * importer reaches them.
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
  /**
   * Which face the composer wears (ADR-0059). `EditPraxis.tsx` renders the
   * shared waiting surface in place of the faction archetype at `waiting`.
   */
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
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  removeMedia: (item: MediaItemOut) => Promise<void>;

  // Image edit stage (#514) — picked images pass through ImageEditModal one at a
  // time before upload; video/audio skip it. `pendingImage` is the file the modal
  // is currently editing (null when the queue is empty).
  pendingImage: File | null;
  confirmImageEdit: (blob: Blob) => Promise<void>;
  cancelImageEdit: () => void;
  /**
   * The modal's failure channel (#1545). Before this, a praxis image the browser
   * could not decode or render was uploaded UNPROCESSED with nothing on screen —
   * the pass-through #1527 removed from the avatar path but deliberately left
   * here, because praxis media had no error line of its own to report on.
   *
   * It always did: `fileError`, the line a too-large pick already uses. This
   * reports onto it, named with the file the modal was holding. `EditPraxis.tsx`
   * passes it as the modal's `onError`.
   */
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
   * Poke the player this praxis is still waiting on (#1083) — target is a
   * character id. For a collab that is a member who has not cast; for a duel it
   * is the rival, and the write is aimed at THEIR side's praxis, not yours.
   * Refreshes afterwards so the button's disabled state comes back from the
   * server rather than being remembered here.
   */
  nudge: (characterId: number) => Promise<void>;
  /**
   * Poke everyone the collab is still waiting on, in one request (#1418).
   *
   * Takes no recipient list: the server derives the crew and applies the same
   * per-person 24h window, so the cooldown stays in one place. Mounted only on
   * the waiting surface's collab footer.
   */
  nudgeCrew: () => Promise<void>;
  /**
   * What the last crew press actually did, or null before one. A 200 does not
   * mean everyone was poked — see {@link CrewNudgeResult}. Never persisted, and
   * deliberately outlives the button, which disappears once the last nudgeable
   * member has been nudged.
   */
  crewNudge: CrewNudgeResult | null;

  // Duel challenge (#311) — selecting duel attaches a challenge to this praxis;
  // the praxis stays type='solo' and gains a duel_id.
  duel: DuelDetailOut | null;
  sendChallenge: (character: CharacterOut) => Promise<void>;
  /** Withdraw a still-pending challenge (challenger's composer chip ×). */
  cancelDuel: () => Promise<void>;
  /**
   * Dissolve an already-accepted (active) duel (#956). Either participant may do
   * it; the backend recalculates both sides back to plain-solo scoring with no
   * forfeit penalty. Asks first (it ends the duel for both) — otherwise the same
   * neutral cancel as `cancelDuel`.
   */
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
   * **Approve**, and every other mode's seal — `POST /praxes/{id}/submit`.
   *
   * On a multi-member collab the server tells Propose and Approve apart by the
   * praxis's own state (ADR-0079): no window open means this opened one, a
   * window already open means this was a vote on it. The composer still asks
   * before the first of those, which is {@link propose}; this is the raw call
   * every other affordance shares.
   */
  publish: () => Promise<void>;
  /**
   * **Done** (ADR-0079) — "my part is finished". Purely social: a roster badge,
   * freely reversible, gating nothing and starting nothing. Takes the value, so
   * the toggle can never guess wrong about which way it is going.
   */
  markDone: (isDone: boolean) => Promise<void>;
  /**
   * **Propose** (ADR-0079) — "I think we're ready to publish".
   *
   * {@link publish} behind a confirm. The only one of the three signals that
   * asks: it starts a countdown on everybody else, and silence is consent.
   */
  propose: () => Promise<void>;
  /**
   * The composer's third exit (#1081): keep the draft and leave.
   *
   * Navigation, and nothing else: it clears the error line and sends the player
   * to their own profile, where their `in_progress` praxes are listed (`/tasks`
   * if they somehow have no character). It carried a flush until #1743 — title
   * and body now live in the room and reach the record on the room server's own
   * debounce (ADR-0073), so there is no client-side write left to order, none
   * that can fail, and nothing to refuse leaving over.
   */
  saveDraft: () => Promise<void>;
  /**
   * **Withdraw proposal** on a pending collab, and a duel side's neutral reopen
   * (#591, #1077, ADR-0079). One endpoint, told apart server-side by status.
   *
   * A GROUP act on a collab now: the countdown stops, every approval clears and
   * the praxis returns to drafting — the same cancellation a keystroke performs,
   * for a member who has read the draft and has no edit to make yet.
   */
  pullBack: () => Promise<void>;
  /**
   * The waiting surface's authoring re-entry (ADR-0059) — "edit the write-up".
   *
   * Routes through `pullBack` rather than opening the editor optimistically,
   * because on a collab that is the cancellation: the countdown the surface was
   * drawing stops and every approval clears. It asks first for exactly that
   * reason; a duel side, whose reopen costs nothing, does not.
   */
  reopenForEdit: () => Promise<void>;
  /**
   * Drop my own membership from a collab without the bank-full drop-to-accept
   * modal (#958). Open to every member, the creator included — a collab is
   * co-owned and `created_by_id` grants no powers (ADR-0013, #1074). Distinct
   * from `cancel`, which deletes the praxis for everyone.
   */
  leaveCollab: () => Promise<void>;
  cancel: () => Promise<void>;

  /**
   * My cast just closed the consensus gate on a multi-member collab, so the
   * one-shot success screen is up (#591). Transient client state — never
   * persisted, and only ever true for the member who cast last.
   */
  collabSuccess: boolean;
  /** Manual continue from the success screen → the praxis detail page. */
  continueFromCollabSuccess: () => void;

  /**
   * The duel seal confirmation is up (#718). A duel is the only mode whose cast
   * carries consequences the player can't fully undo, so it's the only mode that
   * asks first. Transient client state; confirming calls `publish()` untouched.
   */
  duelSealOpen: boolean;
  /** PublishButton's duel-mode action: open the dialog instead of publishing. */
  requestDuelSeal: () => void;
  /** Dismiss the dialog without casting. */
  cancelDuelSeal: () => void;

  /**
   * The confirm the composer is currently waiting on, or null (#1082).
   *
   * `EditPraxis.tsx` mounts one `ConfirmDialog` for this, beside the duel seal
   * and the metatask peel-off, so a single mount covers all 16 composer
   * surfaces, the waiting surface and both form factors. Every handler that
   * used to call `window.confirm` now awaits this instead, so they still read
   * as "ask, then act" — see `askConfirm` in `useComposerConfirm`.
   */
  pendingConfirm: ConfirmRequest | null;
  /** The dialog's affirmative button — resumes the handler that asked. */
  acceptConfirm: () => void;
  /** Escape, backdrop, or "Never mind" — the handler returns without acting. */
  dismissConfirm: () => void;

  /**
   * When the room last took an update — local or a co-author's (#1743).
   *
   * The composer's "Saved …" line, and the only honest thing it can say now
   * that no client-side request writes the praxis: an update the room has
   * acknowledged is already in `praxis_room_update`, and `praxis.body_text`
   * follows it on the server's own debounce.
   */
  autosaveAt: Date | null;
  /**
   * Stamped by `PraxisRoomProvider` on every document update. `EditPraxis.tsx`
   * hands it over as the provider's `onUpdate`; nothing else calls it.
   */
  setAutosaveAt: (value: Date | null) => void;

  /**
   * The ADR-0012 pending-publish window length, in days, from `/game-config`
   * (`collab_auto_submit_days`). `null` until it lands — it is an `EraConfig`
   * value a future era may change, so nothing may assume today's number.
   *
   * The composer needs it for exactly one player: the **holdout**, the member
   * who has not submitted and the only one the deadline threatens (#1164). The
   * waiting surface reads the same field through `useGameConfig`.
   */
  autoSubmitDays: number | null;

  /**
   * A proposal is live and this member has not yet agreed to cancel it by
   * typing (ADR-0079, #1811).
   *
   * The body editor's transaction filter reads this and drops the member's own
   * edits while it is true, calling {@link confirmProposalEdit} instead. It is
   * NOT a freeze — #1745's is retired, the room takes every frame, and remote
   * updates from co-authors apply untouched. It is one dialog standing where a
   * lock used to, so the cancellation is deliberate rather than an accident.
   *
   * False for solo and duel, which have one member and never open a window.
   * The rule itself is one predicate in `proposalGuard.ts`, where the DOM-less
   * harness can call it.
   */
  proposalConfirmArmed: boolean;
  /**
   * Ask, once per proposal. Synchronous and fire-and-forget: its caller is a
   * CodeMirror filter that has already dropped the keystroke, so declining
   * costs that keystroke and leaves nothing half-applied.
   */
  confirmProposalEdit: () => void;

  // Derived locked-state flags
  isPublished: boolean;
  /**
   * The composer is read-only. Since #1164 this means **"hand off"** rather than
   * "render the composer, disabled": a published praxis no longer reaches an
   * archetype at all (`phase` is `completed` or `handoff`), so the one state
   * that still renders a locked composer is a moderated (hidden/failed) one.
   * Every `!controlsLocked` gate in the hook and in the archetypes is what keeps
   * that one honest.
   */
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
