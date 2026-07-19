import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionCssVar, factionFill, factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import CharacterSwitcherSheet from '../../../components/CharacterSwitcherSheet'
import type { FieldDeskHomeState } from '../useFieldDeskHome'

/**
 * Default (na) MOBILE FieldDesk home — the account's carried life at a glance,
 * one-hand and single-column (#500). Character header (avatar in the all-paths
 * rainbow ring + name + faction/level + points), three stat tiles, the
 * in-progress task list, and one or two primary actions. Every faction falls
 * through here until it registers a bespoke mobile home skin (mirrors the
 * taskDetail mobile Default). Presentation-only: all data arrives via
 * {@link FieldDeskHomeState}; copy resolves from the `common` catalog.
 *
 * Layout is flex/relative — no fixed-px grid drives the page structure
 * (SPEC-faction-ui-profile §1a).
 */

// Decorative down-caret (aria-hidden) marking the name as a switcher trigger; a
// const so the jsx-text-only literal rule doesn't read it as user-facing copy.
const CARET_DOWN = '▾'

// Static style objects, hoisted to module scope (#586) — no closure deps.
const pageTitleStyle: CSSProperties = {
  fontSize: 'var(--text-heading)',
  lineHeight: 1,
  color: 'var(--color-text-primary)',
  margin: 0,
}
const statTileStyle: CSSProperties = {
  flex: '1 1 0',
  background: 'var(--color-bg-surface-alt)',
  border: '1px solid var(--color-border)',
  borderRadius: 9,
  padding: 'var(--space-md) var(--space-sm)',
  minWidth: 0,
}
const pendingPillStyle: CSSProperties = {
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 999,
  padding: 'var(--space-md) var(--space-lg)',
  color: 'var(--color-text-primary)',
  textDecoration: 'none',
}
const primaryActionStyle: CSSProperties = {
  padding: 'var(--space-lg)',
  borderRadius: 12,
  fontSize: 'var(--text-lg)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: 'var(--color-bg-page)',
  background: 'var(--color-text-primary)',
  border: '1px solid var(--color-text-primary)',
  textDecoration: 'none',
}
const secondaryActionStyle: CSSProperties = {
  ...primaryActionStyle,
  fontWeight: undefined,
  color: 'var(--color-text-primary)',
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border-strong)',
}

