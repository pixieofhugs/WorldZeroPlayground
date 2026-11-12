import { createContext, useContext, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { hasOwnKey } from '../../utils/hasOwnKey'
// The signed-out gate paints faction faces on routes whose archetype hasn't
// loaded yet, so it pulls the faction face sheet itself (#2079).
import '../../factionFaces'

/** Shared vote chrome: the logged-out gate and the save-error line (ADR-0032). */

/**
 * The task faction, published by {@link VoteUI} so the gate (returned from
 * each widget's own `if (!user)`) can take its voice without a slug prop (#855).
 */
export const VoteFactionContext = createContext<string | null | undefined>(undefined)

/** A faction's gate-line voice: colour, face and casing only, never chrome. */
interface GateTreatment {
  /** A `--font-*` token. */
  fontFamily: string
  /** Label tier `--text-*`. */
  fontSize: string
  letterSpacing?: string
  textTransform?: CSSProperties['textTransform']
  fontWeight?: CSSProperties['fontWeight']
  color?: string
  /** Gradient-clipped ink; wins over `color`. */
  gradient?: string
  textShadow?: string
  /** Ornament glyph (Singularity's caret), deliberately not catalog copy. */
  prefix?: string
}

/** Spectrum gate: `na`, `albescent` and any slug without a treatment (ADR-0039). */
const DEFAULT_GATE: GateTreatment = {
  fontFamily: 'var(--faction-default-card-font)',
  fontSize: 'var(--text-xl)',
  letterSpacing: '0.1em',
  gradient: 'var(--faction-default-rainbow)',
}

/**
 * From the design's `LOGGED OUT · VOTE GATE` board, which labels WOW and Coven
 * backwards (ADR-0050).
 */
const GATE_TREATMENTS: Record<string, GateTreatment> = {
  ua: {
    fontFamily: 'var(--faction-ua-body-font)',
    fontSize: 'var(--text-lg)',
    letterSpacing: '0.16em',
    color: 'var(--faction-ua-card-accent)',
  },
  snide: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-lg)',
    fontWeight: 700,
    letterSpacing: '0.16em',
    color: 'var(--faction-snide-card-accent)',
  },
  singularity: {
    fontFamily: 'var(--faction-singularity-card-font)',
    fontSize: 'var(--text-lg)',
    letterSpacing: '0.06em',
    textTransform: 'lowercase',
    color: 'var(--faction-singularity-card-accent)',
    textShadow: '0 0 8px color-mix(in srgb, var(--faction-singularity-card-accent) 50%, transparent)',
    prefix: '> ',
  },
  everymen: {
    fontFamily: 'var(--faction-everymen-card-font)',
    fontSize: 'var(--text-xl)',
    letterSpacing: '0.14em',
    color: 'var(--faction-everymen-card-accent)',
  },
  ephemerists: {
    fontFamily: 'var(--faction-ephemerists-card-font)',
    fontSize: 'var(--text-lg)',
    letterSpacing: '0.1em',
    color: 'var(--faction-ephemerists-card-accent)',
  },
  wow: {
    fontFamily: 'var(--faction-wow-card-font)',
    fontSize: 'var(--text-xl)',
    textTransform: 'none',
    color: 'var(--faction-wow-card-accent)',
  },
  coven: {
    fontFamily: 'var(--faction-coven-card-font)',
    fontSize: 'var(--text-xl)',
    textTransform: 'none',
    color: 'var(--faction-coven-card-accent)',
  },
}

/** Own-property lookup (#1821), so `constructor` isn't taken for a treatment. */
export function gateTreatment(slug: string | null | undefined): GateTreatment {
  return hasOwnKey(GATE_TREATMENTS, slug) ? GATE_TREATMENTS[slug] : DEFAULT_GATE
}

/**
 * One gate line in place of the vote control (#855); casing differs by
 * `text-transform`, never by string. With `levelRequired` it is the same gate
 * for a character below the vote level (#3102), the level from `/auth/me`.
 */
export function VoteLoginGate({
  factionSlug,
  levelRequired,
}: { factionSlug?: string | null; levelRequired?: number } = {}) {
  const { t } = useTranslation('votes')
  const contextSlug = useContext(VoteFactionContext)
  const treatment = gateTreatment(factionSlug ?? contextSlug)

  return (
    <p
      className="label-heading"
      style={{
        margin: 0,
        fontFamily: treatment.fontFamily,
        fontSize: treatment.fontSize,
        fontWeight: treatment.fontWeight,
        letterSpacing: treatment.letterSpacing,
        textTransform: treatment.textTransform,
        textShadow: treatment.textShadow,
        ...(treatment.gradient
          ? {
              background: treatment.gradient,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }
          : { color: treatment.color }),
      }}
    >
      {treatment.prefix}
      {levelRequired === undefined
        ? t('chrome.loginGate')
        : t('chrome.levelGate', { level: levelRequired })}
    </p>
  )
}

/**
 * The save-error line, the only text under the stars (#2166). Error state is
 * per-widget from {@link useVote}, so it can't hoist to `VoteUI`; only the ink
 * varies. Always the widget's last child, hence no bottom margin.
 */
export function VoteError({ error, color }: { error: string; color: string }) {
  if (!error) return null

  return (
    <p
      className="font-body"
      style={{
        fontSize: 'var(--text-content)',
        color,
        margin: 'var(--space-md) 0 0',
      }}
    >
      {error}
    </p>
  )
}
