/**
 * Cozy Coven praxis detail, the candlelit ward (#1117). The column wears the
 * task card's slip (#2135) with `ward-card` panels on top: cat watermark, braided
 * section rules, candle flicker under the score. Every colour is a shipped
 * `--faction-coven-slip-*`/`-ward-*` token and every motion an index.css class,
 * so theme and reduced-motion run through the cascade; this skin adds no CSS.
 * Copy is the shared `detail.*` block (ADR-0061; voice recorded on #1117).
 * `PraxisDetailSkin` owns the layout and the undressed chrome (#2718); this file
 * supplies the kit. `archetypeSlots.test.tsx` pins both halves.
 */
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MediaGallery from '../../../components/MediaGallery'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import VoteUI, { voteRegionVisible } from '../../../components/vote/VoteUI'
import ScoreStamp from '../../../components/praxisCard/scoreStamp/ScoreStamp'
import { CollabRoster } from '../../../components/collab/CollabRoster'
import { CovenCat, SLIP_SHEET } from '../../../components/factionMarks/covenSlip'
import { useFormFactor } from '../../../hooks/useFormFactor'
import { formatTimestamp } from '../../../utils/dates'
import { mediaUrl } from '../../../utils/media'
import { PraxisDetailSkin, type DuelInk } from '../praxisDetailSkin'
import {
  bylineFaces,
  PraxisOwnerActions,
  MemberByline,
  taskRefMeta,
} from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'
import { factionBodyVars } from '../../../utils/factionBodyFace'

const CHROME = 'var(--font-faction-script)' /* Caveat */
const READING = 'var(--font-faction-spectral)' /* Spectral */
const HAND = 'var(--font-faction-script)' /* Caveat */
const DISPLAY = 'var(--font-faction-witch)' /* Grenze Gotisch */

const INK = 'var(--faction-coven-slip-ink)'
const DEEP = 'var(--faction-coven-slip-deep)'
const SOFT = 'var(--faction-coven-slip-soft)'
const LABEL = 'var(--faction-coven-slip-label)'
const GOLD = 'var(--faction-coven-slip-gold)'
const PINK = 'var(--faction-coven-slip-pk)'
const BORDER = 'var(--faction-coven-slip-border)'
const CARD = 'var(--faction-coven-ward-card)'
const PAGE = 'var(--faction-coven-ward-page)'

interface SizeSet {
  /** Ornament geometry (WORLD_ZERO_STYLE §4a). */
  disc: number
  /** Cat watermark; sized to sit wholly on the sheet (240 + 24px inset fits 320px). */
  wheel: number
  titleSize: string
  headingSize: string
}

const SIZES: Record<'desktop' | 'mobile', SizeSet> = {
  desktop: {
    disc: 46,
    wheel: 400,
    titleSize: 'var(--text-display)',
    headingSize: 'var(--text-title)',
  },
  mobile: {
    disc: 38,
    wheel: 240,
    titleSize: 'var(--text-heading)',
    headingSize: 'var(--text-title)',
  },
}

const CAPTION: CSSProperties = {
  fontFamily: CHROME,
  fontWeight: 700,
  fontSize: 'var(--text-md)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: LABEL,
}

/** `.cvn-braid` owns the strands' pigments (index.css). */
function Braid({ style }: { style?: CSSProperties }) {
  return <span aria-hidden className="cvn-braid" style={{ minWidth: 20, ...style }} />
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '·'
  )
}

