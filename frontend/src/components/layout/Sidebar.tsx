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

/** The task-faction mark on an in-progress row (#1711), set to the row's own
 *  type size so it reads as part of the line rather than as an emblem. */
const ROW_SIGIL = 14

/** The context-faction mark on an activity row (#1892). Bigger than the
 *  in-progress mark above because it is the row's own bullet rather than a
 *  trailing annotation on a line of type — a sigil at the 6px the old rainbow
 *  dot used is a smudge. */
const ACTIVITY_SIGIL = 18

/** The slugs whose mark IS the unaffiliated ring, and which therefore take the
 *  position-sampled spectrum below instead of a livery of their own.
 *
 *  `albescent` used to be a third member. #1892 put it here because #1891 had
 *  just deleted `AlbescentSigil`, so the slug had no mark of its own to draw.
 *  Sigil Studies v2 gives it one — the labyrinth — and the owner has accepted
 *  that these rows show it. So the set is back to the two slugs the predicate
 *  above actually describes. Note the entry was never load-bearing for the
 *  MECHANISM: the labyrinth is painted through a mask like `DefaultSigil`, so
 *  it would take the sampled background just as happily; it is out because its
 *  mark is no longer the ring, not because it could not be sampled. */
const NEUTRAL_SIGIL_SLUGS = new Set(['na', 'default'])

/** The window onto `--faction-default-rainbow` a row at `index` samples — the
 *  same `600%`-wide, `index * 20%`-offset slice the panel's old dots used, so
 *  the neutral rows still walk the spectrum down the column instead of
 *  repeating one identical ring. Expressed as a `background` shorthand because
 *  the sampling is a gradient window; there is no single stop to name. */
function sampledSpectrum(index: number): string {
  return `var(--faction-default-rainbow) ${index * 20}% 0 / 600% 100%`
}

/**
 * THE RAIL WEARS THE VIEWER'S FACTION (#2361), AS A SEAM RATHER THAN A BRANCH.
 *
 * The rail was dressed in the na kit for every viewer: `--color-bg-surface`
 * panels, the three global text tiers, and the unaffiliated spectrum on the
 * hairline, the avatar ring and both tracks. True for an unaffiliated player,
 * wrong for the other eight — and its own comment asserted the point it got
 * wrong ("the rainbow ring and the whole rail already say unaffiliated").
 *
 * ONE RAIL, NOT EIGHT ARCHETYPES. That is the owner's ruling on shape, taken
 * "for now, but I reserve the right to go for B after a visual check" — so this
 * is a first pass whose job is to be LOOKED at, and per-faction CHROME (the
 * Ephemerists' cornice, S.N.I.D.E.'s wall, Coven's slip corners) is deliberately
 * absent. A faction that reads flat without its chrome is evidence for that
 * conversation, not a reason to start it here.
 *
 * WHY A SEAM. Eight locals are declared once, on the `<aside>`, and every style
 * below reads one of them THROUGH A FALLBACK: `var(--rail-ink,
 * var(--color-text-primary))`. Three things fall out of that shape and all
 * three are why it was chosen over threading a slug down:
 *
 *  1. AN UNAFFILIATED VIEWER IS PIXEL-IDENTICAL BY CONSTRUCTION, which is the
 *     acceptance criterion. For `na` — and for `albescent`, and for null, and
 *     for a slug the server invents tomorrow — this function returns `{}`. Not
 *     one custom property is declared, so every fallback below is the value
 *     that shipped, byte for byte. There is no second render path to keep in
 *     step and nothing to measure twice.
 *  2. The module-level style constants stay constants. `panelStyle` is an
 *     EXPORT (`SidebarHandle` borrows it), so making them per-viewer functions
 *     would have changed a contract outside this file.
 *  3. The fallback is per-SITE, which is how three neutral ink tiers survive a
 *     family that has two. `--rail-quiet` unset reads `--color-text-secondary`
 *     at a heading and `--color-text-tertiary` at a timestamp; set, both take
 *     `card-muted`.
 *
 * ALBESCENT TAKES THE na RAIL AND THAT IS THE DESIGN, not a gap.
 * `isKnownFaction` is false for it because `CSS_KEY` maps it to `default`
 * (#783), and ADR-0048 makes its praxis card the Default sheet plus two motion
 * overlays — "revealed by a shimmer, never by a colour, a repaint in
 * Albescent's own hues would put it back in the spectrum and un-hide it". A
 * colour family minted for it here would be that repaint, one surface over.
 *
 * ponytail: two of the locals are COMPOSED here rather than read from a token,
 * because no per-faction token says them. `--rail-well` is the sheet's own ink
 * at 10% — a wash that lands light on a light sheet and lifted on a dark one,
 * so one expression serves all eight rather than eight `-well` tokens for one
 * consumer; and `--rail-spectrum` is a ramp of the faction's own hue, standing
 * where the unaffiliated ramp stands. Both are SURFACE EXTENSIONS in the sense
 * of #2659's decision 07 and stay local to the rail: the core map is
 * faction-owned and canonical, and a surface with genuine extra needs declares
 * its extras itself, composed out of roles rather than added to them.
 *
 * ONE KEY OVERRIDES SIX OF THE ROLES, AND IT IS NOT A FORK (#2631, ADR-0085).
 * `-card-*` is the right family for seven skins because a faction's card sheet
 * is the stock its chrome is made of. S.N.I.D.E. is the one where it is not:
 * its sheet is the photocopier SLAB pasted on a wall (#2066), pinned near-black
 * in BOTH cascades, so the rail was a black column beside a page the same
 * faction paints in flipping xerox stock. The other seven keys return
 * byte-identical values, and an unaffiliated viewer still declares nothing at
 * all — the acceptance criterion above is untouched.
 *
 * THE MAP ITSELF NOW LIVES IN `utils/factionRoles.ts` (#2659). It was written
 * here first, for one surface, and its S.N.I.D.E. entry was the only per-ground
 * override in the repo; decision 06 of "Nine Kits, One Vocabulary" generalises
 * exactly that shape, so this function became its first caller rather than a
 * second mechanism beside it. The rail asks for the `chrome` ground — it is the
 * app's own furniture wearing a faction, not a content card — and reads seven
 * of the nine roles it declares.
 */
