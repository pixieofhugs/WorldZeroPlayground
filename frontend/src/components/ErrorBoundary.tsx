import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

const GUARD_KEY = 'wz-chunk-reload'
const GUARD_MS = 30_000

const CHUNK_ERROR = /Failed to fetch dynamically imported module|Importing a module script failed/i

/** One reload per GUARD_MS; false when the guard already fired or storage is unusable (no guard means no reload, never a loop). */
export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(GUARD_KEY))
    if (last && Date.now() - last < GUARD_MS) return false
    sessionStorage.setItem(GUARD_KEY, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}

// Left unhandled when the guard has fired, so the failed import reaches the boundary.
function onPreloadError(event: Event) {
  if (reloadOnce()) event.preventDefault()
}

window.addEventListener('vite:preloadError', onPreloadError)

function Fallback() {
  const { t } = useTranslation('common')
  return (
    <main role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-2xl font-bold">{t('crash.title')}</h1>
      <p className="text-muted">{t('crash.body')}</p>
      <button type="button" className="btn-outline" onClick={() => window.location.reload()}>
        {t('crash.reload')}
      </button>
    </main>
  )
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (CHUNK_ERROR.test(error.message)) reloadOnce()
    else console.error(error, info.componentStack)
  }

  render() {
    return this.state.failed ? <Fallback /> : this.props.children
  }
}
