import { useState, type CSSProperties, type DragEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import { relativeTime } from '../../utils/dates'
import { factionCssVar, factionName, isKnownFaction } from '../../utils/factions'
import { factionRoleVar, factionRoleVars } from '../../utils/factionRoles'
import { mediaUrl } from '../../utils/media'
import type { ActivityFeedItem } from '../../api/activityFeed'
import type { PraxisCardOut } from '../../api/praxis'
import { useSidebarPanels } from '../../hooks/useSidebarPanels'
import {
  SIDEBAR_PANEL_COLLAPSIBLE,
  useSidebarPanelLayout,
  type SidebarPanelId,
} from '../../hooks/useSidebarPanelLayout'
import { praxisModeLabel } from '../../utils/praxis'
import { useGameConfig } from '../../hooks/useGameConfig'
import { useLevelTrack } from '../../hooks/useLevelTrack'
import FactionSigil from '../sigil/FactionSigil'
import DefaultSigil from '../sigil/DefaultSigil'
import { feedKicker, feedItemTitle } from '../feed/feedItemLabels'
import { normalizeFeedItem } from '../feed/normalizeFeedItem'
import LevelTrackMeta from '../LevelTrackMeta'

const DEFAULT_MAX_TASK_SLOTS = 20

/** In-progress row's task-faction mark (#1711), at the row's type size. */
const ROW_SIGIL = 14

/** Activity row's context-faction mark (#1892): the row's bullet, so bigger. */
const ACTIVITY_SIGIL = 18

/** Slugs whose mark IS the unaffiliated ring, so they take the sampled spectrum.
 *  Albescent is out: it draws its own labyrinth mark (Sigil Studies v2). */
const NEUTRAL_SIGIL_SLUGS = new Set(['na', 'default'])

/** A `600%`-wide, `index * 20%`-offset window onto the rainbow, so neutral rows
 *  walk the spectrum down the column instead of repeating one ring. */
function sampledSpectrum(index: number): string {
  return `var(--faction-default-rainbow) ${index * 20}% 0 / 600% 100%`
}

/**
 * The rail wears the viewer's faction (#2361) as a SEAM, not a branch: locals
 * declared once on the `<aside>`, every style reading one through a fallback
 * (`var(--rail-ink, var(--color-text-primary))`). Why this shape:
 *  1. Unaffiliated / Albescent / null / unknown slug returns `{}`, so every
 *     fallback is the neutral value: pixel-identical by construction.
 *  2. Style constants stay constants; `panelStyle` is exported to `SidebarHandle`.
 *  3. Fallbacks are per-site, so three neutral ink tiers survive a family with
 *     two (`--rail-quiet` unset is secondary at a heading, tertiary at a time).
 * One rail, not eight archetypes (owner ruling, first pass; no per-faction chrome).
 * Albescent keeps the na rail by design: ADR-0048, revealed by shimmer, never colour.
 * Map lives in `utils/factionRoles.ts` (`chrome` ground; S.N.I.D.E. override,
 * #2631 / ADR-0085).
 *
 * ponytail: `--rail-well` and `--rail-spectrum` are composed here, not tokens
 * (surface extensions, #2659 decision 07); mint tokens if a second consumer appears.
 */
function railFaceVars(slug: string | null | undefined): CSSProperties {
  if (!isKnownFaction(slug)) return {}
  const ink = factionRoleVar(slug, 'ink', 'chrome')
  const hue = factionRoleVar(slug, 'fill', 'chrome')
  return {
    ...factionRoleVars(slug, 'rail', 'chrome'),
    // Measured as a veil in factionContrast.test.ts.
    '--rail-well': `color-mix(in srgb, ${ink} 10%, transparent)`,
    // Must be an IMAGE: sites read it as `background-image` under a size window.
    '--rail-spectrum': `linear-gradient(90deg, color-mix(in srgb, ${hue} 45%, transparent), ${hue})`,
    // #2404: switch off the na rainbow ring for members (no class threading).
    '--spectrum-frame-image': 'none',
  } as CSSProperties
}

/** Whole literal keys, never a template: computed keys hide from the copy sweep
 *  and the typed `t()`. */
const PANEL_HEADING_KEY = {
  'active-tasks': 'sidebar.activeTasks.heading',
  'recent-activity': 'sidebar.recentActivity.heading',
} as const satisfies Record<SidebarPanelId, string>

/** 44 is the WCAG 2.5.5 target floor (#1553): geometry, not spacing, so keep it
 *  off the --space-* ramp. */
const identityActionStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  boxSizing: 'border-box',
  padding: '0 var(--space-lg)',
  borderRadius: 999,
  border: '1px solid var(--rail-line, var(--color-border-strong))',
  background: 'var(--rail-well, var(--color-bg-surface-alt))',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--rail-ink, var(--color-text-primary))',
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
  color: 'var(--rail-quiet, var(--color-text-secondary))',
}

