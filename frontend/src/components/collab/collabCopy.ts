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
  | 'you'
  | 'progressAria'
  | 'bannerWaiting'
  | 'bannerHoldout'
  | 'bannerPublished'
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
 */
export const SHARED_DEFAULT_COLLAB_KEYS: readonly CollabCopyKey[] = [
  'leaveDescription',
  'deleteAction',
  'deleteDescription',
  'deleteConfirm',
  'duelPullBackAction',
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
