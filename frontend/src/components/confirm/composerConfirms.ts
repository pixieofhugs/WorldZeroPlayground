/**
 * Every confirm the edit-praxis composer asks for, as pure data (#1082).
 * Each names its OWN consequence, never a generic "are you sure". Collab wording
 * goes through `collabCopy` (#1812); the rest uses `forms:editPraxis.confirm.*`.
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

/** Drop a plain solo praxis (#1082). Duel: `dropDuelSideConfirm`; collab: `deleteCollabConfirm`. */
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
 * Drop your side of a duel (#1831): the draft goes AND the challenge ends (body:
 * you; note: the opponent). Not a forfeit — that exists only at `settled`
 * (ADR-0011 §Forfeit); the word is rejected (#718).
 */
export function dropDuelSideConfirm(): ConfirmRequest {
  return {
    kind: 'dropDuelSide',
    title: tString('forms:editPraxis.confirm.dropDuelSideTitle'),
    body: tString('forms:editPraxis.confirm.dropDuelSide'),
    note: tString('forms:editPraxis.confirm.dropDuelSideNote'),
    confirmLabel: tString('forms:editPraxis.confirm.dropTaskAction'),
    danger: true,
  }
}

/** Delete a collab with other members — the creator's exit (#1074). */
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
 * Leave a collab; the crew keeps the praxis (ADR-0013). At 2 members the rest
 * converts to solo (ADR-0060); at 1 (should be unreachable) it's a drop.
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
    // Costs nobody else their work.
    danger: false,
  }
}

/**
 * Remove a collab member (#959). Resets EVERY member's cast (ADR-0013); only
 * allowed while `in_progress`/`pending` (#1076).
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

/** Propose publishing (ADR-0079, #1811): starts a clock where silence is consent. */
export function proposePublishConfirm(factionSlug: Slug): ConfirmRequest {
  return {
    kind: 'proposePublish',
    title: collabCopy(factionSlug, 'proposeTitle'),
    body: collabCopy(factionSlug, 'proposeConfirm'),
    confirmLabel: collabCopy(factionSlug, 'proposeAction'),
    danger: false,
  }
}

/**
 * First keystroke after a proposal goes live (ADR-0079, #1811). Not a lock: the
 * server cancels the proposal on edit. Not `danger`: nothing is destroyed.
 */
export function editCancelsProposalConfirm(factionSlug: Slug): ConfirmRequest {
  return {
    kind: 'editCancelsProposal',
    title: collabCopy(factionSlug, 'editCancelsTitle'),
    body: collabCopy(factionSlug, 'editCancelsConfirm'),
    confirmLabel: collabCopy(factionSlug, 'editCancelsAction'),
    danger: false,
  }
}

/** Collab-only way back into the text (#1080, ADR-0079): cancels the live proposal. */
export function reopenForEditConfirm(factionSlug: Slug): ConfirmRequest {
  return {
    kind: 'reopenForEdit',
    title: collabCopy(factionSlug, 'awaitingEditTitle'),
    body: collabCopy(factionSlug, 'awaitingEditConfirm'),
    confirmLabel: collabCopy(factionSlug, 'awaitingEditAction'),
    danger: false,
  }
}

/** Dissolve an accepted duel (#956): ends for both sides, no forfeit. */
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
 * The confirm a mode switch needs, or null. Switches are in-place (#321, #311), so
 * only these warn: leaving a duel (challenge cancelled), collab → solo with
 * co-authors (dropped, content stays).
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

/** Collab with co-authors → duel (#311); this path never reaches `modeSwitchConfirm`. */
export function duelDropsCoauthorsConfirm(): ConfirmRequest {
  return {
    kind: 'duelDropsCoauthors',
    title: tString('forms:editPraxis.confirm.dropCoauthorsTitle'),
    body: tString('forms:editPraxis.confirm.duelDropsCoauthors'),
    confirmLabel: tString('forms:editPraxis.confirm.modeSwitchAction'),
    danger: true,
  }
}
