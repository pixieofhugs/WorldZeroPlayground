/**
 * DefaultProfileBody — the unaffiliated / no-faction player-profile skin
 * (#459), ported from the design system's `templates/default/Default
 * Profile.dc.html`: a clean sheet inside the thick spectrum band (all paths
 * open), and the fallback for every faction until its bespoke skin lands
 * (#460). All colours via `--faction-default-*` / global tokens (#418) — no
 * hardcoded hex; light/dark flips through the cascade.
 *
 * Locked section spine: ① identity + progression (shared CredentialCard as
 * the header), ② about — skipped in v1 (no field), ③ badges (hidden when
 * empty), ⑤ praxis (faction PraxisCard, FDL laurel on the top entry), plus
 * the kept proposed-tasks and friend/foe features.
 *
 * ONE RESPONSIVE COMPONENT (#1319, the ADR-0056 / ADR-0058 / ADR-0067 shape).
 * The phone skin used to be a separate file on a `mobileProfile` manifest
 * surface (`mobileArchetypes/DefaultProfile`, #517, redrawn for #969); that
 * surface is retired and its markup is the `MobileProfile` branch below,
 * unchanged. `useFormFactor()` is read once, at the exported component, which
 * is the only dispatcher — the same call site `<Faction>TaskDetail` uses.
 *
 * The two branches are separate components rather than one body full of
 * ternaries because they are not one layout at two sizes: the phone stacks a
 * centred credential over a SEGMENTED praxis/tasks toggle (which owns state),
 * where the desktop lays a two-column grid beside a badge aside. Sharing the
 * ornaments (laurel, badge row, eyebrow) is what the merge buys; sharing the
 * skeleton would have meant redrawing one of the two shipped designs.
 *
 * The na fidelity fix the phone branch carries (#749/ADR-0039): its identity
 * band, avatar hoop, progression bar and section dot reach the spectrum through
 * `factionFill(slug, …)` / CredentialCard, never `factionCssVar('na')`, which
 * resolves grey. Those seams stay per-faction — the branch is only reached by
 * na/albescent and by any faction with no `profileBody` row, so a themed slug
 * gets its solid hue and na gets the rainbow.
 */
import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import type { BadgeOut } from '../../../api/auth'
import { badgeArtFor } from '../../../components/badges/badgeArt'
import CredentialCard from '../../../components/CredentialCard'
import PraxisCard from '../../../components/praxisCard/PraxisCard'
import TaskCard from '../../../components/taskCard/TaskCard'
import { useFormFactor } from '../../../hooks/useFormFactor'
import { factionFill, factionName, isKnownFaction } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import type { ProfileBodyProps } from '../FactionProfileBody'
// The ② About block is shared with every faction kit — see profileSkin.tsx. This
// is the one profile that does NOT delegate to `ProfileSkin`, so it mounts that
// component itself rather than growing a second copy of the rule.
import { AboutBlock } from './profileSkin'

type Segment = 'praxis' | 'tasks'

const EYEBROW: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
}

/** Section heading: display-italic title + optional eyebrow + a soft rainbow rule. */
function SectionHeading({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
      <h2
        className="font-display italic"
        style={{ fontSize: 'var(--text-title)', margin: 0, color: 'var(--color-text-primary)' }}
      >
        {title}
      </h2>
      {eyebrow && <span style={{ ...EYEBROW, letterSpacing: '0.08em' }}>{eyebrow}</span>}
      <span
        aria-hidden
        style={{
          flex: 1,
          height: 3,
          borderRadius: 3,
          background: 'var(--faction-default-rainbow)',
          opacity: 0.5,
        }}
      />
    </div>
  )
}

/** The FDL laurel stamped on the character's top praxis (highest base+vote
 *  points — `praxis.score` is exactly that sum). Spectrum ring, ink glyph. */
