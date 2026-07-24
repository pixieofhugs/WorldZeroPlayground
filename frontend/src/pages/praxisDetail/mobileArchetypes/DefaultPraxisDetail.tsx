/**
 * Default MOBILE praxis-read skin (#499) — the na spectrum-band editorial kit
 * (CONTEXT.md "Default archetype"; ADR-0039), stacked single-column and thumb-
 * first. The mobile twin of the desktop na rebuild (project 1eb2665a): a rainbow-
 * bordered praxis SHEET (ring eyebrow, italic finding, author row with a rainbow-
 * ring avatar + base pts, a rainbow-bordered EVIDENCE plate + "Plate I", a ruled
 * "The account" prose block), then the ADR-0005 vote caster and a points/backers
 * LEDGER. NO AVERAGE anywhere (ADR-0005/0014).
 *
 * Every faction without a bespoke mobile skin falls through here, so the caster
 * publishes `praxis.task_faction_slug` on VoteFactionContext — a wow praxis keeps
 * its chronicle gate voice while na/albescent get the spectrum (#864). Single-
 * column flex, no fixed-px grid (SPEC-faction-ui-profile §1a). Consumes the same
 * {@link PraxisDetailState}; comments mount once from the dispatcher below.
 */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MediaGallery from '../../../components/MediaGallery'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import { formatTimestamp } from '../../../utils/dates'
import type { PraxisDetailState } from '../usePraxisDetail'
import {
  PraxisAdminBar,
  PraxisStatusBanners,
  PraxisOwnerActions,
  PraxisFlagBlock,
  PraxisScoreBreakdown,
  MemberByline,
} from '../shared'
import { VoteFactionContext } from '../../../components/vote/VoteShell'
import MetaTaskSeal from '../../../components/metaTaskSeal/MetaTaskSeal'
import { MobileStarVote } from './shared'

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '·'
  )
}

