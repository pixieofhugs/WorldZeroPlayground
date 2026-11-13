import i18n from '../../i18n'

/**
 * Copy for the collab roster and the multi-party composer footer (#591, #1812),
 * including duel keys (`duel*`, since #1077).
 *
 * Every faction reads the same words (owner ruling, #1812): submission status
 * must be read correctly to act, so it is an exception to ADR-0065's
 * per-faction dressing. `collabCopy.test.ts` guards the catalog shape.
 *
 * The per-faction override (`forms:editPraxis.<slug>.collab.<key>`) is kept as
 * the mechanism, mirroring `utils/factions.ts` and `utils/taunts.ts`; probe
 * with `i18n.exists()` because a bare `t()` on a missing key throws in
 * dev/test. Collab keys must not be overridden (see the guard).
 *
 * `pillWeaving` and friends keep old names because their mechanic still
 * exists; renaming touches every call site for nothing a player sees.
 *
 * Hookless by contract (the footer button), and keys are runtime-dynamic, so
 * resolve through a plain-string view of `t`, as the taunt resolver does.
 */
const tString = i18n.t as unknown as (
  key: string,
  options?: Record<string, string | number>,
) => string

/** The shared block every faction falls back to. */
const SHARED_PREFIX = 'forms:editPraxis.collab'

export type CollabCopyKey =
  | 'castStatus'
  | 'pillCast'
  | 'pillWeaving'
  // Orthogonal to approval (ADR-0079): rides alongside the row's state.
  | 'pillDone'
  // The two non-member states (#1416).
  | 'pillInvited'
  | 'pillDeclined'
  | 'you'
  | 'progressAria'
  // Whether one of the outstanding is you (#1952).
  | 'yoursApproved'
  | 'yoursOutstanding'
  // The heading ladder (#1952), picked by `waitingHeading.ts`. Three still
  // lists all names. Joining lives in copy, so the Oxford comma is a copy call.
  | 'waitingOnOne'
  | 'waitingOnTwo'
  | 'waitingOnThree'
  | 'waitingOnMany'
  | 'bannerHoldout'
  | 'bannerPublished'
  // Crew of one (#1274): replaces banner AND consensus readings, so not `banner*`.
  | 'rosterAwaitingAlone'
  // The three signals and the way out of a proposal (ADR-0079): one act each.
  | 'doneAction'
  | 'doneUndoAction'
  | 'doneDescription'
  | 'proposeAction'
  | 'proposeDescription'
  | 'proposeTitle'
  | 'proposeConfirm'
  | 'approveAction'
  | 'approveFinalAction'
  | 'approveDescription'
  | 'withdrawAction'
  | 'withdrawDescription'
  // The first keystroke on a live proposal cancels it, so it asks once (ADR-0079).
  | 'editCancelsTitle'
  | 'editCancelsConfirm'
  | 'editCancelsAction'
  | 'duelPullBackAction'
  | 'successHeading'
  | 'successBody'
  | 'successContinue'
  | 'leaveDescription'
  | 'deleteAction'
  | 'deleteDescription'
  | 'deleteConfirm'
  // Confirm dialogs for the three collab exits (#1082).
  | 'leaveTitle'
  | 'leaveConfirm'
  | 'leaveConfirmSolo'
  | 'leaveConfirmLast'
  | 'leaveConfirmAction'
  | 'kickTitle'
  | 'kickConfirm'
  | 'kickAction'
  // The post-cast waiting surface (#1080, ADR-0059), collab then duel.
  // `awaitingHeading` is the ladder's unreachable fallback (an empty
  // outstanding list can't happen in `waiting`).
  | 'awaitingHeading'
  | 'awaitingBody'
  | 'awaitingTaskLabel'
  | 'awaitingWriteUpLabel'
  | 'awaitingWriteUpEmpty'
  | 'awaitingEditAction'
  | 'awaitingEditTitle'
  | 'awaitingEditDescription'
  | 'awaitingEditConfirm'
  | 'awaitingClockLabel'
  | 'awaitingClockDays'
  | 'awaitingClockHours'
  | 'awaitingClockCaption'
  | 'awaitingClockAria'
  | 'awaitingClockLapsed'
  // The ADR-0012 window as the HOLDOUT sees it (#1164). `{{days}}d {{hours}}h`
  // sidesteps plurals, which runtime-dynamic keys can't express.
  | 'holdoutClockLine'
  | 'holdoutClockLineHours'
  | 'holdoutClockLineLapsed'
  | 'holdoutClockCaption'
  // Everybody is in (#1164): only a way through to the read page.
  | 'completedStatusMeta'
  | 'completedHeading'
  | 'completedBody'
  | 'completedReadAction'
  | 'duelCompletedHeading'
  | 'duelCompletedBody'
  | 'duelCompletedPlaceholder'
  | 'duelAwaitingHeading'
  | 'duelAwaitingTaskLabel'
  | 'duelAwaitingWriteUpLabel'
  | 'duelHiddenPlaceholder'
  | 'duelElapsedLine'
  | 'duelPendingLine'
  | 'duelPillSubmitted'
  | 'duelPillWriting'
  | 'duelPullBackDescription'
  // Nudging the person the praxis is still waiting on (#1083).
  | 'nudgeAction'
  | 'nudgeSentAction'
  | 'nudgeAria'
  | 'nudgeSentAria'
  | 'nudgeDescription'
  | 'duelNudgeAria'
  | 'nudgeFeedAction'
  // The bulk press (#1418).
  //
  // ponytail: the two result lines are count-agnostic English rather than
  // i18next plural forms. This resolver's keys are runtime-dynamic strings (the
  // slug comes from the task), so a `_one`/`_other` suffix would have to be a
  // member of this union and would then owe every faction two variants — the
  // same reason `holdoutClockLine` spells its days and hours out. If a locale
  // that inflects on the number lands, the upgrade is to give `collabCopy` a
  // `count` passthrough and let i18next select, not to branch here.
  | 'nudgeCrewAction'
  | 'nudgeCrewDescription'
  | 'nudgeCrewResult'
  | 'nudgeCrewResultPartial'

/** Resolve a key in the faction's voice, falling back to the shared block. */
export function collabCopy(
  factionSlug: string | null | undefined,
  key: CollabCopyKey,
  options?: Record<string, string | number>,
): string {
  const slug = factionSlug ?? ''
  if (slug) {
    const factionKey = `forms:editPraxis.${slug}.collab.${key}`
    if (i18n.exists(factionKey)) return tString(factionKey, options)
  }
  return tString(`${SHARED_PREFIX}.${key}`, options)
}