function FdlLaurel() {
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
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'var(--faction-default-rainbow-conic)',
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 4,
          borderRadius: '50%',
          background: 'var(--color-bg-surface-alt)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-primary)',
        }}
      >
        <svg width={18} height={22} viewBox="0 0 40 48" fill="currentColor" aria-hidden>
          <path d="M20 1 C16 10 16 17 20 24 C24 17 24 10 20 1 Z" />
          <path d="M20 22 C14 15 8 15 6 21 C4.6 25 8 29 13.5 27.6 C10.5 25 12.5 21 20 22 Z" />
          <path d="M20 22 C26 15 32 15 34 21 C35.4 25 32 29 26.5 27.6 C29.5 25 27.5 21 20 22 Z" />
          <rect x="11" y="26" width="18" height="4.5" rx="2.2" />
          <path d="M20 30 C17.5 37 16 41 20 47 C24 41 22.5 37 20 30 Z" />
        </svg>
      </span>
    </span>
  )
}

/** ③ One badge row: spectrum-ring medallion + name. `nameLineHeight` is the one
 *  thing the two form factors ever disagreed on, so it stays a knob rather than
 *  a second copy of the row. */
function BadgeRow({
  badge,
  last,
  nameLineHeight,
}: {
  badge: BadgeOut
  last: boolean
  nameLineHeight?: number
}) {
  const Art = badgeArtFor(badge.key)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-md) 0',
        borderBottom: last ? 'none' : '1px solid var(--color-border)',
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: '50%',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: spectrum ring thickness on a 34px medallion; the nearest rung (4px) is a 60% thicker ring and visibly shrinks the inner disc.
          padding: 2.5,
          background: 'var(--faction-default-rainbow-conic)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'var(--color-bg-surface-alt)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-primary)',
          }}
        >
          <Art size={16} />
        </span>
      </span>
      <div
        className="font-display italic"
        style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-primary)', lineHeight: nameLineHeight }}
      >
        {badge.name}
      </div>
    </div>
  )
}

/** ⑤ FDL laurel target: highest earned points (task base + points from votes —
 *  `PraxisCardOut.score` is that sum); first entry wins a tie. */
function laurelTarget(submissions: ProfileBodyProps['submissions']): number | null {
  const topScore = submissions.reduce((max, praxis) => Math.max(max, praxis.score ?? 0), 0)
  return submissions.find((praxis) => (praxis.score ?? 0) === topScore)?.id ?? null
}

/** ① progression numbers, shared by both branches (hidden until game config
 *  supplies thresholds). */
function progressionFigures(
  character: ProfileBodyProps['character'],
  progression: ProfileBodyProps['progression'],
) {
  return {
    pointsIntoLevel: progression
      ? Math.max(character.score - progression.currentThreshold, 0)
      : 0,
    levelSpan: progression
      ? Math.max(progression.nextThreshold - progression.currentThreshold, 0)
      : 0,
    ringDegrees: progression
      ? Math.round(Math.min(Math.max(progression.progressPercent, 0), 100) * 3.6)
      : 0,
  }
}

export default function DefaultProfileBody(props: ProfileBodyProps) {
  return useFormFactor() === 'mobile' ? (
    <MobileProfile {...props} />
  ) : (
    <DesktopProfile {...props} />
  )
}

