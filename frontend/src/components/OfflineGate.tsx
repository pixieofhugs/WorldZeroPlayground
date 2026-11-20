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
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-[var(--color-bg-page)] text-[var(--color-text-primary)]">
      <h1 className="font-display text-[length:var(--text-display)]">{t('offline.title')}</h1>
      <p className="text-[var(--color-text-secondary)]">{t('offline.body')}</p>
      <button
        type="button"
        className="min-h-11 min-w-11 px-6 border border-current rounded-sm cursor-pointer"
        onClick={() => window.location.reload()}
      >
        {t('offline.retry')}
      </button>
    </main>
  )
}
