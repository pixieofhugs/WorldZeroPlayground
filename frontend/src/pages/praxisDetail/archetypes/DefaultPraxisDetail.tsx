/**
 * Default (Unaffiliated / na) praxis-read archetype — the spectrum-band editorial
 * kit (CONTEXT.md "Default archetype"; ADR-0039/0046/0048). Rebuilt to the na
 * redesign (project 1eb2665a, `Default Praxis Detail.dc.html`): "one filed praxis
 * in full" — a rainbow-bordered praxis SHEET (ring eyebrow, big italic finding,
 * author row with a rainbow-ring avatar + base pts, a rainbow-bordered EVIDENCE
 * plate with a "Plate I" caption, a ruled "The account" prose block) beside a
 * sticky rail: the ADR-0005 vote panel (the live na spectrum widget via VoteUI)
 * and a points/backers LEDGER. NO AVERAGE anywhere (ADR-0005/0014) — the ledger
 * shows points awarded, how many people backed it, and each backer's own rung.
 *
 * This is also VoteUI/archetype fallback for themed-but-unskinned factions (wow,
 * albescent): the chrome wears the na spectrum, while VoteUI still dispatches the
 * vote widget on the praxis's own task faction, so a wow praxis votes in its own
 * voice (ADR-0039).
 *
 * Tokens only: --faction-default-* (rainbow via --faction-default-rainbow /
 * -ring) + --color-*. The full-page wash is the shared `.na-backdrop` hook (its
 * rule is owned by the na-kit / Task Detail #967; this surface only mounts the
 * hook). Invariant behavior slots (admin bar, banners, owner actions, flag) come
 * from the shared module.
 */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MediaGallery from '../../../components/MediaGallery'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import VoteUI from '../../../components/vote/VoteUI'
import { formatTimestamp } from '../../../utils/dates'
import {
  PraxisAdminBar,
  PraxisStatusBanners,
  PraxisOwnerActions,
  PraxisFlagBlock,
  MemberByline,
  praxisBreakdownParts,
} from '../shared'
import MetaTaskSeal from '../../../components/metaTaskSeal/MetaTaskSeal'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisOut } from '../../../api/praxis'
import type { VoteSummary, VoterDetail } from '../../../api/votes'

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

/**
 * The points / backers LEDGER (the design's dark "take" panel).
 *
 * DEVIATION (named per docs/agents/design-fidelity.md): the design draws this as
 * an ALWAYS-dark receipt (#17161d/#f0e6d0/#8b8272). CLAUDE.md forbids hardcoded
 * hex and there is no always-dark `--color-*` token to map onto, so it uses the
 * `--faction-default-card-*` family — which matches the design's palette exactly
 * in dark mode and becomes the light na card in light mode (theme-aware, not
 * always-dark). Rainbow accents stay `--faction-default-rainbow`.
 *
 * Every number here is honest live data (ADR-0005): `points_from_votes` awarded,
 * `total_votes` backers, and each backer's own rung as a rainbow bar (value / 5).
 * NO AVERAGE. The design's per-backer "+N points" is NOT available from the API
 * (there is no per-voter point breakdown — a vote is a single 1-5 rung), so the
 * bar shows the rung and no fabricated per-backer points figure is invented.
 */