function railFaceVars(slug: string | null | undefined): CSSProperties {
  if (!isKnownFaction(slug)) return {}
  const ink = factionRoleVar(slug, 'ink', 'chrome')
  const hue = factionRoleVar(slug, 'fill', 'chrome')
  return {
    ...factionRoleVars(slug, 'rail', 'chrome'),
    // 10% of the sheet's own ink: a well on the cream reads as a light warm
    // grey, the same expression on S.N.I.D.E.'s photocopier ink reads as a
    // lifted black. Measured as a VEIL in factionContrast.test.ts, because a
    // wash made of the ink can only ever tighten the ink's own reading.
    '--rail-well': `color-mix(in srgb, ${ink} 10%, transparent)`,
    // Always an IMAGE, never a colour: two of the four sites read this as
    // `background-image` under a `background-size` window, and a flat colour
    // is not a valid image. na's fallback is a gradient for the same reason.
    '--rail-spectrum': `linear-gradient(90deg, color-mix(in srgb, ${hue} 45%, transparent), ${hue})`,
    // #2404 — the panels all carry `.spectrum-frame`, whose ring is the na
    // rainbow. A member's frame is their own `--rail-line` hairline, so the ring
    // is switched OFF here rather than the class being withheld: a rainbow over
    // a faction kit would be a colour leak, and `background-image: none` is one
    // declaration where a conditional class would be a prop threaded through
    // three panels.
    '--spectrum-frame-image': 'none',
  } as CSSProperties
}

/**
 * Each reorderable panel's heading key.
 *
 * A LOOKUP of whole literal keys, never a `sidebar.${id}.heading` template: a
 * computed key is invisible to the copy sweep and to the typed `t()`, which is
 * the same reason `SidebarHandle` writes its four toggle labels out longhand.
 * Every string here is greppable exactly as it appears in the catalog.
 */
const PANEL_HEADING_KEY = {
  'active-tasks': 'sidebar.activeTasks.heading',
  'recent-activity': 'sidebar.recentActivity.heading',
} as const satisfies Record<SidebarPanelId, string>

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
  border: '1px solid var(--rail-line, var(--color-border-strong))',
  background: 'var(--rail-well, var(--color-bg-surface-alt))',
  fontFamily: 'var(--font-body)',
  // --text-md, not .eyebrow's --text-sm: a 44px pill wants a label a reader can
  // land on, and this is the size the bare caps it replaces already read at.
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

/** Shared panel shell for the rail. The three properties that carry the
 *  viewer's faction read the seam (#2361): the sheet, the frame colour and the
 *  per-faction frame RADIUS, which was English in `praxisCard/desktop/shared.
 *  tsx` until `--faction-{key}-card-radius` was minted for it.
 *
 *  Exported so the fold-away handle (#1191) reads as part of the rail. The
 *  handle renders OUTSIDE `#wz-sidebar`, so no local reaches it and it keeps
 *  the neutral chrome it ships with today, for every viewer. */
