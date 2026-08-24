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
import { pickVariant } from '../utils/factionDispatch'
import { computeFactionMultiplier, formatPoints } from '../utils/points'
import { praxisModeLabel } from '../utils/praxis'
import { surfaceMap } from '../factions'
import { useFormFactor } from '../hooks/useFormFactor'
import { useGameConfig } from '../hooks/useGameConfig'
import { useTaskSignup } from '../hooks/useTaskSignup'
import { useSidebarPanels } from '../hooks/useSidebarPanels'
import { rosterOffersAChoice } from '../hooks/useRosterChoice'
import { useFieldDeskHome } from './fieldDesk/useFieldDeskHome'
import DefaultFieldDesk from './fieldDesk/mobileArchetypes/DefaultFieldDesk'

/**
 * FieldDesk — the authenticated account home (#274). Rendered at `/` when authed
 * (App routes a logged-out visitor to the marketing Home instead).
 *
 * On a phone (#500) the carried life gets a mobile-native home instead of the
 * roster: `useFormFactor() === 'mobile'` dispatches through
 * the `mobileFieldDesk` surface to a per-faction skin (Default fallback), mirroring
 * the TaskDetail mobile seam. A brand-new account with no active life still
 * falls through to the roster below so it can create one.
 *
 * THE DESKTOP BRANCH ANSWERS TWO QUESTIONS, IN THIS ORDER (#1557)
 * --------------------------------------------------------------
 * 1. "Whose shoes today?" — the roster: step back into a life, begin a new one,
 *    or take the order's correspondence. This is the page's established job and
 *    the ONLY desktop path to switching the carried character, so it keeps the
 *    top of the page. It is now CONDITIONAL — see the gate below.
 * 2. "What do I do now?" — continue-where-you-left-off over a tabbed browse
 *    (#1557's design). It is second because it is not addressed to anyone until
 *    question 1 is settled: "your drafts" and "tasks you can sign up for" are
 *    both scoped to the carried life, and a viewer who is about to switch lives
 *    is being shown the wrong ones.
 *
 * The design drew (2) as its own page. Owner ruling 2026-08-02: it merges in
 * here instead, because `/` for a signed-in desktop viewer IS this component —
 * routing it to `Home` would have silently orphaned all three roster controls.
 *
 * THE ROSTER IS GATED, NOT THE ROUTE (#1560)
 * ------------------------------------------
 * Owner ruling: a second life must not be advertised before the gate opens — a
 * player discovers it at the era's `second_character_level_required`, and until
 * then has no idea it exists. The padlocked "A second self awaits" dossier is
 * gone, but hiding it alone made the leak louder, not quieter: the heading
 * presumes a choice, the header chip counts lives that could be plural, and the
 * closing line offered outright to "cut a new pair from whole cloth".
 *
 * #1560 was written when `/` was ONLY the roster, so it asked for the route to
 * be gated. Since #1557 landed, `/` also carries "continue where you left off"
 * and the browse — a pre-gate player still needs those. So the seam is the
 * ROSTER SECTION (chip, cards, dossier, closing line), which is hidden as one
 * piece unless it has a choice to offer. `rosterOffersAChoice`
 * (`hooks/useRosterChoice`, shared with the `CHARACTERS` trigger since #2111) is that
 * rule, and the create-your-first-life path is inside it: an account with zero
 * lives ALWAYS sees the roster, or signup dead-ends.
 *
 * The page TITLE is deliberately not in that piece (#1794): `/` is the
 * authenticated home and must have a level-1 heading in every gate state, so
 * the `<h1>` and its rule sit outside and the heading changes what it says
 * instead of disappearing.
 *
 * The Albescent letter (#395) is deliberately OUTSIDE the gate. It converts an
 * existing life rather than adding one, so it is a real control for a
 * single-life pre-gate account and its own server flag already guards it.
 *
 * WHAT THIS PAGE DOES NOT DRAW
 * ----------------------------
 * The design's page shell — a 1392px container holding
 * `grid-template-columns: 320px minmax(0, 1fr)`, 36px gap, `sticky top: 100px`
 * rail — is NOT this page's to own. `ShellContent` already renders the rail
 * beside `<main>` on every desktop route for a signed-in viewer, so a page that
 * drew its own left column would mount a SECOND `Sidebar`; and the sticky part
 * reverses #1191/#1343 outright ("the rail scrolls WITH the page"). Those
 * numbers move for every route at once or not at all — a separate issue.
 */

// Deterministic slight tilt per card — index-keyed so it's stable across renders.
const TILTS = [-2.5, 1.8, -1.2, 2.4, -2.0, 1.4]

