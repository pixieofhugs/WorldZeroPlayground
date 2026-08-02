import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { listPraxes, createPraxis, type PraxisCardOut } from '../api/praxis'
import { listTasks, type TaskOut } from '../api/tasks'
import { useGameConfig } from '../hooks/useGameConfig'
import { useSidebarPanels } from '../hooks/useSidebarPanels'
import { loginWithGoogle, devLogin } from '../api/auth'
import { computeFactionMultiplier } from '../utils/points'
import { praxisModeLabel } from '../utils/praxis'
import { extractError } from '../utils/errors'
import PraxisCard from '../components/praxisCard/PraxisCard'
import TaskCard from '../components/taskCard/TaskCard'
import ActivityTicker from '../components/ActivityTicker'

/**
 * `/`'s page. Two genuinely different screens under one route (epic #1552, owner
 * ruling 2026-08-02): the marketing landing a guest sees, and the signed-in
 * desktop home the design draws — "continue where you left off" over a tabbed
 * browse. That split is deliberate and is NOT the form-factor duplication
 * ADR-0056/0058/0061/0065/0069 keep collapsing; the two screens are for
 * different things, not two dresses on one thing.
 *
 * WHAT THIS PAGE DOES NOT DRAW (#1557)
 * ------------------------------------
 * The design's page shell is a 1392px container holding
 * `grid-template-columns: 320px minmax(0, 1fr)` with a 36px gap and a sticky
 * rail. That grid is NOT this page's to own: `ShellContent` already renders the
 * rail beside `<main>` on every desktop route for a signed-in viewer, so a page
 * that drew its own column would mount a SECOND `Sidebar` — which the design
 * forbids in as many words ("do not build a second card for the home page").
 * This file therefore renders the MAIN COLUMN only, and the shell's container
 * numbers stay where they are until someone widens them for every route at once.
 */

/** How many cards each browse tab shows — two rows of the design's 2-up grid. */
const BROWSE_LIMIT = 4

/**
 * What each browse tab actually asks the server for.
 *
 * Exported because the two headings — "Tasks you can sign up for", "Praxes that
 * need your vote" — are promises, and an unfiltered list under either of them is
 * a bug that renders perfectly. The SSR test harness never runs effects, so a
 * render assertion cannot see the request; naming the filters here is what makes
 * the promise assertable at all.
 *
 * Neither carries a `status`. `can_sign_up` makes the SERVER evaluate its own
 * sign-up predicate (#1130), so an ability that bends the level bar — WOW's
 * once-a-level jump, the Ephemerists' retired-task access — is honoured here
 * without this page knowing a rule; pinning `status: 'active'` alongside it would
 * quietly cancel the second one. `voted: 'no'` is the feed's "needs my vote":
 * votable, unvoted, and never a praxis the account co-owns (ADR-0013).
 */
export const BROWSE_TASK_FILTERS = { can_sign_up: true, limit: BROWSE_LIMIT } as const
export const BROWSE_PRAXIS_FILTERS = { voted: 'no', limit: BROWSE_LIMIT } as const

/** The design's card surface: `--color-bg-surface`, 1px border, `--radius-xl`. */
const surfaceCard: CSSProperties = {
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-xl)',
  // 26px 28px in the design; the nearest rungs on the --space-* scale, keeping
  // the drawing's horizontal-wider-than-vertical direction (§4a, ties round up).
  padding: 'var(--space-xl) var(--space-2xl)',
}

/** 24px display-italic — `--text-title` is that value exactly. */
const sectionHeading: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
  fontSize: 'var(--text-title)',
  lineHeight: 1.1,
  color: 'var(--color-text-primary)',
  margin: 0,
}

/** The uppercase state line under a row's title, and the browse tab labels. */
const metaLine: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}

/**
 * A praxis score for a one-line meta stamp. Same rule the duel surfaces use:
 * whole numbers stay whole, anything else takes one decimal — never a raw float
 * with fifteen digits of arithmetic noise on it.
 */
function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/**
 * "Continue where you left off" — one row per in-progress praxis.
 *
 * Reads the rail's `active_praxes` rather than asking for its own list. That
 * panel is fetched ONCE for the whole app by `SidebarProvider`, in the first
 * wave alongside `/auth/me` (#1344), so this section costs ZERO requests and
 * cannot re-serialise anything. It is also exactly the right set: praxes the
 * carried character is a MEMBER of, which is what "where you left off" means
 * once an accepted collab invite counts.
 *
 * Hidden when there is nothing in flight. A card headed "continue where you left
 * off" with nothing under it is a control the viewer cannot use, and the rail's
 * own In Progress panel is already three inches to the left saying the same
 * nothing.
 */
