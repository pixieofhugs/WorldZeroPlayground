import i18n from '../i18n'
import { hasOwnKey } from './hasOwnKey'

/**
 * Per-faction timestamp dialect (ADR-0018). The comment timestamp slot is the
 * same content (when it was posted) presented in each faction's voice — ADR-0002
 * applied to the timestamp. A shared delta is computed once; each faction maps it
 * to its own string.
 *
 * The WORDS are not here (#2666). They live in the copy catalog at
 * locales/en/praxis.json under `comments.time.<slug>`, with `comments.time.default`
 * as the plain form, and i18next owns the plurals and the ordinals. What stays in
 * this module is the SHAPE of each dialect — which unit bucket a delta reads as,
 * whether the figure is zero-padded, whether the count is 1-based — because none
 * of that is a sentence a translator can write.
 *
 * The dialect is still SELECTED in code, not looked up by slug in the catalog,
 * and that is deliberate: see DIALECTS below for why #783 requires it.
 */

export interface TimeDelta {
  minutes: number
  hours: number
  days: number
}

export function timeDelta(iso: string, now: number = Date.now()): TimeDelta {
  const ms = Math.max(0, now - new Date(iso).getTime())
  const minutes = Math.floor(ms / 60_000)
  return { minutes, hours: Math.floor(minutes / 60), days: Math.floor(minutes / 1440) }
}

/**
 * The coarsest unit a delta has at least one of. Structure, not copy: every
 * bucketed dialect reads the same delta the same way and only the words differ.
 */
type Bucket = 'days' | 'hours' | 'minutes'

function bucket(d: TimeDelta): Bucket | null {
  if (d.days >= 1) return 'days'
  if (d.hours >= 1) return 'hours'
  if (d.minutes >= 1) return 'minutes'
  return null
}

/**
 * The catalog keys each bucketed dialect reads, spelled out as literals so they
 * are greppable exactly as they appear in praxis.json and typechecked against it
 * (#2666). A `t(\`...${slug}...\`)` here would be invisible to the copy sweep,
 * which is half of what this change is about.
 *
 * `days` / `hours` / `minutes` are i18next plural bases: the catalog holds
 * `days_one` and `days_other` and i18next picks the suffix from `count`, the same
 * mechanism `comments.heading` already uses.
 */
const BUCKET_KEYS = {
  default: {
    days: 'praxis:comments.time.default.days',
    hours: 'praxis:comments.time.default.hours',
    minutes: 'praxis:comments.time.default.minutes',
    now: 'praxis:comments.time.default.now',
  },
  coven: {
    days: 'praxis:comments.time.coven.days',
    hours: 'praxis:comments.time.coven.hours',
    minutes: 'praxis:comments.time.coven.minutes',
    now: 'praxis:comments.time.coven.now',
  },
  // Singularity renders like Coven today but is a different voice reaching the
  // same shape — a bare terminal clock with no "ago" (which is also what keeps
  // "now ago" off the screen at t<1m). Its own branch is what lets a copy editor
  // move one without moving the other.
  singularity: {
    days: 'praxis:comments.time.singularity.days',
    hours: 'praxis:comments.time.singularity.hours',
    minutes: 'praxis:comments.time.singularity.minutes',
    now: 'praxis:comments.time.singularity.now',
  },
} as const

type BucketKeys = (typeof BUCKET_KEYS)[keyof typeof BUCKET_KEYS]

function bucketed(d: TimeDelta, keys: BucketKeys): string {
  const b = bucket(d)
  return b === null ? i18n.t(keys.now) : i18n.t(keys[b], { count: d[b] })
}

/**
 * The factions with a timestamp dialect of their own, and how each shapes the
 * delta before the catalog words it. Absence from this table is the plain form.
 *
 * Selection stays in code rather than becoming a catalog lookup keyed by slug,
 * for the same reason `voteReframes.ts` keeps its ladder list in code:
 *
 * - **Albescent must be unreachable, not merely unfilled (#783).** It had "Vigil
 *   the Third", keyed on the comment AUTHOR's faction — so a member revealed
 *   themselves simply by commenting, anywhere, to anyone. Under a catalog lookup
 *   the leak is one JSON edit away and no code review sees it; under this table
 *   adding a dialect is a code change, and `commentTime.test.ts` fails first.
 * - **A dialect is not only words.** "Always hours, zero-padded to three",
 *   "1-based shifts", "at least day one" are arithmetic. A slug→branch lookup
 *   could not express them, so the branch would have to exist here anyway.
 *
 * `na`, `ua`, `wow`, `albescent` and any unknown slug all read
 * `comments.time.default`. `na` is a real population, not an error case.
 */
const DIALECTS: Record<string, (d: TimeDelta) => string> = {
  coven: (d) => bucketed(d, BUCKET_KEYS.coven),
  singularity: (d) => bucketed(d, BUCKET_KEYS.singularity),
  // ponytail: the zero-padding is composed here rather than in the catalog
  // because JSON cannot say "three digits". Ceiling — a locale can reword around
  // the figure but not change its width; upgrade path is `Intl.NumberFormat`
  // with `minimumIntegerDigits: 3` if one ever needs to.
  snide: (d) =>
    i18n.t('praxis:comments.time.snide.hours', { hours: String(d.hours).padStart(3, '0') }),
  ephemerists: (d) =>
    i18n.t('praxis:comments.time.ephemerists.day', {
      count: Math.max(1, d.days),
      ordinal: true,
    }),
  everymen: (d) => i18n.t('praxis:comments.time.everymen.shift', { count: d.days + 1 }),
}

/**
 * Format a comment timestamp in a faction's dialect. The slug is the comment
 * author's member faction; unknown slugs fall back to the plain relative form.
 *
 * Own-property-only (#1821): a bare bracket read reaches `Object.prototype`, so a
 * slug named after a prototype member would hand back a function and be called.
 */
export function formatCommentTime(
  slug: string | null | undefined,
  iso: string,
  now: number = Date.now(),
): string {
  const d = timeDelta(iso, now)
  return hasOwnKey(DIALECTS, slug) ? DIALECTS[slug](d) : bucketed(d, BUCKET_KEYS.default)
}
