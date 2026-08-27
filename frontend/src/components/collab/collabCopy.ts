import i18n from '../../i18n'

/**
 * Copy for the collab roster and the multi-party composer footer (#591, #1812).
 *
 * **Every faction reads the same words.** Owner ruling on #1812: collab
 * submission status is a mechanical fact a player must read correctly *in order
 * to act* — misread it and you lose work or publish early — so it is a
 * deliberate exception to ADR-0065's per-faction dressing. Faction identity is
 * carried by the caret colour, the card archetype and the chrome, not by the
 * name of a state you have to act on. The eight `editPraxis.<slug>.collab`
 * blocks (14 keys each, 112 strings) were deleted; `collabCopy.test.ts` guards
 * the shape of the catalog so a tenth faction cannot quietly re-open it.
 *
 * That ruling finished what #1154 started: the shared block had been written in
 * a witchy register — cast, weaving, woven — which read as a voice nobody owned,
 * and it now speaks the domain's own words per CONTEXT.md ("Submitted",
 * `status = submitted`, with `submitted_at` as the seal date).
 *
 * **The resolver stays.** A faction may still override any key under
 * `forms:editPraxis.<slug>.collab.<key>`; nothing does today, and the collab
 * keys specifically must not (see the guard). It is kept because it is the
 * mechanism a *different* kind of copy would use if one is ever voiced again,
 * and because it mirrors the shape already used for faction names/descriptions
 * (`utils/factions.ts`) and taunts (`utils/taunts.ts`): probe with
 * `i18n.exists()` first, because a bare `t()` on a missing key trips the
 * dev/test missing-key throw before the result could be inspected. A faction
 * with no entry for a key is a normal miss, not a defect.
 *
 * #1811 re-cut the action vocabulary, which #1812 had deliberately left alone:
 * `castAction` / `castFinalAction` / `pullBackAction` were one button meaning
 * three things, and ADR-0079 split them into `doneAction`, `proposeAction`,
 * `approveAction` and `withdrawAction`. Those names DID have to move, because
 * the mechanic moved under them — which is the test the surviving names pass:
 * `pillWeaving` and friends are named for a mechanic that is still there, so
 * renaming them would touch every call site for nothing a player sees.
 *
 * The two exceptions are #1910's: `duelPillSealed` and `duelSealedPlaceholder`
 * were named for a state — *sealed* — that #1863 abolished. They are not the
 * `cast`/`weave` case, where the name outlives a wording change because the
 * mechanic is still there; the duel side is now *submitted*, and *hidden* is
 * what the placeholder describes. `duelPillSubmitted` and
 * `duelHiddenPlaceholder` name what is left. (#1910's own table filed both
 * under `composer.` — they have always lived here, under `collab`.)
 *
 * Despite the name, this is the resolver for the whole *multi-party composer
 * footer*, not just the roster: the one footer button casts and pulls back for
 * a collab, and (since #1077) for a duel side too, and it is hookless by
 * contract, so its words cannot come from `useTranslation`. Duel keys are
 * prefixed `duel*` and sit in the same shared block.
 *
 * Keys are runtime-dynamic (the slug comes from the task), so they can't be the
 * typed literals `t()` expects — resolve through a plain-string view of `t`, as
 * the taunt resolver does. The catalog still owns every word; only the
 * compile-time key check is relaxed.
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
  // The Done badge (ADR-0079, #1811). A fifth reading rather than a sixth
  // state: Done is orthogonal to approval, so it rides ALONGSIDE whichever of
  // the four a row is already in instead of replacing it.
  | 'pillDone'
  // The roster's other two states (#1416). `pillCast`/`pillWeaving` already name
  // the two a MEMBER can be in — submitted, and on the crew but not submitted —
  // so absorbing the invites needed only the two states that are not membership
  // at all: asked and not answered, and asked and refused.
  | 'pillInvited'
  | 'pillDeclined'
  | 'you'
  | 'progressAria'
  // The supporting line's second half (#1952): the tally says how many, this
  // says whether one of them is you. `bannerWaiting` — "Approved. Waiting on
  // the others." — was retired with it, because the surface's heading now says
  // that with NAMES and the roster header said it again three lines below.
  | 'yoursApproved'
  | 'yoursOutstanding'
  // The heading ladder (#1952), chosen between by `waitingHeading.ts`. Four
  // forms, not three: the ruling is "waiting on X when X is greater than 3", so
  // three outstanding still lists all three names. The joining — the comma, the
  // "and" — is written HERE rather than assembled in a component, which is what
  // keeps the Oxford-comma question a copy decision.
  | 'waitingOnOne'
  | 'waitingOnTwo'
  | 'waitingOnThree'
  | 'waitingOnMany'
  | 'bannerHoldout'
  | 'bannerPublished'
  // The roster's fifth state (#1274): a collab whose crew is still one person.
  // It replaces the banner AND the consensus readings, which are degenerate at
  // one member, so it is not a `banner*` key.
  | 'rosterAwaitingAlone'
  // The three signals and the group's way out of a proposal (ADR-0079, #1811).
  // `castAction` / `castFinalAction` / `pullBackAction` are gone with the one
  // button that meant three things: what a player says is now *which* of these
  // they press, and each key names exactly one act.
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
  // The first keystroke after a proposal goes live asks once, because the
  // keystroke is what cancels it (ADR-0079).
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
  // The in-page confirm dialog's wording for the three collab exits (#1082).
  | 'leaveTitle'
  | 'leaveConfirm'
  | 'leaveConfirmSolo'
  | 'leaveConfirmLast'
  | 'leaveConfirmAction'
  | 'kickTitle'
  | 'kickConfirm'
  | 'kickAction'
  // The post-cast waiting surface (#1080, ADR-0059). Collab first, then the
  // duel guise of the same surface.
  //
  // `awaitingStatusMeta` — "Approved by you" — went with #1952: it sat above
  // the rule restating the heading directly under it, and the heading now names
  // who is BLOCKING rather than what you already did.
  //
  // `awaitingHeading` survives as the fallback the ladder cannot reach: a
  // collab in the `waiting` gate always has somebody outstanding, so an empty
  // list is unreachable rather than merely rare, and a heading that can render
  // as a sentence with a hole in it is worse than one that is never seen.
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
  // The same ADR-0012 window, read by the one player it threatens: the HOLDOUT,
  // who keeps the ordinary composer and never saw the ring (#1164). Days and
  // hours are drawn as `{{days}}d {{hours}}h`, matching the ring's own idiom
  // above and sidestepping a plural rule the resolver cannot express (its keys
  // are runtime-dynamic strings, so `count`-suffixed variants would have to be
  // members of this union).
  | 'holdoutClockLine'
  | 'holdoutClockLineHours'
  | 'holdoutClockLineLapsed'
  | 'holdoutClockCaption'
  // The completed reading of the waiting surface (#1164): everybody is in, so
  // there is nothing to wait for and nothing to author — only a way through to
  // the read page.
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
  // The bulk press (#1418): one button, one request, everyone still outstanding.
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

/**
 * Resolve one collab copy key in the given faction's voice, falling back to the
 * shared block. A null/blank slug (or an unaffiliated task) resolves straight to
 * the shared wording.
 */
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
