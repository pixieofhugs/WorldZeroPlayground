/**
 * Shared profile-skin scaffold (#460).
 *
 * Every faction player-profile renders the SAME locked section spine as
 * DefaultProfileBody — ① identity + progression, ③ badges (hidden when empty),
 * ⑤ praxis (faction PraxisCard, FDL laurel on the top entry), plus the kept
 * proposed-tasks and friend/foe features. Only the COSTUME differs. This module
 * factors the invariant structure into one skinnable renderer driven by a
 * per-faction `ProfileKit`; each `<Faction>ProfileBody.tsx` supplies only its
 * kit (tokens, fonts, copy, chrome slots) and delegates here.
 *
 * No hardcoded hex: kits reference the repo's `--faction-<slug>-*` CSS vars.
 * Always-dark (snide, singularity) / always-light (albescent, ua) factions scope
 * their tokens to the skin container and NEVER mutate the global [data-theme].
 */
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { BadgeOut } from '../../../api/auth'
import { badgeArtFor } from '../../../components/badges/badgeArt'
import CredentialCard from '../../../components/CredentialCard'
import PraxisCard from '../../../components/PraxisCard'
import TaskCard from '../../../components/TaskCard'
import { mediaUrl } from '../../../utils/media'
import type { ProfileBodyProps } from '../FactionProfileBody'

/** The costume knobs a faction fills in. Everything is a CSS var reference or
 *  faction-appropriate copy — no literal hex, no per-theme branching. */
export interface ProfileKit {
  /** faction_slug this kit skins (drives the shared CredentialCard skin). */
  slug: string
  /** Fixed theme for always-dark/always-light factions; scoped to the
   *  container only, never applied to the global tree. */
  dataTheme?: 'light' | 'dark'

  /* ── surfaces / ink ── */
  /** Page-level wrapper background (the "wall" behind the profile). */
  pageBackground: string
  /** Optional decorative overlay layered over the page (texture/grid/etc.). */
  pageOverlay?: string
  /** Ink color for headings + the display name. */
  ink: string
  /** Secondary / meta ink. */
  muted: string
  /** Accent color (progression ring, accents). */
  accent: string
  /** Card / panel surface. */
  surface: string
  /** Hairline border color. */
  border: string

  /* ── fonts ── */
  /** Display font for the big name + section headings. */
  displayFont: string
  /** Small mono/label eyebrow font. */
  eyebrowFont: string
  /** Body font for meta lines. */
  bodyFont?: string

  /* ── identity header chrome ── */
  /** Style for the outer identity banner (frame idiom lives here). */
  headerStyle: CSSProperties
  /** Optional absolutely-positioned decoration inside the header (grain, strip). */
  headerDecoration?: ReactNode
  /** Optional wrapper chrome placed AROUND the shared CredentialCard. */
  credentialFrame?: (card: ReactNode) => ReactNode
  /** px font-size for the big display name (default 48). */
  nameSize?: number
  /** Optional CSS text-shadow / transform on the name. */
  nameExtra?: CSSProperties
  /** Eyebrow above the name, e.g. "Player · University of Asthmatics". */
  playerEyebrow: string

  /* ── progression panel ── */
  /** Style for the progression panel container. */
  progressionStyle: CSSProperties
  /** Small label above the level number inside the ring (e.g. "lvl", "ANNO"). */
  ringLabel: string
  /** Fill for the points-into-level bar. */
  barFill: string
  /** Track behind the progression bar. */
  barTrack: string
  /** Render the level number (default: the integer; e.g. roman for ephemerists). */
  formatLevel?: (level: number) => string
  /** Copy for "pts this level" (defaults to "pts this level"). */
  levelUnitLabel?: string
  /** Copy for "next · lvl {n}". */
  nextLevelLabel: (nextLevel: number) => string
  /** Copy for the absolute-score footer line ("{score} / {next} pts"). */
  scoreFootnote?: (score: number, nextThreshold: number) => string

  /* ── section headings ── */
  /** Renders a section heading (⑤ praxis, proposed tasks). */
  sectionHeading: (title: string, eyebrow: string) => ReactNode

  /* ── praxis ── */
  /** Eyebrow for the praxis section, e.g. "sealed by {name}". */
  praxisEyebrow: (name: string) => string
  /** Empty-state title + body copy for the praxis section. */
  praxisEmpty: { title: string; body: string }
  /** Empty-state container style. */
  emptyStateStyle: CSSProperties
  /** The FDL laurel stamped on the top praxis (spectrum ring by default; some
   *  factions draw an ink-outline variant). */
  laurel: ReactNode

  /* ── badges (③) ── */
  /** Section title, e.g. "Distinctions", "Citations", "Commendations". */
  badgeTitle: string
  /** Board container style. */
  badgeBoardStyle: CSSProperties
  /** Renders one badge row (medallion + name). */
  badgeRow: (badge: BadgeOut, last: boolean) => ReactNode
  /** "{n} earned" chip style. */
  badgeChipStyle: CSSProperties
}

