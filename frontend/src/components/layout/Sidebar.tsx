import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import { relativeTime } from '../../utils/dates'
import { factionCssVar } from '../../utils/factions'
import { mediaUrl } from '../../utils/media'
import { useSidebarPanels } from '../../hooks/useSidebarPanels'
import { praxisModeLabel } from '../../utils/praxis'
import { useGameConfig } from '../../hooks/useGameConfig'
import { useLevelTrack } from '../../hooks/useLevelTrack'
import CharacterSwitcherSheet from '../CharacterSwitcherSheet'

const DEFAULT_MAX_TASK_SLOTS = 20

/**
 * Switch / Edit as REAL controls (#1553). They were bare ~11px caps with no
 * box — a sub-20px hit target, which is the accessibility half of the identity
 * redesign and the reason it is not merely cosmetic. 44 is the WCAG 2.5.5
 * target floor and is GEOMETRY, not spacing: it is deliberately not on the
 * --space-* ramp and must not be rounded onto it.
 */
const identityActionStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  boxSizing: 'border-box',
  padding: '0 var(--space-lg)',
  borderRadius: 999,
  border: '1px solid var(--color-border-strong)',
  background: 'var(--color-bg-surface-alt)',
  fontFamily: 'var(--font-body)',
  // --text-md, not .eyebrow's --text-sm: a 44px pill wants a label a reader can
  // land on, and this is the size the bare caps it replaces already read at.
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--color-text-primary)',
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'opacity 120ms ease',
}

/** The baseline row under the track: "N to Level X" · "N,NNN all-time". */
const identityMetaStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}

/** Shared panel shell for the redesigned sidebar (unaffiliated rainbow style).
 *  Exported so the fold-away handle (#1191) reads as part of the rail. */
export const panelStyle: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-xl)',
  padding: 'var(--space-lg)',
}

const sectionLabel: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}

/** "LABEL ——————" header: eyebrow + a rule that fades out to the right. */
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3.5">
      <span style={sectionLabel}>{label}</span>
      <span
        style={{
          flex: 1,
          height: 1,
          background: 'linear-gradient(90deg, var(--color-border-strong), transparent)',
        }}
      />
    </div>
  )
}

/**
 * Always-on right sidebar (Style Guide §4.2), redesigned into the unaffiliated
 * "all paths" rainbow-spectrum identity: character card + in-progress tasks +
 * recent global activity + propose CTA.
 *
 * Those panels used to be three separate fetches made here, each one waiting on
 * `/auth/me`. They are one request now, made before this component exists — see
 * `hooks/useSidebarPanels` (#1344). Identity is still read from auth: the
 * character card is `/auth/me`'s payload, not the rail's.
 *
 * IT NO LONGER LISTS PENDING REQUESTS (#1423, ADR-0070)
 * -----------------------------------------------------
 * A fourth panel used to render collab invites, duel challenges and your own
 * outstanding submissions with inline accept/decline. Under "an unanswered
 * obligation lives in the queue, never in the stream" there is exactly one
 * surface a request can be answered on, and it is the Requests queue at
 * `REQUESTS_QUEUE_ANCHOR` on `/updates`. This panel was the surface it
 * replaced, so it is gone rather than duplicated.
 *
 * The response no longer carries the request items at all (#1456) — only
 * `pending_requests_count`, read by the collapsed handle's badge
 * (`SidebarColumn`), the mobile bell (`MobileHeader`) and the mobile FieldDesk.
 */
