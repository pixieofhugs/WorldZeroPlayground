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

/** The five rungs, as literal values so `votes:<slug>.tier<N>` typechecks. */
const RUNGS = [1, 2, 3, 4, 5] as const

/**
 * The factions with a vote voice, and how each one numbers its discs. The WORDS
 * are not here: they live in the copy catalog at locales/en/votes.json, under
 * `<slug>.tier1` … `<slug>.tier5` in ladder order (#2586), and the visual tokens
 * stay in each archetype. Faction vote vocabulary is ADR-0061's sanctioned
 * carve-out from the one-voice rule, and #1864 kept the star ladder inside it.
 *
 * The per-faction notes below are the ladders' history — read them before
 * moving a slug in or out of this list.
 */
const LADDERS = {
  // The metals ladder (#1207): the vote is a transmutation, lead → platinum,
  // and the discs carry I–V. The archive vocabulary this replaces
  // (apocryphal → canonical) is gone from the catalog rather than left behind
  // as keys holding words they no longer say.
  ephemerists: { numeral: 'roman' },
  everymen: {},
  // The two ladders below were inverted between these slugs by #821 and are put
  // back by #838. Coven is the cozy-casual voice (moon phases, "how'd this
  // land?"); WOW is the archaic one (balloon verdict, "Cast thy Verdict").
  // ADR-0050 — go by metaphor, not label.
  coven: {},
  wow: {},
  snide: {},
  singularity: {},
  // The growing-mandala vote widget (#821): each rank is a "reading" of the
  // filed work as the mandala blooms fuller/warmer — faint → radiant. These
  // words are the mandala's per-rank captions AND UA's app-wide vote
  // vocabulary (anything labelling a value reads them via reframeLabel).
  ua: {},
  // Albescent has no vote voice (#783). It had the "bear witness" vocabulary
  // (#232), Unseeing → Inscribed — and that was the loudest tell left: a task
  // filed under Albescent labelled its vote tiers in the society's own words
  // for every voter, revealed or not. It now falls through to the plain arabic
  // numerals that `na` and unknown slugs get, which is why it is absent here
  // rather than present and empty.
} as const satisfies Record<string, { numeral?: 'roman' }>

/**
 * Per-faction tier vocabulary (structure only). Labels are resolved through
 * i18n at module load — the catalog is bundled and initialized synchronously,
 * and the app is single-locale (ADR-0032).
 *
 * `Object.keys` is re-typed rather than `Object.entries`-destructured because
 * the slug has to stay a literal for `votes:<slug>.tier<N>` to be a real key:
 * that template is typechecked against the catalog, so a slug with no ladder
 * fails the build here instead of throwing at first render.
 */
export const VOTE_REFRAMES: Record<string, VoteReframe> = Object.fromEntries(
  (Object.keys(LADDERS) as (keyof typeof LADDERS)[]).map((slug) => [
    slug,
    {
      ...LADDERS[slug],
      tiers: RUNGS.map((value) => ({ value, label: i18n.t(`votes:${slug}.tier${value}`) })),
    },
  ]),
)

/**
 * Label a vote value in a task faction's vocabulary. Falls back to the arabic
 * number when no reframe exists (factionless / unknown slug).
 *
 * Own-property-only, like every other faction lookup (#1821): a bracket read
 * reaches `Object.prototype`, and the `Object` function is truthy, so `?.` let
 * it through and `reframe.tiers.find` threw a TypeError on any vote rendered
 * for a slug named after a prototype member.
 */
export function reframeLabel(factionSlug: string | null | undefined, value: number): string {
  if (!hasOwnKey(VOTE_REFRAMES, factionSlug)) return String(value)
  const reframe = VOTE_REFRAMES[factionSlug]
  return reframe.tiers.find((tier) => tier.value === value)?.label ?? String(value)
}
