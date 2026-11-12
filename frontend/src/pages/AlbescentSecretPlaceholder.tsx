/**
 * Albescent "sealed" placeholder (#394): what an outsider sees at
 * `/factions/albescent` — an in-world dead end, not a 404 (vocabulary:
 * ADR-0083).
 *
 * FLAT na SHEET, NOT THE PRISM (#2632): the prism arrives with the reveal, and
 * this is the un-revealed view. Colours are the na card's own tiers; the
 * Cormorant italic stays, as it makes this a sealed letter.
 */
import { useTranslation } from 'react-i18next'
// Cormorant ships in the lazy faction sheet (#2079); no archetype asks for it.
import '../factionFaces'

const BG = 'var(--faction-default-card-bg)'
const INK = 'var(--faction-default-card-text)'
/** The eyebrow's tier (#2523): a named token, so contrast tests can measure it. */
const MUTED = 'var(--faction-default-card-muted)'
const FONT = 'var(--font-faction-vellum)'
const MONO = 'var(--font-body)'

/** ORNAMENT ONLY (no contrast owed). Anything read takes a named tier. */
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
