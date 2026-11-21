import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

// Only the OPEN is gated: a connection lost mid-session leaves the app as it is.
export default function OfflineGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common')
  const [offline, setOffline] = useState(() => !navigator.onLine)
  useEffect(() => {
    const back = () => setOffline(false)
    window.addEventListener('online', back)
    return () => window.removeEventListener('online', back)
  }, [])
  if (!offline) return <>{children}</>
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-2xl font-bold">{t('offline.title')}</h1>
      <p className="text-muted">{t('offline.body')}</p>
      <button
        type="button"
        className="btn-outline min-h-11"
        onClick={() => window.location.reload()}
      >
        {t('offline.retry')}
      </button>
    </main>
  )
}
