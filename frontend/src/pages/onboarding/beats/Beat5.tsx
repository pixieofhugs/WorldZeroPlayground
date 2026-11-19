import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import PraxisCard from '../../../components/praxisCard/PraxisCard'
import { VoteSandboxContext } from '../../../components/vote/voteSandbox'
import { dragonPraxis } from '../fixtures'
import { revealVoteRow } from '../fitStage'
import FactionBuddy from '../FactionBuddy'
import Wisp from '../Wisp'
import '../beat5.css'
import { useHoldNext } from './holdNext'
import type { BeatProps } from './types'

/** Seconds into the beat each judge lands; its score card rises 0.55s later. */
const JUDGES = [
  { slug: 'coven', score: 4, land: 0.9, blink: 3.7 },
  { slug: 'wow', score: 5, land: 1.3, blink: 5.1 },
  { slug: 'snide', score: 3, land: 2.05, blink: 4.6 },
  { slug: 'singularity', score: 5, land: 2.4, blink: 3.3 },
]
const SCORE_AFTER = 0.55
const COUNT_AFTER = SCORE_AFTER + 0.2
/** Back plays every judge at 1s, behind the card. */
const QUICK_LAND = 1

/** The last score has risen and the count settled; the old 3.3s for the 2.4s judge. */
const SETTLE_AFTER = COUNT_AFTER + 0.15

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const motionOff = () => reducedMotion() || document.documentElement.dataset.motion === 'off'

export default function Beat5({ confidence }: BeatProps) {
  const { t } = useTranslation('onboarding')
  const root = useRef<HTMLDivElement>(null)
  const [judged, setJudged] = useState(() => (reducedMotion() ? JUDGES.length : 0))
  const [voted, setVoted] = useState<number | null>(null)
  useHoldNext(voted === null ? t('beat5.hold') : null)

  useEffect(() => {
    // One scroll per mount: the judges stay in view while they land, then the vote row is brought up.
    if (motionOff()) {
      revealVoteRow(false)
      if (reducedMotion()) return
    }
    const quick = root.current?.closest('.ob-rew') != null
    const ids = JUDGES.map((j, i) =>
      setTimeout(() => setJudged(i + 1), ((quick ? QUICK_LAND : j.land) + COUNT_AFTER) * 1000),
    )
    if (!motionOff()) {
      const last = quick ? QUICK_LAND : Math.max(...JUDGES.map((j) => j.land))
      ids.push(setTimeout(() => revealVoteRow(true), (last + SETTLE_AFTER) * 1000))
    }
    return () => ids.forEach(clearTimeout)
  }, [])

  // The fixture card's links lead nowhere real; only the vote row belongs in the tab order.
  useEffect(() => {
    root.current?.querySelectorAll('.b5-card a[href]').forEach((a) => a.setAttribute('tabindex', '-1'))
    // The card re-keys on every tally, so the star just pressed is gone; hand focus to its replacement.
    if (voted !== null && document.activeElement === document.body)
      root.current?.querySelector<HTMLElement>('.b5-card button[aria-pressed="true"]')?.focus({ preventScroll: true })
  }, [judged, voted])

  const sandbox = useMemo(() => ({ value: voted, cast: setVoted }), [voted])
  const fromJudges = JUDGES.slice(0, judged).reduce((sum, j) => sum + j.score, 0)
  const fromVotes = fromJudges + (voted ?? 0)
  // The card copies its prop once, so a new tally needs a fresh card.
  const praxis = {
    ...dragonPraxis,
    points_from_votes: fromVotes,
    score: dragonPraxis.score + fromVotes,
    voter_count: judged + (voted === null ? 0 : 1),
    viewer_vote: voted,
  }

  return (
    <div className="b5w" ref={root}>
      {JUDGES.map((j, i) => (
        <span
          key={j.slug}
          className="judge"
          style={{ left: `${8 + i * 22}%`, '--dl': `${j.land}s`, '--sd': `${j.land + SCORE_AFTER}s` } as CSSProperties}
        >
          <FactionBuddy slug={j.slug} size={34} blinkPeriod={j.blink} blinkOffset={-i * 1.9} />
          <span className="score">{j.score}</span>
        </span>
      ))}
      <VoteSandboxContext.Provider value={sandbox}>
        <div className="toss b5-card">
          <PraxisCard key={`${judged}-${voted}`} praxis={praxis} />
        </div>
      </VoteSandboxContext.Provider>
      <span className="ob-cap boing b5-hint">
        {voted === null ? t('beat5.hint') : t('beat5.thanks', { stars: voted })}
      </span>
      <span className="b5-side">
        <span className="ob-cap boing">{voted === null ? t('beat5.turn') : t('beat5.nice')}</span>
        <span className={`boing ${voted === null ? '' : 'shy'}`}>
          <span className="jump">
            <Wisp size={36} confidence={confidence} />
          </span>
        </span>
      </span>
      <svg className="b5-arrow" viewBox="0 0 90 70" width="90" height="70" aria-hidden="true">
        <path d="M74 4 C 84 40, 52 66, 8 58 M8 58 l12 -10 M8 58 l14 6" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
