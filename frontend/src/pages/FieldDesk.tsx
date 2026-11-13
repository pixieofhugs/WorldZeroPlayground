import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { getMyCharacters, setActiveCharacter } from '../api/me'
import { listPraxes, type PraxisCardOut } from '../api/praxis'
import { listTasks, type TaskOut } from '../api/tasks'
import type { CharacterOut } from '../api/auth'
import CredentialCard from '../components/CredentialCard'
import AlbescentInvitation from '../components/AlbescentInvitation'
import PraxisCard from '../components/praxisCard/PraxisCard'
import TaskCard from '../components/taskCard/TaskCard'
import { mediaUrl } from '../utils/media'
import { resolveVariant } from '../utils/factionDispatch'
import { formatPoints } from '../utils/points'
import { praxisModeLabel } from '../utils/praxis'
import { surfaceMap } from '../factions'
import { useFormFactor } from '../hooks/useFormFactor'
import { useTaskSignup } from '../hooks/useTaskSignup'
import { useSidebarPanels } from '../hooks/useSidebarPanels'
import { rosterOffersAChoice } from '../hooks/useRosterChoice'
import { useFieldDeskHome } from './fieldDesk/useFieldDeskHome'

/**
 * FieldDesk — the authenticated home at `/` (#274). On a phone with a carried
 * life it dispatches to the `mobileFieldDesk` skin (#500).
 *
 * Desktop answers two questions in order (#1557): "whose shoes today?" (the
 * roster, the ONLY desktop path to switching character) then "what do I do
 * now?" (continue + browse, both scoped to the carried life).
 *
 * The ROSTER SECTION is gated, not the route (#1560): a second life must not be
 * advertised before `second_character_level_required`, so chip, cards, dossier
 * and closing line hide as one piece via `rosterOffersAChoice`. Zero lives
 * always sees it, or signup dead-ends. The `<h1>` stays outside (#1794), as
 * does the Albescent letter (#395: converts a life, has its own server flag).
 *
 * No page shell / second rail here: `ShellContent` owns the rail, and it
 * scrolls with the page (#1191).
 */

const TILTS = [-2.5, 1.8, -1.2, 2.4, -2.0, 1.4]

