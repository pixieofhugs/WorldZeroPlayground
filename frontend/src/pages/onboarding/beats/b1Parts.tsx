import { K, S } from '../Wisp'

export function Flower({ stop }: { stop: number }) {
  const c = S(stop)
  return (
    <svg viewBox="0 0 16 28" width="16" height="28" className="sv">
      <path
        d="M8 28 V12 M8 20 q-5 -1 -6 -5 M8 22 q5 -1 6 -4"
        fill="none"
        stroke={`color-mix(in srgb, ${S(4)} 70%, ${K})`}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {[[8, 4], [3.5, 8], [12.5, 8], [5, 13], [11, 13]].map(([cx, cy]) => (
        <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="3.6" fill={c} />
      ))}
      <circle cx="8" cy="9" r="3" fill={S(3)} stroke={K} strokeWidth="1" />
    </svg>
  )
}

export function Butterfly({ stop, width = 24, height = 18 }: { stop: number; width?: number; height?: number }) {
  return (
    <svg viewBox="0 0 24 18" width={width} height={height} className="sv">
      <g className="wing">
        <path
          d="M12 9 C 6 0, 0 2, 2 8 C 0 14, 6 16, 12 9 Z M12 9 C 18 0, 24 2, 22 8 C 24 14, 18 16, 12 9 Z"
          fill={S(stop)}
          stroke={K}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </g>
      <path d="M12 4 V14" stroke={K} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
