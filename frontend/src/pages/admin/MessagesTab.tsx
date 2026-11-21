import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { archiveMessage, getMessages } from '../../api/admin'
import type { ContactMessageOut } from '../../api/admin'
import { formatTimestamp } from '../../utils/dates'
import { extractError } from '../../utils/errors'
import PageTitle from '../../components/ui/PageTitle'
import { useReloadCounts } from './useAdminCounts'
import { ErrorBanner } from "../../components/ui/ErrorBanner";

/** Contact-form messages, with an archive toggle. */
export default function MessagesTab() {
  const { t } = useTranslation(['admin', 'common'])
  const reloadCounts = useReloadCounts()
  const [messages, setMessages] = useState<ContactMessageOut[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const refresh = () => {
    setError(null)
    getMessages(showArchived)
      .then(setMessages)
      .catch((err) => setError(extractError(err, t('moderation.loadError'))))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [showArchived])

  const handleArchive = async (id: number) => {
    setActionError(null)
    try {
      await archiveMessage(id)
      refresh()
      reloadCounts()
    } catch (err) {
      setActionError(extractError(err, t('moderation.archiveError')))
    }
  }

  if (loading) return <div className="font-body text-muted content-text">{t('common:loading')}</div>
  if (error) return <p className="font-body content-text danger-text">{error}</p>

  return (
    <div className="flex flex-col gap-8">
      <PageTitle title={t('console.rail.items.messages')} />
      {actionError && (
        <ErrorBanner message={actionError} />
      )}
      <section>
        <div className="flex items-center gap-4 mb-3 border-b-2 border-border pb-1">
          <h3 className="font-display text-xl font-bold">
            {t('moderation.messages.heading')} <span className="text-muted text-base">({messages.length})</span>
          </h3>
          <label className="font-body text-xs text-muted flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            {t('moderation.messages.showArchived')}
          </label>
        </div>
        {messages.length === 0 ? (
          <p className="font-body content-text text-muted">
            {showArchived ? t('moderation.messages.emptyArchived') : t('moderation.messages.empty')}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className="card px-4 py-3"
                style={{ opacity: m.is_archived ? 0.6 : 1 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-display text-lg font-bold">{m.name}</p>
                    <p className="font-body text-xs text-muted">
                      {m.email} &middot; {formatTimestamp(m.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => void handleArchive(m.id)}
                    className="btn-outline text-xs shrink-0"
                  >
                    {m.is_archived ? t('moderation.messages.unarchive') : t('moderation.messages.archive')}
                  </button>
                </div>
                <p className="font-body content-text text-ink mt-2 whitespace-pre-wrap">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
