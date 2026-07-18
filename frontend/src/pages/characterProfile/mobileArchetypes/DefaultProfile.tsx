import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { BadgeOut } from '../../../api/auth'
import { badgeArtFor } from '../../../components/badges/badgeArt'
import PraxisCard from '../../../components/PraxisCard'
import TaskCard from '../../../components/TaskCard'
import { factionCssVar, factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import type { ProfileBodyProps } from '../FactionProfileBody'

type Segment = 'praxis' | 'tasks'

/**
 * Default MOBILE public-profile skin (#517) — a phone-native reflow of the
 * desktop CharacterProfile that CONSUMES the same #459 player-profile contract
 * (identity, badges, friend/foe, dropped role/about): a centred credential
 * header, a real-fields stats row, badges (hidden when empty), the friend/foe
 * control, and a segmented Praxis / Tasks toggle over the existing PraxisCard /
 * TaskCard components stacked single-column. Presentation only — renders no
 * field the contract doesn't expose. Every faction falls through here until it
 * registers a bespoke mobile profile skin.
 */
export default function DefaultProfile({
  character,
  submissions,
  proposedTasks,
  identityActions,
}: ProfileBodyProps) {
  const { t } = useTranslation('common')
  const [segment, setSegment] = useState<Segment>('praxis')
  const badges = character.badges ?? []
  const color = factionCssVar(character.faction_slug)

  return (
    <div className="py-4" data-testid="mobile-profile">
      {/* ── ① Identity — centred credential header ── */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {character.avatar_url ? (
          <img
            src={mediaUrl(character.avatar_url)}
            alt={character.display_name}
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `2px solid ${factionCssVar(character.faction_slug, 'border')}`,
            }}
          />
        ) : (
          <span
            aria-hidden
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${factionCssVar(character.faction_slug, 'light')}, ${color})`,
              border: `2px solid ${factionCssVar(character.faction_slug, 'border')}`,
            }}
          />
        )}
        <h1
          className="font-display italic font-medium"
          style={{ fontSize: 'var(--text-heading)', marginTop: 12, color: 'var(--color-text-primary)', overflowWrap: 'anywhere' }}
        >
          {character.display_name}
        </h1>
        <div className="eyebrow" style={{ marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <i style={{ width: 8, height: 8, borderRadius: 2, background: color, flex: 'none' }} />
          {t('leaderboard.mobile.factionLevel', {
            faction: factionName(character.faction_slug),
            level: character.level,
          })}
        </div>

        {/* friend/foe — kept feature (#459), faction-skinned, folded under identity */}
        {identityActions && <div style={{ marginTop: 14, maxWidth: 220, width: '100%' }}>{identityActions}</div>}
      </div>

      {/* ── Stats row — real fields only ── */}
      <div
        style={{
          display: 'flex',
          margin: '18px 0',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          background: 'var(--color-bg-surface-alt)',
          overflow: 'hidden',
        }}
      >
        <Stat label={t('profile.mobile.stats.points')} value={character.score} />
        <Stat label={t('profile.mobile.stats.praxis')} value={submissions.length} divider />
        <Stat label={t('profile.mobile.stats.tasks')} value={proposedTasks.length} divider />
      </div>

      {/* ── ③ Badges — hidden entirely when empty ── */}
      {badges.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
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
              padding: '2px 14px',
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
          gap: 4,
          padding: 4,
          borderRadius: 999,
          background: 'var(--color-bg-surface-alt)',
          border: '1px solid var(--color-border)',
          marginBottom: 14,
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
              <PraxisCard key={praxis.id} praxis={praxis} />
            ))}
          </div>
        )
      ) : proposedTasks.length === 0 ? (
        <p className="font-body text-muted">{t('profile.proposedTasksEmpty')}</p>
      ) : (
        <div className="flex flex-col gap-4 items-stretch">
          {proposedTasks.map((task) => (
            <TaskCard key={task.id} task={task} displayPoints={task.point_value} />
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, divider }: { label: string; value: number; divider?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: 'center',
        padding: '12px 6px',
        borderLeft: divider ? '1px solid var(--color-border)' : undefined,
      }}
    >
      <div className="font-display italic" style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {value}
      </div>
      <div className="eyebrow" style={{ color: 'var(--color-text-tertiary)', marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}

function BadgeRow({ badge, last }: { badge: BadgeOut; last: boolean }) {
  const Art = badgeArtFor(badge.key)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '10px 0',
        borderBottom: last ? 'none' : '1px solid var(--color-border)',
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: '50%',
          padding: 2.5,
          background: 'var(--faction-default-ring)',
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
        fontFamily: "'Courier Prime', monospace",
        fontSize: 'var(--text-lg)',
        fontWeight: on ? 700 : 400,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: on ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
        background: on ? 'var(--color-text-primary)' : 'transparent',
        border: 'none',
        borderRadius: 999,
        padding: '9px 0',
        minHeight: 36,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