export const panelStyle: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: 'var(--rail-paper, var(--color-bg-surface))',
  // The hairline STAYS under the spectrum ring (#2404). It is the panel's floor:
  // if the rainbow reads faint against the page in either cascade, the sheet
  // still reads as a panel. For a member it is the frame, unchanged.
  border: '1px solid var(--rail-line, var(--color-border))',
  // #2404 — the unaffiliated rung is the deliberate 10px
  // `--faction-default-card-radius`, not `--radius-xl`'s 14px, which this
  // inherited by accident. `.spectrum-frame::before` takes it by `inherit`.
  borderRadius: 'var(--rail-radius, var(--faction-default-card-radius))',
  padding: 'var(--space-lg)',
}

/** The class every rail panel carries (#2404). Paired with `panelStyle` at each
 *  of the three `<section>`s, and unconditional: the ring is switched off for a
 *  member by `--spectrum-frame-image: none` in `railFaceVars`, not by being
 *  withheld here, so no panel needs to know who is looking. The fold-away handle
 *  borrows `panelStyle` alone and deliberately not this — it is chrome outside
 *  `#wz-sidebar`, not a sheet. */
const PANEL_FRAME = 'spectrum-frame'

const sectionLabel: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--rail-quiet, var(--color-text-secondary))',
}

/** The rule that fades out to the right, in "LABEL ——————". Decorative. */
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

/** Six dots, the conventional "grab me" mark. Inline rather than a font glyph so
 *  it renders identically everywhere, and `currentColor` so it inherits the
 *  header's own token instead of naming a colour. */
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

/** Reuses the rail's existing glyph rather than introducing a second chevron:
 *  '›' points right, so a quarter turn down is "open" and no turn is "closed" —
 *  the design's "rotates −90° when collapsed", read from the open state. */
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
 * A panel below the character card: its shell, its header row, and the two
 * gestures the header carries (#1555).
 *
 * COLLAPSING HIDES, IT DOES NOT UNMOUNT
 * -------------------------------------
 * The body is always rendered and folded away with the `hidden` attribute —
 * the same instrument, one level down, that `SidebarColumn` uses for the rail
 * as a whole. #1343 fixed exactly this bug at the rail level: unmounting tore
 * down the hooks inside, so reopening blinked. `hidden` draws nothing,
 * contributes no box and takes the subtree out of the accessibility tree, so
 * "collapsed means gone" holds without costing the reopen.
 *
 * WHY THE GRIP IS A BUTTON
 * ------------------------
 * Native HTML drag-and-drop is a pointer gesture with no keyboard equivalent,
 * so a `<div draggable>` would be a control half the site cannot use. The grip
 * is a real `<button>`: the pointer arms the drag through it, and Arrow Up /
 * Arrow Down move the panel a seat at a time through the same reorder
 * primitive. `draggable` is armed by the grip rather than left on permanently
 * so the panel's own links and text stay selectable and draggable as links.
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
        // The drop-target mark: the panel's own hairline, brightened. It is the
        // border it already has rather than a new outline, so nothing shifts.
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
          // Reorderable but not collapsible — the owner ruling's asymmetry. No
          // disclosure control at all rather than a disabled one.
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

/** The "In progress tasks" panel's body — everything the header does not own.
 *  A component of its own since #1555, because the panel is now rendered from an
 *  ORDER rather than from its position in this file's source. */
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
                    // The na kit's muted ink was the fallback and stays it: the
                    // pill is the rail's own annotation, so it takes the rail's
                    // quiet tier rather than the row's task faction (#2361).
                    color: 'var(--rail-quiet, var(--faction-default-card-muted))',
                    padding: 'var(--space-xs) var(--space-sm)',
                    border: '1px solid var(--rail-line, var(--color-border-strong))',
                    borderRadius: 999,
                  }}
                >
                  {praxisModeLabel(praxis, t)}
                </span>
                {/* Whose faction the TASK belongs to, beside what kind of praxis
                    it is (#1711) — two different facts, so the pill stays. This
                    row spells the faction out nowhere else, so unlike the mobile
                    FieldDesk rows the mark is NAMED rather than hidden. */}
                <span
                  className="flex"
                  role="img"
                  aria-label={factionName(praxis.task_faction_slug)}
                >
                  {/* Inked by the task's faction (#2723). Passing nothing left
                      each mark on its own component default, which on this
                      neutral rail is either the PAGE's text ink (the Ephemerists
                      kite's `currentColor` — white after dark, the report) or a
                      token declared once and so blind to the other theme.
                      `factionCssVar` carries both halves of the cascade. The
                      `isKnownFaction` guard is the filter facet's (#2528): `na`
                      and `albescent` map to CSS key `default`, and that flat
                      grey would paint over the spectra they own. */}
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

      {/* Slot-usage progress bar — a STATIC window onto one track-wide rainbow
          (#1128). The spectrum belongs to the TRACK, not to the fill: at 1 of 5
          slots you see red→orange, at 5 of 5 the whole rainbow, and a visible
          stop is the same physical width at every fill level. Nothing animates,
          so there is no motion left for prefers-reduced-motion to gate — which
          also retires the old drift's un-gated `background-size: 200%`, a
          permanently half-drawn spectrum for anyone who reduced motion. */}
      <div className="mt-4">
        <div className="overflow-hidden" style={{ height: 6, borderRadius: 999, background: 'var(--rail-well, var(--color-bg-surface-alt))' }}>
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
                 red↔magenta seam never comes into view.

                 A MEMBER SEES THE SAME WINDOW ONTO THEIR OWN HUE (#2361): the
                 seam's fallback IS this token, so every word above holds
                 unchanged for an unaffiliated viewer, and a member's ramp is a
                 single 90deg pass too — one stop, not seven, which the window
                 reads exactly as happily. */
              backgroundImage: 'var(--rail-spectrum, var(--faction-default-rainbow))',
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
          style={{ fontSize: 'var(--text-base)', letterSpacing: '0.08em', color: 'var(--rail-quiet, var(--color-text-secondary))', marginTop: 'var(--space-sm)' }}
        >
          {t('sidebar.activeTasks.slots', { count: slotCount, max: maxTaskSlots })}
        </p>
      </div>
    </>
  )
}