function DesktopProfile({
  character,
  submissions,
  proposedTasks,
  progression,
  identityActions,
}: ProfileBodyProps) {
  const { t } = useTranslation('common')
  const isUnaffiliated = !character.faction_slug || character.faction_slug === 'na'
  const badges = character.badges ?? []
  const joined = new Date(character.created_at).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })

  const laurelId = laurelTarget(submissions)
  const { pointsIntoLevel, levelSpan, ringDegrees } = progressionFigures(character, progression)

  const mainColumn = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)', minWidth: 0 }}>
      {/* ── ⑤ Praxis ── */}
      <section>
        <SectionHeading
          title="Praxis"
          eyebrow={`sealed by ${character.display_name}`}
        />
        {submissions.length === 0 ? (
          <div
            style={{
              border: '1.5px dashed var(--color-border-strong)',
              borderRadius: 12,
              padding: 'var(--space-2xl)',
              textAlign: 'center',
              background: 'var(--color-bg-surface-alt)',
            }}
          >
            <div
              className="font-display italic"
              style={{ fontSize: 'var(--text-title)', color: 'var(--color-text-primary)' }}
            >
              {t('profile.praxisEmptyTitle')}
            </div>
            <div
              className="font-body"
              style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)' }}
            >
              {t('profile.praxisEmptyBody')}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 items-start">
            {submissions.map((praxis) => (
              <div key={praxis.id} style={{ position: 'relative' }}>
                {praxis.id === laurelId && <FdlLaurel />}
                <PraxisCard praxis={praxis} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Proposed tasks (kept feature, #419) ── */}
      <section>
        <SectionHeading
          title={t('profile.proposedTasksHeading')}
          eyebrow={t('profile.proposedTasksTotal', { count: proposedTasks.length })}
        />
        {proposedTasks.length === 0 ? (
          <p className="font-body text-muted">{t('profile.proposedTasksEmpty')}</p>
        ) : (
          <div className="flex flex-wrap gap-4 items-start">
            {proposedTasks.map((task) => (
              <TaskCard key={task.id} task={task} basePoints={task.point_value} />
            ))}
          </div>
        )}
      </section>
    </div>
  )

  return (
    <div className="py-8" style={{ position: 'relative' }}>
      {/* Full-page spectrum wash — the na "all paths open" backdrop. The
          `.na-backdrop` rule (raw radial-gradient rgba + a [data-theme="dark"]
          brighten) lives in index.css and is owned by frontend-style; port it
          from the vendored default.css. Inert until that class lands. */}
      <div className="na-backdrop" aria-hidden />
      <div style={{ position: 'relative', zIndex: 1 }}>
      {/* ── ① Identity + progression — spectrum band, credential pinned ── */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 16,
          padding: 'var(--space-xs)',
          background: 'var(--faction-default-rainbow)',
          boxShadow: '0 20px 50px -26px rgba(0,0,0,0.4)',
          marginBottom: 'var(--space-2xl)',
        }}
      >
        <div
          style={{
            borderRadius: 12,
            background: 'var(--faction-default-card-bg)',
            padding: 'var(--space-xl)',
            display: 'flex',
            gap: 'var(--space-2xl)',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <CredentialCard
              displayName={character.display_name}
              handle={character.username}
              factionSlug={character.faction_slug}
              level={character.level}
              score={character.score}
              avatarUrl={character.avatar_url ? mediaUrl(character.avatar_url) : null}
            />
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
              <span
                aria-hidden
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  flex: 'none',
                  background: 'var(--faction-default-rainbow-conic)',
                  WebkitMask: 'radial-gradient(circle, transparent 38%, #000 40%)',
                  mask: 'radial-gradient(circle, transparent 38%, #000 40%)',
                }}
              />
              <span style={{ ...EYEBROW, color: 'var(--faction-default-card-muted)' }}>
                {t('profile.playerFaction', {
                  faction: isUnaffiliated ? t('profile.unaffiliated') : factionName(character.faction_slug),
                })}
              </span>
            </div>

            <h1
              className="font-display italic"
              style={{
                fontSize: 'var(--text-display)',
                lineHeight: 0.98,
                margin: 0,
                color: 'var(--faction-default-card-text)',
                overflowWrap: 'anywhere',
              }}
            >
              {character.display_name}
            </h1>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                flexWrap: 'wrap',
                marginTop: 'var(--space-md)',
              }}
            >
              {isUnaffiliated && (
                <>
                  <span
                    className="font-display italic"
                    style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)' }}
                  >
                    {t('profile.unaffiliatedPending')}
                  </span>
                  <span
                    aria-hidden
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: 'var(--color-text-tertiary)',
                    }}
                  />
                </>
              )}
              <span
                className="font-body"
                style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-tertiary)' }}
              >
                {t('profile.handleJoined', { username: character.username, joined })}
              </span>
            </div>

            {/* progression panel */}
            {progression && (
              <div
                style={{
                  marginTop: 'var(--space-xl)',
                  border: '1px solid var(--color-border-strong)',
                  borderRadius: 12,
                  padding: 'var(--space-lg)',
                  background: 'var(--color-bg-surface-alt)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-lg)',
                  maxWidth: 440,
                }}
              >
                {/* level ring */}
                <div
                  style={{
                    flexShrink: 0,
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: `conic-gradient(var(--color-text-primary) ${ringDegrees}deg, var(--color-border) 0)`,
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
                      background: 'var(--color-bg-surface-alt)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    <span style={{ ...EYEBROW, fontSize: 'var(--text-xs)', letterSpacing: '0.1em' }}>{t('profile.lvl')}</span>
                    <span
                      className="font-display italic"
                      style={{ fontSize: 'var(--text-title)', color: 'var(--color-text-primary)' }}
                    >
                      {character.level}
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
                      marginBottom: 'var(--space-sm)',
                    }}
                  >
                    <span
                      className="font-body"
                      style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)' }}
                    >
                      {t('profile.ptsThisLevel', { current: pointsIntoLevel, span: levelSpan })}
                    </span>
                    <span style={{ ...EYEBROW, fontSize: 'var(--text-sm)', letterSpacing: '0.08em' }}>
                      {t('profile.nextLevel', { level: progression.nextLevel })}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 10,
                      borderRadius: 20,
                      background: 'var(--color-border)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 20,
                        width: `${progression.progressPercent}%`,
                        background: 'var(--faction-default-rainbow)',
                        transition: 'width 300ms',
                      }}
                    />
                  </div>
                  <div
                    className="font-body"
                    style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-xs)' }}
                  >
                    {t('profile.ptsToNext', { score: character.score, threshold: progression.nextThreshold })}
                  </div>
                </div>
              </div>
            )}

            {/* friend/foe — kept feature, faction-skinned, folded into the header */}
            {identityActions && (
              <div style={{ marginTop: 'var(--space-lg)', maxWidth: 220 }}>{identityActions}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── ② About — the long-form field arrived with #1626 ── */}
      <AboutBlock bio={character.bio} heading={<SectionHeading title={t('profile.aboutHeading')} />} />

      {badges.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) fit-content(300px)',
            gap: 'var(--space-2xl)',
            alignItems: 'start',
          }}
        >
          {mainColumn}

          {/* ── ③ Badges — hidden entirely when the character has none ── */}
          <aside>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}
            >
              <h2
                className="font-display italic"
                style={{ fontSize: 'var(--text-title)', margin: 0, color: 'var(--color-text-primary)' }}
              >
                {t('profile.badgesHeading')}
              </h2>
              <span
                style={{
                  ...EYEBROW,
                  fontSize: 'var(--text-sm)',
                  letterSpacing: '0.1em',
                  marginLeft: 'auto',
                  border: '1px solid var(--color-border-strong)',
                  borderRadius: 20,
                  padding: 'var(--space-xs) var(--space-sm)',
                }}
              >
                {t('profile.badgesEarned', { count: badges.length })}
              </span>
            </div>
            <div
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                background: 'var(--color-bg-surface-alt)',
                padding: 'var(--space-xs) var(--space-lg)',
              }}
            >
              {badges.map((badge, index) => (
                <BadgeRow
                  key={badge.key}
                  badge={badge}
                  last={index === badges.length - 1}
                  nameLineHeight={1.15}
                />
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

/**
 * The phone reflow of the same #459 contract: centred credential on the
 * spectrum band, badges above, and a segmented Praxis/Tasks toggle over the
 * shared cards stacked single-column. Presentation only — it renders no field
 * the contract does not expose.
 */
function MobileProfile({
  character,
  submissions,
  proposedTasks,
  progression,
  identityActions,
}: ProfileBodyProps) {
  const { t } = useTranslation('common')
  const [segment, setSegment] = useState<Segment>('praxis')
  const badges = character.badges ?? []
  const isUnaffiliated = !isKnownFaction(character.faction_slug)

  const joined = new Date(character.created_at).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })

  const laurelId = laurelTarget(submissions)
  const { pointsIntoLevel, levelSpan, ringDegrees } = progressionFigures(character, progression)

  return (
    <div className="py-4" data-testid="mobile-profile" style={{ position: 'relative' }}>
      {/* Full-page spectrum wash — the na "all paths open" backdrop. The
          `.na-backdrop` rule (raw radial-gradient rgba + a [data-theme="dark"]
          brighten) lives in index.css and is owned by frontend-style; port it
          from the vendored default.css. Inert until that class lands. */}
      <div className="na-backdrop" aria-hidden />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── ① Identity — spectrum band, centred credential ── */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 16,
            padding: 'var(--space-xs)',
            ...factionFill(character.faction_slug, 'bar'),
            boxShadow: '0 20px 50px -26px rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              borderRadius: 12,
              background: isUnaffiliated ? 'var(--faction-default-card-bg)' : 'var(--color-bg-surface-alt)',
              padding: 'var(--space-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-md)',
            }}
          >
            {/* eyebrow: spectrum-ring dot + Player · Unaffiliated */}
            <span
              style={{
                ...EYEBROW,
                color: isUnaffiliated ? 'var(--faction-default-card-muted)' : 'var(--color-text-tertiary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  flex: 'none',
                  ...factionFill(character.faction_slug, 'dot'),
                  WebkitMask: 'radial-gradient(circle, transparent 38%, #000 40%)',
                  mask: 'radial-gradient(circle, transparent 38%, #000 40%)',
                }}
              />
              {t('profile.playerFaction', {
                faction: isUnaffiliated ? t('profile.unaffiliated') : factionName(character.faction_slug),
              })}
            </span>

            {/* identity header — the shared credential card (its Unaffiliated
                state wears the spectrum ring; themed slugs keep their accent) */}
            <CredentialCard
              displayName={character.display_name}
              handle={character.username}
              factionSlug={character.faction_slug}
              level={character.level}
              score={character.score}
              avatarUrl={character.avatar_url ? mediaUrl(character.avatar_url) : null}
            />

            {/* subtitle: faction-pending (na only) + handle / joined */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {isUnaffiliated && (
                <>
                  <span
                    className="font-display italic"
                    style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)' }}
                  >
                    {t('profile.unaffiliatedPending')}
                  </span>
                  <span
                    aria-hidden
                    style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--color-text-tertiary)' }}
                  />
                </>
              )}
              <span className="font-body" style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-tertiary)' }}>
                {t('profile.handleJoined', { username: character.username, joined })}
              </span>
            </div>

            {/* progression panel — level ring + points-into-level bar */}
            {progression && (
              <div
                style={{
                  width: '100%',
                  border: '1px solid var(--color-border-strong)',
                  borderRadius: 12,
                  padding: 'var(--space-lg)',
                  background: 'var(--color-bg-surface-alt)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-lg)',
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: `conic-gradient(var(--color-text-primary) ${ringDegrees}deg, var(--color-border) 0)`,
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
                      background: 'var(--color-bg-surface-alt)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    <span style={{ ...EYEBROW, fontSize: 'var(--text-xs)', letterSpacing: '0.1em' }}>{t('profile.lvl')}</span>
                    <span
                      className="font-display italic"
                      style={{ fontSize: 'var(--text-title)', color: 'var(--color-text-primary)' }}
                    >
                      {character.level}
                    </span>
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: 'var(--space-sm)',
                    }}
                  >
                    <span className="font-body" style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)' }}>
                      {t('profile.ptsThisLevel', { current: pointsIntoLevel, span: levelSpan })}
                    </span>
                    <span style={{ ...EYEBROW, fontSize: 'var(--text-sm)', letterSpacing: '0.08em' }}>
                      {t('profile.nextLevel', { level: progression.nextLevel })}
                    </span>
                  </div>
                  <div style={{ height: 10, borderRadius: 20, background: 'var(--color-border)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 20,
                        width: `${progression.progressPercent}%`,
                        ...factionFill(character.faction_slug, 'bar'),
                        transition: 'width 300ms',
                      }}
                    />
                  </div>
                  <div
                    className="font-body"
                    style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-xs)' }}
                  >
                    {t('profile.ptsToNext', { score: character.score, threshold: progression.nextThreshold })}
                  </div>
                </div>
              </div>
            )}

            {/* friend/foe — kept feature (#459), folded under identity */}
            {identityActions && (
              <div style={{ marginTop: 'var(--space-xs)', maxWidth: 220, width: '100%' }}>{identityActions}</div>
            )}
          </div>
        </div>

        {/* ── ② About — same block as the desktop branch and every kit ── */}
        <AboutBlock bio={character.bio} heading={<SectionHeading title={t('profile.aboutHeading')} />} />

        {/* ── ③ Badges — hidden entirely when empty ── */}
        {badges.length > 0 && (
          <div style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
              <h2 className="font-display italic" style={{ fontSize: 'var(--text-title)', color: 'var(--color-text-primary)' }}>
                {t('profile.badgesHeading')}
              </h2>
              <span className="eyebrow" style={{ marginLeft: 'auto', color: 'var(--color-text-tertiary)' }}>
                {t('profile.badgesEarned', { count: badges.length })}
              </span>
            </div>
            <div
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                background: 'var(--color-bg-surface-alt)',
                padding: 'var(--space-xs) var(--space-lg)',
              }}
            >
              {badges.map((badge, index) => (
                <BadgeRow key={badge.key} badge={badge} last={index === badges.length - 1} />
              ))}
            </div>
          </div>
        )}

        {/* ── Segmented Praxis / Tasks toggle ── */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-xs)',
            padding: 'var(--space-xs)',
            borderRadius: 999,
            background: 'var(--color-bg-surface-alt)',
            border: '1px solid var(--color-border)',
            marginTop: 'var(--space-lg)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          <SegTab on={segment === 'praxis'} onClick={() => setSegment('praxis')}>
            {t('profile.mobile.tabPraxis')}
          </SegTab>
          <SegTab on={segment === 'tasks'} onClick={() => setSegment('tasks')}>
            {t('profile.mobile.tabTasks')}
          </SegTab>
        </div>

        {/* ── Content — reuse the existing cards, stacked single-column ── */}
        {segment === 'praxis' ? (
          submissions.length === 0 ? (
            <p className="font-body text-muted">{t('profile.praxisEmptyTitle')}</p>
          ) : (
            <div className="flex flex-col gap-4 items-stretch">
              {submissions.map((praxis) => (
                <div key={praxis.id} style={{ position: 'relative' }}>
                  {praxis.id === laurelId && <FdlLaurel />}
                  <PraxisCard praxis={praxis} />
                </div>
              ))}
            </div>
          )
        ) : proposedTasks.length === 0 ? (
          <p className="font-body text-muted">{t('profile.proposedTasksEmpty')}</p>
        ) : (
          <div className="flex flex-col gap-4 items-stretch">
            {proposedTasks.map((task) => (
              <TaskCard key={task.id} task={task} basePoints={task.point_value} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SegTab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-lg)',
        fontWeight: on ? 700 : 400,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: on ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
        background: on ? 'var(--color-text-primary)' : 'transparent',
        border: 'none',
        borderRadius: 999,
        padding: 'var(--space-sm) 0',
        minHeight: 36,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
