import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getFactions, type FactionOut } from '../../../api/factions'
import { factionCssVar, factionName, sortFactionsByRainbowOrder } from '../../../utils/factions'
import { useAuth } from '../../../auth/AuthContext'
import { extractError } from '../../../utils/errors'

const NA_SLUG = 'na'

/**
 * Default MOBILE factions-directory skin — the phone twin of the desktop
 * Factions grid. A single-column screen: an "unaffiliated" banner (shown only
 * while the viewer hasn't sworn to a faction) over a two-up tile grid, each tile
 * wearing its faction's colour and linking to that faction's detail page where
 * all membership actions live (#347). Member counts are intentionally dropped —
 * no cheap per-faction count query exists (ADR-0035: real fields only).
 *
 * Self-fetches the (slug-only) faction list; the viewer's current faction comes
 * from AuthContext, so no extra membership plumbing is needed for the banner.
 * Bespoke faction directory skins register in Factions' MOBILE_ARCHETYPE_BY_SLUG.
 */
export default function DefaultFactionsDirectory() {
  const { t } = useTranslation('factions')
  const { t: tc } = useTranslation('common')
  const { user } = useAuth()
  const currentSlug = user?.character?.faction_slug ?? null
  const unaffiliated = !currentSlug || currentSlug === NA_SLUG

  const [factions, setFactions] = useState<FactionOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getFactions()
      .then((data) => {
        if (!cancelled) setFactions(data)
      })
      .catch((err) => {
        if (!cancelled) setError(extractError(err, t('mobile.loadError')))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  const visible = sortFactionsByRainbowOrder(factions.filter((f) => f.slug !== NA_SLUG))

  return (
    <div className="py-4" data-testid="mobile-factions-directory">
      <h1
        className="font-display italic font-medium mb-3"
        style={{ fontSize: 26, color: 'var(--color-text-primary)', lineHeight: 1.1 }}
      >
        {tc('nav.factions')}
      </h1>

      {unaffiliated && (
        <section
          className="sidebar-card mb-4"
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              flex: 'none',
              background: 'var(--color-bg-surface-alt)',
              border: '1px solid var(--color-border)',
            }}
          />
          <div>
            <div
              className="font-display italic"
              style={{ fontSize: 16, color: 'var(--color-text-primary)' }}
            >
              {t('mobile.unaffiliatedTitle')}
            </div>
            <p
              className="font-body"
              style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2, lineHeight: 1.4 }}
            >
              {t('mobile.unaffiliatedBody')}
            </p>
          </div>
        </section>
      )}

      {loading ? (
        <p className="font-body text-muted">{t('index.loading')}</p>
      ) : error ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">{error}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {visible.map((f) => (
            <Link
              key={f.slug}
              to={`/factions/${f.slug}`}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                minHeight: 118,
                padding: 12,
                borderRadius: 12,
                textDecoration: 'none',
                background: factionCssVar(f.slug),
                color: 'var(--color-text-on-accent)',
              }}
            >
              <span
                className="font-display italic font-medium"
                style={{ fontSize: 17, lineHeight: 1.05 }}
              >
                {factionName(f.slug)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