/** A reusable spectrum-ring FDL laurel (used by all colored factions; the
 *  colorless ones supply their own ink-outline variant). `ringBg` defaults to
 *  the spectrum default ring; `centerBg`/`glyphColor` skin the medallion. */
export function SpectrumLaurel({
  ringBg = 'var(--faction-default-ring)',
  centerBg = 'var(--color-bg-surface-alt)',
  glyphColor = 'var(--color-text-primary)',
  rotate = 0,
}: {
  ringBg?: string
  centerBg?: string
  glyphColor?: string
  rotate?: number
}) {
  return (
    <span
      title="Top praxis"
      style={{
        position: 'absolute',
        top: -11,
        right: 14,
        zIndex: 20,
        width: 44,
        height: 44,
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
      }}
    >
      <span
        style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: ringBg }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 4,
          borderRadius: '50%',
          background: centerBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: glyphColor,
        }}
      >
        <LaurelGlyph />
      </span>
    </span>
  )
}

/** The fleur/laurel glyph, in currentColor. */
export function LaurelGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * (22 / 18)}
      viewBox="0 0 40 48"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20 1 C16 10 16 17 20 24 C24 17 24 10 20 1 Z" />
      <path d="M20 22 C14 15 8 15 6 21 C4.6 25 8 29 13.5 27.6 C10.5 25 12.5 21 20 22 Z" />
      <path d="M20 22 C26 15 32 15 34 21 C35.4 25 32 29 26.5 27.6 C29.5 25 27.5 21 20 22 Z" />
      <rect x="11" y="26" width="18" height="4.5" rx="2.2" />
      <path d="M20 30 C17.5 37 16 41 20 47 C24 41 22.5 37 20 30 Z" />
    </svg>
  )
}

/** Shared badge-row primitive: a skinnable medallion + the badge name. Kits
 *  pass their medallion chrome; the glyph is mapped client-side by badge key. */
export function BadgeRow({
  badge,
  last,
  medallion,
  nameStyle,
  dividerColor,
}: {
  badge: BadgeOut
  last: boolean
  medallion: (glyph: ReactNode) => ReactNode
  nameStyle: CSSProperties
  dividerColor: string
}) {
  const Art = badgeArtFor(badge.key)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '10px 0',
        borderBottom: last ? 'none' : `1px solid ${dividerColor}`,
      }}
    >
      {medallion(<Art size={16} />)}
      <div style={nameStyle}>{badge.name}</div>
    </div>
  )
}

/**
 * The invariant profile renderer. Given the live props + a faction kit, lays
 * out the locked spine in the faction's costume. Structurally identical to
 * DefaultProfileBody — only the styling knobs move.
 */
