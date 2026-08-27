/**
 * "Waiting on Pixie and Bob" — the one heading that answers *am I done?* on the
 * waiting surface, and names who is blocking (#1952).
 *
 * It replaces four statements of one situation that genuinely co-rendered:
 * `awaitingStatusMeta` ("Approved by you"), `awaitingHeading` ("You have
 * approved this proposal"), `bannerWaiting` ("Approved. Waiting on the others.")
 * and the roster's tally. The first three said what YOU had already done, in
 * three sizes, in two components; none of them said who the praxis was actually
 * held up on, which is the question the report could not answer.
 *
 * FOUR FORMS, NOT THREE. The owner ruling is "waiting on X when X is greater
 * than 3", so three outstanding still lists all three names and the count form
 * starts at four. It is written out as four keys because that is what it is —
 * the 1/2/3 forms interpolate NAMES and only the last interpolates a number, so
 * it is not an i18next `count` plural, and a `_one`/`_other` pair could not
 * express it. (`collabCopy`'s keys are runtime-dynamic strings anyway, which is
 * the same reason `holdoutClockLine` spells its days and hours out.)
 *
 * THE JOINING IS THE CATALOG'S. The comma, the "and", and the Oxford-comma
 * question are decisions about English, so they live in four written strings
 * rather than in a `join()` here. This module only chooses which one, which is
 * the part that has a boundary worth testing.
 *
 * ponytail: the ceiling is English word order. A locale that joins names
 * differently at some other arity re-cuts the ladder in the catalog, and only
 * the `switch` below moves with it.
 */
import { collabCopy } from './collabCopy'

/**
 * The heading for a crew with `names` still outstanding, in the order the
 * roster lists them.
 *
 * `null` when nobody is outstanding — unreachable from the waiting surface,
 * whose gate is `waiting` only while somebody still owes an approval, so the
 * caller falls back to its own heading rather than this printing an empty one.
 */
export function waitingOnHeading(
  factionSlug: string | null | undefined,
  names: readonly string[],
): string | null {
  const [first, second, third] = names
  switch (names.length) {
    case 0:
      return null
    case 1:
      return collabCopy(factionSlug, 'waitingOnOne', { first })
    case 2:
      return collabCopy(factionSlug, 'waitingOnTwo', { first, second })
    case 3:
      return collabCopy(factionSlug, 'waitingOnThree', { first, second, third })
    default:
      return collabCopy(factionSlug, 'waitingOnMany', { outstanding: names.length })
  }
}
