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

/** Per-faction tier vocabulary (structure + words only; visual tokens stay in each archetype). */
export const VOTE_REFRAMES: Record<string, VoteReframe> = {
  ephemerists: {
    numeral: 'roman',
    tiers: [
      { value: 1, label: 'apocryphal' },
      { value: 2, label: 'disputed' },
      { value: 3, label: 'plausible' },
      { value: 4, label: 'corroborated' },
      { value: 5, label: 'canonical' },
    ],
  },
  everymen: {
    tiers: [
      { value: 1, label: 'a start' },
      { value: 2, label: 'solid' },
      { value: 3, label: 'good' },
      { value: 4, label: 'excellent' },
      { value: 5, label: 'legendary' },
    ],
  },
  wow: {
    tiers: [
      { value: 1, label: 'a start' },
      { value: 2, label: 'solid' },
      { value: 3, label: 'good' },
      { value: 4, label: 'excellent' },
      { value: 5, label: 'legendary' },
    ],
  },
  snide: {
    tiers: [
      { value: 1, label: 'meh' },
      { value: 2, label: 'not bad' },
      { value: 3, label: 'rad' },
      { value: 4, label: 'sick' },
      { value: 5, label: 'ANARCHY' },
    ],
  },
  singularity: {
    tiers: [
      { value: 1, label: 'NOISE' },
      { value: 2, label: 'WEAK' },
      { value: 3, label: 'SIGNAL' },
      { value: 4, label: 'CLEAR' },
      { value: 5, label: 'VERIFIED' },
    ],
  },
  ua: {
    tiers: [
      { value: 1, label: 'Noted' },
      { value: 2, label: 'Sketch' },
      { value: 3, label: 'Hung' },
      { value: 4, label: 'Commended' },
      { value: 5, label: 'Acquired' },
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