export default function Sidebar() {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const character = user?.character
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const {
    global_activity: globalActivity,
    active_praxes: activeTasks,
  } = useSidebarPanels()
  const gameConfig = useGameConfig()
  const track = useLevelTrack(character?.level ?? 0, character?.score ?? 0)

  const maxTaskSlots = gameConfig?.max_task_signups ?? DEFAULT_MAX_TASK_SLOTS
  const slotCount = activeTasks.length
  const slotPercent = Math.min((slotCount / maxTaskSlots) * 100, 100)
  const eraName = user?.era_name ?? ''

  return (
    // `id` is the target of the fold-away handle's `aria-controls` (#1191).
    <aside id="wz-sidebar" className="flex flex-col gap-4 w-full">
      {/* ── Character Card ── */}
      {character ? (
        <section style={panelStyle}>
          {/* Signature rainbow hairline — this panel only. Kept through the
              identity redesign (#1553): the hairline, the avatar ring and the
              level track are one mark at three scales. */}
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              opacity: 0.9,
              background: 'var(--faction-default-rainbow)',
            }}
          />

          {/* ── Actions: real 44px targets, right-aligned on their own row ── */}
          <div className="flex justify-end gap-2 mb-4">
            <button
              type="button"
              onClick={() => setSwitcherOpen(true)}
              className="hover:opacity-80 active:opacity-60"
              style={identityActionStyle}
            >
              {t('sidebar.characterCard.characters')}
            </button>
            <Link
              to={`/characters/${character.id}/edit`}
              className="hover:opacity-80 active:opacity-60"
              style={identityActionStyle}
            >
              {t('sidebar.characterCard.edit')}
            </Link>
          </div>

          {/* ── Identity: avatar + name + level. No faction word — the rainbow
                 ring and the whole rail already say unaffiliated, and no points
                 figure either; there is exactly one of those, below. ── */}
          <div className="flex items-center gap-3.5 mb-4">
            {/* avatar in a rainbow ring (unaffiliated / all-paths mark) */}
            <div
              className="shrink-0 rounded-full"
              style={{ width: 58, height: 58, padding: 'var(--space-xs)', background: 'var(--faction-default-rainbow-conic)' }}
            >
              {character.avatar_url ? (
                <img
                  src={mediaUrl(character.avatar_url)}
                  alt={character.display_name}
                  className="w-full h-full rounded-full"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${factionCssVar(character.faction_slug, 'light')}, ${factionCssVar(character.faction_slug)})`,
                  }}
                />
              )}
            </div>
            <div className="min-w-0">
              <Link
                to={`/characters/${character.id}`}
                className="font-display italic block truncate"
                style={{ fontSize: 'var(--text-heading)', lineHeight: 1.05, color: 'var(--color-text-primary)', textDecoration: 'none' }}
              >
                {character.display_name}
              </Link>
              <div
                className="truncate"
                style={{
                  marginTop: 'var(--space-xs)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-base)',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {t('sidebar.characterCard.level', { level: character.level })}
              </div>
            </div>
          </div>

          {/* ── The one points figure, in the display face ── */}
          <div className="flex items-baseline gap-2">
            <span
              className="font-display italic"
              style={{ fontSize: 'var(--text-heading)', lineHeight: 1, color: 'var(--color-text-primary)' }}
            >
              {character.score.toLocaleString()}
            </span>
            <span className="truncate" style={identityMetaStyle}>
              {eraName
                ? t('sidebar.characterCard.eraPoints', { era: eraName })
                : t('sidebar.characterCard.points')}
            </span>
          </div>

          {/* ── The level track. The fill is the spectrum CLIPPED by the fill
                 width — one full ramp read through a narrower window, so the
                 mark is the same rainbow the hairline and the ring are. Not a
                 solid colour, and not a token of its own. ── */}
          <div
            className="overflow-hidden"
            style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-surface-alt)', marginTop: 'var(--space-md)' }}
            {...(track
              ? {
                  role: 'progressbar',
                  'aria-valuemin': 0,
                  'aria-valuemax': 100,
                  'aria-valuenow': Math.round(track.fillPercent),
                  'aria-label': t('sidebar.characterCard.trackLabel', {
                    score: character.score.toLocaleString(),
                    target: track.nextThreshold.toLocaleString(),
                    level: track.nextLevel ?? character.level,
                  }),
                }
              : null)}
          >
            <div
              style={{
                height: '100%',
                width: `${track?.fillPercent ?? 0}%`,
                borderRadius: 999,
                background: 'var(--faction-default-rainbow)',
                transition: 'width 300ms',
              }}
            />
          </div>

          {/* ── Baseline: what is owed, and what has ever been earned ── */}
          <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-sm)' }}>
            {track && (
              <span style={identityMetaStyle}>
                {track.nextLevel === null
                  ? t('sidebar.characterCard.topLevel')
                  : t('sidebar.characterCard.toNextLevel', {
                      points: track.pointsToNext.toLocaleString(),
                      level: track.nextLevel,
                    })}
              </span>
            )}
            <span style={{ ...identityMetaStyle, marginLeft: 'auto' }}>
              {t('sidebar.characterCard.allTime', { points: character.all_time_score.toLocaleString() })}
            </span>
          </div>

          {/* The switcher the "Characters" pill opens — the same sheet the
              mobile home uses, so both homes answer the button identically. */}
          <CharacterSwitcherSheet
            open={switcherOpen}
            activeCharacterId={character.id}
            onClose={() => setSwitcherOpen(false)}
          />
        </section>
      ) : (
        <section style={panelStyle}>
          <p className="eyebrow text-center">{t('sidebar.characterCard.noCharacter')}</p>
        </section>
      )}

      {/* ── In Progress Panel ── */}
      <section style={panelStyle}>
        <SectionHeader label={t('sidebar.activeTasks.heading')} />

        {activeTasks.length === 0 ? (
          <p className="font-body content-text" style={{ color: 'var(--color-text-tertiary)' }}>
            {t('sidebar.activeTasks.empty')}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {activeTasks.map((praxis) => (
              <div key={praxis.id} className="flex items-start justify-between gap-3">
                <Link
                  to={`/praxis/${praxis.id}/edit`}
                  className="font-display min-w-0"
                  style={{ fontSize: 'var(--text-content)', lineHeight: 1.25, color: 'var(--color-text-primary)', textDecoration: 'none' }}
                >
                  {praxis.task_title}
                </Link>
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
                  {praxisModeLabel(praxis, t)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Slot-usage progress bar — a STATIC window onto one track-wide rainbow
            (#1128). The spectrum belongs to the TRACK, not to the fill: at 1 of 5
            slots you see red→orange, at 5 of 5 the whole rainbow, and a visible
            stop is the same physical width at every fill level. Nothing animates,
            so there is no motion left for prefers-reduced-motion to gate — which
            also retires the old drift's un-gated `background-size: 200%`, a
            permanently half-drawn spectrum for anyone who reduced motion. */}
        <div className="mt-4">
          <div className="overflow-hidden" style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-surface-alt)' }}>
            <div
              style={{
                height: '100%',
                width: `${slotPercent}%`,
                borderRadius: 999,
                /* --faction-default-rainbow is the 90deg ramp that runs red 0% →
                   magenta 100%: exactly ONE pass of the spectrum, which is what a
                   window wants. Deliberately not -rainbow-loop (eight stops, back
                   to red at 100% — cut to TILE under a travelling
                   background-position, and it would seat a second red at the
                   track's far end), not -rainbow-conic (angular), not
                   -rainbow-vertical (180deg, for a tall thin rule) and not
                   -ring (hard wedges). With no repeat and no motion the ramp's
                   red↔magenta seam never comes into view. */
                backgroundImage: 'var(--faction-default-rainbow)',
                backgroundRepeat: 'no-repeat',
                /* Scale the gradient up by however much the fill is shrunk, so a
                   fifth-width fill reveals the first fifth of one rainbow rather
                   than squeezing all seven stops into a fifth of the bar.
                   A PERCENTAGE is correct here, and this is not the px span
                   DefaultVote's docstring (#842) argues for: that widget has
                   five separate dot elements, so a percentage gave each dot its own
                   restarted ramp. This is ONE fill, so the percentage resolves
                   against it alone — fill = slotPercent% × track, therefore
                   backgroundSize = (100/slotPercent)% × fill = track, exactly.
                   Omitted at zero slots, where the ratio is Infinity (invalid CSS);
                   the fill is 0%-wide there, so nothing is visible either way. */
                ...(slotPercent > 0 ? { backgroundSize: `${(100 / slotPercent) * 100}% 100%` } : null),
                transition: 'width 300ms, background-size 300ms',
              }}
            />
          </div>
          <p
            className="font-body text-right"
            style={{ fontSize: 'var(--text-base)', letterSpacing: '0.08em', color: 'var(--color-text-secondary)', marginTop: 'var(--space-sm)' }}
          >
            {t('sidebar.activeTasks.slots', { count: slotCount, max: maxTaskSlots })}
          </p>
        </div>
      </section>

      {/* ── Recent Global Activity Panel ── */}
      <section style={panelStyle}>
        <SectionHeader label={t('sidebar.globalActivity.heading')} />

        {globalActivity.length === 0 ? (
          <p className="font-body content-text" style={{ color: 'var(--color-text-tertiary)' }}>
            {t('sidebar.globalActivity.empty')}
          </p>
        ) : (
          <div className="flex flex-col">
            {globalActivity.map((item, index) => {
              const isTask = item.type === 'global_task'
              const isEra = item.type === 'era_announcement'
              const isLast = index === globalActivity.length - 1
              const taskId = item.payload.task_id
              const title = isEra
                ? item.payload.era_name
                : item.payload.task_title ||
                  item.payload.praxis_title ||
                  t('sidebar.globalActivity.fallbackTaskTitle')
              const kicker = isEra
                ? t('sidebar.globalActivity.kickerEra')
                : isTask
                  ? t('sidebar.globalActivity.kickerNewTask')
                  : item.actor_display_name
              const titleStyle: CSSProperties = {
                fontSize: 'var(--text-content)',
                lineHeight: 1.3,
                color: 'var(--color-text-primary)',
                textDecoration: 'none',
              }
              return (
                <div
                  key={`${item.type}-${index}`}
                  className="flex gap-3"
                  style={{
                    padding: 'var(--space-md) 0',
                    borderBottom: isLast ? undefined : '1px solid var(--color-border)',
                  }}
                >
                  {/* rainbow bullet — sampled from the default spectrum by position */}
                  <span
                    className="shrink-0"
                    style={{
                      width: 6,
                      height: 6,
                      marginTop: 'var(--space-xs)',
                      borderRadius: 2,
                      background: 'var(--faction-default-rainbow)',
                      backgroundSize: '600% 100%',
                      backgroundPosition: `${index * 20}% 0`,
                    }}
                  />
                  <div className="min-w-0">
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-sm)',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--space-xs)',
                      }}
                    >
                      {kicker}
                    </div>
                    {isTask && taskId ? (
                      <Link to={`/tasks/${taskId}`} className="font-display block truncate" style={titleStyle}>
                        {title}
                      </Link>
                    ) : (
                      <div className="font-display truncate" style={titleStyle}>
                        {title}
                      </div>
                    )}
                    <div className="font-body" style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-base)', color: 'var(--color-text-tertiary)' }}>
                      {relativeTime(item.timestamp)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Propose a Task CTA ── */}
      <Link
        to="/propose-task"
        className="font-display w-full flex items-center justify-center gap-2.5 hover:opacity-90"
        style={{
          boxSizing: 'border-box',
          padding: 'var(--space-lg)',
          borderRadius: 11,
          fontSize: 'var(--text-xl)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--color-bg-page)',
          background: 'var(--color-text-primary)',
          border: '1px solid var(--color-text-primary)',
          textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 'var(--text-xl)', lineHeight: 1 }}>+</span>
        <span>{t('actions.proposeTask')}</span>
      </Link>
    </aside>
  )
}
