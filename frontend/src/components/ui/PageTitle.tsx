/**
 * Page title with per-letter underlines cycling the na spectrum's seven stops
 * (Style Guide §7, ADR-0066). Scalar stops, since a gradient can't be indexed.
 */

const SPECTRUM_STOPS = [
  'var(--faction-default-stop-1)',
  'var(--faction-default-stop-2)',
  'var(--faction-default-stop-3)',
  'var(--faction-default-stop-4)',
  'var(--faction-default-stop-5)',
  'var(--faction-default-stop-6)',
  'var(--faction-default-stop-7)',
]

interface Props {
  title: string
  /** Small eyebrow text above the title (e.g. era name, item count) */
  eyebrow?: string
}

export default function PageTitle({ title, eyebrow }: Props) {
  let colorIndex = 0

  return (
    <div className="mb-6">
      {eyebrow && <p className="label-heading mb-1">{eyebrow}</p>}
      <h1
        className="font-display italic font-medium leading-tight"
        style={{ fontSize: 'var(--text-display)', color: 'var(--color-text-primary)' }}
      >
        {title.split('').map((char, index) => {
          if (char === ' ') {
            // A real space, so the accessible name keeps its words (#1043).
            return <span key={index}>{' '}</span>
          }
          const color = SPECTRUM_STOPS[colorIndex % SPECTRUM_STOPS.length]
          colorIndex++
          return (
            <span
              key={index}
              style={{
                borderBottom: `4px solid ${color}`,
                // eslint-disable-next-line local/no-raw-style-values -- ornament: glyph-to-underline lead; a rung detaches the bar.
                paddingBottom: 2,
              }}
            >
              {char}
            </span>
          )
        })}
      </h1>
    </div>
  )
}