/** One member's ringed disc; collab bylines stack these, overlapping. */
function MemberDisc({
  name,
  avatarUrl,
  size,
}: {
  name: string
  avatarUrl: string
  size: number
}) {
  return (
    <span
      aria-hidden
      style={{
        display: 'block',
        width: size,
        height: size,
        borderRadius: '50%',
        // Ring-stroke inset: the padding IS the drawn band (WORLD_ZERO_STYLE §4a).
        // eslint-disable-next-line local/no-raw-style-values -- ornament: the drawn ring's stroke width.
        padding: 2,
        background: `linear-gradient(150deg, ${PINK}, ${GOLD})`,
        flexShrink: 0,
        boxShadow: '0 3px 10px var(--faction-coven-slip-glow)',
      }}
    >
      {avatarUrl ? (
        <img
          src={mediaUrl(avatarUrl)}
          alt={name}
          className="object-cover"
          style={{ display: 'block', width: '100%', height: '100%', borderRadius: '50%' }}
        />
      ) : (
        <span
          className="flex items-center justify-center"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: CARD,
            fontFamily: HAND,
            fontSize: 'var(--text-content)',
            fontWeight: 700,
            color: DEEP,
          }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  )
}

export default function CovenPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const formFactor = useFormFactor()
  const desktop = formFactor !== 'mobile'
  const size = SIZES[formFactor]
  const { praxis, voters } = state

  // Guarded non-null by the dispatcher.
  if (!praxis) return null

  // A collab is a collab at one member (#1274). Tested positively: a duel side
  // is `type='solo'` + `duel_id` (ADR-0011), so `!== 'solo'` breaks duels (#992).
  const isCollab = praxis.type === 'collab'

  const sectionHead = (label: ReactNode, gloss?: ReactNode) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-md)',
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: size.headingSize,
          lineHeight: 1.06,
          letterSpacing: '0.02em',
          color: INK,
        }}
      >
        {label}
      </span>
      <Braid style={{ flex: 1 }} />
      {gloss !== undefined && <span style={{ ...CAPTION, flex: '0 0 auto' }}>{gloss}</span>}
    </div>
  )

  const panel: CSSProperties = {
    background: CARD,
    border: `2px solid ${BORDER}`,
    borderRadius: 16,
    boxSizing: 'border-box',
    boxShadow: 'var(--faction-coven-slip-shadow)',
    padding: 'var(--space-lg)',
  }

  const sectionGap = desktop ? 'var(--space-2xl)' : 'var(--space-xl)'

  // Navigation and moderation banners are the shared layer's (#2102, #2718);
  // this kit passes no banner ink, so they keep the neutral `--color-*` tokens.

  const header = (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-md)',
        }}
      >
        {/* `bylineFaces` credits the creator even with no member rows. */}
        <span style={{ display: 'flex', alignItems: 'center' }}>
          {bylineFaces(praxis).map((author, index) => (
            <Link
              key={author.id}
              to={`/characters/${author.id}`}
              style={{
                display: 'block',
                marginLeft: index === 0 ? 0 : 'calc(-1 * var(--space-lg))',
                zIndex: index,
              }}
            >
              <MemberDisc
                name={author.name}
                avatarUrl={author.avatarUrl}
                size={size.disc}
              />
            </Link>
          ))}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <MemberByline
            praxis={praxis}
            linkStyle={{
              fontFamily: READING,
              fontSize: desktop ? 'var(--text-title)' : 'var(--text-content)',
              color: INK,
              textDecoration: 'none',
            }}
          />
          <div style={CAPTION}>
            {t('detail.filed', {
              date: formatTimestamp(praxis.submitted_at ?? praxis.created_at),
            })}
          </div>
        </div>
      </div>

      <h1
        style={{
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: size.titleSize,
          lineHeight: 1.04,
          margin: '0 0 var(--space-md)',
          color: INK,
          overflowWrap: 'anywhere',
        }}
      >
        {praxis.title || praxis.task_title}
      </h1>

      <PraxisOwnerActions state={state} />

      <div style={{ marginBottom: sectionGap }}>
        <Braid />
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--space-sm)',
            flexWrap: 'wrap',
            padding: 'var(--space-md) 0',
          }}
        >
          <span style={CAPTION}>{t('detail.taskRef.label')}</span>
          {/* INK (#1295): this band is unpanelled, so the link sits on the sheet. */}
          <Link
            to={`/tasks/${praxis.task_id}`}
            className="content-text"
            style={{ fontFamily: READING, color: INK, textDecoration: 'none' }}
          >
            {praxis.task_title}
          </Link>
          <span style={{ ...CAPTION, marginLeft: 'auto' }}>
            {taskRefMeta(praxis, t)}
          </span>
        </div>
        <Braid />
      </div>
    </>
  )

  // `ScoreStamp` is the one readout (#1091, ADR-0053). Handed over
  // unconditionally: `scoreWasBanked` is the shared gate.
  const scoreBlock = (
    <section style={{ ...panel, position: 'relative', overflow: 'hidden' }}>
      {sectionHead(t('detail.score.heading'))}
      <span
        aria-hidden
        className="cvn-candle"
        style={{
          position: 'absolute',
          left: '50%',
          top: '55%',
          width: 200,
          height: 200,
          // eslint-disable-next-line local/no-raw-style-values -- ornament: half the 200px candle halo, centring the glow on its anchor. The offsets ARE the drawn disc's size; no rung halves it.
          marginLeft: -100,
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the vertical half of the same halo centring.
          marginTop: -100,
          borderRadius: '50%',
          background: 'var(--faction-coven-slip-sigil-halo)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        {/* The page's one crown is the stamp's corner fleur (#1710, ADR-0054). */}
        <ScoreStamp praxis={praxis} />
      </div>
    </section>
  )

  // The ward panel's measured inks (#1153, `factionContrast.test.ts`). The
  // rival's side never carries its faction hue.
  const duelInk: DuelInk = { name: INK, total: INK, muted: SOFT, line: BORDER, plate: PAGE }

  // Same predicate `VoteUI` gates itself on (#1429), so no empty plate.
  const voteBlock = voteRegionVisible(state.user, praxis.viewer_can_vote) && (
    <section style={panel}>
      {sectionHead(t('detail.vote.heading'))}
      <p
        className="content-text"
        style={{ fontFamily: HAND, margin: '0 0 var(--space-md)', color: SOFT }}
      >
        {t('detail.vote.prompt')}
      </p>
      {/* Dispatched on the TASK's faction; `VoteUI` also publishes the slug the
          logged-out gate reads, so the widget is never mounted bare. */}
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        currentValue={praxis.viewer_vote ?? undefined}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </section>
  )

  // No average anywhere (ADR-0014), and no invented per-voter points.
  const votersBlock = voters.length > 0 && (
    <section style={panel}>
      {sectionHead(
        t('detail.voters.heading'),
        t('detail.voters.count', { count: voters.length }),
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {voters.map((voter) => (
          <div
            key={voter.character_id}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}
          >
            <Link
              to={`/characters/${voter.character_id}`}
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: READING,
                fontSize: 'var(--text-content)',
                color: INK,
                textDecoration: 'none',
              }}
            >
              {voter.display_name}
            </Link>
            <span
              aria-hidden
              style={{
                width: 84,
                height: 9,
                borderRadius: 5,
                background: PAGE,
                border: `1px solid ${BORDER}`,
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${(voter.value / 5) * 100}%`,
                  background: `linear-gradient(90deg, ${PINK}, ${GOLD})`,
                }}
              />
            </span>
            <span
              style={{
                width: 20,
                textAlign: 'right',
                fontFamily: READING,
                fontSize: 'var(--text-content)',
                color: DEEP,
              }}
            >
              {voter.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  )

  const proof = praxis.media_items.length > 0 && (
    <section style={{ marginBottom: sectionGap }}>
      {sectionHead(t('detail.sections.proof'))}
      <div
        style={{
          borderRadius: 16,
          padding: 'var(--space-sm)',
          border: `2px solid ${BORDER}`,
          background:
            'linear-gradient(158deg, var(--faction-coven-slip-from), var(--faction-coven-slip-mid) 38%, var(--faction-coven-slip-lav) 76%, var(--faction-coven-slip-vio))',
          boxShadow: 'var(--faction-coven-slip-shadow)',
        }}
      >
        <div style={{ borderRadius: 10, background: CARD, padding: 'var(--space-md)' }}>
          <MediaGallery media={praxis.media_items} layout={desktop ? 'grid' : 'column'} />
        </div>
      </div>
    </section>
  )

  const writeUp = praxis.body_text && (
    <section style={{ marginBottom: sectionGap }}>
      {sectionHead(t('detail.sections.writeUp'))}
      <MarkdownPreview
        source={praxis.body_text}
        className="markdown-preview content-text"
        style={{ fontFamily: READING, lineHeight: 1.75, color: INK }}
      />
    </section>
  )

  const crew = isCollab && (
    <section style={{ marginBottom: sectionGap }}>
      {sectionHead(t('detail.sections.members'))}
      <CollabRoster
        praxisType={praxis.type}
        invites={praxis.invites}
        members={praxis.members}
        currentCharacterId={state.user?.character?.id ?? null}
        factionSlug={praxis.task_faction_slug}
        taskPointValue={praxis.task_point_value}
        onKick={state.handleKickMember}
      />
    </section>
  )

  return (
    <PraxisDetailSkin
      state={state}
      kit={{
        pageStyle: { position: 'relative', color: INK, fontFamily: CHROME },
        /* `SLIP_SHEET` is `covenSlip`'s one copy of the ramp (#2135). The
           ground is the column's, not the viewport's (WORLD_ZERO_STYLE §5).
           No `overflow: hidden`: it would clip the composer's @-mention
           listbox (#1255). */
        sheetStyle: {
          ...factionBodyVars("coven"),
          position: 'relative',
          zIndex: 1,
          maxWidth: 1200,
          margin: '0 auto',
          background: SLIP_SHEET,
          border: `2px solid ${BORDER}`,
          borderRadius: 18,
          padding: desktop ? 'var(--space-2xl)' : 'var(--space-lg)',
          boxSizing: 'border-box',
        },
        sheetBody: (body) => <div style={{ position: 'relative', zIndex: 1 }}>{body}</div>,
        splitStyle: { position: 'relative' },
        /* Cat watermark (#2041; drawing shared in `covenSlip`). Anchored to the
           columns row, not the sheet: the sheet's bottom sits behind the opaque
           comment composer (#2135). The row is no stacking context, so
           `zIndex: -1` lands in the sheet body: under the copy, over the ground. */
        splitPrelude: (
          <CovenCat
            size={size.wheel}
            style={{ right: 24, bottom: 0, opacity: 0.09, zIndex: -1 }}
          />
        ),
        header,
        score: scoreBlock,
        duelPanel: panel,
        duelHeading: sectionHead(t('duelCrossLink.label')),
        duelInk,
        vote: voteBlock,
        voters: votersBlock,
        proof,
        writeUp,
        crew,
        metatasksHeading: sectionHead(t('detail.metatasks.heading')),
        commentsHeading: sectionHead(t('detail.sections.comments')),
      }}
    />
  )
}