/** Rail panel shell. Exported for the fold-away handle (#1191), which renders
 *  outside `#wz-sidebar`, so no rail local reaches it: neutral for everyone. */
export const panelStyle: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: 'var(--rail-paper, var(--color-bg-surface))',
  // Stays under the spectrum ring (#2404) so a faint rainbow still reads as a panel.
  border: '1px solid var(--rail-line, var(--color-border))',
  // `.spectrum-frame::before` inherits this radius (#2404).
  borderRadius: 'var(--rail-radius, var(--faction-default-card-radius))',
  padding: 'var(--space-lg)',
}

/** Unconditional on every rail panel (#2404); `railFaceVars` switches the ring
 *  off for members. The handle deliberately does not carry it. */
const PANEL_FRAME = 'spectrum-frame'

const sectionLabel: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--rail-quiet, var(--color-text-secondary))',
}

/** The fading rule in "LABEL ——————". */
function HeaderRule() {
  return (
    <span
      aria-hidden="true"
      style={{
        flex: 1,
        height: 1,
        background:
          'linear-gradient(90deg, var(--rail-line, var(--color-border-strong)), transparent)',
      }}
    />
  )
}

/** Six-dot grip; inline SVG so it renders identically everywhere. */
function GripMark() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true" focusable="false">
      <circle cx="2.5" cy="4" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="4" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="8" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="8" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="12" r="1.2" fill="currentColor" />
    </svg>
  )
}

/** '›' points right: a quarter turn down is open, no turn is closed. */
const CHEVRON_ROTATION_OPEN = 'rotate(90deg)'
const CHEVRON_ROTATION_CLOSED = 'rotate(0deg)'

const gripButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  color: 'var(--rail-quiet, var(--color-text-tertiary))',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'grab',
}

const disclosureButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  color: 'var(--rail-quiet, var(--color-text-secondary))',
  fontSize: 'var(--text-content)',
  lineHeight: 1,
}

interface SidebarPanelProps {
  readonly id: SidebarPanelId
  readonly label: string
  /** 1-based seat, spoken by the grip so a keyboard user hears the move land. */
  readonly position: number
  readonly total: number
  readonly collapsed: boolean
  readonly onToggleCollapsed: () => void
  readonly onMoveByStep: (delta: number) => void
  readonly armed: boolean
  readonly onArm: (armed: boolean) => void
  readonly dragging: boolean
  readonly dropTarget: boolean
  readonly onDragStart: () => void
  readonly onDragOverPanel: () => void
  readonly onDragLeavePanel: () => void
  readonly onDropPanel: () => void
  readonly onDragEnd: () => void
  readonly children: ReactNode
}

/**
 * A reorderable panel below the character card (#1555).
 *
 * Collapsing HIDES (`hidden`), never unmounts: unmounting tears down the hooks
 * inside and reopening blinks (#1343, same as `SidebarColumn`).
 *
 * The grip is a real `<button>` because native drag-and-drop has no keyboard
 * path: Arrow Up/Down move a seat. `draggable` is armed only from the grip so
 * the panel's links and text stay selectable.
 */
