import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { acceptTerms } from '../../api/terms'
import type { TaskOut } from '../../api/tasks'
import { resolveHandoffTask } from '../../utils/onboardingHandoff'
import { clearTermsAcceptance, holdTermsAcceptance, termsAcceptanceHeld } from '../../utils/onboardingResume'
import Wisp from './Wisp'
import { BEATS } from './beats'
import { HoldNextContext } from './beats/holdNext'
import { back, decline, initialFlow, isBeat, next, skip, toArrival, toCharacter, toSignIn, type Flow, type Step } from './flowSteps'
import './flow.css'

// Past START only: out of the graph the title waits on. Warmed on mount so START never meets a gap.
const loadSteps = () =>
  Promise.all([import('./Arrival'), import('./AuthCard'), import('./CharacterStep'), import('./Declined'), import('./SignInView'), import('./TermsCard')]).then(
    ([a, b, c, d, e, f]) => ({ Arrival: a.default, AuthCard: b.default, CharacterStep: c.default, Declined: d.default, SignInView: e.default, TermsCard: f.default }),
  )

const TYPE_MS = 28
const LEAVE_MS = 460
const TITLE_DELAY_MS = 2800
const TITLE_CHAR_MS = 84
// START bounces in as the Wisp starts to drop (1s), not after the title has typed: a player who wants in never waits on the bit.
const START_DELAY_S = 0.8

// The one beat whose stage holds a live control (Next waits on it), so it stays out of aria-hidden.
const VOTE_BEAT = 5

const CONFIDENCE: Record<string, number> = { title: 0.08, 1: 0.18, 2: 0.3, 3: 0.42, 4: 0.5, 5: 0.6, 6: 0.72, 7: 0.82 }

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** The title types itself after a pause; `instant` (reduced motion, or coming back) shows it whole. */
function useTitleTyping(text: string, instant: boolean): string {
  const [n, setN] = useState(instant ? text.length : 0)
  useEffect(() => {
    if (instant) return setN(text.length)
    let id: ReturnType<typeof setInterval>
    const start = setTimeout(() => {
      id = setInterval(() => setN((c) => Math.min(text.length, c + 1)), TITLE_CHAR_MS)
    }, TITLE_DELAY_MS)
    return () => {
      clearTimeout(start)
      clearInterval(id)
    }
  }, [text, instant])
  return text.slice(0, n)
}

function Title({ cameBack, onStart }: { cameBack: boolean; onStart: () => void }) {
  const { t } = useTranslation('onboarding')
  const welcome = t('flow.welcome')
  const shown = useTitleTyping(welcome, cameBack || reducedMotion())
  const delay = (s: number): CSSProperties => ({ animationDelay: `${s}s` })
  return (
    <section className={`ob-title ${cameBack ? 'ob-rew ob-quick' : ''}`}>
      <div aria-hidden="true" className="ob-rail">
        <div className="boing ob-level">
          <span className="ob-cap">{t('flow.level')}</span>
          <b>0</b>
        </div>
        <div className="ob-line">
          <span className="ob-srule ob-draw" />
          <span className="ob-sleeper">
            <span className="drop" style={delay(1)}>
              <span className="ob-wake ob-snz">
                <Wisp size={52} confidence={CONFIDENCE.title} />
                <i className="ob-sbub" />
              </span>
            </span>
            <i className="ob-zz" style={delay(1.8)} />
            <i className="ob-zz" style={{ ...delay(2.8), left: '84%' }} />
            <i className="ob-zz" style={delay(3.25)} />
            <i className="ob-bang" />
          </span>
        </div>
        <div className="ob-ring">
          <div className="ob-disc">
            <b>?</b>
            <span className="ob-cap">{t('flow.points')}</span>
          </div>
        </div>
      </div>
      <h1 className="ob-lora ob-h1" aria-label={welcome}>
        <span aria-hidden="true">
          {shown}
          <span className="ob-caret" />
        </span>
      </h1>
      <button type="button" className="boing ob-start" style={delay(START_DELAY_S)} onClick={onStart} data-testid="onboarding-start">
        {t('flow.start')}
      </button>
    </section>
  )
}

