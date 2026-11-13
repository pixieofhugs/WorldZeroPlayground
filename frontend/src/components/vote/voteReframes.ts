import i18n from '../../i18n'
import { hasOwnKey } from '../../utils/hasOwnKey'

interface ReframeTier {
  value: number
  label: string
}

interface VoteReframe {
  /** Omit for arabic; 'roman' for Ephemerists-style roman numeral display. */
  numeral?: 'roman'
  tiers: ReframeTier[]
}

/** Literals so `votes:<slug>.tier<N>` typechecks. */
const RUNGS = [1, 2, 3, 4, 5] as const

/**
 * Factions with a vote voice and their numerals. Words live in
 * locales/en/votes.json as `<slug>.tier1..5` (#2586); ADR-0061's carve-out.
 */
const LADDERS = {
  // Metals, lead → platinum (#1207).
  ephemerists: { numeral: 'roman' },
  everymen: {},
  // Coven is cozy-casual, WOW archaic; easy to swap (#838, ADR-0050).
  coven: {},
  wow: {},
  snide: {},
  singularity: {},
  // Also UA's app-wide vote vocabulary via reframeLabel.
  ua: {},
  // Albescent is absent on purpose (#783): its own words would reveal the
  // society to every voter on its tasks. It gets arabic numerals.
} as const satisfies Record<string, { numeral?: 'roman' }>

/**
 * Labels are GETTERS so live copy overrides and the copy editor's `t`-time
 * registry see them. `Object.keys` keeps the slug a literal so the key template
 * typechecks against the catalog.
 */
export const VOTE_REFRAMES: Record<string, VoteReframe> = Object.fromEntries(
  (Object.keys(LADDERS) as (keyof typeof LADDERS)[]).map((slug) => [
    slug,
    {
      ...LADDERS[slug],
      tiers: RUNGS.map((value) => ({
        value,
        get label() {
          return i18n.t(`votes:${slug}.tier${value}`)
        },
      })),
    },
  ]),
)

/**
 * A vote value in the faction's words, else the arabic number. Own-property only
 * (#1821): a prototype-named slug would otherwise throw.
 */
export function reframeLabel(factionSlug: string | null | undefined, value: number): string {
  if (!hasOwnKey(VOTE_REFRAMES, factionSlug)) return String(value)
  const reframe = VOTE_REFRAMES[factionSlug]
  return reframe.tiers.find((tier) => tier.value === value)?.label ?? String(value)
}
