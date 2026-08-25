/**
 * Albescent "sealed" placeholder (#394). What an outsider sees at
 * `/factions/albescent` — deliberately NOT a 404, an in-world dead end. Cite
 * ADR-0083 for Albescent's vocabulary; ADR-0017's "Register" idiom, which
 * arrived with #231, is **Superseded by ADR-0061**.
 *
 * FLAT na SHEET, NOT THE PRISM, and this page is the clearest case of the rule
 * (#2632). It does not read `factionSheet()`, and the reason is not mechanical:
 * **the prism arrives with the reveal**, and this page IS the un-revealed view.
 * It is the same call epic #2496 ruling 8 makes about a redacted directory tile,
 * arriving one surface over — a stranger who has not been let in meets the plain
 * unaffiliated card, and the ground that says "Albescent" is one of the things
 * being withheld.
 *
 * ── THE VELLUM IS GONE (#2632) ──────────────────────────────────────────────
 *
 * Every colour here was a reveal token or an `ink()` wash mixed down from one —
 * the last hand-authored register in the repo, a pure-white sheet on a cream
 * page. Owner ruling: the white aesthetic is purged and Albescent commits
 * entirely to the prism vocabulary, so the stock, the ink and the quiet tier are
 * the na card's own (`--faction-default-card-bg` / `-text` / `-muted`) and flip
 * with it, still with nothing branching on a `dark` boolean.
 *
 * THE TYPEFACE IS NOT THE REGISTER. Cormorant Garamond stays, via `factionFaces`
 * — dropping a palette is not dropping a face, and the italic line is what makes
 * this a sealed letter rather than a blank card.
 *
 * ADR-0017's ruling 7 — "always-light, identical values in both cascades,
 * exactly as singularity's are always-dark" — is dead, and so is the record
 * carrying it: ADR-0083 §8 retires it, and #2632 amends §8 in turn. (Its other
 * half was already dead: the `--faction-albescent-card-*` tokens it prescribes
 * went with #783.) Singularity's always-dark is untouched.
 */
import { useTranslation } from 'react-i18next'
// Cormorant Garamond ships in the lazily-fetched faction sheet (#2079), and this
// page draws it without dispatching an archetype.
import '../factionFaces'

const BG = 'var(--faction-default-card-bg)'
const INK = 'var(--faction-default-card-text)'
/**
 * The card's quiet TEXT tier, which is where the eyebrow reads (#2523).
 *
 * It used to be `ink(30)`, 1.92:1 in light, and the reason nothing caught that
 * is the reason this constant exists: a per-site mix is a tier the register does
 * not name, and no value-level sweep can reach one. Reading the token is what
 * makes the line measurable, not merely lighter — and the token it now reads is
 * the na card's own muted tier, already measured on this exact stock in both
 * themes by `factionContrast.test.ts`.
 */
const MUTED = 'var(--faction-default-card-muted)'
const FONT = 'var(--font-faction-vellum)'
const MONO = 'var(--font-body)'

/**
 * A translucent wash of Albescent ink at the given opacity percentage.
 *
 * ORNAMENT ONLY. Its three callers are the card's hairline, the fleur-de-lis
 * and the 64px rule — marks that owe no contrast ratio and are meant to stay
 * whispers. Anything that is READ takes a named tier; see `MUTED`.
 */
const ink = (percent: number): string => `color-mix(in srgb, ${INK} ${percent}%, transparent)`

function FleurMark({ size = 56 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 40 48"
      width={size * (40 / 48)}
      height={size}
      style={{ display: 'block', color: ink(22) }}
      aria-hidden="true"
    >
      <g fill="currentColor">
        <path d="M20 1 C16 10 16 17 20 24 C24 17 24 10 20 1 Z" />
        <path d="M20 22 C14 15 8 15 6 21 C4.6 25 8 29 13.5 27.6 C10.5 25 12.5 21 20 22 Z" />
        <path d="M20 22 C26 15 32 15 34 21 C35.4 25 32 29 26.5 27.6 C29.5 25 27.5 21 20 22 Z" />
        <rect x="11" y="26" width="18" height="4.5" rx="2.2" />
        <path d="M20 30 C17.5 37 16 41 20 47 C24 41 22.5 37 20 30 Z" />
      </g>
    </svg>
  )
}

export default function AlbescentSecretPlaceholder() {
  const { t } = useTranslation('factions')
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: '70vh', fontFamily: MONO }}
    >
      <div
        className="text-center"
        style={{
          background: BG,
          border: `1px solid ${ink(12)}`,
          color: INK,
          maxWidth: 520,
          width: '100%',
          padding: 'var(--space-5xl) var(--space-4xl)',
        }}
      >
        <div className="flex justify-center" style={{ marginBottom: 'var(--space-2xl)' }}>
          <FleurMark />
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 'var(--text-md)',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: MUTED,
            marginBottom: 'var(--space-xl)',
          }}
        >
          {t('albescent.sealed.eyebrow')}
        </div>
        <p
          style={{
            fontFamily: FONT,
            fontStyle: 'italic',
            fontSize: 'var(--text-title)',
            lineHeight: 1.25,
            color: INK,
            margin: 0,
          }}
        >
          {t('albescent.sealed.line')}
        </p>
        <div style={{ height: 1, width: 64, margin: 'var(--space-2xl) auto 0', background: ink(16) }} />
      </div>
    </div>
  )
}