export default function FieldDesk() {
  const { t } = useTranslation('common')
  const { user, applyUser } = useAuth()
  const navigate = useNavigate()
  // `null` = not loaded yet, distinct from empty for the gate.
  const [lives, setLives] = useState<CharacterOut[] | null>(null)
  const [switching, setSwitching] = useState<number | null>(null)
  const { signupMsg, handleSignup } = useTaskSignup()

  const formFactor = useFormFactor()
  const homeState = useFieldDeskHome(lives)

  useEffect(() => {
    void getMyCharacters()
      .then(setLives)
      // Must resolve to a known roster, or a new account never sees "begin".
      .catch(() => setLives([]))
  }, [])

  const enterLife = async (id: number) => {
    setSwitching(id)
    try {
      // The POST returns the refreshed `CurrentUser` (#1383).
      applyUser(await setActiveCharacter(id))
      navigate(`/characters/${id}`)
    } finally {
      setSwitching(null)
    }
  }

  const active = user?.character ?? null
  const carriesALife = Boolean(user?.character)
  const canCreateAdditional = user?.can_create_additional_character ?? false
  // First life is always free; otherwise the server-computed flag is authoritative.
  const canBeginNewSelf = lives !== null && (lives.length === 0 || canCreateAdditional)
  const showRoster = rosterOffersAChoice(lives, carriesALife, canCreateAdditional)
  // Before the roster lands, a carried life proves at least one exists.
  const drawerEmpty = lives === null ? !carriesALife : lives.length === 0
  // The page's <h1>, always present (#1794). With the roster hidden it names
  // the carried life; the `&&` is for the type-checker.
  const heading = !showRoster && active
    ? active.display_name || `@${active.username}`
    : drawerEmpty ? t('fieldDesk.headingFirstLife') : t('fieldDesk.heading')

  if (formFactor === 'mobile' && homeState) {
    const Skin = resolveVariant(surfaceMap('mobileFieldDesk'), homeState.character.faction_slug)
    return <Skin state={homeState} />
  }

  return (
    <div className="page">
      {/* Inside the gate: a lives count invites making it bigger. */}
      {showRoster && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-sm)' }}>
          {active && lives !== null && (
            <div style={pillStyle}>
              {active.avatar_url ? (
                <img src={mediaUrl(active.avatar_url)} alt={active.display_name} style={pillAvatar} />
              ) : (
                <span style={{ ...pillAvatar, display: 'inline-block' }} />
              )}
              <span style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)' }}>
                @{active.username} ·{' '}
                <b style={{ color: 'var(--color-text-primary)' }}>
                  {t('fieldDesk.livesInPlay', { count: lives.length })}
                </b>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Outside the gate (#1794). Box shrinks to the title, rule fills it
          (#3097); maxWidth caps a 50-char unbroken name. */}
      <div style={{ width: 'fit-content', maxWidth: '100%' }}>
        <h1 style={headingStyle}>{heading}</h1>
        <div aria-hidden style={rainbowUnderline} />
      </div>

      {showRoster &&
        (lives === null ? (
          <p className="font-body text-muted" style={{ marginTop: 'var(--space-xl)' }}>{t('fieldDesk.loading')}</p>
        ) : (
          <div style={rosterRow}>
            {lives.map((life, index) => (
              <RosterLifeCard
                key={life.id}
                life={life}
                rotation={TILTS[index % TILTS.length]}
                switching={switching != null}
                onEnter={() => enterLife(life.id)}
              />
            ))}

            {canBeginNewSelf && <NewSelfDossier onBegin={() => navigate('/characters/create')} />}
          </div>
        ))}

      {/* Albescent invitation (#395, ADR-0021); no faction link (ADR-0027).
          Outside the roster gate. */}
      {lives !== null && (user?.can_start_as_albescent ?? false) && (
        <AlbescentInvitation
          lives={lives}
          onJoined={async () => {
            // User flags come back on the join POST (#1383); only the
            // roster needs re-reading.
            setLives(await getMyCharacters())
          }}
        />
      )}

      {showRoster && lives !== null && (
        <p style={footerHint}>{t(rosterFooterKey(lives.length, canCreateAdditional))}</p>
      )}

      {/* "What do I do now?" (#1557) */}
      <div className="flex flex-col" style={{ gap: 'var(--space-2xl)', marginTop: 'var(--space-4xl)' }}>
        {signupMsg && (
          <p className="font-body content-text border-2 danger-edge danger-text px-3 py-2">
            {signupMsg}
          </p>
        )}
        <ContinueSection />
        <BrowseSection onSignup={handleSignup} />
      </div>
    </div>
  )
}

type FooterKey = 'fieldDesk.footer' | 'fieldDesk.footerFirstLife' | 'fieldDesk.footerNoNewSelf'

/** The roster's closing line names only the offers it makes (#1560). */
export function rosterFooterKey(lifeCount: number, canCreateAdditional: boolean): FooterKey {
  if (lifeCount === 0) return 'fieldDesk.footerFirstLife'
  return canCreateAdditional ? 'fieldDesk.footer' : 'fieldDesk.footerNoNewSelf'
}

/**
 * One roster life: the card that steps into it plus an Edit door (#2552),
 * placed as on the phone. The door is a sibling of the card button (an anchor
 * inside a button is invalid DOM). Every card is the viewer's own
 * (`getMyCharacters`), so no ownership branch. Exported for its SSR test.
 */
export function RosterLifeCard({
  life,
  rotation,
  switching,
  onEnter,
}: {
  life: CharacterOut
  rotation: number
  /** True while ANY life is being stepped into — the whole roster goes inert. */
  switching: boolean
  onEnter: () => void
}) {
  const { t } = useTranslation('common')
  return (
    <div>
      {/* "Edit" alone is fine: WCAG 2.4.4 is purpose in context (the card). */}
      <div style={rosterEditRow}>
        <Link
          to={`/characters/${life.id}/edit`}
          className="hover:opacity-80 active:opacity-60"
          style={rosterEditPill}
        >
          {t('sidebar.characterCard.edit')}
        </Link>
      </div>
      <button
        type="button"
        onClick={onEnter}
        disabled={switching}
        className="fielddesk-life"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        title={t('fieldDesk.stepInto', { name: life.display_name })}
      >
        <CredentialCard
          displayName={life.display_name}
          handle={life.username}
          factionSlug={life.faction_slug}
          level={life.level}
          score={life.score}
          avatarUrl={mediaUrl(life.avatar_url)}
          rotation={rotation}
        />
      </button>
    </div>
  )
}

/** "Begin a new self". No locked face (#1560): the caller mounts it or not. */
function NewSelfDossier({ onBegin }: { onBegin: () => void }) {
  const { t } = useTranslation('common')
  return (
    <button type="button" onClick={onBegin} style={dossierUnlocked} title={t('fieldDesk.beginNewSelfTitle')}>
      <div style={folderTab} />
      <div style={medallion}>+</div>
      <div className="content-title" style={dossierTitle}>
        {t('fieldDesk.beginNewSelf')}
      </div>
    </button>
  )
}

/** Two rows of the design's 2-up grid. */
const BROWSE_LIMIT = 4

/**
 * Browse tab filters, exported so tests can assert the headings' promises.
 * No `status`: `can_sign_up` runs the server's own predicate (#1130), which
 * faction abilities bend; `status: 'active'` would cancel retired-task access.
 * `voted: 'no'` excludes co-owned praxes (ADR-0013).
 */
export const BROWSE_TASK_FILTERS = { can_sign_up: true, limit: BROWSE_LIMIT } as const
export const BROWSE_PRAXIS_FILTERS = { voted: 'no', limit: BROWSE_LIMIT } as const

const surfaceCard: CSSProperties = {
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-xl)',
  // Design 26px 28px, nearest --space-* rungs (§4a, ties round up).
  padding: 'var(--space-xl) var(--space-2xl)',
}

const sectionHeading: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
  fontSize: 'var(--text-title)',
  lineHeight: 1.1,
  color: 'var(--color-text-primary)',
  margin: 0,
}

const metaLine: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}