export function ProfileSkin({
  props,
  kit,
}: {
  props: ProfileBodyProps
  kit: ProfileKit
}) {
  const { t } = useTranslation('common')
  const { character, submissions, proposedTasks, progression, identityActions } = props
  const badges = character.badges ?? []
  const joined = new Date(character.created_at).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })

  // ⑤ FDL laurel target: highest earned points (PraxisCardOut.score is base+vote).
  const topScore = submissions.reduce((max, p) => Math.max(max, p.score ?? 0), 0)
  const laurelId = submissions.find((p) => (p.score ?? 0) === topScore)?.id ?? null

  // ① progression numbers (hidden until game config supplies thresholds).
  const pointsIntoLevel = progression
    ? Math.max(character.score - progression.currentThreshold, 0)
    : 0
  const levelSpan = progression
    ? Math.max(progression.nextThreshold - progression.currentThreshold, 0)
    : 0
  const ringDegrees = progression
    ? Math.round(Math.min(Math.max(progression.progressPercent, 0), 100) * 3.6)
    : 0

  const levelText = kit.formatLevel
    ? kit.formatLevel(character.level)
    : String(character.level)
  const levelUnit = kit.levelUnitLabel ?? 'pts this level'

  const credential = (
    <CredentialCard
      displayName={character.display_name}
      handle={character.username}
      bio={character.bio}
      factionSlug={character.faction_slug}
      level={character.level}
      score={character.score}
      avatarUrl={character.avatar_url ? mediaUrl(character.avatar_url) : null}
    />
  )

  const mainColumn = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 34, minWidth: 0 }}>
      {/* ── ⑤ Praxis ── */}
      <section>
        {kit.sectionHeading('Praxis', kit.praxisEyebrow(character.display_name))}
        {submissions.length === 0 ? (
          <div style={kit.emptyStateStyle}>
            <div
              style={{
                fontFamily: kit.displayFont,
                fontSize: 19,
                color: kit.ink,
              }}
            >
              {kit.praxisEmpty.title}
            </div>
            <div
              style={{
                fontFamily: kit.bodyFont ?? kit.eyebrowFont,
                fontSize: 11,
                color: kit.muted,
                marginTop: 5,
              }}
            >
              {kit.praxisEmpty.body}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 items-start">
            {submissions.map((praxis) => (
              <div key={praxis.id} style={{ position: 'relative' }}>
                {praxis.id === laurelId && kit.laurel}
                <PraxisCard praxis={praxis} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Proposed tasks (kept feature, #419) ── */}
      <section>
        {kit.sectionHeading(t('profile.proposedTasksHeading'), t('profile.proposedTasksTotal', { count: proposedTasks.length }))}
        {proposedTasks.length === 0 ? (
          <p style={{ fontFamily: kit.bodyFont ?? kit.eyebrowFont, color: kit.muted }}>
            {t('profile.proposedTasksEmpty')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-4 items-start">
            {proposedTasks.map((task) => (
              <TaskCard key={task.id} task={task} displayPoints={task.point_value} />
            ))}
          </div>
        )}
      </section>
    </div>
  )

  return (
    <div
      data-theme={kit.dataTheme}
      style={{
        position: 'relative',
        background: kit.pageBackground,
        padding: '32px 28px',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {kit.pageOverlay && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: kit.pageOverlay,
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── ① Identity + progression ── */}
        <header style={{ ...kit.headerStyle, position: 'relative', overflow: 'hidden' }}>
          {kit.headerDecoration}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              gap: 34,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flexShrink: 0 }}>
              {kit.credentialFrame ? kit.credentialFrame(credential) : credential}
            </div>

            <div style={{ flex: 1, minWidth: 300 }}>
              <div
                style={{
                  fontFamily: kit.eyebrowFont,
                  fontSize: 9,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: kit.muted,
                  marginBottom: 8,
                }}
              >
                {kit.playerEyebrow}
              </div>

              <h1
                style={{
                  fontFamily: kit.displayFont,
                  fontSize: kit.nameSize ?? 48,
                  lineHeight: 0.98,
                  margin: 0,
                  color: kit.ink,
                  overflowWrap: 'anywhere',
                  ...kit.nameExtra,
                }}
              >
                {character.display_name}
              </h1>

              <div
                style={{
                  fontFamily: kit.bodyFont ?? kit.eyebrowFont,
                  fontSize: 12,
                  color: kit.muted,
                  marginTop: 10,
                }}
              >
                {t('profile.handleJoined', { username: character.username, joined })}
              </div>

              {progression && (
                <div style={kit.progressionStyle}>
                  {/* level ring */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: `conic-gradient(${kit.accent} ${ringDegrees}deg, ${kit.barTrack} 0)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: '50%',
                        background: kit.surface,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: kit.eyebrowFont,
                          fontSize: 7,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: kit.muted,
                        }}
                      >
                        {kit.ringLabel}
                      </span>
                      <span
                        style={{
                          fontFamily: kit.displayFont,
                          fontSize: 22,
                          color: kit.accent,
                        }}
                      >
                        {levelText}
                      </span>
                    </span>
                  </div>

                  {/* points-into-level bar toward level+1 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: kit.bodyFont ?? kit.eyebrowFont,
                          fontSize: 10,
                          color: kit.muted,
                        }}
                      >
                        {pointsIntoLevel} / {levelSpan} {levelUnit}
                      </span>
                      <span
                        style={{
                          fontFamily: kit.eyebrowFont,
                          fontSize: 9,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: kit.muted,
                        }}
                      >
                        {kit.nextLevelLabel(progression.nextLevel)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 10,
                        borderRadius: 20,
                        background: kit.barTrack,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 20,
                          width: `${progression.progressPercent}%`,
                          background: kit.barFill,
                          transition: 'width 300ms',
                        }}
                      />
                    </div>
                    {kit.scoreFootnote && (
                      <div
                        style={{
                          fontFamily: kit.bodyFont ?? kit.eyebrowFont,
                          fontSize: 9,
                          color: kit.muted,
                          marginTop: 5,
                        }}
                      >
                        {kit.scoreFootnote(character.score, progression.nextThreshold)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* friend/foe — kept feature, faction-skinned, folded into header */}
              {identityActions && (
                <div style={{ marginTop: 16, maxWidth: 220 }}>{identityActions}</div>
              )}
            </div>
          </div>
        </header>

        {/* ── ② About: skipped in v1 (no long-form field) ── */}

        {badges.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 300px',
              gap: 30,
              alignItems: 'start',
            }}
          >
            {mainColumn}

            {/* ── ③ Badges — hidden entirely when empty ── */}
            <aside>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <h2 style={{ fontFamily: kit.displayFont, fontSize: 22, margin: 0, color: kit.ink }}>
                  {kit.badgeTitle}
                </h2>
                <span style={kit.badgeChipStyle}>{t('profile.badgesEarned', { count: badges.length })}</span>
              </div>
              <div style={kit.badgeBoardStyle}>
                {badges.map((badge, index) => (
                  <span key={badge.key}>
                    {kit.badgeRow(badge, index === badges.length - 1)}
                  </span>
                ))}
              </div>
            </aside>
          </div>
        ) : (
          mainColumn
        )}
      </div>
    </div>
  )
}
