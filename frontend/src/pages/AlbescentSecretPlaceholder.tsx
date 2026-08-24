/**
 * Albescent "sealed" placeholder (#394). What an outsider sees at
 * `/factions/albescent` — deliberately NOT a 404, an in-world dead end.
 * Styled in the Albescent "Register" idiom, which arrived with #231 and
 * ADR-0017 — now marked **Superseded by ADR-0061**, so cite ADR-0083 for
 * Albescent's vocabulary today: vellum stock, Cormorant Garamond italic,
 * quiet mono label, faint fleur-de-lis glyph.
 *
 * IT FOLLOWS THE FLIP (#2301, epic #2496 ruling 7), and it does so with no edit
 * below. This docstring used to end "Albescent surfaces never dim in dark mode —
 * the `--albescent-reveal-*` tokens carry identical values in both themes", and
 * that is no longer true: the reveal register has a dark half whose values are
 * the na card's own. Every colour on this page is a `--albescent-reveal-*`
 * token — `BG`, `INK`, `MUTED` — or an `ink()` wash mixed down from `INK`, so
 * the sheet, the rules and the glyph all invert through the cascade with
 * nothing branching on a `dark` boolean.
 *
 * ADR-0017's ruling 7 used to say Albescent's surfaces are "always-light
 * (identical values in both the light and dark cascades, exactly as
 * singularity's are always-dark)". THAT CLAUSE IS DEAD AND SO IS THE RECORD
 * CARRYING IT: the owner retired ADR-0017 outright, and it now reads
 * "**Superseded by ADR-0061**" with an ## Amendment section naming what
 * replaced each of its decisions; ADR-0083 §8 is what retires ruling 7 in
 * particular. NOTHING IS OWED HERE ANY MORE — this comment used to say the
 * amendment was the owner's to make and flag it on #2301. It has been made.
 * (Ruling 7's other half was already dead: the `--faction-albescent-card-*`
 * tokens it prescribes were deleted by #783, so Albescent has rendered as
 * unaffiliated everywhere since.) Singularity's always-dark is untouched and
 * stays — this was about the vellum, not about retiring theme-invariant
 * surfaces as a class.
 */
import { useTranslation } from 'react-i18next'
// Cormorant Garamond ships in the lazily-fetched faction sheet (#2079), and this
// page draws it without dispatching an archetype.
import '../factionFaces'

const BG = 'var(--albescent-reveal-surface)'
const INK = 'var(--albescent-reveal-text)'
/**
 * The register's quiet TEXT tier — 4.64:1 by day, 5.44:1 at night, both
 * measured on this sheet by `factionContrast.test.ts` (#2523).
 *
 * The eyebrow used to be `ink(30)`, 1.92:1 in light, and the reason nothing
 * caught that is the reason this constant exists: a per-site mix is a fourth
 * tier on a register that names three, and no value-level sweep can reach one.
 * Reading the token is what makes the line measurable, not merely lighter.
 */
const MUTED = 'var(--albescent-reveal-text-muted)'
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