/**
 * "Continue where you left off". Reads the rail's `active_praxes` (fetched once
 * by `SidebarProvider`, #1344), so it costs zero requests. Hidden when empty.
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
      {/* The na conic, cut for this size (ADR-0066). */}
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
          fontSize: 'var(--text-md)',
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

type BrowseTab = 'tasks' | 'praxis'

const BROWSE_TABS: readonly BrowseTab[] = ['tasks', 'praxis']

const SEE_MORE_HREF: Record<BrowseTab, string> = {
  tasks: '/tasks',
  praxis: '/praxis',
}

/** Tabbed browse. One request per tab, on first show only. */
function BrowseSection({ onSignup }: { onSignup: (taskId: number) => void }) {
  const { t } = useTranslation(['home', 'common'])
  const { user } = useAuth()
  const [pickedTab, setTab] = useState<BrowseTab>('tasks')
  // #3169: `=== false` so a missing field is not gated. No vote, no praxis tab.
  const tabs = user?.can_vote === false ? BROWSE_TABS.filter((c) => c !== 'praxis') : BROWSE_TABS
  const tab = tabs.includes(pickedTab) ? pickedTab : 'tasks'
  // `null` = never fetched, `[]` = fetched and empty.
  const [tasks, setTasks] = useState<TaskOut[] | null>(null)
  const [praxes, setPraxes] = useState<PraxisCardOut[] | null>(null)

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
      <div className="flex items-center gap-4 flex-wrap" style={{ marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ ...sectionHeading, flex: 1 }}>{t(`signedIn.browse.headings.${tab}`)}</h2>
        {tabs.length > 1 && <div
          className="inline-flex items-center shrink-0"
          style={{
            background: 'var(--color-bg-surface-alt)',
            border: '1px solid var(--color-border)',
            borderRadius: 999,
            padding: 'var(--space-xs)',
          }}
        >
          {tabs.map((candidate) => {
            const active = candidate === tab
            return (
              <button
                key={candidate}
                type="button"
                onClick={() => setTab(candidate)}
                aria-pressed={active}
                style={{
                  ...metaLine,
                  // Pill geometry, not spacing.
                  height: 34,
                  padding: '0 var(--space-lg)',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? 'var(--color-text-primary)' : 'transparent',
                  color: active ? 'var(--color-bg-page)' : 'var(--color-text-secondary)',
                  transition: 'background 150ms, color 150ms',
                }}
              >
                {t(`signedIn.browse.tabs.${candidate}`)}
              </button>
            )
          })}
        </div>}
        <Link
          to={SEE_MORE_HREF[tab]}
          className="shrink-0 hover:opacity-80"
          style={{ ...metaLine, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {t('signedIn.browse.seeMore')} →
        </Link>
      </div>

      {items === null ? (
        <p className="font-body text-muted">{t('common:loading')}</p>
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
                  multiplier={task.viewer_faction_multiplier}
                  inProgressCount={task.in_progress_count}
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

const pillStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 999,
  padding: 'var(--space-xs) var(--space-md) var(--space-xs) var(--space-xs)',
}
const pillAvatar: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: '50%',
  objectFit: 'cover',
  background: 'var(--color-bg-surface-alt)',
}
// Size comes from .content-title.
const dossierTitle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
  fontWeight: 700,
  color: 'var(--color-text-primary)',
}
const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
  fontWeight: 700,
  fontSize: 'var(--text-display)',
  lineHeight: 1,
  color: 'var(--color-text-primary)',
  margin: 0,
  overflowWrap: 'anywhere',
}
// Stops were cut for 220px (ADR-0066); it now spans the heading width and
// stretches (#3097, accepted). Do not re-cut the stops to compensate.
const rainbowUnderline: CSSProperties = {
  height: 4,
  marginTop: 'var(--space-sm)',
  borderRadius: 2,
  background: 'var(--faction-default-total-rainbow)',
}
const rosterRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--space-2xl)',
  alignItems: 'flex-start',
  marginTop: 'var(--space-2xl)',
}
const rosterEditRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginBottom: 'var(--space-sm)',
}
/** Matches the rail's `identityActionStyle`. 44 = WCAG 2.5.5 target floor. */

