import type { CSSProperties } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { BadgeOut } from '../../../api/auth'
import { badgeArtFor } from '../../../components/badges/badgeArt'
import CredentialCard from '../../../components/CredentialCard'
import PraxisCard from '../../../components/PraxisCard'
import TaskCard from '../../../components/TaskCard'
import { factionFill, factionName, isKnownFaction } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import type { ProfileBodyProps } from '../FactionProfileBody'

type Segment = 'praxis' | 'tasks'

const EYEBROW: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
}

/**
 * Default MOBILE public-profile skin (#517, redrawn for #969) — a phone-native
 * reflow of the na "all paths open" spectrum kit that CONSUMES the same #459
 * player-profile contract (identity, progression, badges, friend/foe, praxis).
 *
 * The na fidelity fix: the identity band, avatar hoop, progression bar and
 * section dot all reach the spectrum through `factionFill(slug, …)` /
 * CredentialCard, never `factionCssVar('na')` — which resolves grey (ADR-0039,
 * #749). This file is ALSO the mobile fallback for every faction except WOW
 * (only WOW registers `mobileProfile`), so those seams stay per-faction: a
 * themed slug gets its solid hue, `na`/albescent get the rainbow. Copy branches
 * on `isKnownFaction` too — "faction pending" is unaffiliated-only.
 *
 * Presentation only — renders no field the contract doesn't expose.
 */
export default function DefaultProfile({
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

  // ⑤ FDL laurel target: highest earned points (PraxisCardOut.score is the
  // task base + vote sum); first entry wins a tie.
  const topScore = submissions.reduce((max, praxis) => Math.max(max, praxis.score ?? 0), 0)
  const laurelId = submissions.find((praxis) => (praxis.score ?? 0) === topScore)?.id ?? null

  // ① progression numbers (null until game config supplies thresholds).
  const pointsIntoLevel = progression
    ? Math.max(character.score - progression.currentThreshold, 0)
    : 0
  const levelSpan = progression
    ? Math.max(progression.nextThreshold - progression.currentThreshold, 0)
    : 0
  const ringDegrees = progression
    ? Math.round(Math.min(Math.max(progression.progressPercent, 0), 100) * 3.6)
    : 0

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
              bio={character.bio}
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

/** The FDL laurel stamped on the character's top praxis. Spectrum ring, ink glyph. */
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
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--faction-default-rainbow-conic)' }} />
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

function BadgeRow({ badge, last }: { badge: BadgeOut; last: boolean }) {
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
      <div className="font-display italic" style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-primary)' }}>
        {badge.name}
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
