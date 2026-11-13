import { useEffect, useState, type CSSProperties } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { listPraxes, type PraxisCardOut } from '../api/praxis'
import { listTasks, type TaskOut } from '../api/tasks'
import { useTaskSignup } from '../hooks/useTaskSignup'
import { devLogin } from '../api/auth'
import { messageForCode } from '../utils/errors'
import PraxisCard from '../components/praxisCard/PraxisCard'
import TaskCard from '../components/taskCard/TaskCard'
import ActivityTicker from '../components/ActivityTicker'
// Caveat + Permanent Marker live in the lazy faction sheet (#2079); Home
// dispatches no archetype, so it must ask for them itself.
import '../factionFaces'

function SectionHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center gap-5 mb-6">
      <div
        style={{
          fontFamily: 'var(--font-faction-marker)',
          fontSize: 'var(--text-heading)',
          lineHeight: 1,
          color: 'var(--color-text-primary)',
        }}
      >
        {title}
      </div>
      <div className="flex-1" style={{ height: 1, background: 'var(--color-border)' }} />
      <button
        onClick={() => navigate(href)}
        className="label-caption"
        style={{ background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        {linkLabel} →
      </button>
    </div>
  )
}

const markerButton: CSSProperties = {
  fontFamily: 'var(--font-faction-marker)',
  fontSize: 'var(--text-content)',
  textTransform: 'none',
  letterSpacing: '0.03em',
}

export default function Home() {
  const { t } = useTranslation('home')
  const { user, refetch } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  /**
   * `?login=required` is ProtectedRoute's bounce; anything else is an
   * `ErrorCode` from a failed OAuth callback (#1773), worded by `errors.json`,
   * with a fallback for codes this build doesn't know.
   */
  const loginParam = searchParams.get('login')
  let loginNotice: string | null = null
  if (loginParam === 'required') loginNotice = t('loginRequired')
  else if (loginParam) loginNotice = messageForCode(loginParam) ?? t('loginFailed')

  const [feed, setFeed] = useState<PraxisCardOut[]>([])
  const [newestTask, setNewestTask] = useState<TaskOut | null>(null)
  const { signupMsg, handleSignup } = useTaskSignup()
  useEffect(() => {
    listPraxes({ status: 'submitted', limit: 8 }).then(setFeed).catch(() => setFeed([]))
    listTasks({ status: 'active', sort: 'newest', limit: 1 })
      .then((tasks) => setNewestTask(tasks[0] ?? null))
      .catch(() => setNewestTask(null))
  }, [])

  const handleRandomTask = async () => {
    try {
      const tasks = await listTasks({ status: 'active' })
      if (tasks.length > 0) {
        const pick = tasks[Math.floor(Math.random() * tasks.length)]
        navigate(`/tasks/${pick.id}`)
        return
      }
    } catch {
      /* fall through to the tasks page */
    }
    navigate('/tasks')
  }

  return (
    <div className="pb-12">
      {loginNotice && (
        <p className="font-body content-text text-muted mt-6 border-2 border-border px-4 py-2 inline-block">
          {loginNotice}
        </p>
      )}

      <section className="relative text-center" style={{ padding: 'var(--space-5xl) var(--space-sm) var(--space-4xl)' }}>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse 900px 480px at 50% 38%, var(--color-bg-surface) 0%, transparent 70%)',
          }}
        />
        <div
          className="relative"
          style={{ fontFamily: 'var(--font-faction-script)', fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)', letterSpacing: '0.06em' }}
        >
          {t('hero.eyebrow')}
        </div>
        <div className="relative" style={{ marginBottom: 'var(--space-lg)' }}>
          <span
            className="font-display italic"
            style={{
              fontSize: 'clamp(56px, 12vw, 124px)',
              lineHeight: 0.9,
              color: 'var(--color-text-primary)',
              display: 'inline-block',
              paddingBottom: 'var(--space-sm)',
              // The nav wordmark's rule at 6px (ADR-0066). One layer, no
              // page-ground mask: that showed as a slab (#3100).
              backgroundImage: 'var(--faction-default-total-rainbow)',
              backgroundSize: '100% 6px',
              backgroundPosition: 'bottom',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {t('hero.wordmark')}
          </span>
        </div>
        <div
          className="relative mx-auto"
          style={{ fontFamily: 'var(--font-faction-script)', fontSize: 'var(--text-title)', lineHeight: 1.4, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3xl)', maxWidth: 560 }}
        >
          {t('hero.tagline')}
        </div>
        {/* Signed out, this leads into the onboarding arc, not a provider
            (#1861); `/start` offers the providers. */}
        <div className="relative flex flex-wrap justify-center items-center" style={{ gap: 'var(--space-lg)' }}>
          <button
            onClick={() => navigate(user ? '/tasks' : '/start')}
            className="btn-primary"
            style={{ ...markerButton, padding: 'var(--space-lg) var(--space-4xl)' }}
            data-testid="home-hero-cta"
          >
            {user ? t('hero.cta.loggedIn') : t('hero.cta.loggedOut')}
          </button>
        </div>
        {!user && import.meta.env.DEV && (
          <div className="relative" style={{ marginTop: 'var(--space-lg)' }}>
            <button
              // dev-login returns nothing, so `/auth/me` must be asked.
              onClick={async () => { await devLogin(); await refetch() }}
              className="btn-outline"
              style={{ padding: 'var(--space-xs) var(--space-md)' }}
            >
              {t('hero.devLogin')}
            </button>
          </div>
        )}
      </section>

      {/* The feed requires auth. */}
      {user && (
        <div style={{ marginBottom: 'var(--space-sm)' }}>
          <ActivityTicker />
        </div>
      )}

      {signupMsg && (
        <p className="font-body content-text mt-6 border-2 danger-edge danger-text px-3 py-2">
          {signupMsg}
        </p>
      )}

      <section style={{ paddingTop: 'var(--space-4xl)' }}>
        <SectionHeader title={t('sections.featuredPraxis.title')} href="/praxis" linkLabel={t('sections.featuredPraxis.link')} />
        {feed.length === 0 ? (
          <p className="font-body text-muted">{t('sections.featuredPraxis.empty')}</p>
        ) : (
          <div className="flex flex-wrap gap-5 items-start">
            {feed.map((p) => <PraxisCard key={p.id} praxis={p} />)}
          </div>
        )}
      </section>

      <section style={{ paddingTop: 'var(--space-4xl)' }}>
        <SectionHeader title={t('sections.newestTask.title')} href="/tasks" linkLabel={t('sections.newestTask.link')} />
        {newestTask ? (
          <TaskCard
            task={newestTask}
            basePoints={newestTask.point_value}
            multiplier={newestTask.viewer_faction_multiplier}
            // The card reads `signup_reason` itself (#1976).
            onSignup={user ? handleSignup : undefined}
          />
        ) : (
          <p className="font-body text-muted">{t('sections.newestTask.empty')}</p>
        )}
      </section>

      <section className="text-center" style={{ paddingTop: 'var(--space-5xl)' }}>
        <div
          style={{ fontFamily: 'var(--font-faction-marker)', fontSize: 'var(--text-heading)', lineHeight: 1.1, color: 'var(--color-text-primary)', marginBottom: 'var(--space-xl)', transform: 'rotate(-1.2deg)' }}
        >
          {t('closing.prompt')}
        </div>
        <button
          onClick={handleRandomTask}
          className="btn-outline"
          style={{ ...markerButton, padding: 'var(--space-lg) var(--space-4xl)' }}
        >
          {t('closing.randomTask')}
        </button>
      </section>
    </div>
  )
}
