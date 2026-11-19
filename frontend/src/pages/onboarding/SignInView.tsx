import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import SignInOptions from '../../components/SignInOptions'
import { primaryControl } from './OnboardingCard'
import Wisp from './Wisp'
import './motion/shared.css'
import './motion/login.css'

const CHAR_MS = 84
const START_MS = 500

/** A plain sign-in: no `onChoose`, so no onboarding resume is marked. */
export default function SignInView({ onRestart }: { onRestart: () => void }) {
  const { t } = useTranslation('onboarding')
  const title = t('signin.title')
  const instant = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const [n, setN] = useState(instant ? title.length : 0)
  useEffect(() => {
    if (instant) return
    let id: ReturnType<typeof setInterval>
    const start = setTimeout(() => {
      id = setInterval(() => setN((c) => Math.min(title.length, c + 1)), CHAR_MS)
    }, START_MS)
    return () => {
      clearTimeout(start)
      clearInterval(id)
    }
  }, [title, instant])

  return (
    <main className="ob-welcome">
      <span aria-hidden="true" className="jump shy">
        <Wisp size={64} confidence={1} />
      </span>
      <h1 className="ob-lora" aria-label={title}>
        <span aria-hidden="true">
          {title.slice(0, n)}
          <span className="ob-caret" />
        </span>
      </h1>
      <div className="ob-sheet boing ob-welcome-box">
        <SignInOptions className="" style={primaryControl} />
      </div>
      <button type="button" className="ob-ghost ob-cap boing ob-restart" onClick={onRestart} data-testid="onboarding-restart">
        {t('signin.restart')}
      </button>
    </main>
  )
}