function ContinueSection() {
  const { t } = useTranslation('home')
  const { t: tc } = useTranslation('common')
  const { active_praxes: inFlight } = useSidebarPanels()

  if (inFlight.length === 0) return null

  return (
    <section style={surfaceCard}>
      <h2 style={sectionHeading}>{t('signedIn.continue.heading')}</h2>
      <div>
        {inFlight.map((praxis, index) => (
          <ContinueRow key={praxis.id} praxis={praxis} first={index === 0} label={praxisModeLabel(praxis, tc)} />
        ))}
      </div>
    </section>
  )
}

function ContinueRow({
  praxis,
  first,
  label,
}: {
  praxis: PraxisCardOut
  first: boolean
  label: string
}) {
  const { t } = useTranslation('home')
  // A draft is still yours to edit; anything past that reads, it does not resume.
  const isDraft = praxis.status === 'in_progress'
  const meta = isDraft
    ? t('signedIn.continue.meta.draft', { points: formatPoints(praxis.score) })
    : t('signedIn.continue.meta.submitted', {
        points: formatPoints(praxis.score),
        count: praxis.voter_count,
      })

  return (
    <Link
      to={isDraft ? `/praxis/${praxis.id}/edit` : `/praxis/${praxis.id}`}
      className="flex items-center gap-3.5 hover:opacity-80"
      style={{
        textDecoration: 'none',
        paddingTop: 'var(--space-lg)',
        paddingBottom: 'var(--space-lg)',
        borderTop: first ? undefined : '1px solid var(--color-border)',
      }}
    >
      {/* The one na conic, at the size it is cut for (ADR-0066): a 10px dot
          would smear the 90deg ramp into mud. */}
      <span
        aria-hidden="true"
        className="shrink-0 rounded-full"
        style={{ width: 10, height: 10, background: 'var(--faction-default-rainbow-conic)' }}
      />
      <span className="min-w-0 flex-1">
        <span
          className="font-display block truncate"
          style={{ fontSize: 'var(--text-content)', lineHeight: 1.25, color: 'var(--color-text-primary)' }}
        >
          {praxis.task_title}
        </span>
        <span style={{ ...metaLine, display: 'block', marginTop: 'var(--space-xs)' }}>{meta}</span>
      </span>
      <span
        className="shrink-0"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--faction-default-card-muted)',
          padding: 'var(--space-xs) var(--space-sm)',
          border: '1px solid var(--color-border-strong)',
          borderRadius: 999,
        }}
      >
        {label}
      </span>
    </Link>
  )
}

/** Which half of the browse section is showing. */
type BrowseTab = 'tasks' | 'praxis'

const BROWSE_TABS: readonly BrowseTab[] = ['tasks', 'praxis']

/** Where each tab's "See more" goes — the design's own table. */
const SEE_MORE_HREF: Record<BrowseTab, string> = {
  tasks: '/tasks',
  praxis: '/praxis',
}

/**
 * The tabbed browse section.
 *
 * BOTH TABS LAND ON ALREADY-NARROWED DATA, because both headings promise it.
 * `can_sign_up` (#1130) makes the server evaluate its own sign-up predicate, so
 * a faction ability that bends the level bar is honoured without this page
 * knowing any rule — which is also why no `status` rides along: adding one would
 * quietly cancel the Ephemerists' retired-task access. `voted: 'no'` is the feed's
 * "needs my vote" (votable, unvoted, and not co-owned by the account — ADR-0013).
 *
 * One request per tab, made when the tab is first shown and never again: the
 * landing tab costs one, and the other costs nothing until it is asked for.
 */
