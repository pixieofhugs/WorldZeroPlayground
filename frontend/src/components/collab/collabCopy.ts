import i18n from '../../i18n'

/**
 * Per-faction voice for the collab roster copy (#591).
 *
 * The roster's key names are verb-neutral (`castAction`, `pillWeaving`, …);
 * the *words* are the faction's. Each faction may override any key under
 * `forms:editPraxis.<slug>.collab.<key>`; anything it doesn't override falls
 * back to the shared `forms:editPraxis.collab.<key>` block. This mirrors the
 * resolver shape already used for faction names/descriptions
 * (`utils/factions.ts`) and taunts (`utils/taunts.ts`): probe with
 * `i18n.exists()` first, because a bare `t()` on a missing key trips the
 * dev/test missing-key throw before the result could be inspected. A faction
 * with no entry for a key is a normal miss, not a defect.
 *
 * The shared block is the tier with **no voice**, so it speaks the domain's own
 * words (#1154): *submitted* / *not submitted*, per CONTEXT.md ("Submitted",
 * `status = submitted`, with `submitted_at` as the seal date). It used to be
 * written in a witchy register — cast, weaving, woven — which read as a voice
 * nobody owned: eight factions override the voiced keys, so the only faction
 * actually reading it is Warriors of Whimsy, and it is also what a *new* faction
 * inherits and what any un-overridden key falls back to. A faction that wants to
 * cast, sign off or file still does, in its own block; the fallback does not.
 * The key names are the one exception and stay as they are — they are named for
 * the mechanic, not the wording (see the verb-neutrality note above), and eight
 * of the nine blocks they front genuinely do still mean "cast".
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
  // The roster's other two states (#1416). `pillCast`/`pillWeaving` already name
  // the two a MEMBER can be in — submitted, and on the crew but not submitted —
  // so absorbing the invites needed only the two states that are not membership
  // at all: asked and not answered, and asked and refused.
  | 'pillInvited'
  | 'pillDeclined'
  | 'you'
  | 'progressAria'
  | 'bannerWaiting'
  | 'bannerHoldout'
  | 'bannerPublished'
  // The roster's fifth state (#1274): a collab whose crew is still one person.
  // It replaces the banner AND the consensus readings, which are degenerate at
  // one member, so it is not a `banner*` key.
  | 'rosterAwaitingAlone'
  | 'castAction'
  | 'castFinalAction'
  | 'pullBackAction'
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
  | 'awaitingStatusMeta'
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
  | 'duelSealedPlaceholder'
  | 'duelElapsedLine'
  | 'duelPendingLine'
  | 'duelPillSealed'
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
 * Keys that are content to speak in the shared voice (#1074).
 *
 * Most collab keys are voiced by every faction — the roster's diction is part of
 * the faction's identity, and `collabCopy.test.ts` holds each faction to the full
 * set. These ones ship with a shared default only: they describe the *mechanics*
 * of leaving versus deleting a co-owned praxis (ADR-0013), which every faction
 * agrees on, and a warning about destroying other people's work is a poor place
 * to be clever. A faction may still override any of them; nothing here stops it,
 * and the resolver is unchanged. The list exists so the completeness test knows
 * which keys a silent faction is allowed to leave alone.
 *
 * `duelPullBackAction` (#1077) joins them: it is the same composer footer button
 * in its duel guise, so it resolves through the same hookless resolver, but the
 * line is a plain statement of a mechanic (at `active` your cast reopens for
 * free — forfeit begins only at `settled`, ADR-0011 §Forfeit) and a faction
 * flourish here risks reading as a consequence. Shared voice until a faction
 * asks for its own.
 *
 * The confirm-dialog wording for leave and kick (#1082) joins them on the same
 * grounds as `deleteConfirm` did: the three exits are one mechanic each — who
 * loses what when you go, and whose cast a kick clears (ADR-0013, ADR-0060) —
 * and a dialog whose whole job is to state a consequence plainly is the worst
 * place in the composer to be in character. Adding them here is also what keeps
 * a new shared key from silently owing eight faction translations.
 *
 * The `nudge*` block (#1083) joins them too, and the issue asks for it by name:
 * a voiced block historically drags all eight factions with it, and this one is
 * four words on a button plus one feed line. What it says is a mechanic and a
 * limit — one reminder, once a day, signed with your name — and the feed line in
 * particular is read by the RECIPIENT, whose faction is not the sender's, so a
 * sender-voiced quip there would land in someone else's room. Overrides stay
 * available for whichever faction earns one first.
 *
 * The `nudgeCrew*` block (#1418) joins them on the strongest version of that
 * argument: two of its four keys are a REPORT — how many of the crew the press
 * actually reached, and how many were inside their 24h window — and a faction
 * voice over a count is where an honest number goes to become a vibe.
 *
 * The whole `awaiting*` / `duelAwaiting*` block (#1080) joins them for the same
 * reason, plus one of its own: the waiting surface is **one shared, token-themed
 * screen** for every faction and both form factors (epic #1071, decision 7), the
 * way `CollabSuccess` already is. Its lines are mechanics — what a countdown
 * does, why a rival's entry is not readable, what re-opening your part costs
 * everyone else — and a per-faction voice over a warning about destroying other
 * people's cast is the same poor idea it was for `deleteConfirm`. A faction may
 * still override any of them; per-faction frames for this surface are a
 * follow-up wave, not a debt this one incurs.
 *
 * `rosterAwaitingAlone` (#1274) joins them as well. It states a fact about the
 * praxis rather than addressing the player — nobody else is on this collab yet —
 * which is the same tier as the other mechanics lines here. It is also read on
 * the PUBLIC detail page by non-members, so it has to work as a neutral
 * statement to a stranger. Its sibling `rosterAwaitingInvited`, which named the
 * outstanding invitees, went with the invite chips in #1416: those people are
 * roster rows now, so the line repeated a name three lines above itself.
 *
 * `pillInvited` / `pillDeclined` (#1416) join them, and the issue asks for it by
 * name so that absorbing invites into the roster costs no faction a translation.
 * They also earn it: an invite's status is a fact about the INVITEE — they have
 * not answered, or they said no — and the roster speaks in the voice of the
 * TASK's faction, which is frequently not theirs. A voiced refusal would put
 * words in the mouth of someone who is not on this praxis at all. The two
 * membership states stay voiced, because those people did join.
 *
 * The `holdout*` and `completed*` blocks (#1164) are the same block finished.
 * The first says what the ADR-0012 window does to the member who has not
 * submitted — a deadline and its escape, stated once; the second is the reading
 * that replaced the locked composer, and it is read by whoever opens `/edit`
 * after the fact, holdout included. Both are mechanics in the domain's own noun
 * (CONTEXT.md: *submitted*), which is exactly the tier this list is for.
 */
