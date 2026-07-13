import { useEffect, useState, type CSSProperties } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { listPraxes, createPraxis, type PraxisCardOut } from '../api/praxis'
import { listTasks, type TaskOut } from '../api/tasks'
import { getGameConfig, type FactionConfigOut } from '../api/gameConfig'
import { loginWithGoogle, devLogin } from '../api/auth'
import { computeDisplayPoints } from '../utils/points'
import { extractError } from '../utils/errors'
import PraxisCard from '../components/PraxisCard'
import TaskCard from '../components/TaskCard'
import ActivityTicker from '../components/home/ActivityTicker'

/** "Featured Praxis" / "Newest Task" header — marker title + rule + see-all link. */
function SectionHeader({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center gap-5 mb-6">
      <div
        style={{
          fontFamily: 'var(--font-faction-marker)',
          fontSize: 32,
          lineHeight: 1,
          color: 'var(--color-text-primary)',
        }}
      >
        {title}
      </div>
      <div className="flex-1" style={{ height: 1, background: 'var(--color-border)' }} />
      <button
        onClick={() => navigate(href)}
        className="eyebrow"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}
      >
        {linkLabel} →
      </button>
    </div>
  )
}

/** Shared look for the oversized hand-lettered landing CTAs. */
const markerButton: CSSProperties = {
  fontFamily: 'var(--font-faction-marker)',
  fontSize: 18,
  textTransform: 'none',
  letterSpacing: '0.03em',
}

export default function Home() {
  const { t } = useTranslation('home')
  const { user, refetch } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const loginRequired = searchParams.get('login') === 'required'

  const [feed, setFeed] = useState<PraxisCardOut[]>([])
  const [newestTask, setNewestTask] = useState<TaskOut | null>(null)
  const [factionConfigs, setFactionConfigs] = useState<FactionConfigOut[]>([])
  const [signupMsg, setSignupMsg] = useState<string | null>(null)

  useEffect(() => {
    getGameConfig().then((c) => setFactionConfigs(c.factions)).catch(() => {})
    listPraxes({ status: 'submitted', limit: 8 }).then(setFeed).catch(() => setFeed([]))
    listTasks({ status: 'active', sort: 'newest', limit: 1 })
      .then((tasks) => setNewestTask(tasks[0] ?? null))
      .catch(() => setNewestTask(null))
  }, [])

  const handleSignup = async (id: number) => {
    setSignupMsg(null)
    try {
      const praxis = await createPraxis({ task_id: id, type: 'solo' })
      navigate(`/praxes/${praxis.id}/edit`)
    } catch (err) {
      setSignupMsg(extractError(err, t('signup.error')))
    }
  }

  const handlePrimaryCta = () => {
    if (user) navigate('/tasks')
    else loginWithGoogle()
  }

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
      {loginRequired && (
        <p className="font-body text-sm text-muted mt-6 border-2 border-border px-4 py-2 inline-block">
          {t('loginRequired')}
        </p>
      )}

      {/* ── HERO ── */}
      <section className="relative text-center" style={{ padding: '72px 8px 56px' }}>
        {/* Faint spotlight behind the wordmark */}
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
          style={{ fontFamily: 'var(--font-faction-script)', fontSize: 20, color: 'var(--color-text-secondary)', marginBottom: 16, letterSpacing: '0.06em' }}
        >
          {t('hero.eyebrow')}
        </div>
        <div className="relative" style={{ marginBottom: 18 }}>
          <span
            className="font-display italic"
            style={{
              fontSize: 'clamp(56px, 12vw, 124px)',
              lineHeight: 0.9,
              color: 'var(--color-text-primary)',
              display: 'inline-block',
              paddingBottom: 6,
              backgroundImage:
                'linear-gradient(var(--color-bg-page), var(--color-bg-page)), linear-gradient(90deg, var(--underline-3), var(--underline-2), var(--underline-6), var(--underline-5))',
              backgroundSize: '100% calc(100% - 6px), 100% 6px',
              backgroundPosition: 'top, bottom',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {t('hero.wordmark')}
          </span>
        </div>
        <div
          className="relative mx-auto"
          style={{ fontFamily: 'var(--font-faction-script)', fontSize: 28, lineHeight: 1.4, color: 'var(--color-text-secondary)', marginBottom: 40, maxWidth: 560 }}
        >
          {t('hero.tagline')}
        </div>
        <button
          onClick={handlePrimaryCta}
          className="btn-primary relative"
          style={{ ...markerButton, padding: '14px 48px' }}
        >
          {user ? t('hero.cta.loggedIn') : t('hero.cta.loggedOut')}
        </button>
        {!user && import.meta.env.DEV && (
          <div className="relative" style={{ marginTop: 14 }}>
            <button
              onClick={async () => { await devLogin(); await refetch() }}
              className="btn-outline"
              style={{ padding: '0.25rem 0.75rem' }}
            >
              {t('hero.devLogin')}
            </button>
          </div>
        )}
      </section>

      {/* ── ACTIVITY TICKER (logged-in only — feed requires auth) ── */}
      {user && (
        <div style={{ marginBottom: 8 }}>
          <ActivityTicker />
        </div>
      )}

      {signupMsg && (
        <p className="font-body text-sm mt-6 border-2 border-red-300 text-red-600 px-3 py-2">
          {signupMsg}
        </p>
      )}

      {/* ── FEATURED PRAXIS ── */}
      <section style={{ paddingTop: 48 }}>
        <SectionHeader title={t('sections.featuredPraxis.title')} href="/praxes" linkLabel={t('sections.featuredPraxis.link')} />
        {feed.length === 0 ? (
          <p className="font-body text-muted">{t('sections.featuredPraxis.empty')}</p>
        ) : (
          <div className="flex flex-wrap gap-5 items-start">
            {feed.map((p) => <PraxisCard key={p.id} praxis={p} />)}
          </div>
        )}
      </section>

      {/* ── NEWEST TASK ── */}
      <section style={{ paddingTop: 48 }}>
        <SectionHeader title={t('sections.newestTask.title')} href="/tasks" linkLabel={t('sections.newestTask.link')} />
        {newestTask ? (
          <TaskCard
            task={newestTask}
            displayPoints={computeDisplayPoints(
              newestTask.point_value,
              user?.character?.faction_slug,
              newestTask.primary_faction_slug,
              factionConfigs,
            )}
            onSignup={user && newestTask.can_submit_praxis ? handleSignup : undefined}
          />
        ) : (
          <p className="font-body text-muted">{t('sections.newestTask.empty')}</p>
        )}
      </section>

      {/* ── CLOSING CTA ── */}
      <section className="text-center" style={{ paddingTop: 64 }}>
        <div
          style={{ fontFamily: 'var(--font-faction-marker)', fontSize: 36, lineHeight: 1.1, color: 'var(--color-text-primary)', marginBottom: 24, transform: 'rotate(-1.2deg)' }}
        >
          {t('closing.prompt')}
        </div>
        <button
          onClick={handleRandomTask}
          className="btn-outline"
          style={{ ...markerButton, padding: '14px 52px' }}
        >
          {t('closing.randomTask')}
        </button>
      </section>
    </div>
  )
}
