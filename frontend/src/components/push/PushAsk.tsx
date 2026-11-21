import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiGet, apiPut } from '../../api/client'
import { listPraxes } from '../../api/praxis'
import { useAuth } from '../../auth/AuthContext'
import { saveBody } from '../../pages/settings/notificationPrefs'
import { deviceSubscribed, pushBlock, subscribePush } from '../../utils/pushSubscribe'
import { dismissPushAsk, pushAskDismissed } from '../../utils/pushAskDismissed'
import './pushAsk.css'

/**
 * The rows the card's copy promises: someone rates, comments, or calls you out. This turns
 * `vote_on_mine` push on against its default (#3704): the player just said yes to "know when
 * someone rates this", so the default no longer applies.
 */
const ASKED_ROWS = ['vote_on_mine', 'comment_on_mine', 'comment_mention']

/** One-time "want to know when someone rates this?" under a player's first praxis (#3704). */
export default function PushAsk({ praxisId }: { readonly praxisId: number }) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const characterId = user?.character?.id
  const [vapidKey, setVapidKey] = useState<string | null>(null)
  const [gone, setGone] = useState(pushAskDismissed)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (characterId == null || gone) return
    let live = true
    ;(async () => {
      const { data } = await apiGet('/me/notification-prefs')
      const key = data.vapid_public_key ?? null
      if (pushBlock(key) !== 'ok' || (await deviceSubscribed())) return
      const mine = await listPraxes({ member_id: characterId, status: 'submitted', era_scope: 'all_eras', limit: 2 })
      if (live && mine.length === 1 && mine[0].id === praxisId) setVapidKey(key)
    })().catch(() => {})
    return () => {
      live = false
    }
  }, [characterId, praxisId, gone])

  if (!vapidKey || gone) return null

  const dismiss = () => {
    dismissPushAsk()
    setGone(true)
  }
  const turnOn = async () => {
    setBusy(true)
    try {
      const result = await subscribePush(vapidKey)
      if (result === 'dismissed') return
      if (result === 'ok') {
        const { data } = await apiGet('/me/notification-prefs')
        const next = { ...data.events }
        for (const key of ASKED_ROWS) if (next[key]) next[key] = { ...next[key], by_push: true }
        await apiPut('/me/notification-prefs', { body: saveBody(next) })
      }
      dismiss()
    } catch {
      // Left up so the player can tap again; Settings shows the error states.
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="push-ask-title" className="push-ask" data-testid="push-ask">
      <div className="push-ask-head">
        <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="push-ask-bell">
          <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        <h2 id="push-ask-title" className="push-ask-title">{t('pushAsk.title')}</h2>
      </div>
      <p className="push-ask-body">{t('pushAsk.body')}</p>
      <div className="push-ask-actions">
        <button type="button" className="btn-primary" disabled={busy} onClick={turnOn}>
          {t('pushAsk.turnOn')}
        </button>
        <button type="button" className="btn-outline" onClick={dismiss}>
          {t('pushAsk.notNow')}
        </button>
      </div>
      <p className="push-ask-note">{t('pushAsk.note')}</p>
    </section>
  )
}