export default function DefaultPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, votes, voters } = state
  if (!praxis) return null

  const authorInitial = initials(praxis.created_by_display_name)
  const backerCount = votes?.total_votes ?? voters.length

  return (
    <div data-skin="default" className="page" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Full-page spectrum wash (`.na-backdrop` rule ships with the na kit #967). */}
      <div className="na-backdrop" />

      {/* Breadcrumb: Tasks / {task} / Praxis */}
      <nav className="font-body" style={{ position: 'relative', zIndex: 1, fontSize: 'var(--text-base)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
        <Link to="/tasks" style={{ color: 'inherit', textDecoration: 'none' }}>{t('detail.default.breadcrumbTasks')}</Link>
        {' / '}
        <Link to={`/tasks/${praxis.task_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{praxis.task_title}</Link>
        {' / '}
        <span style={{ color: 'var(--color-text-primary)' }}>{t('detail.default.breadcrumbPraxis')}</span>
      </nav>

      {/* Behavior slots (invariant) */}
      <PraxisStatusBanners state={state} />
      <PraxisAdminBar state={state} />

      {/* THE PRAXIS SHEET — rainbow-bordered card */}
      {/* padding here is the rainbow-frame thickness (ornament geometry),
          snapped to --space-xs to stay on the scale. */}
      <div style={{ position: 'relative', zIndex: 1, borderRadius: 16, padding: 'var(--space-xs)', background: 'var(--faction-default-rainbow)', boxShadow: '0 14px 34px -22px var(--color-overlay-strong)' }}>
        <div style={{ borderRadius: 12, background: 'var(--faction-default-card-bg)', color: 'var(--faction-default-card-text)', padding: 'var(--space-lg)' }}>

          {/* Eyebrow: ring dot + counts-for-everyone */}
          <div className="flex items-center" style={{ gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
            <span aria-hidden style={{ width: 24, height: 24, borderRadius: '50%', flex: 'none', background: 'var(--faction-default-ring)', WebkitMask: 'radial-gradient(circle, transparent 38%, black 40%)', mask: 'radial-gradient(circle, transparent 38%, black 40%)' }} />
            <span className="eyebrow" style={{ color: 'var(--faction-default-card-muted)' }}>{t('detail.default.praxisEyebrow')}</span>
          </div>

          {/* Finding title */}
          <h1 className="font-display italic content-title" style={{ fontWeight: 700, lineHeight: 1.08, margin: '0 0 var(--space-md)', color: 'var(--faction-default-card-text)', overflowWrap: 'anywhere' }}>
            {praxis.title}
          </h1>

          {/* Author row: rainbow-ring avatar · Re: task · filed · base pts */}
          <div className="flex items-center" style={{ gap: 'var(--space-md)', paddingBottom: 'var(--space-lg)', marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--faction-default-border)' }}>
            <Link to={`/characters/${praxis.created_by_id}`} className="shrink-0">
              <span style={{ display: 'block', width: 40, height: 40, borderRadius: '50%', padding: 'var(--space-xs)', background: 'var(--faction-default-rainbow)' }}>
                <span className="flex items-center justify-center font-display italic" style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--faction-default-card-bg)', fontSize: 'var(--text-lg)', color: 'var(--faction-default-card-text)' }} aria-hidden>
                  {authorInitial}
                </span>
              </span>
            </Link>
            <div className="min-w-0 flex-1">
              <MemberByline
                praxis={praxis}
                linkClassName="font-display italic"
                linkStyle={{ fontSize: 'var(--text-xl)', color: 'var(--faction-default-card-text)', textDecoration: 'none' }}
              />
              <div className="eyebrow" style={{ color: 'var(--faction-default-card-muted)', marginTop: 'var(--space-xs)' }}>
                {t('detail.default.filedRe', { task: praxis.task_title, date: formatTimestamp(praxis.created_at) })}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-accent)', fontSize: 'var(--text-heading)', lineHeight: 1, color: 'var(--faction-default-card-text)' }}>
                {praxis.task_point_value}
              </div>
              <div className="eyebrow" style={{ color: 'var(--faction-default-card-muted)', marginTop: 'var(--space-xs)' }}>
                {t('detail.default.basePts')}
              </div>
            </div>
          </div>

          {/* Owner actions (invariant) */}
          <PraxisOwnerActions state={state} />

          {/* Metatask seals (#932) — read-only stack; nothing when none applied */}
          <MetaTaskSeal metatasks={praxis.applied_metatasks} />

          {/* Evidence plate — rainbow-bordered, "Plate I" caption */}
          {praxis.media_items.length > 0 && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <div style={{ borderRadius: 10, padding: 'var(--space-xs)', background: 'var(--faction-default-rainbow)' }}>
                <div style={{ borderRadius: 6, background: 'var(--color-bg-surface)', padding: 'var(--space-sm)' }}>
                  <MediaGallery media={praxis.media_items} />
                </div>
              </div>
              <div className="font-display italic" style={{ textAlign: 'center', fontSize: 'var(--text-md)', color: 'var(--faction-default-card-muted)', marginTop: 'var(--space-sm)' }}>
                {t('detail.default.plate')}
              </div>
            </div>
          )}

          {/* The account — ruled divider + prose */}
          {praxis.body_text && (
            <>
              <div className="flex items-center" style={{ gap: 'var(--space-md)', margin: 'var(--space-lg) 0 var(--space-md)' }}>
                <div style={{ height: 1, flex: 1, background: 'var(--faction-default-border)' }} />
                <span className="eyebrow" style={{ color: 'var(--faction-default-card-muted)', whiteSpace: 'nowrap' }}>{t('detail.default.theAccount')}</span>
                <div style={{ height: 1, flex: 1, background: 'var(--faction-default-border)' }} />
              </div>
              <MarkdownPreview
                source={praxis.body_text}
                className="font-body markdown-preview content-text"
                style={{ lineHeight: 1.85, color: 'var(--faction-default-card-muted)' }}
              />
            </>
          )}
        </div>
      </div>

      {/* Cast panel — thumb-first star caster (ADR-0005, no average) */}
      <div style={{ position: 'relative', zIndex: 1, borderRadius: 12, background: 'var(--color-bg-surface-alt)', border: '1px solid var(--color-border)', padding: 'var(--space-lg)' }}>
        <div className="eyebrow" style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-xs)' }}>{t('detail.default.castHeading')}</div>
        <div className="font-display italic" style={{ textAlign: 'center', fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
          {t('detail.default.castPrompt')}
        </div>
        {/* The default skin serves every unskinned faction, so the gate voice
            comes from the praxis, not a constant (#864). */}
        <VoteFactionContext.Provider value={praxis.task_faction_slug}>
          <MobileStarVote praxisId={praxis.id} accent="var(--faction-default-card-accent)" />
        </VoteFactionContext.Provider>
      </div>

      {/* Points + backers ledger */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          borderRadius: 12,
          background: 'var(--faction-default-card-bg)',
          color: 'var(--faction-default-card-text)',
          border: '1px solid var(--faction-default-border)',
          boxShadow: '0 14px 32px -18px var(--color-overlay-medium)',
          padding: 'var(--space-lg)',
        }}
      >
        {/* rainbow header rule */}
        <div style={{ height: 4, borderRadius: 3, background: 'var(--faction-default-rainbow)', marginBottom: 'var(--space-lg)' }} />

        {/* pts awarded · people backed it */}
        <div style={{ display: 'flex', marginBottom: 'var(--space-lg)' }}>
          <div style={{ flex: 1, paddingRight: 'var(--space-md)' }}>
            <div style={{ fontFamily: 'var(--font-accent)', fontSize: 'var(--text-display)', lineHeight: 0.85, color: 'var(--faction-default-card-text)' }}>
              {`+${praxis.points_from_votes}`}
            </div>
            <div className="eyebrow" style={{ color: 'var(--faction-default-card-muted)', marginTop: 'var(--space-sm)' }}>
              {t('detail.default.ledgerAwarded')}
            </div>
          </div>
          <div style={{ flex: 1, paddingLeft: 'var(--space-md)', borderLeft: '1px solid var(--faction-default-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontFamily: 'var(--font-accent)', fontSize: 'var(--text-display)', lineHeight: 0.85, color: 'var(--faction-default-card-text)' }}>
              <span aria-hidden style={{ fontSize: 'var(--text-title)', color: 'var(--faction-default-card-muted)' }}>&#10003;</span>
              {backerCount}
            </div>
            <div className="eyebrow" style={{ color: 'var(--faction-default-card-muted)', marginTop: 'var(--space-sm)' }}>
              {t('detail.default.ledgerBacked', { count: backerCount })}
            </div>
          </div>
        </div>

        {/* earned-points breakdown (#641, ADR-0053): base × mult + votes */}
        <div style={{ borderTop: '1px dashed var(--faction-default-border)', paddingTop: 'var(--space-md)', marginBottom: voters.length ? 'var(--space-lg)' : 0 }}>
          <PraxisScoreBreakdown state={state} accent="var(--faction-default-card-text)" muted="var(--faction-default-card-muted)" font="var(--font-accent)" />
        </div>

        {/* Backed by — each backer + the rung they gave (value / 5). No average;
            per-backer points aren't in the API, so the bar shows the rung only. */}
        {voters.length > 0 ? (
          <>
            <div className="eyebrow" style={{ color: 'var(--faction-default-card-muted)', marginBottom: 'var(--space-md)' }}>
              {t('detail.default.ledgerBackedBy')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {voters.map((voter) => (
                <div key={voter.character_id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <Link to={`/characters/${voter.character_id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--faction-default-card-muted)', color: 'var(--faction-default-card-bg)', fontFamily: 'var(--font-accent)', fontSize: 'var(--text-sm)' }}>
                      {initials(voter.display_name)}
                    </span>
                  </Link>
                  <Link to={`/characters/${voter.character_id}`} style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'var(--text-lg)', color: 'var(--faction-default-card-text)', textDecoration: 'none' }}>
                    {voter.display_name}
                  </Link>
                  <div style={{ width: 96, height: 9, borderRadius: 5, background: 'var(--faction-default-border)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${(voter.value / 5) * 100}%`, background: 'var(--faction-default-rainbow)' }} />
                  </div>
                  <span style={{ width: 24, textAlign: 'right', fontFamily: 'var(--font-accent)', fontSize: 'var(--text-lg)', color: 'var(--faction-default-card-text)' }}>
                    {voter.value}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--faction-default-border)', marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)' }}>
              <span className="eyebrow" style={{ color: 'var(--faction-default-card-muted)' }}>
                {t('detail.default.ledgerBackers', { count: voters.length })}
              </span>
              <span style={{ fontFamily: 'var(--font-accent)', fontSize: 'var(--text-title)', color: 'var(--faction-default-card-text)' }}>
                {t('detail.default.ledgerTotal', { points: praxis.points_from_votes })}
              </span>
            </div>
          </>
        ) : (
          <p className="font-body" style={{ fontSize: 'var(--text-base)', color: 'var(--faction-default-card-muted)', margin: 0 }}>
            {t('detail.default.ledgerEmpty')}
          </p>
        )}
      </div>

      {/* Flag block (invariant) */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <PraxisFlagBlock state={state} />
      </div>
    </div>
  )
}