/** The "Recent activity" panel's body. See `ActiveTasksBody` for why it is its
 *  own component. */
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
            // The SAME vocabulary `/updates` draws its cards from — `feedKicker`
            // names all fifteen types and `normalizeFeedItem` unpacks the
            // eleven the faction chassis owns into actor / action / headline /
            // points. The panel used to hand-roll a two-branch kicker over the
            // only two types it could ever see; now that it sees eleven, a
            // second private vocabulary here would be eleven ways to disagree
            // with the page this panel links to.
            const row = normalizeFeedItem(item)
            // `era_announcement` is the one live type the chassis does not own
            // (epic #1192 decision 6), so `row` is null for it and the shared
            // title helper answers instead. `friend_defection` has no headline
            // at all — its substance IS the sentence — so the action line is
            // the fallback before the title helper.
            const headline = row?.headline ?? row?.action ?? feedItemTitle(item)
            const href = row?.headlineHref ?? null
            const kicker = item.actor_display_name
              ? `${feedKicker(item.type)} · ${item.actor_display_name}`
              : feedKicker(item.type)
            // A null slug means the server found no faction to frame this item
            // with — neutral, same as the unaffiliated slugs.
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
                {/* The row's FACTION, not a decoration shaped like a signal
                    (#1892). The slug is the same `context_faction_slug` the
                    card on `/updates` frames itself with, for the reason the
                    kicker above is shared: this panel is a window onto that
                    page, and a mark that disagreed with the frame the player
                    lands on would be one more private vocabulary.

                    No `marginTop`: at 18px the mark aligns optically to the
                    kicker line on its own, and the old nudge — sized for a 6px
                    dot — now floats it above the row. */}
                {isNeutral ? (
                  // `DefaultSigil` names itself; a wrapper label here would
                  // only overwrite that copy with something shorter.
                  <span className="shrink-0 flex">
                    <DefaultSigil size={ACTIVITY_SIGIL} color={sampledSpectrum(index)} />
                  </span>
                ) : (
                  // The seven faction marks are aria-hidden SVGs, so the row
                  // names them — as the in-progress row above does, and for the
                  // same reason: nothing else in the row spells the faction out.
                  <span
                    className="shrink-0 flex"
                    role="img"
                    aria-label={factionName(item.context_faction_slug)}
                  >
                    {/* And in that faction's hue (#2723), for the reason the
                        in-progress row above is. `isNeutral` has already sent
                        `na` and a null slug to the sampled ring, but NOT
                        `albescent` — it draws its labyrinth through this
                        dispatcher, and its adapter forwards `color` onto the
                        mask — so the guard is what keeps that mark on its conic
                        rather than the flat `--faction-default` grey. */}
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

      {/* The panel is a WINDOW onto the feed, never a replacement for it: it
          shows five items and has no paging, no archive gesture and no type
          facet. `/updates` has all three, so the foot of the panel is a door
          to it — and it is drawn even when the panel is empty, because "no
          activity yet" is exactly when a player most needs telling that the
          full feed exists somewhere. */}
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
 * tasks + recent activity.
 *
 * IT WEARS THE VIEWER'S FACTION (#2361)
 * -------------------------------------
 * It was built to the unaffiliated "all paths" rainbow-spectrum identity and
 * wore it for every viewer. It now takes the viewer's own sheet, inks, frame
 * radius and display face through the seam `railFaceVars` declares — see that
 * function for the whole argument, including why an unaffiliated (and an
 * Albescent) viewer is pixel-identical to what shipped before it.
 *
 * Those panels used to be three separate fetches made here, each one waiting on
 * `/auth/me`. They are one request now, made before this component exists — see
 * `hooks/useSidebarPanels` (#1344). Identity is still read from auth: the
 * character card is `/auth/me`'s payload, not the rail's.
 *
 * IT NO LONGER OFFERS "PROPOSE A TASK" (#1556)
 * --------------------------------------------
 * The rail is status and requests, not an authoring entry point. The affordance
 * has one home now and it is `/tasks`, where the player is already browsing the
 * bank — see `pages/Tasks.tsx`. This moves WHERE the entry point is, never WHO
 * gets one: the `can_propose_task` gate moved with it, and in fact tightened,
 * because the rail's button was ungated and offered the route to accounts the
 * server would refuse.
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
 *
 * THE PANELS BELOW THE CARD ARE THE PLAYER'S TO ARRANGE (#1555)
 * -------------------------------------------------------------
 * Everything under the character card is rendered from an ORDER, not from
 * source position, and each of those panels can be dragged to a new seat or
 * moved with the arrow keys from its grip. The two long ones fold away as well.
 * The character card is pinned above all of it and carries neither gesture:
 * it is the answer to "who am I playing", which has no useful second position
 * and nothing worth hiding.
 *
 * The shape persists per ACCOUNT (`useSidebarPanelLayout`), never per
 * character — a rail that rearranged itself as you switched lives would read as
 * a bug rather than as your own preference.
 *
 * Note what does NOT appear in the order: pending requests. The rail stopped
 * listing them at #1423 (ADR-0070) and the count lives on the handle, so there
 * is no requests panel here to seat. The ruling that it would be reorderable
 * but never collapsible is carried by `SIDEBAR_PANEL_COLLAPSIBLE`, which is a
 * per-panel flag for that reason.
 */
export default function Sidebar() {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const character = user?.character
  const { order, isCollapsed, toggleCollapsed, movePanelOnto, movePanelByStep } =
    useSidebarPanelLayout(user?.account_id ?? null)

  // Transient drag bookkeeping — the design's `dragKey` / `overKey`. It is
  // deliberately NOT in the layout hook: nothing about a drag in flight is worth
  // persisting, and a re-render per pointer move should not touch storage.
  // `armedId` is the third: `draggable` is switched on only while the pointer is
  // on that panel's grip, so the panel's own links stay ordinary links.
  const [armedId, setArmedId] = useState<SidebarPanelId | null>(null)
  const [draggingId, setDraggingId] = useState<SidebarPanelId | null>(null)
  const [dropTargetId, setDropTargetId] = useState<SidebarPanelId | null>(null)

  function endDrag() {
    setArmedId(null)
    setDraggingId(null)
    setDropTargetId(null)
  }

  const {
    // The wire field is still named `global_activity`, but since #1556 it
    // carries the player's whole LIVE feed minus the obligations — see
    // `api/sidebar.ts`. Read under the name of what it holds.
    global_activity: recentActivity,
    active_praxes: activeTasks,
  } = useSidebarPanels()
  const gameConfig = useGameConfig()
  const track = useLevelTrack(character?.level ?? 0, character?.score ?? 0)

  const maxTaskSlots = gameConfig?.max_task_signups ?? DEFAULT_MAX_TASK_SLOTS
  const eraName = user?.era_name ?? ''

  // Built for EVERY panel on every render, collapsed or not. That is the point:
  // a collapsed panel is hidden, never unmounted (#1343), so its body is here
  // waiting rather than being rebuilt when the player opens it again.
  const panelBodies: Record<SidebarPanelId, ReactNode> = {
    'active-tasks': <ActiveTasksBody activeTasks={activeTasks} maxTaskSlots={maxTaskSlots} />,
    'recent-activity': <RecentActivityBody recentActivity={recentActivity} />,
  }

  // The whole rail's dress, declared once (#2361). `{}` for an unaffiliated or
  // Albescent viewer, which is what makes their rail byte-identical.
  const railFace = railFaceVars(character?.faction_slug)
  const wearsFactionFace = Object.keys(railFace).length > 0

  // #2404 — THE ONE THING THAT TELLS THE TWO APART, and it is motion, not
  // colour. Albescent still takes the na rail whole: same sheet, same frame,
  // same spectrum, `railFace` still `{}`. The attribute adds nothing visible on
  // its own; it is the hook the DEFERRED `motion.ornament.css` matches to walk
  // `.spectrum-frame`'s rainbow slowly around all three panels, which is exactly
  // the shimmer ADR-0048 always permitted. One attribute on the aside rather
  // than a class on each panel, because it reaches every panel by descent —
  // the same shape as `data-rail-face` above.
  const driftsTheFrame = character?.faction_slug === 'albescent'

  return (
    // `id` is the target of the fold-away handle's `aria-controls` (#1191).
    <aside
      id="wz-sidebar"
      className="flex flex-col gap-4 w-full"
      // The DISPLAY FACE is the one thing the seam cannot carry on its own:
      // `.font-display` is a Tailwind utility with a hardcoded stack, so a
      // `var()` fallback has nowhere to live. The attribute is the switch —
      // absent for an unaffiliated viewer, so the one rule in index.css that
      // repoints it (`[data-rail-face] .font-display`) never matches and the
      // utility's stack is untouched.
      {...(wearsFactionFace ? { 'data-rail-face': '' } : null)}
      {...(driftsTheFrame ? { 'data-spectrum-drift': '' } : null)}
      style={railFace}
    >
      {/* ── Character Card ── */}
      {character ? (
        <section className={PANEL_FRAME} style={panelStyle}>
          {/* Signature hairline — this panel only. Kept through the identity
              redesign (#1553): the hairline, the avatar ring and the level
              track are one mark at three scales. Since #2361 it is one mark at
              three scales in the VIEWER's colour — the unaffiliated spectrum
              while the seam is unset, the member's own ramp once it is set. */}
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

          {/* ── Actions: real 44px targets, right-aligned on their own row.
                 ONE door, since #2354. The `CHARACTERS` pill that stood here
                 opened the account's roster in a bottom sheet — the same roster,
                 on the same `rosterOffersAChoice` gate, that the desktop home
                 lays out in the page behind this rail.

                 `EDIT` stays, but not for the reason it used to: since #2552 the
                 home page's roster cards each carry this same door, so it is no
                 longer the only one. It is the only one the viewer is CERTAIN to
                 have — those cards live behind `rosterOffersAChoice`, and the
                 commonest state of all (one life, gate shut) draws no roster at
                 all. Two doors to the same room while the gate is open; this one
                 while it is shut. ── */}
          <div className="flex justify-end gap-2 mb-4">
            <Link
              to={`/characters/${character.id}/edit`}
              className="hover:opacity-80 active:opacity-60"
              style={identityActionStyle}
            >
              {t('sidebar.characterCard.edit')}
            </Link>
          </div>

          {/* ── Identity: avatar + name + level. Still no faction WORD, and
                 still no points figure; there is exactly one of those, below.
                 The ring said "unaffiliated" for every viewer until #2361 — it
                 says the viewer's own faction now, and only an unaffiliated or
                 Albescent viewer keeps the all-paths spectrum. ── */}
          <div className="flex items-center gap-3.5 mb-4">
            {/* avatar in the viewer's ring — the na conic while the seam is
                unset, the member's own ramp once it is set */}
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

          {/* ── The one points figure, in the display face ── */}
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

          {/* ── The level track. The fill is the ramp CLIPPED by the fill width
                 — one full pass read through a narrower window, so the mark is
                 the same one the hairline and the ring are. Not a solid colour,
                 and not a token of its own: it reads the rail's spectrum seam,
                 whose unset value is the unaffiliated ramp this always was. ── */}
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

          {/* ── Baseline: what is owed, and what has ever been earned ── */}
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