export default function DefaultFieldDesk({ state }: { state: FieldDeskHomeState }) {
  const { t } = useTranslation('common')
  const { character, eraName, votesReceived, activeTasks, pendingCount, canProposeTask } = state
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const stats = [
    { label: t('fieldDesk.home.stats.points'), value: character.score?.toLocaleString() ?? '0' },
    { label: t('fieldDesk.home.stats.votes'), value: votesReceived.toLocaleString() },
    { label: t('fieldDesk.home.stats.era'), value: eraName || '—' },
  ]

  return (
    <div data-skin="default" className="page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* App-bar row: kicker + FieldDesk title */}
      <header>
        <div className="eyebrow" style={{ color: 'var(--color-text-secondary)' }}>
          {t('nav.home')}
        </div>
        <h1 className="font-display italic" style={pageTitleStyle}>
          {t('fieldDesk.home.title')}
        </h1>
      </header>

      {/* ── Character card ── */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-lg)',
        }}
      >
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
        <div className="flex items-center justify-between mb-4" style={{ marginTop: 'var(--space-xs)' }}>
          <span className="eyebrow" style={{ color: 'var(--color-text-secondary)' }}>
            {t('fieldDesk.home.charEyebrow')}
          </span>
          <div className="flex items-center" style={{ gap: 'var(--space-lg)' }}>
            <button
              type="button"
              onClick={() => setSwitcherOpen(true)}
              className="eyebrow"
              style={{ color: 'var(--faction-default-card-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {t('fieldDesk.home.switch')}
            </button>
            <Link
              to={`/characters/${character.id}/edit`}
              className="eyebrow"
              style={{ color: 'var(--faction-default-card-muted)', textDecoration: 'none' }}
            >
              {t('fieldDesk.home.edit')}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div
            className="shrink-0 rounded-full"
            style={{
              width: 56,
              height: 56,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: spectrum ring thickness drawn around a 56px avatar; the nearest rung (4px) thickens the band by a third.
              padding: 3,
              background: 'var(--faction-default-ring)',
            }}
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
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5" style={{ minWidth: 0 }}>
              <Link
                to={`/characters/${character.id}`}
                className="font-display italic block truncate content-title"
                style={{ lineHeight: 1.05, color: 'var(--color-text-primary)', textDecoration: 'none' }}
              >
                {character.display_name}
              </Link>
              {/* ▾ opens the active-character switcher sheet (#516). */}
              <button
                type="button"
                onClick={() => setSwitcherOpen(true)}
                aria-label={t('fieldDesk.home.switcher.title')}
                // eslint-disable-next-line local/no-raw-style-values -- ornament: ▾ dingbat used as an icon, sized to the name row
                style={{ flex: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 14, lineHeight: 1, color: 'var(--color-text-tertiary)' }}
              >
                <span aria-hidden>{CARET_DOWN}</span>
              </button>
            </div>
            <div
              className="truncate"
              style={{
                marginTop: 'var(--space-xs)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-text-secondary)',
              }}
            >
              {t('sidebar.characterCard.factionLevel', {
                faction: factionName(character.faction_slug),
                level: character.level,
              })}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display content-title" style={{ lineHeight: 1, color: 'var(--color-text-primary)' }}>
              {character.score?.toLocaleString() ?? '0'}
            </div>
            <div className="eyebrow" style={{ color: 'var(--color-text-secondary)' }}>
              {t('fieldDesk.home.stats.points')}
            </div>
          </div>
        </div>

        <div className="flex gap-2" style={{ marginTop: 'var(--space-lg)' }}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center"
              style={statTileStyle}
            >
              <div className="font-display truncate content-text" style={{ lineHeight: 1, color: 'var(--color-text-primary)' }}>
                {stat.value}
              </div>
              <div
                className="eyebrow"
                style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-secondary)' }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pending requests pill (only when there are any) ── */}
      {pendingCount > 0 && (
        <Link
          to="/updates?filter=requests"
          className="font-body flex items-center justify-between content-text"
          style={pendingPillStyle}
        >
          <span>{t('fieldDesk.home.pending', { count: pendingCount })}</span>
          <span aria-hidden style={{ color: 'var(--color-text-tertiary)' }}>›</span>
        </Link>
      )}

      {/* ── In-progress tasks ── */}
      <section
        style={{
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-lg)',
        }}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <span className="eyebrow" style={{ color: 'var(--color-text-secondary)' }}>
            {t('fieldDesk.home.questsHeading')}
          </span>
          <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--color-border-strong), transparent)' }} />
          <Link
            to="/tasks"
            className="eyebrow"
            style={{ color: 'var(--faction-default-card-muted)', textDecoration: 'none' }}
          >
            {t('fieldDesk.home.viewAll')}
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <p className="font-body content-text" style={{ color: 'var(--color-text-tertiary)' }}>
            {t('fieldDesk.home.questsEmpty')}
          </p>
        ) : (
          <div className="flex flex-col">
            {activeTasks.map((praxis, index) => (
              <Link
                key={praxis.id}
                to={`/praxes/${praxis.id}/edit`}
                className="flex items-center gap-3"
                style={{
                  padding: 'var(--space-md) 0',
                  borderTop: index === 0 ? undefined : '1px solid var(--color-border)',
                  textDecoration: 'none',
                }}
              >
                <span
                  className="shrink-0"
                  style={{ width: 10, height: 10, borderRadius: 3, ...factionFill(praxis.task_faction_slug, 'dot') }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-display truncate content-text" style={{ lineHeight: 1.2, color: 'var(--color-text-primary)' }}>
                    {praxis.task_title}
                  </div>
                  <div
                    className="truncate"
                    style={{
                      marginTop: 'var(--space-xs)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-sm)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {t('fieldDesk.home.taskMeta', {
                      faction: factionName(praxis.task_faction_slug),
                      points: praxis.task_point_value,
                    })}
                  </div>
                </div>
                <span
                  className="shrink-0 eyebrow"
                  style={{
                    color: 'var(--faction-default-card-muted)',
                    padding: 'var(--space-xs) var(--space-sm)',
                    border: '1px solid var(--color-border-strong)',
                    borderRadius: 999,
                  }}
                >
                  {t(`praxisType.${praxis.type}`)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Primary actions ── */}
      <div className="flex gap-2.5">
        <Link
          to="/tasks"
          className="font-body flex-1 flex items-center justify-center"
          style={primaryActionStyle}
        >
          {t('fieldDesk.home.browseTasks')}
        </Link>
        {canProposeTask && (
          <Link
            to="/propose-task"
            className="font-body flex-1 flex items-center justify-center gap-2"
            style={secondaryActionStyle}
          >
            {/* eslint-disable-next-line local/no-raw-style-values -- ornament: "+" glyph used as an icon, sized to the button row */}
            <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>+</span>
            <span>{t('actions.proposeTask')}</span>
          </Link>
        )}
      </div>

      {/* Active-character switcher — bottom sheet over Home (#516). */}
      <CharacterSwitcherSheet
        open={switcherOpen}
        activeCharacterId={character.id}
        onClose={() => setSwitcherOpen(false)}
      />
    </div>
  )
}
