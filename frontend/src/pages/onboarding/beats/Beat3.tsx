import TaskCard from '../../../components/taskCard/TaskCard'
import { DragonClaw, DragonHead, DragonTail } from '../Dragon'
import { dragonTask, stickTask } from '../fixtures'
import Wisp, { K, S, T } from '../Wisp'
import '../beat3.css'
import type { BeatProps } from './types'

const ink = { stroke: K, strokeLinejoin: 'round' as const }

/** The dragon's head, claws and tail are children of its card, so they arrive with it and nothing is drawn before the card that hides it. */
export default function Beat3({ confidence }: BeatProps) {
  return (
    <div className="b3-row">
      <div className="toss b3-card">
        <DragonTail />
        <DragonHead />
        <DragonClaw className="cl" />
        <DragonClaw className="cr" />
        <span className="chef">
          <Wisp size={36} confidence={confidence} />
          <span className="stick">
            <span className="mallow" />
          </span>
          <i className="pbang">!</i>
        </span>
        <div inert>
          <TaskCard task={dragonTask} basePoints={dragonTask.point_value} />
        </div>
      </div>
      <div className="b3-col">
        <div className="toss b3-card b3-second">
          <span className="stk">
            <span className="stkspin">
              <svg className="b3-svg" viewBox="0 0 44 96" width="44" height="96" aria-hidden="true">
                <path d="M17 96 C 16 70, 18 40, 19 8 C 19 2, 26 2, 26 8 C 26 40, 27 70, 29 96 Z" fill={S(2)} strokeWidth="2" {...ink} />
                <path d="M25 50 C 31 42, 35 34, 39 24 C 40 21, 44 22, 43 25 C 39 36, 33 46, 26 56 Z" fill={S(2)} strokeWidth="2" {...ink} />
                <path d="M19 64 C 13 60, 8 56, 4 50 C 2 47, -1 50, 1 52 C 6 59, 12 64, 19 70 Z" fill={S(2)} strokeWidth="2" {...ink} />
                <path d="M21 40 q2 3 0 6 M24 76 q-2 3 0 6 M22 86 h3" fill="none" stroke={K} strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
                <g className="seye">
                  <circle cx="18" cy="17" r="4.6" fill={T} stroke={K} strokeWidth="1.2" />
                  <circle cx="28" cy="17" r="4.6" fill={T} stroke={K} strokeWidth="1.2" />
                  <g className="spup">
                    <circle cx="18" cy="17" r="2.2" fill={K} />
                    <circle cx="28" cy="17" r="2.2" fill={K} />
                  </g>
                </g>
                <g className="shd">
                  <path d="M9 14 h11 v4 a4 4 0 0 1 -4 4 h-3 a4 4 0 0 1 -4 -4 Z M26 14 h11 v4 a4 4 0 0 1 -4 4 h-3 a4 4 0 0 1 -4 -4 Z M20 15 h6" fill={K} stroke={K} strokeWidth="1.5" strokeLinejoin="round" />
                  <path className="glint" d="M31 16 l1 2 l2 1 l-2 1 l-1 2 l-1 -2 l-2 -1 l2 -1 Z" fill={T} />
                </g>
              </svg>
            </span>
          </span>
          <i className="sbang">!</i>
          <span className="dog">
            <svg className="b3-svg" viewBox="0 0 72 70" width="72" height="70" aria-hidden="true">
              <rect x="30" y="40" width="28" height="30" rx="6" fill={T} stroke={K} strokeWidth="2" />
              <ellipse cx="44" cy="30" rx="21" ry="19" fill={T} stroke={K} strokeWidth="2" />
              <path d="M50 18 a7 7 0 0 1 12 6 a9 9 0 0 1 -12 -6 Z" fill={S(2)} opacity=".85" />
              <g className="djaw">
                <path d="M10 40 C 14 50, 26 52, 34 44 L 30 40 Z" fill={T} strokeWidth="2" {...ink} />
                <ellipse cx="20" cy="46" rx="4" ry="5" fill={S(1)} />
              </g>
              <path d="M30 28 C 22 26, 12 28, 8 33 C 6 38, 12 41, 22 41 L 34 40 Z" fill={T} strokeWidth="2" {...ink} />
              <ellipse cx="9" cy="32" rx="4.5" ry="3.6" fill={K} />
              <circle cx="36" cy="22" r="3.6" fill={K} />
              <circle cx="35" cy="21" r="1.2" fill={T} />
              <path className="dear" d="M52 12 C 60 8, 68 14, 66 30 C 65 38, 58 38, 57 30 C 56 22, 54 18, 52 12 Z" fill={S(2)} strokeWidth="2" {...ink} />
            </svg>
            <i className="dq">?</i>
          </span>
          <div inert>
            <TaskCard task={stickTask} basePoints={stickTask.point_value} />
          </div>
        </div>
      </div>
    </div>
  )
}
