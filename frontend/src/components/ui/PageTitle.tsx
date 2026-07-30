/**
 * Page title with per-letter colored underline bars (Style Guide §7).
 *
 * Each letter gets a border-bottom cycling through the site's one rainbow —
 * the na spectrum's seven scalar stops (#1220, ADR-0066). It cycled a separate
 * six-hue brand palette (`underline-1…6`) until that palette was retired into
 * the spectrum; the cycle is SEVEN long now, and it flips with the theme, which
 * the brand palette never did. Spaces render as gaps with no underline.
 *
 * Scalars rather than `--faction-default-rainbow`: a per-letter bar needs stop
 * N by index, and a gradient token cannot be indexed.
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
      {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
      <h1
        className="font-display italic font-medium leading-tight"
        style={{ fontSize: 'var(--text-display)', color: 'var(--color-text-primary)' }}
      >
        {title.split('').map((char, index) => {
          if (char === ' ') {
            return (
              <span key={index} style={{ display: 'inline-block', width: '0.3em' }} />
            )
          }
          const color = SPECTRUM_STOPS[colorIndex % SPECTRUM_STOPS.length]
          colorIndex++
          return (
            <span
              key={index}
              style={{
                borderBottom: `4px solid ${color}`,
                // eslint-disable-next-line local/no-raw-style-values -- ornament: lead between the glyph and its drawn 4px underline bar; a rung pushes the bar off the letter.
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