export default function OnboardingFlow({ resumed, onAccepted }: { resumed: boolean; onAccepted: () => void }) {
  const { user, loading, refetch } = useAuth()
  const { t } = useTranslation('onboarding')
  const { t: tc } = useTranslation('common')
  const [flow, setFlow] = useState<Flow>(() => initialFlow(resumed))
  const [reveal, setReveal] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [cameFrom, setCameFrom] = useState<Step | null>(null)
  const [held, setHeld] = useState<string | null>(null)
  const [arrival, setArrival] = useState<{ name: string; task: TaskOut } | null>(null)
  const navigate = useNavigate()
  // After an OAuth round trip a held click is written once, before creation; a failure shows the contract again.
  const [recording, setRecording] = useState(() => resumed && termsAcceptanceHeld())
  const recordedOnce = useRef(false)
  // Back from a later step re-mounts the contract; one mount writes one row.
  const wrote = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const [steps, setSteps] = useState<Awaited<ReturnType<typeof loadSteps>> | null>(null)
  const [stepsTry, setStepsTry] = useState(0)
  const [stepsFailed, setStepsFailed] = useState(false)
  useEffect(() => {
    setStepsFailed(false)
    loadSteps().then(setSteps, () => setStepsFailed(true))
  }, [stepsTry])

  // A player with a character goes where the hand-off sends them; one without creates it here.
  const hasCharacter = !!user?.character || arrival !== null
  const handOff = () => (hasCharacter ? onAccepted() : move((f) => toCharacter(f, hasCharacter)))

  useEffect(() => {
    if (!recording || loading || recordedOnce.current) return
    if (!user) return setRecording(false)
    recordedOnce.current = true
    acceptTerms().then(
      async () => {
        wrote.current = true
        clearTermsAcceptance()
        // Layout gates on `has_accepted_terms`; hand off only once it can see the row.
        await refetch()
        handOff()
      },
      () => {
        clearTermsAcceptance()
        setRecording(false)
      },
    )
  }, [recording, loading, user, handOff, refetch])

  const { step } = flow
  const n = isBeat(step) ? step : null
  const beat = n !== null
  const line = beat ? t(`beats.${n}`) : ''
  const done = reveal >= line.length
  const target = flow.history[flow.history.length - 1]

  useEffect(() => {
    if (!beat || leaving || done) return
    if (reducedMotion()) return setReveal(line.length)
    const id = setTimeout(() => setReveal((r) => r + 1), TYPE_MS)
    return () => clearTimeout(id)
  }, [beat, leaving, done, reveal, line.length])

  // Focus carries the whole line to a screen reader; typing is only for the eyes.
  const lineBox = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (beat) return lineBox.current?.focus({ preventScroll: true })
    const root = rootRef.current
    if (step === 'title') return cameFrom !== null ? root?.querySelector<HTMLElement>('[data-testid=onboarding-start]')?.focus({ preventScroll: true }) : undefined
    const el = root?.querySelector<HTMLElement>('h1, h2') ?? root?.querySelector<HTMLElement>('section')
    if (!el) return
    if (!el.hasAttribute('tabindex')) el.tabIndex = -1
    el.focus({ preventScroll: true })
  }, [step, beat, loading, recording, cameFrom, steps])

  // Leaving un-types the line while the scene is yanked away.
  useEffect(() => {
    if (!leaving || !beat) return
    const id = setInterval(() => setReveal((r) => Math.max(0, r - Math.ceil(line.length / 12))), TYPE_MS)
    return () => clearInterval(id)
  }, [leaving, beat, line.length])

  const move = (to: (f: Flow) => Flow) => {
    if (leaving) return
    window.scrollTo(0, 0)
    setFlow(to)
    setReveal(0)
    setCameFrom(null)
  }

  const goBack = () => {
    if (leaving || !flow.history.length) return
    const land = () => {
      window.scrollTo(0, 0)
      setFlow((f) => back(f, hasCharacter))
      setReveal(Infinity)
      setCameFrom(step)
      setLeaving(false)
    }
    if (reducedMotion()) return land()
    setLeaving(true)
    timer.current = setTimeout(land, LEAVE_MS)
  }

  const advance = () => {
    if (leaving) return
    if (!done) setReveal(line.length)
    else if (held === null) move(next)
  }

  const goNext = () => {
    if (held === null) move(next)
  }

  const setHold = useCallback((label: string | null) => setHeld(label), [])

  // Back plays on the whole screen except beat to beat, where only the stage swaps.
  const toBeat = target !== undefined && isBeat(target)
  const fromBeat = cameFrom !== null && isBeat(cameFrom)
  const screenCls = leaving ? (toBeat && beat ? '' : 'ob-lv') : cameFrom !== null && !(beat && fromBeat) ? 'ob-rew' : ''
  const stageCls = leaving ? (toBeat ? 'ob-lv' : '') : beat && fromBeat ? 'ob-rew' : ''
  const cameBack = cameFrom !== null
  const onBack = flow.history.length ? goBack : undefined

  const Beat = n === null ? null : BEATS[n - 1]
  const label = n === 7 ? t('flow.toContract') : t('flow.next')

  return (
    <div ref={rootRef} className="onboarding-arc ob-root" data-theme="dark" style={{ ['--conf' as string]: CONFIDENCE[String(step)] ?? 1 }}>
      <span aria-hidden="true" className="ob-aurora" style={{ animationDelay: step === 'title' && !cameBack ? '3.4s' : '0s' }} />
      <header className="ob-header">
        <span>
          <span className={`ob-brand ob-cap ${step === 'title' ? '' : 'ob-brand-hide'}`}>
            {t('flow.brand')} <i />
          </span>
        </span>
        <span>
          {beat && (
            <button type="button" className="ob-ghost ob-cap ob-fwd2" onClick={() => move(skip)} data-testid="onboarding-skip">
              {t('flow.skip')}
            </button>
          )}
          {!user && (step === 'title' || beat) && (
            <button type="button" className="ob-ghost ob-cap" onClick={() => move(toSignIn)} data-testid="onboarding-header-sign-in">
              {t('flow.signIn')}
            </button>
          )}
        </span>
      </header>
      {leaving && (
        <span aria-hidden="true" className="ob-cap ob-rwd ob-rwd-arrow">
          {t('flow.rewind')}
        </span>
      )}

      {step === 'title' && <Title cameBack={cameBack} onStart={() => move(next)} />}

      {Beat && n !== null && (
        <section className={`ob-beat ${screenCls}`}>
          <HoldNextContext.Provider value={setHold}>
            <section aria-hidden={n === VOTE_BEAT ? undefined : true} inert={n !== VOTE_BEAT} className={`ob-stage ${stageCls}`} key={step}>
              <Beat confidence={CONFIDENCE[n]} />
            </section>
          </HoldNextContext.Provider>
          <div className="ob-sheet ob-box">
            <span className="ob-box-top">
              <span className="ob-cap">{t('flow.stepOf', { n })}</span>
              <span className="ob-hair" />
              <span className="ob-pips" aria-hidden="true">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <i key={i} style={i <= n ? { background: `var(--faction-default-stop-${i})` } : undefined} />
                ))}
              </span>
            </span>
            <button type="button" className="ob-adv" key={step} ref={lineBox} tabIndex={-1} onClick={(e) => (e.detail === 0 ? goNext() : advance())} aria-label={line}>
              <span aria-hidden="true" className="ob-lora ob-line-text">
                {line.slice(0, reveal)}
                <span className="ob-caret" />
              </span>
            </button>
            <span className="ob-box-nav">
              {onBack ? (
                <button type="button" className="ob-ghost ob-cap ob-bk ob-prev" onClick={onBack}>
                  {t('flow.back')}
                </button>
              ) : (
                <span />
              )}
              {held !== null ? (
                <span className="ob-cap ob-hold">{held}</span>
              ) : (
                <button type="button" className="ob-ghost ob-cap ob-next ob-fwd" onClick={goNext}>
                  {label}
                </button>
              )}
            </span>
          </div>
        </section>
      )}

      {!steps && step !== 'title' && !beat && (
        <section className={`${screenCls} page font-body text-muted`}>
          {stepsFailed ? (
            <button type="button" className="ob-ghost" data-testid="onboarding-steps-retry" onClick={() => setStepsTry((n) => n + 1)}>
              {t('flow.loadFailed')}
            </button>
          ) : (
            tc('loading')
          )}
        </section>
      )}

      {steps && (
        <>
      {step === 'signin' && <div className={screenCls}><steps.AuthCard onBack={onBack} /></div>}

      {step === 'character' && (
        <div className={screenCls}>
          <steps.CharacterStep
            onBack={onBack}
            onCreated={async (c) => {
              const task = await resolveHandoffTask()
              if (!task) return navigate('/tasks')
              setArrival({ name: c.display_name, task })
              move(toArrival)
            }}
          />
        </div>
      )}

      {step === 'arrival' && arrival && (
        <div className={screenCls}>
          <steps.Arrival name={arrival.name} task={arrival.task} onBack={onBack} />
        </div>
      )}

      {step === 'returning' && (
        <div className={screenCls}>
          <steps.SignInView onRestart={() => move(() => initialFlow(false))} />
        </div>
      )}

      {step === 'declined' && (
        <div className={screenCls}>
          <steps.Declined onReconsider={onBack} />
        </div>
      )}

      {step === 'contract' && (
        <div className={screenCls}>
          {loading || recording ? (
            <div className="page font-body text-muted">{tc('loading')}</div>
          ) : (
            <steps.TermsCard
              // A session writes the row now; a guest holds the click through sign-in.
              record={
                user
                  ? async () => {
                      if (wrote.current) return
                      await acceptTerms()
                      wrote.current = true
                    }
                  : async () => void holdTermsAcceptance()
              }
              onAccepted={() => (user ? void refetch().then(handOff) : move(next))}
              onDecline={() => {
                clearTermsAcceptance()
                move(decline)
              }}
              onBack={onBack}
            />
          )}
        </div>
      )}
        </>
      )}
    </div>
  )
}