function SidebarPanel({
  id,
  label,
  position,
  total,
  collapsed,
  onToggleCollapsed,
  onMoveByStep,
  armed,
  onArm,
  dragging,
  dropTarget,
  onDragStart,
  onDragOverPanel,
  onDragLeavePanel,
  onDropPanel,
  onDragEnd,
  children,
}: SidebarPanelProps) {
  const { t } = useTranslation('common')
  const bodyId = `wz-sidebar-panel-${id}`
  const collapsible = SIDEBAR_PANEL_COLLAPSIBLE[id]

  function handleGripKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      onMoveByStep(-1)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      onMoveByStep(1)
    }
  }

  function handleDragStart(event: DragEvent<HTMLElement>) {
    // Firefox refuses to start a drag with an empty dataTransfer.
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.effectAllowed = 'move'
    onDragStart()
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    // preventDefault is what marks this element as a valid drop target.
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    onDragOverPanel()
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    onDropPanel()
  }

  return (
    <section
      className={PANEL_FRAME}
      aria-labelledby={`${bodyId}-label`}
      draggable={armed}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeavePanel}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
      style={{
        ...panelStyle,
        // Drop target brightens the existing border, so nothing shifts.
        ...(dropTarget ? { borderColor: 'var(--rail-line, var(--color-border-strong))' } : null),
        ...(dragging ? { opacity: 0.5 } : null),
      }}
    >
      <div className="flex items-center gap-2.5 mb-3.5">
        <button
          type="button"
          onPointerDown={() => onArm(true)}
          onPointerUp={() => onArm(false)}
          onKeyDown={handleGripKeyDown}
          aria-label={t('sidebar.panel.reorder', { panel: label, position, total })}
          title={t('sidebar.panel.reorder', { panel: label, position, total })}
          aria-keyshortcuts="ArrowUp ArrowDown"
          className="shrink-0 hover:opacity-80"
          style={gripButtonStyle}
        >
          <GripMark />
        </button>

        {collapsible ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            aria-label={
              collapsed
                ? t('sidebar.panel.expand', { panel: label })
                : t('sidebar.panel.collapse', { panel: label })
            }
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
            style={disclosureButtonStyle}
          >
            <span id={`${bodyId}-label`} className="truncate" style={sectionLabel}>
              {label}
            </span>
            <HeaderRule />
            <span
              aria-hidden="true"
              className="shrink-0"
              style={{
                display: 'inline-block',
                transform: collapsed ? CHEVRON_ROTATION_CLOSED : CHEVRON_ROTATION_OPEN,
                transition: 'transform 160ms ease',
              }}
            >
              ›
            </span>
          </button>
        ) : (
          // Not collapsible: no disclosure control rather than a disabled one.
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span id={`${bodyId}-label`} className="truncate" style={sectionLabel}>
              {label}
            </span>
            <HeaderRule />
          </div>
        )}
      </div>

      <div id={bodyId} hidden={collapsed}>
        {children}
      </div>
    </section>
  )
}

