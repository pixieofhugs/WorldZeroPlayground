/**
 * Albescent "sealed" placeholder (#394). What an outsider sees at
 * `/factions/albescent` — deliberately NOT a 404, an in-world dead end.
 * Styled in the Albescent "Register" idiom (ADR-0017 / #231): always-light
 * vellum, near-black ink, Cormorant Garamond italic, quiet mono label, faint
 * fleur-de-lis glyph. Albescent surfaces never dim in dark mode — the
 * `--faction-albescent-*` tokens carry identical values in both themes.
 */
import { useTranslation } from 'react-i18next'

const BG = 'var(--faction-albescent-card-bg)'
const INK = 'var(--faction-albescent-card-text)'
const FONT = 'var(--faction-albescent-card-font)'
const MONO = 'var(--font-body)'

/** A translucent wash of Albescent ink at the given opacity percentage. */
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
          padding: '64px 48px',
        }}
      >
        <div className="flex justify-center" style={{ marginBottom: 28 }}>
          <FleurMark />
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 8,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: ink(30),
            marginBottom: 20,
          }}
        >
          {t('albescent.sealed.eyebrow')}
        </div>
        <p
          style={{
            fontFamily: FONT,
            fontStyle: 'italic',
            fontSize: 30,
            lineHeight: 1.25,
            color: INK,
            margin: 0,
          }}
        >
          {t('albescent.sealed.line')}
        </p>
        <div style={{ height: 1, width: 64, margin: '28px auto 0', background: ink(16) }} />
      </div>
    </div>
  )
}