function TheLedger({
  praxis,
  votes,
  voters,
}: {
  praxis: PraxisOut
  votes: VoteSummary | null
  voters: VoterDetail[]
}) {
  const { t } = useTranslation('praxis')
  // The single earned-points breakdown (#641, ADR-0053): the payload's own
  // terms, `{base} × {mult} + {votes}`, the `× {mult}` term omitted at ×1.0.
  const { base, votePoints, isPlain, multiplierLabel } = praxisBreakdownParts(praxis)
  const backerCount = votes?.total_votes ?? voters.length

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 12,
        background: 'var(--faction-default-card-bg)',
        color: 'var(--faction-default-card-text)',
        border: '1px solid var(--faction-default-border)',
        boxShadow: '0 14px 32px -18px var(--color-overlay-medium)',
        padding: 'var(--space-lg) var(--space-lg) var(--space-xl)',
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
        <span style={{ fontFamily: 'var(--font-accent)', fontSize: 'var(--text-title)', color: 'var(--faction-default-card-text)', whiteSpace: 'nowrap' }}>
          {base}
          {!isPlain && (
            <>
              <span aria-hidden style={{ opacity: 0.55, margin: '0 var(--space-xs)' }}>&#215;</span>
              {multiplierLabel}
            </>
          )}
          <span aria-hidden style={{ opacity: 0.55, margin: '0 var(--space-xs)' }}>+</span>
          {votePoints}
        </span>
        <span className="eyebrow" style={{ display: 'block', marginTop: 'var(--space-xs)', color: 'var(--faction-default-card-muted)' }}>
          {isPlain ? t('detail.default.pointsFromVotes') : t('detail.score.ptsMultVotes')}
        </span>
      </div>

      {/* Backed by — each backer + the rung they gave (value / 5) */}
      {voters.length > 0 ? (
        <>
          <div className="eyebrow" style={{ color: 'var(--faction-default-card-muted)', marginBottom: 'var(--space-md)' }}>
            {t('detail.default.ledgerBackedBy')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {voters.map((voter) => (
              <div key={voter.character_id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <Link to={`/characters/${voter.character_id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--faction-default-card-muted)',
                      color: 'var(--faction-default-card-bg)',
                      fontFamily: 'var(--font-accent)',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    {initials(voter.display_name)}
                  </span>
                </Link>
                <Link
                  to={`/characters/${voter.character_id}`}
                  style={{ width: 92, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'var(--text-lg)', color: 'var(--faction-default-card-text)', textDecoration: 'none' }}
                >
                  {voter.display_name}
                </Link>
                <div style={{ flex: 1, height: 9, borderRadius: 5, background: 'var(--faction-default-border)', position: 'relative', overflow: 'hidden' }}>
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
  )
}

export default function DefaultPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis, votes, voters } = state

  // Guarded non-null by the dispatcher.
  if (!praxis) return null

  const authorInitial = initials(praxis.created_by_display_name)

  return (
    <div style={{ position: 'relative' }}>
      {/* Full-page spectrum wash. The `.na-backdrop` rule ships with the na kit
          / Task Detail (#967); mounting the hook here is harmless until it lands. */}
      <div className="na-backdrop" />

      <div className="py-8" style={{ position: 'relative', zIndex: 1, maxWidth: 1080, marginInline: 'auto' }}>
        {/* ── Breadcrumb: Tasks / {task} / Praxis ── */}
        <nav className="font-body mb-4" style={{ fontSize: 'var(--text-sm)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
          <Link to="/tasks" style={{ color: 'inherit', textDecoration: 'none' }}>{t('detail.default.breadcrumbTasks')}</Link>
          {' / '}
          <Link to={`/tasks/${praxis.task_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            {praxis.task_title}
          </Link>
          {' / '}
          <span style={{ color: 'var(--color-text-primary)' }}>{t('detail.default.breadcrumbPraxis')}</span>
        </nav>

        {/* ── Behavior slots (invariant) ── */}
        <PraxisStatusBanners state={state} />
        <PraxisAdminBar state={state} />

        {/* ── Layout: sheet / rail ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-2xl)', alignItems: 'start' }}>

          {/* ── THE PRAXIS SHEET — rainbow-bordered card ── */}
          {/* padding here is the rainbow-frame thickness (ornament geometry);
              snapped from the design's 6px to --space-xs to stay on the scale. */}
          <div style={{ borderRadius: 16, padding: 'var(--space-xs)', background: 'var(--faction-default-rainbow)', boxShadow: '0 18px 44px -26px var(--color-overlay-strong)' }}>
            <div style={{ borderRadius: 11, background: 'var(--faction-default-card-bg)', color: 'var(--faction-default-card-text)', padding: 'var(--space-2xl)' }}>

              {/* Eyebrow: ring dot + counts-for-everyone */}
              <div className="flex items-center" style={{ gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                <span aria-hidden style={{ width: 26, height: 26, borderRadius: '50%', flex: 'none', background: 'var(--faction-default-ring)', WebkitMask: 'radial-gradient(circle, transparent 38%, black 40%)', mask: 'radial-gradient(circle, transparent 38%, black 40%)' }} />
                <span className="eyebrow" style={{ color: 'var(--faction-default-card-muted)' }}>{t('detail.default.praxisEyebrow')}</span>
              </div>

              {/* Finding title */}
              <h1
                className="font-display italic"
                style={{ fontWeight: 700, fontSize: 'var(--text-display)', lineHeight: 1.06, margin: '0 0 var(--space-lg)', color: 'var(--faction-default-card-text)', overflowWrap: 'anywhere' }}
              >
                {praxis.title}
              </h1>

              {/* Owner actions (invariant) */}
              <PraxisOwnerActions state={state} />

              {/* Author row: rainbow-ring avatar · Re: task · filed · base pts */}
              <div className="flex items-center" style={{ gap: 'var(--space-md)', paddingBottom: 'var(--space-xl)', marginBottom: 'var(--space-xl)', borderBottom: '1px solid var(--faction-default-border)' }}>
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

              {/* Metatask seals (#928) — read-only stack; nothing when none applied */}
              {praxis.applied_metatasks.length > 0 && (
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <MetaTaskSeal metatasks={praxis.applied_metatasks} />
                </div>
              )}

              {/* Evidence plate — rainbow-bordered, "Plate I" caption */}
              {praxis.media_items.length > 0 && (
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <div style={{ borderRadius: 10, padding: 'var(--space-xs)', background: 'var(--faction-default-rainbow)' }}>
                    <div style={{ borderRadius: 6, background: 'var(--color-bg-surface)', padding: 'var(--space-sm)' }}>
                      <MediaGallery media={praxis.media_items} layout="grid" />
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
                  <div className="flex items-center" style={{ gap: 'var(--space-md)', margin: 'var(--space-xl) 0 var(--space-lg)' }}>
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

          {/* ── RAIL — cast panel + ledger (sticky) ── */}
          <div style={{ position: 'sticky', top: 84, display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

            {/* Cast panel — the live na spectrum widget (ADR-0005, no average) */}
            <div style={{ borderRadius: 12, background: 'var(--color-bg-surface-alt)', border: '1px solid var(--color-border)', padding: 'var(--space-lg)' }}>
              <div className="eyebrow" style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-xs)' }}>{t('detail.default.castHeading')}</div>
              <div className="font-display italic" style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)', lineHeight: 1.4 }}>
                {t('detail.default.castPrompt')}
              </div>
              <VoteUI factionSlug={praxis.task_faction_slug} praxisId={praxis.id} />
            </div>

            {/* Points + backers ledger */}
            <TheLedger praxis={praxis} votes={votes} voters={voters} />

            {/* Flag block (invariant) */}
            <PraxisFlagBlock state={state} />
          </div>
        </div>
      </div>
    </div>
  )
}
