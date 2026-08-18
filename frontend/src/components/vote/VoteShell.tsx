import { createContext, useContext, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { hasOwnKey } from '../../utils/hasOwnKey'
// GATE_TREATMENTS below sets six faction display faces from the lazily-fetched
// faction sheet (#2079). This chunk is a static dependency of nearly every
// content route, and the gate is what a SIGNED-OUT viewer sees in place of the
// vote control — so it can paint a faction's voice on a page whose faction
// archetype has not been asked for yet.
import '../../factionFaces'

/**
 * Shared chrome for per-faction vote UIs. The 1-5 control itself is faction-
 * specific (ink stamps, hearts, …), but the logged-out gate and the save-error
 * line are identical in structure — only their theme colors differ. These two
 * helpers keep that chrome in one place. Copy lives in the votes:chrome catalog
 * branch (ADR-0032).
 */

/**
 * The task faction whose vote widget is being rendered, published by
 * {@link VoteUI} so shared chrome can speak in that faction's voice without
 * every widget threading a slug prop (#855).
 *
 * A context rather than a prop on purpose: the gate is returned by each
 * faction widget's own `if (!user)` early return — which is where the design
 * puts the swap, BENEATH the card's prompt heading and nothing else — and
 * those nine call sites are owned by nine parallel faction slices. Reading the
 * slug from above leaves them untouched.
 */
export const VoteFactionContext = createContext<string | null | undefined>(undefined)

/**
 * One faction's eyebrow voice for the gate line. Colour, face and casing only:
 * the gate is a single line of text, so a treatment can never grow chrome of
 * its own (design v2: "no stamps, no disabled buttons").
 */
interface GateTreatment {
  /** Faction display/body face — always a `--font-*` token. */
  fontFamily: string
  /** Off the `--text-*` label ramp; the gate is label tier, not content tier. */
  fontSize: string
  letterSpacing?: string
  /** Overrides `.label-heading`'s uppercase where the faction speaks in its own case. */
  textTransform?: CSSProperties['textTransform']
  fontWeight?: CSSProperties['fontWeight']
  /** Solid ink. Mutually exclusive with `gradient`. */
  color?: string
  /** Gradient-clipped ink (the unaffiliated spectrum). Wins over `color`. */
  gradient?: string
  textShadow?: string
  /**
   * An ornament glyph prefixed to the line — Singularity's terminal caret.
   * Deliberately NOT catalog copy: it is part of that faction's eyebrow
   * treatment (a prompt marker), the same way its scanline is, and the gate is
   * a single translatable string shared by all nine factions.
   */
  prefix?: string
}

/**
 * The unaffiliated spectrum gate, and the fall-through for every slug without
 * a treatment of its own — `na`, `albescent` (which the design says inherits
 * the unaffiliated eyebrow) and any faction added later (ADR-0039).
 */
const DEFAULT_GATE: GateTreatment = {
  fontFamily: 'var(--faction-default-card-font)',
  fontSize: 'var(--text-xl)',
  letterSpacing: '0.1em',
  gradient: 'var(--faction-default-rainbow)',
}

/**
 * Per-faction gate voices, from the vendored design's `LOGGED OUT · VOTE GATE`
 * board. The board draws seven tiles; the `wow` entry is the one labelled
 * "Cozy Coven" there (MedievalSharp, plum) — every artifact in this epic labels
 * WOW and Coven backwards, see ADR-0050. `coven` therefore keeps its own pink
 * marker voice.
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
    // The terminal never shouts; the caret does the talking.
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
    // The chronicle sets its verdicts in sentence case, not small caps.
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

/**
 * Resolve a slug to its gate voice; unknown/absent slugs get the spectrum.
 *
 * Own-property-only (#1821): `||` only catches falsy, and `Object.prototype`
 * members are functions, so a slug named `constructor` was spread onto the gate
 * as if it were a treatment.
 */
export function gateTreatment(slug: string | null | undefined): GateTreatment {
  return hasOwnKey(GATE_TREATMENTS, slug) ? GATE_TREATMENTS[slug] : DEFAULT_GATE
}

/**
 * Logged-out gate shown in place of the vote control (#855).
 *
 * ONE line, in the faction's eyebrow voice: no stamp chrome, no disabled 1-5
 * control, no second sentence. The card around it is untouched — a signed-out
 * viewer keeps the headline, the media and the read-only score stamp, because
 * neither `ScoreStamp` nor any other card slot consults the viewer; only the
 * widget below the prompt heading swaps.
 *
 * The copy is one catalog key for all nine factions. The casing differences the
 * design draws (LOG IN TO VOTE vs Log in to vote) are `text-transform` on the
 * treatment, never nine strings.
 */
export function VoteLoginGate({ factionSlug }: { factionSlug?: string | null } = {}) {
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
      {t('chrome.loginGate')}
    </p>
  )
}

/**
 * The save-error line — the last thing any vote widget can print.
 *
 * WHAT THIS REPLACES, AND WHY IT IS STILL A COMPONENT (#2166). It used to be
 * `VoteSummary`, which drew two paragraphs: "Voted {{stars}} pts"
 * (`chrome.voted`) and the aggregate tally "12 votes · 44 pts"
 * (`chrome.tally`). The owner's ruling took both — nothing is printed under the
 * stars now, not the viewer's own cast and not the aggregate — which left a
 * component called "Summary" summarising nothing, so the name went too.
 *
 * The error itself does NOT have a home further up. It is per-widget state out
 * of {@link useVote}, and `VoteUI` above it never sees it, so there is no shell
 * element to hoist it onto; the alternative to one shared helper is the same
 * paragraph copy-pasted into nine skins. Face, size and spacing therefore stay
 * here and only the ink is a prop — six skins want `--color-danger`, three
 * speak in their own (Everymen's red, UA's accent, Ephemerists' ochre).
 *
 * Renders NOTHING when there is no error, and it is the widget's last child on
 * every skin — hence `margin: <top> 0 0`. A bottom margin here would leave a
 * gap hanging off the foot of a widget that usually prints nothing at all.
 */
export function VoteError({ error, color }: { error: string; color: string }) {
  if (!error) return null

  return (
    <p
      className="font-body"
      style={{
        fontSize: 'var(--text-content)',
        color,
        // The gap the struck tally used to hold open, so the line still clears
        // the control rather than crowding it.
        margin: 'var(--space-md) 0 0',
      }}
    >
      {error}
    </p>
  )
}
