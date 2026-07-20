import i18n from '../../i18n'
import { FACTION_ALIASES } from '../../utils/factions'

export interface ReframeTier {
  value: number
  label: string
}

export interface VoteReframe {
  /** Omit for arabic; 'roman' for Ephemerists-style roman numeral display. */
  numeral?: 'roman'
  tiers: ReframeTier[]
}

/**
 * Per-faction tier vocabulary (structure only; the words live in the copy
 * catalog at locales/en/votes.json and visual tokens stay in each archetype).
 * Labels are resolved through i18n at module load — the catalog is bundled and
 * initialized synchronously, and the app is single-locale (ADR-0032).
 */
export const VOTE_REFRAMES: Record<string, VoteReframe> = {
  ephemerists: {
    numeral: 'roman',
    tiers: [
      { value: 1, label: i18n.t('votes:ephemerists.apocryphal') },
      { value: 2, label: i18n.t('votes:ephemerists.disputed') },
      { value: 3, label: i18n.t('votes:ephemerists.plausible') },
      { value: 4, label: i18n.t('votes:ephemerists.corroborated') },
      { value: 5, label: i18n.t('votes:ephemerists.canonical') },
    ],
  },
  everymen: {
    tiers: [
      { value: 1, label: i18n.t('votes:everymen.a-start') },
      { value: 2, label: i18n.t('votes:everymen.solid') },
      { value: 3, label: i18n.t('votes:everymen.good') },
      { value: 4, label: i18n.t('votes:everymen.excellent') },
      { value: 5, label: i18n.t('votes:everymen.legendary') },
    ],
  },
  coven: {
    tiers: [
      { value: 1, label: i18n.t('votes:coven.a-start') },
      { value: 2, label: i18n.t('votes:coven.solid') },
      { value: 3, label: i18n.t('votes:coven.good') },
      { value: 4, label: i18n.t('votes:coven.excellent') },
      { value: 5, label: i18n.t('votes:coven.legendary') },
    ],
  },
  wow: {
    tiers: [
      { value: 1, label: i18n.t('votes:wow.sweet') },
      { value: 2, label: i18n.t('votes:wow.lovely') },
      { value: 3, label: i18n.t('votes:wow.wonderful') },
      { value: 4, label: i18n.t('votes:wow.magical') },
      { value: 5, label: i18n.t('votes:wow.iconic') },
    ],
  },
  snide: {
    tiers: [
      { value: 1, label: i18n.t('votes:snide.meh') },
      { value: 2, label: i18n.t('votes:snide.not-bad') },
      { value: 3, label: i18n.t('votes:snide.rad') },
      { value: 4, label: i18n.t('votes:snide.sick') },
      { value: 5, label: i18n.t('votes:snide.anarchy') },
    ],
  },
  singularity: {
    tiers: [
      { value: 1, label: i18n.t('votes:singularity.noise') },
      { value: 2, label: i18n.t('votes:singularity.weak') },
      { value: 3, label: i18n.t('votes:singularity.signal') },
      { value: 4, label: i18n.t('votes:singularity.clear') },
      { value: 5, label: i18n.t('votes:singularity.verified') },
    ],
  },
  ua: {
    // The growing-mandala vote widget (#821): each rank is a "reading" of the
    // filed work as the mandala blooms fuller/warmer — faint → radiant. These
    // words are the mandala's per-rank captions AND UA's app-wide vote
    // vocabulary (the voter-breakdown resolver reads them via reframeLabel).
    tiers: [
      { value: 1, label: i18n.t('votes:ua.faint') },
      { value: 2, label: i18n.t('votes:ua.forming') },
      { value: 3, label: i18n.t('votes:ua.true') },
      { value: 4, label: i18n.t('votes:ua.alive') },
      { value: 5, label: i18n.t('votes:ua.radiant') },
    ],
  },
  // Albescent has no vote voice (#783). It had the "bear witness" vocabulary
  // (#232), Unseeing → Inscribed — and that was the loudest tell left: a task
  // filed under Albescent labelled its vote tiers in the society's own words
  // for every voter, revealed or not. It now falls through to the plain arabic
  // numerals that `na` and unknown slugs get.
}

/**
 * Label a vote value in a task faction's vocabulary (alias-aware, mirroring
 * pickVariant). Falls back to the arabic number when no reframe exists
 * (factionless / unknown slug).
 */
export function reframeLabel(factionSlug: string | null | undefined, value: number): string {
  const reframe =
    VOTE_REFRAMES[factionSlug ?? ''] ??
    VOTE_REFRAMES[FACTION_ALIASES[factionSlug ?? ''] ?? '']
  return reframe?.tiers.find((tier) => tier.value === value)?.label ?? String(value)
}