/** "In progress tasks" panel body. */
function ActiveTasksBody({
  activeTasks,
  maxTaskSlots,
}: {
  readonly activeTasks: PraxisCardOut[]
  readonly maxTaskSlots: number
}) {
  const { t } = useTranslation('common')
  const slotCount = activeTasks.length
  const slotPercent = Math.min((slotCount / maxTaskSlots) * 100, 100)

  return (
    <>
      {activeTasks.length === 0 ? (
        <p
          className="font-body content-text"
          style={{ color: 'var(--rail-quiet, var(--color-text-tertiary))' }}
        >
          {t('sidebar.activeTasks.empty')}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {activeTasks.map((praxis) => (
            <div key={praxis.id} className="flex items-start justify-between gap-3">
              <Link
                to={`/praxis/${praxis.id}/edit`}
                className="font-display min-w-0"
                style={{ fontSize: 'var(--text-content)', lineHeight: 1.25, color: 'var(--rail-ink, var(--color-text-primary))', textDecoration: 'none' }}
              >
                {praxis.task_title}
              </Link>
              <div className="shrink-0 flex items-center gap-2">
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-md)',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    // Rail's quiet tier, not the row's task faction (#2361).
                    color: 'var(--rail-quiet, var(--faction-default-card-muted))',
                    padding: 'var(--space-xs) var(--space-sm)',
                    border: '1px solid var(--rail-line, var(--color-border-strong))',
                    borderRadius: 999,
                  }}
                >
                  {praxisModeLabel(praxis, t)}
                </span>
                {/* The task's faction (#1711); named, since nothing else in the
                    row spells it out. */}
                <span
                  className="flex"
                  role="img"
                  aria-label={factionName(praxis.task_faction_slug)}
                >
                  {/* Inked explicitly (#2723): component defaults miss one theme.
                      Guard (#2528): na/albescent map to flat `default` grey,
                      which would paint over their spectra. */}
                  <FactionSigil
                    slug={praxis.task_faction_slug}
                    size={ROW_SIGIL}
                    color={
                      isKnownFaction(praxis.task_faction_slug)
                        ? factionCssVar(praxis.task_faction_slug)
                        : undefined
                    }
                  />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slot bar: a static window onto one track-wide rainbow (#1128); the
          spectrum belongs to the track, not the fill. */}
      <div className="mt-4">
        <div className="overflow-hidden" style={{ height: 6, borderRadius: 999, background: 'var(--rail-well, var(--color-bg-surface-alt))' }}>
          <div
            style={{
              height: '100%',
              width: `${slotPercent}%`,
              borderRadius: 999,
              /* One 90deg pass of the spectrum; not -rainbow-loop, which would
                 seat a second red at the far end. */
              backgroundImage: 'var(--rail-spectrum, var(--faction-default-rainbow))',
              backgroundRepeat: 'no-repeat',
              /* backgroundSize = (100/slotPercent)% × fill = track width, so a
                 partial fill reveals part of one rainbow. Omitted at 0
                 (Infinity is invalid CSS). */
              ...(slotPercent > 0 ? { backgroundSize: `${(100 / slotPercent) * 100}% 100%` } : null),
              transition: 'width 300ms, background-size 300ms',
            }}
          />
        </div>
        <p
          className="font-body text-right"
          style={{ fontSize: 'var(--text-base)', letterSpacing: '0.08em', color: 'var(--rail-quiet, var(--color-text-secondary))', marginTop: 'var(--space-sm)' }}
        >
          {t('sidebar.activeTasks.slots', { count: slotCount, max: maxTaskSlots })}
        </p>
      </div>
    </>
  )
}

/** "Recent activity" panel body. */
function RecentActivityBody({ recentActivity }: { readonly recentActivity: ActivityFeedItem[] }) {
  const { t } = useTranslation('common')

  return (
    <>
      {recentActivity.length === 0 ? (
        <p
          className="font-body content-text"
          style={{ color: 'var(--rail-quiet, var(--color-text-tertiary))' }}
        >
          {t('sidebar.recentActivity.empty')}
        </p>
      ) : (
        <div className="flex flex-col">
          {recentActivity.map((item, index) => {
            const isLast = index === recentActivity.length - 1
            // Same vocabulary as `/updates`, so the panel cannot disagree with it.
            const row = normalizeFeedItem(item)
            // `row` is null for `era_announcement` (#1192 decision 6);
            // `friend_defection` has no headline, only an action line.
            const headline = row?.headline ?? row?.action ?? feedItemTitle(item)
            const href = row?.headlineHref ?? null
            const kicker = item.actor_display_name
              ? `${feedKicker(item.type)} · ${item.actor_display_name}`
              : feedKicker(item.type)
            const isNeutral =
              item.context_faction_slug === null ||
              NEUTRAL_SIGIL_SLUGS.has(item.context_faction_slug)
            const titleStyle: CSSProperties = {
              fontSize: 'var(--text-content)',
              lineHeight: 1.3,
              color: 'var(--rail-ink, var(--color-text-primary))',
              textDecoration: 'none',
            }
            return (
              <div
                key={item.item_key}
                className="flex gap-3"
                style={{
                  padding: 'var(--space-md) 0',
                  borderBottom: isLast
                    ? undefined
                    : '1px solid var(--rail-line, var(--color-border))',
                }}
              >
                {/* The row's faction (#1892), matching the `/updates` card frame. */}
                {isNeutral ? (
                  // `DefaultSigil` names itself; no wrapper label.
                  <span className="shrink-0 flex">
                    <DefaultSigil size={ACTIVITY_SIGIL} color={sampledSpectrum(index)} />
                  </span>
                ) : (
                  // Faction marks are aria-hidden SVGs, so the row names them.
                  <span
                    className="shrink-0 flex"
                    role="img"
                    aria-label={factionName(item.context_faction_slug)}
                  >
                    {/* As above (#2723); the guard keeps albescent's labyrinth
                        on its conic, not flat grey. */}
                    <FactionSigil
                      slug={item.context_faction_slug}
                      size={ACTIVITY_SIGIL}
                      color={
                        isKnownFaction(item.context_faction_slug)
                          ? factionCssVar(item.context_faction_slug)
                          : undefined
                      }
                    />
                  </span>
                )}
                <div className="min-w-0">
                  <div
                    className="truncate"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-md)',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--rail-quiet, var(--color-text-secondary))',
                      marginBottom: 'var(--space-xs)',
                    }}
                  >
                    {kicker}
                  </div>
                  {href ? (
                    <Link to={href} className="font-display block truncate" style={titleStyle}>
                      {headline}
                    </Link>
                  ) : (
                    <div className="font-display truncate" style={titleStyle}>
                      {headline}
                    </div>
                  )}
                  <div className="font-body" style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-base)', color: 'var(--rail-quiet, var(--color-text-tertiary))' }}>
                    {relativeTime(item.timestamp)}
                    {row?.points ? ` · ${row.points}` : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Door to the full feed, drawn even when empty. */}
      <div className="mt-3">
        <Link
          to="/updates"
          className="font-body hover:opacity-80"
          style={{
            fontSize: 'var(--text-base)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--rail-quiet, var(--color-text-secondary))',
            textDecoration: 'none',
          }}
        >
          {t('sidebar.recentActivity.seeMore')}
        </Link>
      </div>
    </>
  )
}

/**
 * Always-on right sidebar (Style Guide §4.2): character card + in-progress
 * tasks + recent activity, dressed in the viewer's faction (see `railFaceVars`).
 * Panel data is one prefetched request (`hooks/useSidebarPanels`, #1344); the
 * character card reads `/auth/me`.
 *
 * No "propose a task" here (#1556: lives on `/tasks`, gated) and no pending
 * requests (ADR-0070: answered only in the `/updates` queue; the handle shows
 * the count).
 *
 * Panels under the card render from a player-arranged ORDER (#1555), persisted
 * per ACCOUNT, not per character. The card itself is pinned.
 */
export default function Sidebar() {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const character = user?.character
  const { order, isCollapsed, toggleCollapsed, movePanelOnto, movePanelByStep } =
    useSidebarPanelLayout(user?.account_id ?? null)

  // Transient drag state, kept out of the persisted layout hook.
  const [armedId, setArmedId] = useState<SidebarPanelId | null>(null)
  const [draggingId, setDraggingId] = useState<SidebarPanelId | null>(null)
  const [dropTargetId, setDropTargetId] = useState<SidebarPanelId | null>(null)

  function endDrag() {
    setArmedId(null)
    setDraggingId(null)
    setDropTargetId(null)
  }

  const {
    // Holds the player's live feed minus obligations (`api/sidebar.ts`).
    global_activity: recentActivity,
    active_praxes: activeTasks,
  } = useSidebarPanels()
  const gameConfig = useGameConfig()
  const track = useLevelTrack(character?.level ?? 0, character?.score ?? 0)

  const maxTaskSlots = gameConfig?.max_task_signups ?? DEFAULT_MAX_TASK_SLOTS
  const eraName = user?.era_name ?? ''

  // Built for every panel, collapsed or not: hidden, never unmounted (#1343).
  const panelBodies: Record<SidebarPanelId, ReactNode> = {
    'active-tasks': <ActiveTasksBody activeTasks={activeTasks} maxTaskSlots={maxTaskSlots} />,
    'recent-activity': <RecentActivityBody recentActivity={recentActivity} />,
  }

  const railFace = railFaceVars(character?.faction_slug)
  const wearsFactionFace = Object.keys(railFace).length > 0

  // #2404: Albescent's only difference is motion (ADR-0048), via a hook that
  // `motion.ornament.css` matches to drift the frame's rainbow.
  const driftsTheFrame = character?.faction_slug === 'albescent'

  return (
    // `id` is the target of the fold-away handle's `aria-controls` (#1191).
    <aside
      id="wz-sidebar"
      className="flex flex-col gap-4 w-full"
      // `.font-display` has a hardcoded stack, so the face switches via
      // `[data-rail-face] .font-display` in index.css instead of a fallback.
      {...(wearsFactionFace ? { 'data-rail-face': '' } : null)}
      {...(driftsTheFrame ? { 'data-spectrum-drift': '' } : null)}
      style={railFace}
    >
      {/* ── Character Card ── */}
      {character ? (
        <section className={PANEL_FRAME} style={panelStyle}>
          {/* Signature hairline: with the avatar ring and level track, one
              mark at three scales (#1553). */}
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              opacity: 0.9,
              background: 'var(--rail-spectrum, var(--faction-default-rainbow))',
            }}
          />

          {/* Edit: the one edit door present even when `rosterOffersAChoice`
              is shut and the home page draws no roster (#2552). */}
          <div className="flex justify-end gap-2 mb-4">
            <Link
              to={`/characters/${character.id}/edit`}
              className="hover:opacity-80 active:opacity-60"
              style={identityActionStyle}
            >
              {t('sidebar.characterCard.edit')}
            </Link>
          </div>

          {/* Identity: avatar + name + level. No faction word. */}
          <div className="flex items-center gap-3.5 mb-4">
            <div
              className="shrink-0 rounded-full"
              style={{ width: 58, height: 58, padding: 'var(--space-xs)', background: 'var(--rail-spectrum, var(--faction-default-rainbow-conic))' }}
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
                style={{ fontSize: 'var(--text-heading)', lineHeight: 1.05, color: 'var(--rail-ink, var(--color-text-primary))', textDecoration: 'none' }}
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
                  color: 'var(--rail-quiet, var(--color-text-secondary))',
                }}
              >
                {t('sidebar.characterCard.level', { level: character.level })}
              </div>
            </div>
          </div>

          {/* The one points figure */}
          <div className="flex items-baseline gap-2">
            <span
              className="font-display italic"
              style={{ fontSize: 'var(--text-heading)', lineHeight: 1, color: 'var(--rail-ink, var(--color-text-primary))' }}
            >
              {character.score.toLocaleString()}
            </span>
            <span className="truncate" style={identityMetaStyle}>
              {eraName
                ? t('sidebar.characterCard.eraPoints', { era: eraName, count: character.score })
                : t('sidebar.characterCard.points', { count: character.score })}
            </span>
          </div>

          {/* Level track: the rail spectrum clipped by the fill width. */}
          <div
            className="overflow-hidden"
            style={{ height: 6, borderRadius: 999, background: 'var(--rail-well, var(--color-bg-surface-alt))', marginTop: 'var(--space-md)' }}
            {...(track
              ? {
                  role: 'progressbar',
                  'aria-valuemin': 0,
                  'aria-valuemax': 100,
                  'aria-valuenow': Math.round(track.fillPercent),
                  'aria-label': t('sidebar.characterCard.trackLabel', {
                    score: track.pointsIntoLevel.toLocaleString(),
                    target: track.levelSpan.toLocaleString(),
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
                background: 'var(--rail-spectrum, var(--faction-default-rainbow))',
                transition: 'width 300ms',
              }}
            />
          </div>

          <LevelTrackMeta
            track={track}
            allTimeScore={character.all_time_score}
            style={identityMetaStyle}
          />
        </section>
      ) : (
        <section className={PANEL_FRAME} style={panelStyle}>
          <p className="label-caption text-center">{t('sidebar.characterCard.noCharacter')}</p>
        </section>
      )}

      {/* ── The panels the player arranges ──
          Rendered from `order`, and KEYED BY PANEL ID: React then moves the
          existing DOM node into its new seat instead of rebuilding it, which is
          what keeps focus on the grip a keyboard user just pressed an arrow on
          — and what stops a reorder re-mounting a panel it must not unmount. */}
      {order.map((id, index) => (
        <SidebarPanel
          key={id}
          id={id}
          label={t(PANEL_HEADING_KEY[id])}
          position={index + 1}
          total={order.length}
          collapsed={isCollapsed(id)}
          onToggleCollapsed={() => toggleCollapsed(id)}
          onMoveByStep={(delta) => movePanelByStep(id, delta)}
          armed={armedId === id}
          onArm={(next) => setArmedId(next ? id : null)}
          dragging={draggingId === id}
          dropTarget={draggingId !== null && draggingId !== id && dropTargetId === id}
          onDragStart={() => setDraggingId(id)}
          onDragOverPanel={() => setDropTargetId(id)}
          onDragLeavePanel={() => setDropTargetId((previous) => (previous === id ? null : previous))}
          onDropPanel={() => {
            if (draggingId !== null && draggingId !== id) movePanelOnto(draggingId, id)
            endDrag()
          }}
          onDragEnd={endDrag}
        >
          {panelBodies[id]}
        </SidebarPanel>
      ))}

    </aside>
  )
}