function BrowseSection({ onSignup }: { onSignup: (taskId: number) => void }) {
  const { t } = useTranslation('home')
  const { user } = useAuth()
  const [tab, setTab] = useState<BrowseTab>('tasks')
  // `null` = never fetched, `[]` = fetched and empty. The pair is what makes the
  // fetch-once-per-tab rule expressible without a second flag.
  const [tasks, setTasks] = useState<TaskOut[] | null>(null)
  const [praxes, setPraxes] = useState<PraxisCardOut[] | null>(null)
  const factionConfigs = useGameConfig()?.factions ?? []

  useEffect(() => {
    if (tab !== 'tasks' || tasks !== null) return
    let cancelled = false
    listTasks(BROWSE_TASK_FILTERS)
      .then((rows) => { if (!cancelled) setTasks(rows) })
      .catch(() => { if (!cancelled) setTasks([]) })
    return () => { cancelled = true }
  }, [tab, tasks])

  useEffect(() => {
    if (tab !== 'praxis' || praxes !== null) return
    let cancelled = false
    listPraxes(BROWSE_PRAXIS_FILTERS)
      .then((rows) => { if (!cancelled) setPraxes(rows) })
      .catch(() => { if (!cancelled) setPraxes([]) })
    return () => { cancelled = true }
  }, [tab, praxes])

  const items = tab === 'tasks' ? tasks : praxes

  return (
    <section>
      {/* Heading, tab switch and "See more" on one row (the design's own line). */}
      <div className="flex items-center gap-4 flex-wrap" style={{ marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ ...sectionHeading, flex: 1 }}>{t(`signedIn.browse.headings.${tab}`)}</h2>
        <div
          className="inline-flex items-center shrink-0"
          style={{
            background: 'var(--color-bg-surface-alt)',
            border: '1px solid var(--color-border)',
            borderRadius: 999,
            padding: 'var(--space-xs)',
          }}
        >
          {BROWSE_TABS.map((candidate) => {
            const active = candidate === tab
            return (
              <button
                key={candidate}
                type="button"
                onClick={() => setTab(candidate)}
                aria-pressed={active}
                style={{
                  ...metaLine,
                  // Pill geometry, not spacing off the scale — `height` is
                  // ornament measure and stays the drawn 34px.
                  height: 34,
                  padding: '0 var(--space-lg)',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  // The active pill inverts: text ground, page ink.
                  background: active ? 'var(--color-text-primary)' : 'transparent',
                  color: active ? 'var(--color-bg-page)' : 'var(--color-text-secondary)',
                  transition: 'background 150ms, color 150ms',
                }}
              >
                {t(`signedIn.browse.tabs.${candidate}`)}
              </button>
            )
          })}
        </div>
        <Link
          to={SEE_MORE_HREF[tab]}
          className="shrink-0 hover:opacity-80"
          style={{ ...metaLine, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {t('signedIn.browse.seeMore')} →
        </Link>
      </div>

      {items === null ? (
        <p className="font-body text-muted">{t('signedIn.browse.loading')}</p>
      ) : items.length === 0 ? (
        <p className="font-body text-muted">{t(`signedIn.browse.empty.${tab}`)}</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 'var(--space-lg)',
            alignItems: 'start',
          }}
        >
          {tab === 'tasks'
            ? (items as TaskOut[]).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  basePoints={task.point_value}
                  multiplier={computeFactionMultiplier(
                    user?.character?.faction_slug,
                    task.primary_faction_slug,
                    factionConfigs,
                  )}
                  inProgressCount={task.in_progress_count ?? 0}
                  onSignup={onSignup}
                />
              ))
            : (items as PraxisCardOut[]).map((praxis) => (
                <PraxisCard key={praxis.id} praxis={praxis} />
              ))}
        </div>
      )}
    </section>
  )
}

/** The signed-in desktop home: continue-where-you-left-off over a tabbed browse. */
function SignedInHome({
  onSignup,
  signupMsg,
}: {
  onSignup: (taskId: number) => void
  signupMsg: string | null
}) {
  return (
    <div
      className="flex flex-col"
      style={{ gap: 'var(--space-2xl)', paddingTop: 'var(--space-2xl)', paddingBottom: 'var(--space-5xl)' }}
    >
      {signupMsg && (
        <p className="font-body content-text border-2 border-red-300 text-red-600 px-3 py-2">
          {signupMsg}
        </p>
      )}
      <ContinueSection />
      <BrowseSection onSignup={onSignup} />
    </div>
  )
}

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
  fontSize: 'var(--text-content)',
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
  const [signupMsg, setSignupMsg] = useState<string | null>(null)
  // The shared cache, not a second `/game-config` request (#1141). Derived, not
  // mirrored into state: empty until the payload lands, exactly as the old
  // `useState([])` was, so the featured task's multiplier settles at 1.0 first.
  const factionConfigs = useGameConfig()?.factions ?? []
  const signedIn = Boolean(user)

  useEffect(() => {
    // The guest landing's two lists. A signed-in viewer gets the home above,
    // which reads a different pair, so neither request is made for them.
    if (signedIn) return
    listPraxes({ status: 'submitted', limit: 8 }).then(setFeed).catch(() => setFeed([]))
    listTasks({ status: 'active', sort: 'newest', limit: 1 })
      .then((tasks) => setNewestTask(tasks[0] ?? null))
      .catch(() => setNewestTask(null))
  }, [signedIn])

  const handleSignup = async (id: number) => {
    setSignupMsg(null)
    try {
      const praxis = await createPraxis({ task_id: id, type: 'solo' })
      navigate(`/praxis/${praxis.id}/edit`)
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

  // The redesigned home (#1557). Everything below this line is the marketing
  // landing, left exactly as it was — including its `user &&` branches, which a
  // guest never satisfies but which are not this issue's to prune.
  if (signedIn) return <SignedInHome onSignup={handleSignup} signupMsg={signupMsg} />

  return (
    <div className="pb-12">
      {loginRequired && (
        <p className="font-body content-text text-muted mt-6 border-2 border-border px-4 py-2 inline-block">
          {t('loginRequired')}
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
        <button
          onClick={handlePrimaryCta}
          className="btn-primary relative"
          style={{ ...markerButton, padding: 'var(--space-lg) var(--space-4xl)' }}
        >
          {user ? t('hero.cta.loggedIn') : t('hero.cta.loggedOut')}
        </button>
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
      <section style={{ paddingTop: 'var(--space-4xl)' }}>
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
