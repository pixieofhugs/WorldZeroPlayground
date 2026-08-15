/**
 * Every confirm the edit-praxis composer asks for, as data (#1082).
 *
 * These were seven `window.confirm(...)` calls scattered across
 * `useEditPraxis.ts` and `CollabRoster.tsx`. Pulling the words out of the
 * handlers and into pure builders is what makes them testable: the dialog needs
 * a DOM, a request does not.
 *
 * COPY RULE — each confirm names its OWN consequence. They are not variations
 * on "are you sure": deleting destroys other people's work, leaving does not,
 * and kicking clears casts that were already made. A single generic sentence
 * over all three would be wrong twice.
 *
 * Collab wording resolves through `collabCopy`, which since #1812 speaks one
 * voice for everybody. These keys were shared before that ruling generalised
 * it: a warning about destroying somebody else's work is the worst place in the
 * composer to be in character.
 *
 * The mode-switch and duel confirms are not collab copy and stay on plain
 * `forms:editPraxis.confirm.*` keys.
 */
import i18n from '../../i18n'
import type { PraxisType } from '../../api/praxis'
import { collabCopy } from '../collab/collabCopy'
import type { ConfirmRequest } from './ConfirmDialog'

export type { ConfirmRequest }

/** Runtime-dynamic keys can't be the typed literals `t()` wants. */
const tString = i18n.t as unknown as (
  key: string,
  options?: Record<string, string | number>,
) => string

type Slug = string | null | undefined

/**
 * Drop a praxis that only you are in — solo, or your side of a duel (#1082).
 *
 * The collab case is `deleteCollabConfirm` and says something quite different;
 * `cancel` picks between them on whether a crew is actually at stake.
 */
export function dropTaskConfirm(): ConfirmRequest {
  return {
    kind: 'dropTask',
    title: tString('forms:editPraxis.confirm.dropTaskTitle'),
    body: tString('forms:editPraxis.confirm.dropTask'),
    confirmLabel: tString('forms:editPraxis.confirm.dropTaskAction'),
    danger: true,
  }
}

/**
 * Delete a collab that has other members in it — the creator's exit (#1074).
 *
 * Reuses #1074's three keys rather than writing a second set: `deleteConfirm`
 * is already the sentence that names the cost (everyone's part goes), and
 * `deleteAction` is already the words for the act. The title and the button
 * therefore read the same, which is the honest outcome of having one name for
 * one act.
 */
export function deleteCollabConfirm(factionSlug: Slug): ConfirmRequest {
  return {
    kind: 'deleteCollab',
    title: collabCopy(factionSlug, 'deleteAction'),
    body: collabCopy(factionSlug, 'deleteConfirm'),
    confirmLabel: collabCopy(factionSlug, 'deleteAction'),
    danger: true,
  }
}

/**
 * Leave a collab — you bow out, the crew keeps the praxis (ADR-0013).
 *
 * The note is ADR-0060: a collab that drops to one member converts to a solo
 * praxis for whoever is left, collab bonus and all, so the second-to-last
 * member's exit is not the same act as the third-to-last member's. And the
 * last member's exit is a drop, not a leave — that state should be unreachable
 * now that 2→1 converts, but if it is ever reached the dialog must not promise
 * a crew that carries on.
 */
export function leaveCollabConfirm(
  factionSlug: Slug,
  memberCount: number,
): ConfirmRequest {
  const note =
    memberCount <= 1
      ? collabCopy(factionSlug, 'leaveConfirmLast')
      : memberCount === 2
        ? collabCopy(factionSlug, 'leaveConfirmSolo')
        : undefined
  return {
    kind: 'leaveCollab',
    title: collabCopy(factionSlug, 'leaveTitle'),
    body: collabCopy(factionSlug, 'leaveConfirm'),
    note,
    confirmLabel: collabCopy(factionSlug, 'leaveConfirmAction'),
    // Leaving costs nobody else their work — the crew carries on. It is drawn
    // as an ordinary action, not a destructive one.
    danger: false,
  }
}

