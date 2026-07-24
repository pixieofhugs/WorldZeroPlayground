import type { CSSProperties, ReactNode } from 'react'
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
  PraxisVoterBreakdown,
  PraxisScoreBreakdown,
  MemberByline,
} from '../shared'
import { VoteFactionContext } from '../../../components/vote/VoteShell'
import MetaTaskSeal from '../../../components/metaTaskSeal/MetaTaskSeal'
import { MobileStarVote } from './shared'

/**
 * S.N.I.D.E. MOBILE praxis-detail skin (#530) — a closed case pasted up on a
 * phone. A dark ransom plate holds the evidence (full media); a Bebas confession
 * headline, the account body, and a thumb-sized "call the job" vote caster
 * follow. Renders the same invariant CONTENT + behavior slots as every archetype
 * (the shared praxisDetail module) — only the paste-up changes. Grounds on the
 * `--faction-snide-*` tokens; native-dark.
 */

const WALL = 'var(--faction-snide-wall)'
const WALL_TEXT = 'var(--faction-snide-wall-text)'
const INK = 'var(--faction-snide-card-bg)'
const TEXT = 'var(--faction-snide-card-text)'
const MUTED = 'var(--faction-snide-card-muted)'
const ACID = 'var(--faction-snide-card-accent)'
const PINK = 'var(--faction-snide-pink)'
const TAPE = 'var(--faction-snide-tape)'
const LINE = 'var(--faction-snide-border)'
const COND = 'var(--faction-snide-font-cond)'
const IMPACT = 'var(--faction-snide-font-impact)'
const TYPE = 'var(--faction-snide-font-type)'

const CARD_SHADOW = '5px 6px 0 rgba(0,0,0,.5)'

const kicker: CSSProperties = {
  fontFamily: TYPE,
  fontSize: 'var(--text-xs)',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: MUTED,
}

/** Evidence plate — a dark taped card headed by an acid kicker. */
function Plate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ position: 'relative', background: INK, color: TEXT, border: `1px solid ${LINE}`, boxShadow: CARD_SHADOW, padding: 'var(--space-md)', overflow: 'hidden' }}>
      <span aria-hidden style={{ position: 'absolute', top: -10, left: 20, width: 58, height: 22, background: TAPE, transform: 'rotate(-4deg)', opacity: 0.92 }} />
      <div style={{ fontFamily: COND, fontSize: 'var(--text-lg)', letterSpacing: '0.1em', textTransform: 'uppercase', color: ACID, marginBottom: 'var(--space-md)' }}>
        {title}
      </div>
      {children}
    </section>
  )
}

export default function SnidePraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const { praxis } = state
  if (!praxis) return null

  const filedDate = praxis.submitted_at ?? praxis.created_at
  const initial = (praxis.created_by_display_name || '?')[0]?.toUpperCase() ?? '?'

  return (
    <div data-skin="snide" className="page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', fontFamily: TYPE, color: WALL_TEXT, background: WALL }}>
      {/* Behavior slots (invariant) */}
      <PraxisStatusBanners state={state} />
      <PraxisAdminBar state={state} />

      {/* Byline row */}
      <div className="flex items-center gap-3">
        <Link to={`/characters/${praxis.created_by_id}`} className="shrink-0">
          <span
            className="flex items-center justify-center"
            style={{ width: 42, height: 42, background: ACID, color: INK, fontFamily: IMPACT, fontSize: 'var(--text-content)' }}
            aria-hidden
          >
            {initial}
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <MemberByline
            praxis={praxis}
            linkStyle={{ fontFamily: COND, fontSize: 'var(--text-content)', letterSpacing: '0.03em', color: WALL_TEXT, lineHeight: 1, textDecoration: 'none' }}
          />
          <div className="truncate" style={{ ...kicker, marginTop: 'var(--space-xs)' }}>
            {t('detail.snide.pulledItOff')} · {formatTimestamp(filedDate)}
          </div>
        </div>
      </div>

      {/* Metatask seals (#932) — read-only stack, below the byline, above the
          evidence. Each seal keeps its issuing faction's voice; renders nothing
          when none are applied. */}
      <MetaTaskSeal metatasks={praxis.applied_metatasks} />

      {/* Evidence plate — full media inside */}
      {praxis.media_items.length > 0 && (
        <Plate title={t('detail.snide.mobile.evidence')}>
          <MediaGallery media={praxis.media_items} layout="grid" />
        </Plate>
      )}

      {/* Confession headline */}
      <div>
        <div style={{ ...kicker, marginBottom: 'var(--space-xs)', color: ACID }}>{t('detail.snide.theConfession')}</div>
        <h1 style={{ fontFamily: COND, fontSize: 'var(--text-heading)', letterSpacing: '0.02em', lineHeight: 1.08, margin: 0, color: WALL_TEXT, overflowWrap: 'anywhere' }}>
          {praxis.title ?? t('detail.snide.untitled')}
        </h1>
      </div>

      {/* Owner actions (invariant) */}
      <PraxisOwnerActions state={state} />

      {/* re: task link */}
      <div style={{ fontFamily: TYPE, fontSize: 'var(--text-lg)', color: MUTED }}>
        {t('detail.snide.mobile.re')}{' '}
        <Link to={`/tasks/${praxis.task_id}`} style={{ color: PINK, fontFamily: COND, letterSpacing: '0.03em', textDecoration: 'none' }}>
          {praxis.task_title}
        </Link>
      </div>

      {/* Account body */}
      {praxis.body_text && (
        <MarkdownPreview
          source={praxis.body_text}
          className="markdown-preview content-text"
          style={{ fontFamily: TYPE, lineHeight: 1.7, color: WALL_TEXT }}
        />
      )}

      {/* Vote caster */}
      <Plate title={t('detail.snide.theVerdict')}>
        <div className="flex items-center justify-center content-text" style={{ marginBottom: 'var(--space-md)', fontFamily: COND, letterSpacing: '0.03em', color: TEXT }}>
          {t('detail.snide.mobile.appraise')}
        </div>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <PraxisScoreBreakdown state={state} align="center" accent={ACID} font={IMPACT} />
        </div>
        <VoteFactionContext.Provider value="snide">
          <MobileStarVote
            praxisId={praxis.id}
            accent={ACID}
            accentFont={IMPACT}
          />
        </VoteFactionContext.Provider>
      </Plate>

      {/* Flag + voter breakdown (invariant) */}
      <PraxisFlagBlock state={state} />
      <PraxisVoterBreakdown state={state} />
    </div>
  )
}
