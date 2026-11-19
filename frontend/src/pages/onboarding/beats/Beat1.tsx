import { lazy, Suspense, useSyncExternalStore, type CSSProperties } from 'react'
import Wisp, { K, S } from '../Wisp'
import { B1_ART } from '../motion/b1art.generated'
import { Butterfly, Flower } from './b1Parts'
import type { BeatProps } from './types'
import './Beat1.css'

// Below 900px the wide pieces are neither mounted nor fetched.
const Wide = lazy(() => import('./Beat1Wide'))

const WIDE_QUERY = '(min-width: 900px)'
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(WIDE_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const isWide = () => window.matchMedia(WIDE_QUERY).matches


export default function Beat1({ confidence }: BeatProps) {
  const wide = useSyncExternalStore(subscribeWide, isWide)
  return (
    <div className="b1">
      <div className="out">
        <span className="sky" />
        <svg
          viewBox="0 0 440 70"
          preserveAspectRatio="none"
          width="100%"
          height="70"
          className="hills"
        >
          <path d="M0 38 C 80 10, 160 18, 240 32 C 320 46, 380 16, 440 24 V70 H0 Z" className="hill1" />
          <path d="M0 54 C 100 40, 200 50, 300 46 C 360 44, 400 52, 440 50 V70 H0 Z" className="hill2" />
        </svg>
        <span className="ground" />
        {wide && (
          <Suspense fallback={null}>
            <Wide />
          </Suspense>
        )}
        <span className="outin">
          <span className="cloud c1" />
          <span className="cloud c2" />
          <span className="sun">
            <svg viewBox="-30 -30 60 60" width="48" height="48" className="sv">
              <g className="rays">
                <path
                  d="M0 -29 V-21 M0 21 V29 M-29 0 H-21 M21 0 H29 M-20 -20 l5 5 M15 15 l5 5 M20 -20 l-5 5 M-15 15 l-5 5"
                  stroke={S(3)}
                  strokeWidth="3.4"
                  strokeLinecap="round"
                />
              </g>
              <circle r="15" fill={S(3)} stroke={K} strokeWidth="2" />
            </svg>
          </span>
          <span className="bird">
            <svg viewBox="0 0 34 10" width="34" height="10" className="sv">
              <path
                className="flap"
                d="M0 6 q4 -6 8 0 q4 -6 8 0 M18 9 q3 -5 6 0 q3 -5 6 0"
                fill="none"
                stroke={K}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          {B1_ART.flowers.map((f) => (
            <span className="flw" key={f.x} style={{ left: f.x }}>
              <span className="boing" style={{ transformOrigin: '50% 100%', animationDelay: `${f.d}s` }}>
                <Flower stop={f.c} />
              </span>
            </span>
          ))}
        </span>
      </div>
      <span className="scr">
        <span className="feed" />
        <span className="cam" />
        <span className="hbar" />
        <span className="ntf" />
      </span>
      <span className="b1x">
        <span className="b1y">
          <span className="b1s">
            <span className="b1c">
              <span className="b1f">
                <Wisp size={44} confidence={confidence} />
              </span>
            </span>
          </span>
        </span>
      </span>
      <span className="bfly">
        <Butterfly stop={1} />
      </span>
      <svg className="gls" viewBox="0 0 440 250" width="440" height="250" aria-hidden="true">
        <path className="sheen" d="M96 23 h46 l-74 204 h-39 v-22 Z" />
        {B1_ART.cracks.map((c, i) => (
          <path key={i} className={c.k === 1 ? 'ck ck1' : 'ck ck2'} pathLength="1" d={c.d} style={{ animationDelay: c.delay }} />
        ))}
        {B1_ART.shards.map((s, i) => (
          <polygon
            key={i}
            className="shard"
            points={s.points}
            style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--dr': `${s.dr}deg`, animationDelay: `${s.delay}s` } as CSSProperties}
          />
        ))}
      </svg>
      <span className="bez">
        <i />
        <i />
      </span>
      <span className="burst" />
    </div>
  )
}
