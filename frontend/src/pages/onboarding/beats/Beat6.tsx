import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameConfig } from '../../../hooks/useGameConfig'
import { DragonHead, DragonTail } from '../Dragon'
import { B6 } from '../motion/beat6.generated'
import Wisp, { K, S } from '../Wisp'
import '../beat6.css'
import type { BeatProps } from './types'

const delay = (s: number): CSSProperties => ({ animationDelay: `${s}s` })

/** The first level-up: the level and the unlock line come from the era's config and the progression catalog, never from a literal. */
export default function Beat6(_props: BeatProps) {
  const { t } = useTranslation('onboarding')
  const { t: tp } = useTranslation('progression')
  const { t: tv } = useTranslation('votes')
  const config = useGameConfig()
  const reached = config?.level_profiles.findIndex((p) => p.unlocks.length > 0) ?? -1
  const names = (config?.level_profiles[reached]?.unlocks ?? [])
    .filter((u) => u.kind === 'ability')
    .map((u) => (tp as unknown as (k: string) => string)(`unlocks.${u.key}.name`))

  return (
    <div className="b6w">
      <DragonHead className="b6d calm" width={100} height={92} style={delay(B6.dragon)} />
      <span className="b6t" aria-hidden="true" style={delay(B6.dragon + 0.5)}>
        <DragonTail className="b6wag" style={{ animationDelay: `${B6.dragon + 0.5}s, ${B6.dragon + 1.4}s` }} />
      </span>
      <div className="ob-sheet boing">
        <div className="b6">
          {B6.ledges.map((l, i) => (
            <span key={i} className="b6-ldg" style={{ left: l.left, width: l.width, bottom: l.bottom, height: l.height }} />
          ))}
          {B6.cards.map((c, i) => (
            <span
              key={i}
              className="b6-crd"
              style={{ left: c.left, bottom: c.bottom, height: c.height, ['--c' as string]: S(c.hue), ['--th' as string]: `${c.th}deg`, ['--w' as string]: `${c.w}deg`, ['--tw' as string]: `${c.tw}s`, ['--tt' as string]: `${c.tt}s` }}
            >
              <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
                <path d={c.icon} fill="none" stroke={K} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          ))}
          <span className="boing b6-flag" style={delay(B6.flag)}>
            <svg viewBox="0 0 22 30" width="22" height="30" aria-hidden="true">
              <path d="M3 30 V2" stroke={K} strokeWidth="2.2" strokeLinecap="round" />
              <path className="b6-flut" d="M3 3 h15 l-4 5 l4 5 h-15 Z" fill={S(1)} stroke={K} strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="b6x">
            <span className="b6y">
              <span className="b6s">
                <Wisp size={28} style={{ ['--conf' as string]: 'inherit' }} />
              </span>
              <i className="b6bang">!</i>
            </span>
          </span>
        </div>
        <div className="b6-lvrow">
          <div className="b6-lv">
            <span className="ob-cap">{t('flow.level')}</span>
            <span className="b6-num">
              <span className="b6-roll" style={delay(B6.roll)}>
                <span>{reached > 0 ? reached - 1 : ''}</span>
                <span>{reached > 0 ? reached : ''}</span>
              </span>
            </span>
          </div>
          <span className="ob-hair" />
          <div className="ob-ring b6-ring" style={{ animationDelay: `${B6.roll}s, ${B6.roll}s` }}>
            <div className="ob-disc">
              <b>★</b>
            </div>
          </div>
        </div>
        {names.length > 0 && (
          <p className="b6-lines boing" style={delay(B6.unlock)}>
            {tp('popup.nowUnlocked')}: {names.join(', ')}
          </p>
        )}
        <p className="b6-lines boing" style={delay(B6.unlock + 0.4)}>
          {tv('chrome.receivedVoteGate')}
        </p>
      </div>
    </div>
  )
}