const rosterEditPill: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  boxSizing: 'border-box',
  padding: '0 var(--space-lg)',
  borderRadius: 999,
  border: '1px solid var(--color-border-strong)',
  background: 'var(--color-bg-surface-alt)',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--color-text-primary)',
  textDecoration: 'none',
  transition: 'opacity 120ms ease',
}
const footerHint: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
  fontSize: 'var(--text-content)',
  color: 'var(--color-text-tertiary)',
  marginTop: 'var(--space-3xl)',
}
const dossierBase: CSSProperties = {
  width: 266,
  minHeight: 320,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: 'var(--space-xl)',
  position: 'relative',
  background: 'var(--color-bg-surface-alt)',
}
const dossierUnlocked: CSSProperties = {
  ...dossierBase,
  border: '1.5px dashed var(--color-border-strong)',
  cursor: 'pointer',
}
const folderTab: CSSProperties = {
  position: 'absolute',
  top: -1,
  left: 24,
  width: 80,
  height: 14,
  border: '1.5px dashed var(--color-border-strong)',
  borderBottom: 'none',
  transform: 'translateY(-100%)',
  background: 'var(--color-bg-surface-alt)',
}
const medallion: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  border: '2px solid var(--color-border-strong)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // eslint-disable-next-line local/no-raw-style-values -- ornament: the "+" is a glyph sized to the 48px medallion, not text
  fontSize: 28,
  color: 'var(--color-text-primary)',
  marginBottom: 'var(--space-lg)',
}
