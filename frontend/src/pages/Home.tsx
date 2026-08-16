import { useEffect, useState, type CSSProperties } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { listPraxes, createPraxis, type PraxisCardOut } from '../api/praxis'
import { listTasks, type TaskOut } from '../api/tasks'
import { useGameConfig } from '../hooks/useGameConfig'
import { devLogin } from '../api/auth'
import { computeFactionMultiplier } from '../utils/points'
import { extractError, messageForCode } from '../utils/errors'
import SignInOptions from '../components/SignInOptions'
import PraxisCard from '../components/praxisCard/PraxisCard'
import TaskCard from '../components/taskCard/TaskCard'
import ActivityTicker from '../components/ActivityTicker'

/** "Featured Praxis" / "Newest Task" header — marker title + rule + see-all link. */
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

/** Shared look for the oversized hand-lettered landing CTAs. */
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
   * The one notice `?login=` can raise, in either of its two meanings.
   *
   * `required` is `auth/ProtectedRoute`'s bounce and this page owns its words.
   * Anything else is an `ErrorCode` from a failed OAuth callback, which is a
   * top-level navigation and so has no response body to read (#1773) — the
   * `errors.json` catalog owns those words, exactly as it does for the same
   * code raised over XHR. Falls back for a code this build has never heard of,
   * which is what a frontend deployed ahead of the backend would meet.
   */
  const loginParam = searchParams.get('login')
  let loginNotice: string | null = null
  if (loginParam === 'required') loginNotice = t('loginRequired')
  else if (loginParam) loginNotice = messageForCode(loginParam) ?? t('loginFailed')

  const [feed, setFeed] = useState<PraxisCardOut[]>([])
  const [newestTask, setNewestTask] = useState<TaskOut | null>(null)
  const [signupMsg, setSignupMsg] = useState<string | null>(null)
  // The shared cache, not a second `/game-config` request (#1141). Derived, not
  // mirrored into state: empty until the payload lands, exactly as the old
  // `useState([])` was, so the featured task's multiplier settles at 1.0 first.
  const factionConfigs = useGameConfig()?.factions ?? []

  useEffect(() => {
    listPraxes({ status: 'submitted', limit: 8 }).then(setFeed).catch(() => setFeed([]))
    listTasks({ status: 'active', sort: 'newest', limit: 1 })
      .then((tasks) => setNewestTask(tasks[0] ?? null))
      .catch(() => setNewestTask(null))
  }, [])

  const handleSignup = async (id: number) => {
    setSignupMsg(null)
    try {
      const praxis = await createPraxis({ task_id: id, type: 'solo' })
      navigate(`/praxis/${praxis.id}/edit`)
    } catch (err) {
      setSignupMsg(extractError(err, t('signup.error')))
    }
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
      {loginNotice && (
        <p className="font-body content-text text-muted mt-6 border-2 border-border px-4 py-2 inline-block">
          {loginNotice}
        </p>
      )}

      {/* ── HERO ── */}
      <section className="relative text-center" style={{ padding: 'var(--space-5xl) var(--space-sm) var(--space-4xl)' }}>
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
              // Same two-layer rule as the nav wordmark, 6px instead of 2px:
              // the spectrum's four-stop cut (#1220, ADR-0066), not a ramp of
              // its own.
              backgroundImage:
                'linear-gradient(var(--color-bg-page), var(--color-bg-page)), var(--faction-default-total-rainbow)',
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
          style={{ fontFamily: 'var(--font-faction-script)', fontSize: 'var(--text-title)', lineHeight: 1.4, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3xl)', maxWidth: 560 }}
        >
          {t('hero.tagline')}
        </div>
        {/* The CTA slot. Signed in it is one button; signed out it is both ways
            in, side by side (#1773) — wrapping rather than shrinking, because
            the phone reaches this hero with no other logged-out control on the
            page (`MobileHeader` has none). */}
        <div className="relative flex flex-wrap justify-center items-center" style={{ gap: 'var(--space-lg)' }}>
          {user ? (
            <button
              onClick={() => navigate('/tasks')}
              className="btn-primary"
              style={{ ...markerButton, padding: 'var(--space-lg) var(--space-4xl)' }}
            >
              {t('hero.cta.loggedIn')}
            </button>
          ) : (
            <SignInOptions style={{ ...markerButton, padding: 'var(--space-lg) var(--space-2xl)' }} />
          )}
        </div>
        {!user && import.meta.env.DEV && (
          <div className="relative" style={{ marginTop: 'var(--space-lg)' }}>
            <button
              // The mirror image of sign-out, and the one case that genuinely
              // has to ask: `POST /auth/dev-login` sets the cookie and returns
              // nothing, so `/auth/me` is the only way to learn who that is.
              onClick={async () => { await devLogin(); await refetch() }}
              className="btn-outline"
              style={{ padding: 'var(--space-xs) var(--space-md)' }}
            >
              {t('hero.devLogin')}
            </button>
          </div>
        )}
      </section>

      {/* ── ACTIVITY TICKER (logged-in only — feed requires auth) ── */}
      {user && (
        <div style={{ marginBottom: 'var(--space-sm)' }}>
          <ActivityTicker />
        </div>
      )}

      {signupMsg && (
        <p className="font-body content-text mt-6 border-2 border-red-300 text-red-600 px-3 py-2">
          {signupMsg}
        </p>
      )}

      {/* ── FEATURED PRAXIS ── */}
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

      {/* ── NEWEST TASK ── */}
      {/* `scanning-surface`: home is a browsing surface (#1716), so a WOW card
          hangs its points upside down here. See index.css. */}
      <section className="scanning-surface" style={{ paddingTop: 'var(--space-4xl)' }}>
        <SectionHeader title={t('sections.newestTask.title')} href="/tasks" linkLabel={t('sections.newestTask.link')} />
        {newestTask ? (
          <TaskCard
            task={newestTask}
            basePoints={newestTask.point_value}
            multiplier={computeFactionMultiplier(
              user?.character?.faction_slug,
              newestTask.primary_faction_slug,
              factionConfigs,
            )}
            onSignup={user && newestTask.can_sign_up ? handleSignup : undefined}
          />
        ) : (
          <p className="font-body text-muted">{t('sections.newestTask.empty')}</p>
        )}
      </section>

      {/* ── CLOSING CTA ── */}
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
