import PraxisCard from '../../../components/praxisCard/PraxisCard'
import { VoteSandboxContext } from '../../../components/vote/voteSandbox'
import { stickPraxis } from '../fixtures'
import Wisp, { K, S, T } from '../Wisp'
import '../beat4.css'
import type { BeatProps } from './types'

const PICTURE = { value: null, cast: () => {} }

/** The card is a picture here (`inert`); the generated `b4*` loop is one clock, so it ends where it starts. */
export default function Beat4({ confidence }: BeatProps) {
  return (
    <div className="b4w">
      <span className="flash" />
      <div className="swing" inert>
        <VoteSandboxContext.Provider value={PICTURE}>
          <PraxisCard praxis={stickPraxis} />
        </VoteSandboxContext.Provider>
      </div>
      <span className="drop crit cL b4-d1">
        <svg className="camhop b4a" viewBox="0 0 56 46" width="56" height="46" overflow="visible" aria-hidden="true">
          <circle className="glow b4a" cx="43" cy="5" r="12" fill={T} />
          <rect x="38" y="2" width="10" height="8" rx="2" fill={T} stroke={K} strokeWidth="1.5" />
          <path d="M15 10 l3 -6 h12 l3 6 Z" fill={S(6)} stroke={K} strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="3" y="10" width="50" height="30" rx="6" fill={S(6)} stroke={K} strokeWidth="2" />
          <circle cx="28" cy="25" r="12" fill={K} />
          <circle cx="28" cy="25" r="8" fill="none" stroke={T} strokeWidth="1.5" opacity=".5" />
          <circle cx="24.4" cy="21.4" r="2.3" fill={T} opacity=".85" />
          <path d="M14 40 v5 M42 40 v5" stroke={S(6)} strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
      <span className="drop crit cM b4-d2">
        <svg className="mic b4a" viewBox="0 0 44 48" width="44" height="48" overflow="visible" aria-hidden="true">
          <path className="wv b4a" d="M5 8 q-7 9 0 18 M39 8 q7 9 0 18 M-3 4 q-10 13 0 26 M47 4 q10 13 0 26" fill="none" stroke={T} strokeWidth="2" strokeLinecap="round" />
          <path d="M8 22 q0 16 14 16 q14 0 14 -16 M22 38 v7 M13 46 h18" fill="none" stroke={T} strokeWidth="2" strokeLinecap="round" />
          <rect x="12" y="2" width="20" height="29" rx="10" fill={S(1)} stroke={K} strokeWidth="2" />
          <path d="M15.5 10 h13 M14 15.5 h16 M14 21 h16" stroke={K} strokeWidth="1.5" strokeLinecap="round" opacity=".45" />
        </svg>
      </span>
      <span className="note n0 b4a" />
      <span className="note n1 b4a" />
      <span className="drop crit cR b4-d3">
        <svg className="clap b4a" viewBox="0 0 52 46" width="52" height="46" overflow="visible" aria-hidden="true">
          <rect x="4" y="19" width="44" height="26" rx="3" fill={S(3)} stroke={K} strokeWidth="2" />
          <path d="M10 29 h32 M10 36 h20" stroke={K} strokeWidth="1.6" strokeLinecap="round" opacity=".4" />
          <rect x="4" y="14" width="44" height="7" fill={K} stroke={T} strokeWidth="1" />
          <path d="M12 15 l-3 5 M24 15 l-3 5 M36 15 l-3 5 M46 15 l-3 5" stroke={T} strokeWidth="3" />
          <g className="arm b4a">
            <rect x="4" y="6" width="44" height="7" fill={K} stroke={T} strokeWidth="1" />
            <path d="M12 7 l-3 5 M24 7 l-3 5 M36 7 l-3 5 M46 7 l-3 5" stroke={T} strokeWidth="3" />
          </g>
        </svg>
      </span>
      <span className="drop crit cW b4-d4">
        <span className="b4h">
          <span className="b4x">
            <span className="b4y">
              <span className="b4s">
                <Wisp size={30} confidence={confidence} />
              </span>
            </span>
          </span>
        </span>
      </span>
      <span className="b4-score pop">+{stickPraxis.score}</span>
    </div>
  )
}