export default function FieldDesk() {
  const { t } = useTranslation('common')
  const { user, applyUser } = useAuth()
  const navigate = useNavigate()
  // `null` until the roster lands — "not known yet" and "known to be empty" are
  // different answers to the gate below, and one state cannot say both.
  const [lives, setLives] = useState<CharacterOut[] | null>(null)
  const [switching, setSwitching] = useState<number | null>(null)
  const { signupMsg, handleSignup } = useTaskSignup()

  // Mobile home dispatch (#500). Hooks run unconditionally; the branch below
  // only fires once a carried life exists — otherwise we render the roster.
  const formFactor = useFormFactor()
  const homeState = useFieldDeskHome(lives)

  useEffect(() => {
    void getMyCharacters()
      .then(setLives)
      // A failed read must still resolve to a KNOWN roster, or the page waits
      // on `null` forever and a brand-new account never reaches "begin a new
      // self". Empty is the same thing the old `finally` left behind.
      .catch(() => setLives([]))
  }, [])

  const enterLife = async (id: number) => {
    setSwitching(id)
    try {
      // As in CharacterSwitcherSheet: the POST already answers the refreshed
      // `CurrentUser`, so consume it rather than re-asking `/auth/me` (#1383).
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
  // "Is the drawer empty?" — settled outright once the roster lands. Before it
  // does, the carried life is the best proof there is: an account playing
  // someone has at least one. Keeps the heading from swapping under the viewer.
  const drawerEmpty = lives === null ? !carriesALife : lives.length === 0
  // The page's <h1>, which is the PAGE's and not the roster's (#1794): it used
  // to be drawn inside the gated block, so the commonest state of all — one
  // life, gate shut — served `/` with an outline starting at level 2.
  //
  // With the roster hidden the page is no longer asking whose shoes; its subject
  // is the life being carried, so the heading names it (owner ruling
  // 2026-08-15). No new string — the name is data already on the page. A shut
  // gate implies `carriesALife`, so `active` is always there to name; the `&&`
  // is what the type-checker needs to see it, and a blank display name falls to
  // the handle rather than to an empty heading.
  const heading = !showRoster && active
    ? active.display_name || `@${active.username}`
    : drawerEmpty ? t('fieldDesk.headingFirstLife') : t('fieldDesk.heading')

  // Phone + a carried life → the mobile-native home skin for that faction.
  if (formFactor === 'mobile' && homeState) {
    const Skin = pickVariant(surfaceMap('mobileFieldDesk'), homeState.character.faction_slug, DefaultFieldDesk)
    return <Skin state={homeState} />
  }

  return (
    <div className="page">
      {/* ── The roster (#1560: only when it has a choice to offer) ─────────── */}
      {/* Top-bar pill: the ACTIVE life's @handle + avatar + lives-in-play. No
          account handle. Inside the gate — a count is an invitation to make
          it bigger, which is the thing being kept back. */}
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

      {/* Outside the gate (#1794). The title and its rule travel together — the
          rule is the title's, not the roster's — so the gate-open drawing is
          unchanged: pill, title, rule, roster. See `heading` above for what it
          says once the roster is gone. */}
      <h1 style={headingStyle}>{heading}</h1>
      <div style={rainbowUnderline} />

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

            {/* "Begin a new self" — the dossier has no locked face any more
                (#1560). Either the slot is open and the card is here, or the
                offer is not made at all. */}
            {canBeginNewSelf && <NewSelfDossier onBegin={() => navigate('/characters/create')} />}
          </div>
        ))}

      {/* The order's correspondence (#395) — account-collective invitation
          (ADR-0021), shown only while the server flag holds. Deliberately no
          link to any faction surface (ADR-0027 secrecy). OUTSIDE the roster gate:
          it re-dresses a life the account already carries, so it is offered to a
          single-life pre-gate account too. */}
      {lives !== null && (user?.can_start_as_albescent ?? false) && (
        <AlbescentInvitation
          lives={lives}
          onJoined={async () => {
            // Only the roster now: joining Albescent moves `faction_slug`,
            // `albescent_revealed` and the capability flags at once, but they
            // all ride back on the join POST and AlbescentInvitation adopts
            // that directly (#1383). The roster still has to be re-read — the
            // joined life's faction changed, and the rows above draw it.
            setLives(await getMyCharacters())
          }}
        />
      )}

      {/* The line that closes the roster, so it says only what the roster above
          it actually offers: both halves, lacing only, or the first pair. */}
      {showRoster && lives !== null && (
        <p style={footerHint}>{t(rosterFooterKey(lives.length, canCreateAdditional))}</p>
      )}

      {/* ── "What do I do now?" (#1557) ──────────────────────────────────────
          Below the roster, and below the line that closes it: the roster names
          who the viewer is playing, and only then does a list of drafts and
          signable tasks mean anything. See the header comment. */}
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

/** The three closing lines the roster can honestly end on. */
type FooterKey = 'fieldDesk.footer' | 'fieldDesk.footerFirstLife' | 'fieldDesk.footerNoNewSelf'

/**
 * Which closing line the roster earns (#1560).
 *
 * "Lace up an old one, or cut a new pair from whole cloth" names both halves of
 * the roster, and was rendered unconditionally — which is how a pre-gate player
 * was told about second lives in prose after the padlock was taken away. It is
 * kept for the case where it is TRUE, and each half drops out when its offer
 * does: nothing to lace up with an empty drawer, nothing to cut with a shut gate.
 */
export function rosterFooterKey(lifeCount: number, canCreateAdditional: boolean): FooterKey {
  if (lifeCount === 0) return 'fieldDesk.footerFirstLife'
  return canCreateAdditional ? 'fieldDesk.footer' : 'fieldDesk.footerNoNewSelf'
}

/**
 * One life in the roster: the credential card that steps into it, and the door
 * that edits it (#2552).
 *
 * The edit door is what the phone has had all along — all nine
 * `mobileArchetypes/*FieldDesk.tsx` draw an `Edit` pill in the identity card's
 * action row — and what the laptop did not, leaving the rail's identity card as
 * the only non-mobile way into `/characters/:id/edit`. Same placement as the
 * phone's and the rail's, right-aligned above the card, so the two form factors
 * agree about where the door is. Same catalog string, too: no new copy for a
 * door that already exists ten times over.
 *
 * It is a SIBLING of the card's button rather than a child of it, because the
 * card is itself a button and an anchor inside one is invalid DOM. That is also
 * why the pill sits outside the tilt: the rotation is the card's.
 *
 * OWNERSHIP is structural, not a branch. The roster is `getMyCharacters()` —
 * the account's own lives and nothing else — so every card here is one the
 * viewer owns and the door is never a control that would only refuse them.
 * Nothing else on this page draws a `CredentialCard` from someone else's life.
 *
 * Exported for its test: `renderToStaticMarkup` never runs effects, so
 * `FieldDesk` itself can only be rendered with an unresolved roster and there
 * are no cards in that markup to look at. Same reason `rosterFooterKey` is.
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
      {/* The link's accessible name is just "Edit", as it is on the phone and in
          the rail. Several cards means several of them, and what tells them
          apart is this wrapper: WCAG 2.4.4 is link purpose *in context*, and the
          context is the card named directly below. */}
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

