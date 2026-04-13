/**
 * Shared faction configuration — single source of truth for faction display data.
 *
 * TODO: Replace with API response from GET /factions once the backend returns
 * color fields. Until then, these must be kept in sync manually.
 */

export interface FactionConfig {
  slug: string
  name: string
  color: string
}

export const FACTIONS: Record<string, FactionConfig> = {
  ua:          { slug: 'ua',          name: 'UA',          color: '#6b6a7a' },
  analog:      { slug: 'analog',      name: 'Analog',      color: '#15803d' },
  gestalt:     { slug: 'gestalt',     name: 'Gestalt',     color: '#14532d' },
  snide:       { slug: 'snide',       name: 'S.N.I.D.E.',  color: '#8a6a20' },
  journeymen:  { slug: 'journeymen',  name: 'Journeymen',  color: '#c49a3a' },
  singularity: { slug: 'singularity', name: 'Singularity',  color: '#7c3aed' },
  ua_masters:  { slug: 'ua_masters',  name: 'UA Masters',   color: '#555555' },
  albescent:   { slug: 'albescent',   name: '/Albescent',   color: '#6b6a7a' },
  aged_out:    { slug: 'aged_out',    name: 'Aged Out',     color: '#6b6a7a' },
}

/** Get faction color by slug, with fallback */
export function factionColor(slug: string | null | undefined): string {
  return FACTIONS[slug ?? '']?.color ?? '#6b6a7a'
}

/** Get faction display name by slug, with fallback */
export function factionName(slug: string | null | undefined): string {
  return FACTIONS[slug ?? '']?.name ?? 'Unaffiliated'
}
