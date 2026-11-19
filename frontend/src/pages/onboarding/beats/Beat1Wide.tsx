import type { CSSProperties, ReactNode } from 'react'
import FactionBuddy from '../FactionBuddy'
import { K, S, T } from '../Wisp'
import { B1_WIDE as W } from '../motion/b1wide.generated'
import { Butterfly, Flower } from './b1Parts'
import './Beat1Wide.css'

const ink = { stroke: K, strokeLinejoin: 'round', strokeLinecap: 'round' } as const

type Spot = { x: number; y: number; d: number }

function Put({ at, children, style }: { at: Spot; children: ReactNode; style?: CSSProperties }) {
  return (
    <span className="wd" style={{ left: `${at.x}%`, bottom: `calc(var(--ob) + ${at.y}px)`, ...style }}>
      <span className="wpop" style={{ '--d': `${at.d}s` } as CSSProperties}>
        {children}
      </span>
    </span>
  )
}

function Buddy({ slug }: { slug: keyof typeof W.buddies }) {
  const b = W.buddies[slug]
  return <FactionBuddy slug={slug} size={22} blinkPeriod={b.period} blinkOffset={b.offset} />
}

const Pine = (
  <svg viewBox="0 0 30 52" width="30" height="52" className="sv">
    <rect x="12.5" y="38" width="5" height="14" fill={S(2)} {...ink} strokeWidth="1.4" />
    <path d="M15 2 L26 20 h-5 L28 38 H2 L9 20 H4 Z" className="wgrass" {...ink} strokeWidth="1.8" />
  </svg>
)

