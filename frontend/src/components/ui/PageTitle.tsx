/**
 * Page title with per-letter colored underline bars (Style Guide §5.2).
 *
 * Each letter gets a border-bottom cycling through the faction-inspired palette.
 * Spaces render as gaps with no underline.
 */

const UNDERLINE_COLORS = ['var(--underline-1)', 'var(--underline-2)', 'var(--underline-3)', 'var(--underline-4)', 'var(--underline-5)', 'var(--underline-6)']

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
          const color = UNDERLINE_COLORS[colorIndex % UNDERLINE_COLORS.length]
          colorIndex++
          return (
            <span
              key={index}
              style={{
                borderBottom: `4px solid ${color}`,
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