/**
 * "Begin a new self" — the open slot.
 *
 * There is no locked face (#1560). The gate is answered by the caller: this card
 * is mounted when the slot is open and absent when it is not, per CLAUDE.md's
 * "hide unusable controls, don't show them disabled".
 */
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

// --- "what do I do now?" (#1557) --------------------------------------------

/** How many cards each browse tab shows — two rows of the design's 2-up grid. */
const BROWSE_LIMIT = 4

/**
 * What each browse tab actually asks the server for.
 *
 * Exported because the two headings — "Tasks you can sign up for", "Praxis that
 * needs your vote" — are promises, and an unfiltered list under either of them
 * is a bug that renders perfectly. The SSR test harness never runs effects, so a
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
 * BOTH TABS LAND ON ALREADY-NARROWED DATA, because both headings promise it —
 * see `BROWSE_TASK_FILTERS` / `BROWSE_PRAXIS_FILTERS` above for why neither
 * carries a `status`.
 *
 * One request per tab, made when the tab is first shown and never again: the
 * landing tab costs one, and the other costs nothing until it is asked for.
 */
function BrowseSection({ onSignup }: { onSignup: (taskId: number) => void }) {
  const { t } = useTranslation(['home', 'common'])
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
                  multiplier={computeFactionMultiplier(
                    user?.character?.faction_slug,
                    task.primary_faction_slug,
                    factionConfigs,
                  )}
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

// --- token-driven styles (no hardcoded hex) ---------------------------------

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
// Hoisted from NewSelfDossier (#586): static, no closure deps. The size comes
// from .content-title; these only carry font, weight, colour and offset.
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
}
// The title's rule takes the spectrum's four-stop cut (#1220, ADR-0066) — a
// 4px × 220px band, which is the geometry --faction-default-total-rainbow is
// cut for; the seven-stop ramp smears at this size.
const rainbowUnderline: CSSProperties = {
  height: 4,
  width: 220,
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
/** The edit door's row: right-aligned over the card, as on the phone (#2552). */
const rosterEditRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginBottom: 'var(--space-sm)',
}
/**
 * The edit door itself — the rail's `identityActionStyle` and the phone desks'
 * `actionPillStyle` at the same measurements, minus the `--rail-*` seam those
 * two read, which does not reach the page body. 44 is the WCAG 2.5.5 target
 * floor and is GEOMETRY, not spacing: deliberately not on the --space-* ramp.
 */
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