export default function Beat1Wide() {
  return (
    <>
      <svg className="rbw wd sv" viewBox="0 0 500 250" width="500" height="250">
        {W.rainbow.map((r) => (
          <path
            key={r.d}
            pathLength="1"
            d={r.d}
            fill="none"
            stroke={S(r.stop)}
            strokeWidth="8.4"
            style={{ animationDelay: `calc(var(--sh) + ${r.delay}s)` }}
          />
        ))}
      </svg>
      {W.birds.map((b) => (
        <span
          key={b.top}
          className="wbird wd"
          style={{ top: b.top, animationDuration: `${b.dur}s`, animationDelay: `calc(var(--sh) + ${b.delay}s)` }}
        >
          <svg viewBox="0 0 34 10" width="34" height="10" className="sv">
            <path className="flap" d="M0 6 q4 -6 8 0 q4 -6 8 0 M18 9 q3 -5 6 0 q3 -5 6 0" fill="none" stroke={K} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {W.clouds.map((c) => (
        <span key={c.x} className="cloud wd" style={{ left: `${c.x}%`, top: c.top, width: c.w, animationDuration: `${c.dur}s` }} />
      ))}

      <Put at={W.tree}>
        <span className="wtree">
          <svg viewBox="0 0 110 130" width="110" height="130" className="sv">
            <path d="M48 130 C 50 100, 50 80, 46 58 L 60 58 C 58 84, 60 104, 64 130 Z" fill={S(2)} {...ink} strokeWidth="2" />
            <path d="M56 78 C 70 72, 84 72, 99 76" fill="none" stroke={K} strokeWidth="7" strokeLinecap="round" />
            <path d="M56 78 C 70 72, 84 72, 99 76" fill="none" stroke={S(2)} strokeWidth="3.4" strokeLinecap="round" />
            <g className="wsway">
              <g className="wgrass" {...ink} strokeWidth="4">
                <circle cx="32" cy="44" r="24" />
                <circle cx="68" cy="38" r="27" />
                <circle cx="50" cy="22" r="22" />
              </g>
              <g className="wgrass">
                <circle cx="32" cy="44" r="24" />
                <circle cx="68" cy="38" r="27" />
                <circle cx="50" cy="22" r="22" />
              </g>
              <path d="M26 40 q5 -6 11 -2 M58 26 q6 -5 12 0 M62 48 q5 -4 10 0" fill="none" stroke={K} strokeWidth="1.5" strokeLinecap="round" opacity=".35" />
            </g>
          </svg>
          <span className="wswing">
            <svg viewBox="0 0 12 38" width="12" height="38">
              <path d="M0 0 V36 M12 0 V36" stroke={K} strokeWidth="1.4" />
              <rect x="-4" y="35" width="20" height="3.4" rx="1.5" fill={S(2)} {...ink} strokeWidth="1.2" />
            </svg>
            <span className="wcov">
              <Buddy slug="coven" />
            </span>
          </span>
        </span>
      </Put>

      <span className="wd wballoon">
        <span className="wrise">
          <svg className="wbob sv" viewBox="0 0 60 90" width="60" height="90">
            <path d="M25 64 l1.4 11 M35 64 l-1.4 11" stroke={K} strokeWidth="1.2" />
            <path d="M30 2 C 8 2, 0 22, 4 36 C 8 50, 20 58, 24 64 h12 C 40 58, 52 50, 56 36 C 60 22, 52 2, 30 2 Z" fill={S(1)} {...ink} strokeWidth="2" />
            <path d="M30 2 C 19 14, 17 44, 26 64 h8 C 43 44, 41 14, 30 2 Z" fill={S(3)} {...ink} strokeWidth="1.4" />
            <path d="M5 30 q25 9 50 0" fill="none" stroke={K} strokeWidth="1.2" opacity=".4" />
            <circle cx="30" cy="72" r="5" fill={T} {...ink} strokeWidth="1.2" />
            <circle cx="28.2" cy="71.4" r="1.1" fill={K} />
            <circle cx="31.8" cy="71.4" r="1.1" fill={K} />
            <rect x="23" y="75" width="14" height="10" rx="2.5" fill={S(2)} {...ink} strokeWidth="1.6" />
            <path d="M23 79 h14" stroke={K} strokeWidth="1" opacity=".5" />
          </svg>
        </span>
      </span>

      <Put at={W.kite}>
        <span className="wkitebox">
          <svg viewBox="0 0 130 210" width="130" height="210" className="sv">
            <g className="wkite">
              <path d="M16 186 C 40 150, 70 110, 98 62" fill="none" stroke={T} strokeWidth="1.3" opacity=".75" />
              <g className="wkwob">
                <path d="M98 68 q-9 9 0 18 q9 9 0 18 q-9 9 0 18" fill="none" stroke={K} strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="98" cy="86" r="3.4" fill={S(3)} stroke={K} strokeWidth=".9" />
                <circle cx="98" cy="104" r="3.4" fill={S(6)} stroke={K} strokeWidth=".9" />
                <path d="M98 8 L119 36 L98 68 L77 36 Z" fill={S(7)} {...ink} strokeWidth="2" />
                <path d="M98 8 L77 36 L98 36 Z" fill={S(3)} {...ink} strokeWidth="1.2" />
                <path d="M98 8 V68 M77 36 H119" stroke={K} strokeWidth="1.2" opacity=".55" />
              </g>
            </g>
          </svg>
          <span className="wkb">
            <Buddy slug="singularity" />
          </span>
        </span>
      </Put>

      <Put at={W.windmill}>
        <svg viewBox="0 0 64 100" width="64" height="100" className="sv">
          <path d="M22 100 L27 40 h10 L42 100 Z" fill={T} {...ink} strokeWidth="2" />
          <path d="M29 100 v-14 a3 3 0 0 1 6 0 v14 M28.6 58 h6.8" fill="none" stroke={K} strokeWidth="1.4" opacity=".6" />
          <g className="wspin">
            {[[0, 1], [90, 3], [180, 6], [270, 4]].map(([a, c]) => (
              <path key={a} d="M32 42 L27 6 h10 Z" fill={S(c)} {...ink} strokeWidth="1.6" transform={`rotate(${a} 32 42)`} />
            ))}
          </g>
          <circle cx="32" cy="42" r="4.4" fill={K} />
        </svg>
      </Put>

      {W.pines.map((p) => (
        <Put key={p.x} at={p} style={{ scale: String(p.scale), transformOrigin: '50% 100%' }}>
          {Pine}
        </Put>
      ))}

      <Put at={W.wow}>
        <span className="jump wj1">
          <Buddy slug="wow" />
        </span>
      </Put>
      <Put at={W.everymen}>
        <span className="jump wj2">
          <Buddy slug="everymen" />
        </span>
      </Put>
      <Put at={W.ua}>
        <span className="wua">
          <Buddy slug="ua" />
          <svg viewBox="0 0 30 40" width="30" height="40" className="sv">
            <path d="M6 40 L13 12 M24 40 L17 12 M15 14 V38" stroke={K} strokeWidth="2" strokeLinecap="round" />
            <rect x="2" y="3" width="26" height="21" rx="2" fill={T} {...ink} strokeWidth="1.8" transform="rotate(-4 15 14)" />
            <path d="M6 19 q4 -9 9 -4 t9 -5" fill="none" stroke={S(1)} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M7 21 q5 -6 9 -2 t7 -3" fill="none" stroke={S(6)} strokeWidth="2" strokeLinecap="round" />
            <circle cx="22" cy="9" r="2.4" fill={S(3)} />
          </svg>
        </span>
      </Put>
      <Put at={W.snide}>
        <span className="jump wj3">
          <Buddy slug="snide" />
        </span>
      </Put>
      <Put at={W.ephemerists}>
        <span className="weph">
          <Buddy slug="ephemerists" />
          <svg className="wscan sv" viewBox="0 0 24 12" width="24" height="12">
            <path d="M0 3.6 h9 v4.8 h-9 Z" fill={S(3)} {...ink} strokeWidth="1.3" />
            <path d="M9 2.4 h8 v7.2 h-8 Z" fill={T} {...ink} strokeWidth="1.3" />
            <path d="M17 1 h4 v10 h-4 Z" fill={S(3)} {...ink} strokeWidth="1.3" />
          </svg>
        </span>
      </Put>

      {W.flowers.map((f) => (
        <Put key={`${f.x}${f.y}`} at={f}>
          <Flower stop={f.stop} />
        </Put>
      ))}
      {W.butterflies.map((b) => (
        <Put key={b.x} at={b}>
          <span className="wflit" style={{ animationDuration: `${b.dur}s`, animationDirection: b.reverse ? 'reverse' : 'normal' }}>
            <Butterfly stop={b.stop} width={20} height={15} />
          </span>
        </Put>
      ))}

      <span className="wbun wd">
        <svg className="wbhop sv" viewBox="0 0 32 28" width="32" height="28">
          <circle cx="4" cy="17" r="3.4" fill={T} {...ink} strokeWidth="1.5" />
          <ellipse cx="14" cy="18" rx="10.5" ry="8" fill={T} {...ink} strokeWidth="1.7" />
          <path d="M22 9 C 19 1, 21 -6, 24 -2 C 26 2, 25 6, 25 9 Z M26 9 C 26 2, 30 -4, 31 1 C 32 5, 30 8, 29 10 Z" fill={T} {...ink} strokeWidth="1.5" />
          <circle cx="25" cy="13" r="6.4" fill={T} {...ink} strokeWidth="1.7" />
          <circle cx="27.4" cy="12" r="1.3" fill={K} />
          <path d="M7 26 h6 M17 26 h6" stroke={K} strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </span>
    </>
  )
}
