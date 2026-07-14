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
  wow: {
    tiers: [
      { value: 1, label: i18n.t('votes:wow.a-start') },
      { value: 2, label: i18n.t('votes:wow.solid') },
      { value: 3, label: i18n.t('votes:wow.good') },
      { value: 4, label: i18n.t('votes:wow.excellent') },
      { value: 5, label: i18n.t('votes:wow.legendary') },
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
    tiers: [
      { value: 1, label: i18n.t('votes:ua.rough-sketch') },
      { value: 2, label: i18n.t('votes:ua.study') },
      { value: 3, label: i18n.t('votes:ua.accomplished') },
      { value: 4, label: i18n.t('votes:ua.distinguished') },
      { value: 5, label: i18n.t('votes:ua.masterwork') },
    ],
  },
  // Albescent "bear witness" vocabulary (#232) — how completely a task was
  // attended, Unseeing → Inscribed. Words from docs/design/albescent-kit.
  albescent: {
    tiers: [
      { value: 1, label: i18n.t('votes:albescent.unseeing') },
      { value: 2, label: i18n.t('votes:albescent.glimpsed') },
      { value: 3, label: i18n.t('votes:albescent.witnessed') },
      { value: 4, label: i18n.t('votes:albescent.verified') },
      { value: 5, label: i18n.t('votes:albescent.inscribed') },
    ],
  },
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
