import { useId, type ReactNode } from 'react'

/**
 * The tab bar's four drawn glyphs (#3761): outline when idle, solid when active.
 * Inked with the wordmark's four-stop cut; each instance owns its gradient id.
 */
const BG = 'var(--color-bg-page)'
const STOPS: readonly [string, string][] = [
  ['0%', 'var(--faction-default-stop-1)'],
  ['40%', 'var(--faction-default-stop-3)'],
  ['60%', 'var(--faction-default-stop-4)'],
  ['100%', 'var(--faction-default-stop-6)'],
]

const TICKET = 'M2.5 7h19v3.4a2.1 2.1 0 0 0 0 4.2V18h-19v-3.4a2.1 2.1 0 0 0 0-4.2Z'
const STAR = 'M9.2 9.6l.95 1.95 2.15.3-1.55 1.5.37 2.13-1.92-1-1.92 1 .37-2.13-1.55-1.5 2.15-.3z'
const HEADS = [
  'M1.8 20.5C1.8 15.6 3.4 12.6 6.3 12.6S10.8 15.6 10.8 20.5Z',
  'M13.2 20.5C13.2 15.6 14.8 12.6 17.7 12.6S22.2 15.6 22.2 20.5Z',
  'M7.4 20.5C7.4 13.2 9.4 8.4 12 8.4S16.6 13.2 16.6 20.5Z',
]

export type GlyphName = 'home' | 'tasks' | 'praxis' | 'community'

function body(name: GlyphName, solid: boolean, ink: string): ReactNode {
  switch (name) {
    case 'home':
      return (
        <>
          <path d="M3 7.2Q8 5.2 12 8v12.6Q8 18.4 3 20Z" fill={solid ? ink : 'none'} />
          <path d="M21 7.2Q16 5.2 12 8v12.6Q16 18.4 21 20Z" fill={solid ? ink : 'none'} />
          <path
            d="M5.6 11h3.6M5.6 14h2.6M14.8 11h3.6M14.8 14h3"
            stroke={solid ? BG : ink}
            strokeWidth={solid ? 1.5 : 1.3}
          />
        </>
      )
    case 'tasks':
      return (
        <>
          <path d={TICKET} fill={solid ? ink : 'none'} />
          <path d="M16.4 8v9" stroke={solid ? BG : ink} strokeWidth="1.3" strokeDasharray="1.3 1.9" />
          <path d={STAR} stroke={solid ? BG : ink} fill={solid ? BG : 'none'} strokeWidth="1.2" />
        </>
      )
    case 'praxis':
      return (
        <g transform="rotate(-7 12 12)">
          <rect x="4.6" y="3" width="14.8" height="18" rx="1.4" fill={solid ? ink : 'none'} />
          <rect x="6.6" y="5" width="10.8" height="9.6" rx=".6" strokeWidth="1.3" fill={solid ? BG : 'none'} />
          <path d="M7 13.4l3.1-3.1 2.3 2.3 1.6-1.6 3.1 3.1" strokeWidth={solid ? 1.4 : 1.3} />
        </g>
      )
    case 'community':
      return (
        <>
          <path d={HEADS[0]} fill={solid ? ink : 'none'} />
          <path d={HEADS[1]} fill={solid ? ink : 'none'} />
          <path
            d={HEADS[2]}
            fill={solid ? ink : BG}
            stroke={solid ? BG : ink}
            strokeWidth={solid ? 1.6 : undefined}
          />
        </>
      )
  }
}

export default function TabGlyph({ name, solid }: { name: GlyphName; solid: boolean }) {
  const id = `tabglyph-${useId().replace(/:/g, '')}`
  const ink = `url(#${id})`
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke={ink}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: solid ? 1 : 0.72 }}
    >
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="3" y1="3" x2="21" y2="21">
          {STOPS.map(([offset, color]) => (
            <stop key={offset} offset={offset} style={{ stopColor: color }} />
          ))}
        </linearGradient>
      </defs>
      {body(name, solid, ink)}
    </svg>
  )
}