export const SHARED_DEFAULT_COLLAB_KEYS: readonly CollabCopyKey[] = [
  'leaveDescription',
  'deleteAction',
  'deleteDescription',
  'deleteConfirm',
  'leaveTitle',
  'leaveConfirm',
  'leaveConfirmSolo',
  'leaveConfirmLast',
  'leaveConfirmAction',
  'kickTitle',
  'kickConfirm',
  'kickAction',
  'duelPullBackAction',
  'rosterAwaitingAlone',
  'pillInvited',
  'pillDeclined',
  'awaitingStatusMeta',
  'awaitingHeading',
  'awaitingBody',
  'awaitingTaskLabel',
  'awaitingWriteUpLabel',
  'awaitingWriteUpEmpty',
  'awaitingEditAction',
  'awaitingEditTitle',
  'awaitingEditDescription',
  'awaitingEditConfirm',
  'awaitingClockLabel',
  'awaitingClockDays',
  'awaitingClockHours',
  'awaitingClockCaption',
  'awaitingClockAria',
  'awaitingClockLapsed',
  'holdoutClockLine',
  'holdoutClockLineHours',
  'holdoutClockLineLapsed',
  'holdoutClockCaption',
  'completedStatusMeta',
  'completedHeading',
  'completedBody',
  'completedReadAction',
  'duelCompletedHeading',
  'duelCompletedBody',
  'duelCompletedPlaceholder',
  'duelAwaitingHeading',
  'duelAwaitingTaskLabel',
  'duelAwaitingWriteUpLabel',
  'duelSealedPlaceholder',
  'duelElapsedLine',
  'duelPendingLine',
  'duelPillSealed',
  'duelPillWriting',
  'duelPullBackDescription',
  'nudgeAction',
  'nudgeSentAction',
  'nudgeAria',
  'nudgeSentAria',
  'nudgeDescription',
  'duelNudgeAria',
  'nudgeFeedAction',
  'nudgeCrewAction',
  'nudgeCrewDescription',
  'nudgeCrewResult',
  'nudgeCrewResultPartial',
]

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