/**
 * Remove another member from a collab (#959).
 *
 * A kick resets EVERY member's cast (ADR-0013), including the kicker's, and the
 * backend only allows it while the praxis is `in_progress` or `pending` (#1076
 * — the roster hides the × once the collab is submitted). So the copy says what
 * the guard permits: the group goes back to editing. It does not offer to
 * remove anyone from a sealed collab.
 */
export function kickMemberConfirm(
  factionSlug: Slug,
  name: string,
): ConfirmRequest {
  return {
    kind: 'kickMember',
    title: collabCopy(factionSlug, 'kickTitle', { name }),
    body: collabCopy(factionSlug, 'kickConfirm', { name }),
    confirmLabel: collabCopy(factionSlug, 'kickAction'),
    danger: true,
  }
}

/**
 * Take your own cast back out of a collab so you can edit it (#1080).
 *
 * Only ever asked on a collab: pulling back is scoped to you, but the edit it
 * exists for cancels the pending-publish window and clears every member's cast
 * (`cancel_pending_publish_on_edit`, ADR-0012). A duel side's pull-back is free
 * before the duel settles (ADR-0011 §Forfeit) and asks nothing.
 */
export function reopenForEditConfirm(factionSlug: Slug): ConfirmRequest {
  return {
    kind: 'reopenForEdit',
    title: collabCopy(factionSlug, 'awaitingEditTitle'),
    body: collabCopy(factionSlug, 'awaitingEditConfirm'),
    confirmLabel: collabCopy(factionSlug, 'awaitingEditAction'),
    danger: false,
  }
}

/**
 * Dissolve an accepted duel (#956) — it ends for both sides, with no forfeit.
 */
export function dissolveDuelConfirm(): ConfirmRequest {
  return {
    kind: 'dissolveDuel',
    title: tString('forms:editPraxis.confirm.dissolveDuelTitle'),
    body: tString('forms:editPraxis.confirm.dissolveDuel'),
    confirmLabel: tString('forms:editPraxis.confirm.dissolveDuelAction'),
    danger: true,
  }
}

/**
 * Decide whether switching to a new mode needs a confirm, and with what words.
 * Returns the request to put in front of the player, or null to proceed
 * silently. (Was `modeSwitchPrompt` in `useEditPraxis`, returning a bare string
 * for `window.confirm`.)
 *
 * Mode switches are in-place (#321 solo↔collab, #311 duel), so the draft is
 * always preserved — only genuinely destructive transitions warn:
 *  - leaving a pending/active duel  → the challenge is cancelled
 *  - collab → solo with co-authors  → they're dropped (content stays)
 */
export function modeSwitchConfirm(
  next: PraxisType,
  currentType: PraxisType,
  memberCount: number,
  inDuel: boolean,
): ConfirmRequest | null {
  if (inDuel && next !== 'duel') {
    return {
      kind: 'leaveDuel',
      title: tString('forms:editPraxis.confirm.leaveDuelTitle'),
      body: tString('forms:editPraxis.confirm.leaveDuel'),
      confirmLabel: tString('forms:editPraxis.confirm.modeSwitchAction'),
      danger: true,
    }
  }
  if (next === 'solo' && currentType === 'collab' && memberCount > 1) {
    return {
      kind: 'soloDropsCoauthors',
      title: tString('forms:editPraxis.confirm.dropCoauthorsTitle'),
      body: tString('forms:editPraxis.confirm.soloDropsCoauthors'),
      confirmLabel: tString('forms:editPraxis.confirm.modeSwitchAction'),
      danger: true,
    }
  }
  return null
}

/**
 * Switching to duel from a collab that has co-authors (#311). Same loss as
 * `soloDropsCoauthors` by a different route — the duel path drops the crew
 * before it opens the challenge pane, so it never reaches `modeSwitchConfirm`.
 */
export function duelDropsCoauthorsConfirm(): ConfirmRequest {
  return {
    kind: 'duelDropsCoauthors',
    title: tString('forms:editPraxis.confirm.dropCoauthorsTitle'),
    body: tString('forms:editPraxis.confirm.duelDropsCoauthors'),
    confirmLabel: tString('forms:editPraxis.confirm.modeSwitchAction'),
    danger: true,
  }
}
