import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MediaGallery from '../../../components/MediaGallery'
import MarkdownPreview from '../../editPraxis/blocks/MarkdownPreview'
import VoteUI, { voteRegionVisible } from '../../../components/vote/VoteUI'
import ScoreStamp from '../../../components/praxisCard/scoreStamp/ScoreStamp'
import { CollabRoster } from '../../../components/collab/CollabRoster'
import { BalloonBunch, Bunting, Zig } from '../../../components/factionMarks/wowOrnament'
import { useFormFactor } from '../../../hooks/useFormFactor'
import { formatTimestamp } from '../../../utils/dates'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'
import { mediaUrl } from '../../../utils/media'
import { PraxisDetailSkin, type DuelInk } from '../praxisDetailSkin'
import {
  bylineFaces,
  PraxisOwnerActions,
  MemberByline,
  taskRefMeta,
} from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'

/**
 * Warriors of Whimsy — THE CHRONICLE ENTRY (#1121; design `Warrior of Whimsy
 * Praxis Detail.dc.html`). A quest is issued by decree (`WowTaskDetail`) and
 * its proof is recorded in the chronicle (ADR-0050). `PraxisDetailSkin` owns
 * layout and neutral slots; this file is the kit (`archetypeSlots.test.tsx`).
 *
 * Dress: bunting, dotted parchment field, cream plates in 2px gold, wavy rules,
 * one balloon bunch by the comments. MedievalSharp for display/labels, Lora
 * italic for the quiet register. Ornaments only from `wowOrnament.tsx` (§6).
 *
 * Load-bearing rules (§3): the gilt is theme-invariant (the parchment flips),
 * and never an ink. A rival's faction colour is never an ink or behind text —
 * only a ring, plate edge or bar. Nothing enforces this automatically (#1115),
 * and the `DuelCard` `ink` seam (#1153) is one careless prop away.
 *
 * Copy: none (ADR-0061); faction words parked on #1121. "proclaim" is
 * `comments.wow.post`, dispatched on the commenter's faction.
 *
 * Role reads (#2674) are declared on `.wow-detail-field`, not the wrapper that
 * holds the neutral `Breadcrumb` (#2102). Non-role names below (label ink,
 * gold, inset, hairline) are this surface's own extras.
 */
const MED = 'var(--wow-praxis-page-face)' /* MedievalSharp */
const LORA = 'var(--faction-wow-body-font)' /* Lora */

const INK = 'var(--wow-praxis-page-ink)'
/** Metadata ink. 4.52:1 on a cream plate; not legible enough on the field. */
const MUTED = 'var(--wow-praxis-page-quiet)'
/** Label ink measured on BOTH grounds: 5.32:1 plate, 5.06:1 field. */
const LABEL = 'var(--faction-wow-accent-deep)'
/** Plum as INK (flips with theme). 5.11:1 on the field. */
const PLUM = 'var(--wow-praxis-page-accent)'
/** Frame + rule gold. Theme-invariant, never an ink: 2.24:1 on the cream. */
const GOLD = 'var(--faction-wow-chronicle-gold)'
const CARD = 'var(--wow-praxis-page-paper)'
const INSET = 'var(--faction-wow-detail-inset)'
const HAIR = 'var(--faction-wow-chronicle-rule)'

/** The gold→plum voter rung. A FILL, never an ink. */
const RUNG = `linear-gradient(90deg, ${GOLD}, var(--faction-wow-plum-surface))`

interface SizeSet {
  title: string
  byline: string
  /** Main-column section heads, on the field. */
  sectionHead: string
  /** Aside heads, a tier down for the 330px plate. */
  panelHead: string
  disc: number
  pagePad: string
  panelPad: string
  sectionGap: string
  buntingGap: string
}

const SIZES: Record<'desktop' | 'mobile', SizeSet> = {
  desktop: {
    title: 'var(--text-display)',
    byline: 'var(--text-title)',
    sectionHead: 'var(--text-heading)',
    panelHead: 'var(--text-title)',
    disc: 44,
    pagePad: 'var(--space-2xl)',
    panelPad: 'var(--space-lg)',
    sectionGap: 'var(--space-2xl)',
    buntingGap: 'var(--space-xl)',
  },
  mobile: {
    title: 'var(--text-heading)',
    byline: 'var(--text-content)',
    sectionHead: 'var(--text-title)',
    panelHead: 'var(--text-title)',
    disc: 38,
    pagePad: 'var(--space-lg)',
    panelPad: 'var(--space-lg)',
    sectionGap: 'var(--space-xl)',
    buntingGap: 'var(--space-lg)',
  },
}

/** The chronicle's label voice — MedievalSharp small caps. */
const EYEBROW: CSSProperties = {
  fontFamily: MED,
  fontSize: 'var(--text-base)',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
}

/** Lora italic, the faction's quiet register. */
const QUIET: CSSProperties = {
  fontFamily: LORA,
  fontStyle: 'italic',
  lineHeight: 1.55,
}

/** Lora italic — a note in the margin of the entry, never set text. */
const MARGINALIA: CSSProperties = {
  fontFamily: LORA,
  fontStyle: 'italic',
  lineHeight: 1.35,
}

/** Initials fallback for a member with no uploaded avatar. */
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

/** A member's disc in the gilt rope ring; collab bylines stack these. */
function ChronicleDisc({
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
        padding: 'var(--space-xs)',
        background: 'var(--faction-wow-avatar-ring)',
        flexShrink: 0,
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
            background: 'var(--faction-wow-avatar-field)',
            fontFamily: MED,
            fontSize: 'var(--text-lg)',
            color: PLUM,
          }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  )
}

export default function WowPraxisDetail({ state }: { state: PraxisDetailState }) {
  const { t } = useTranslation('praxis')
  const desktop = useFormFactor() !== 'mobile'
  const size = SIZES[desktop ? 'desktop' : 'mobile']
  const { praxis, voters } = state

  // Guarded non-null by the dispatcher.
  if (!praxis) return null

  // A collab at ONE member is still a collab (#1274). Tested positively: a duel
  // side is `type='solo'` + `duel_id` (ADR-0011), so `!== 'solo'` is wrong (#992).
  const isCollab = praxis.type === 'collab'

  /** A cream plate in a gold frame — the chronicle's one container. */
  const plate: CSSProperties = {
    background: CARD,
    border: `2px solid ${GOLD}`,
    borderRadius: 10,
    boxSizing: 'border-box',
    boxShadow: 'var(--faction-wow-detail-shadow)',
    color: INK,
  }

  /** The same plate, with the aside's padding already on it. */
  const panel: CSSProperties = { ...plate, padding: size.panelPad }

  /** MedievalSharp label, wavy gold→plum rule, optional trailing ornament. */
  const head = (
    id: string,
    label: ReactNode,
    fontSize: string,
    trailing?: ReactNode,
  ) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-md)',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontFamily: MED, fontSize, lineHeight: 1.08, color: INK }}>{label}</span>
      <Zig id={id} style={{ flex: 1 }} />
      {trailing}
    </div>
  )

  const sectionHead = (id: string, label: ReactNode, trailing?: ReactNode) =>
    head(id, label, size.sectionHead, trailing)
  const panelHead = (id: string, label: ReactNode, trailing?: ReactNode) =>
    head(id, label, size.panelHead, trailing)

  // Navigation and moderation chrome come from the shared skin (#2102, #2718);
  // this kit passes neither flagged-ink knob.

  // ── Byline · title · owner actions · task reference ──
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
        {/* Stacked discs, one per member; no member rows still credits the creator. */}
        <span style={{ display: 'flex', alignItems: 'center' }}>
          {bylineFaces(praxis).map((author, index) => (
            <Link
              key={author.id}
              to={`/characters/${author.id}`}
              style={{
                display: 'block',
                // Each disc laps the one before by a negated spacing step.
                marginLeft: index === 0 ? 0 : 'calc(-1 * var(--space-lg))',
                zIndex: index,
              }}
            >
              <ChronicleDisc
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
              fontFamily: MED,
              fontSize: size.byline,
              color: INK,
              textDecoration: 'none',
            }}
          />
          {/* The scribe's hand: when the entry was set down. */}
          <div style={{ ...MARGINALIA, fontSize: 'var(--text-xl)', color: LABEL }}>
            {t('detail.filed', {
              date: formatTimestamp(praxis.submitted_at ?? praxis.created_at),
            })}
          </div>
        </div>
      </div>

      <h1
        style={{
          fontFamily: MED,
          fontSize: size.title,
          lineHeight: 1.08,
          margin: '0 0 var(--space-md)',
          color: INK,
          overflowWrap: 'anywhere',
        }}
      >
        {praxis.title || praxis.task_title}
      </h1>

      <PraxisOwnerActions state={state} />

      {/* Task reference. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-sm)',
          flexWrap: 'wrap',
          borderTop: `1px solid ${HAIR}`,
          borderBottom: `1px solid ${HAIR}`,
          padding: 'var(--space-md) 0',
          marginBottom: size.sectionGap,
        }}
      >
        <span style={{ ...EYEBROW, color: LABEL }}>{t('detail.taskRef.label')}</span>
        <Link
          to={`/tasks/${praxis.task_id}`}
          className="content-text"
          style={{ ...QUIET, color: INK, textDecoration: 'none' }}
        >
          {praxis.task_title}
        </Link>
        <span style={{ ...EYEBROW, color: LABEL, marginLeft: 'auto' }}>
          {taskRefMeta(praxis, t)}
        </span>
      </div>
    </>
  )

  // ── Score: `ScoreStamp` is the whole readout, dispatched on the TASK's
  // faction (#1091, ADR-0053); `scoreWasBanked` is the skin's gate. ──
  const scoreBlock = (
    <section style={panel}>
      {panelHead('score', t('detail.score.heading'))}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {/* The crown fleur in the stamp's corner (#1710, ADR-0054). */}
        <ScoreStamp praxis={praxis} />
      </div>
    </section>
  )

  // ── Duel: `DuelCard` self-hides with no duel / declined / run-up (#1071).
  // The opponent-accent rule binds on `ink` (#1153): every value is a WOW
  // token off this plate; no gilt (2.24:1). ──
  const duelInk: DuelInk = { name: INK, total: INK, muted: MUTED, line: HAIR, plate: INSET }

  // ── Vote · voters ──
  // WOW's balloon verdict draws its own "Cast thy Verdict", so the gloss is the
  // neutral prompt. Gated on `VoteUI`'s own predicate (#1429) so an author gets
  // no empty section.
  const voteBlock = voteRegionVisible(state.user, praxis.viewer_can_vote) && (
    <section style={panel}>
      {panelHead('vote', t('detail.vote.heading'))}
      <p
        className="content-text"
        style={{ ...MARGINALIA, margin: '0 0 var(--space-md)', color: MUTED }}
      >
        {t('detail.vote.prompt')}
      </p>
      <VoteUI
        factionSlug={praxis.task_faction_slug}
        praxisId={praxis.id}
        currentValue={praxis.viewer_vote ?? undefined}
        viewerCanVote={praxis.viewer_can_vote}
      />
    </section>
  )

  // Rung = gold→plum FILL (value / 5). NO AVERAGE (ADR-0014).
  const votersBlock = voters.length > 0 && (
    <section style={panel}>
      {panelHead(
        'voters',
        t('detail.voters.heading'),
        <span style={{ ...MARGINALIA, fontSize: 'var(--text-xl)', color: MUTED }}>
          {t('detail.voters.count', { count: voters.length })}
        </span>,
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {voters.map((voter) => (
          <div
            key={voter.character_id}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}
          >
            <Link
              to={`/characters/${voter.character_id}`}
              className="content-text"
              style={{
                ...QUIET,
                flex: '1 1 auto',
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
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
                background: HAIR,
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
                  background: RUNG,
                }}
              />
            </span>
            <span
              style={{
                fontFamily: MED,
                width: 20,
                textAlign: 'right',
                fontSize: 'var(--text-content)',
                color: INK,
              }}
            >
              {voter.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  )

  // The report card is mounted bare by the skin (ADR-0061).

  // ── Proof · write-up · members ──
  const proof = praxis.media_items.length > 0 && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead('proof', t('detail.sections.proof'))}
      <div style={{ ...plate, padding: 'var(--space-md)' }}>
        <div
          style={{
            background: INSET,
            border: `1.5px solid ${HAIR}`,
            borderRadius: 8,
            padding: 'var(--space-sm)',
          }}
        >
          <MediaGallery media={praxis.media_items} layout={desktop ? 'grid' : 'column'} />
        </div>
      </div>
    </section>
  )

  const writeUp = praxis.body_text && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead('writeup', t('detail.sections.writeUp'))}
      <div style={{ ...plate, padding: size.panelPad }}>
        <MarkdownPreview
          source={praxis.body_text}
          className="markdown-preview content-text"
          style={{ ...QUIET, lineHeight: 1.75, color: INK }}
        />
        <Zig id="writeup-foot" style={{ marginTop: 'var(--space-lg)' }} />
      </div>
    </section>
  )

  const crew = isCollab && (
    <section style={{ marginBottom: size.sectionGap }}>
      {sectionHead('crew', t('detail.sections.members'))}
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

  // Metatasks: the skin mounts the READ-ONLY seal (#1093); add chips would 422
  // (`apply_metatask` needs `in_progress`).

  return (
    <PraxisDetailSkin
      state={state}
      kit={{
        pageStyle: { position: 'relative' },
        /* Dotted parchment on the COLUMN, not the viewport (§5, #1028). */
        sheetClassName: 'wow-detail-field',
        sheetStyle: {
          ...factionBodyVars("wow"), ...factionRoleVars('wow', 'wow-praxis-page'),
          position: 'relative',
          zIndex: 1,
          maxWidth: 1200,
          margin: '0 auto',
          borderRadius: 18,
          padding: size.pagePad,
          overflow: 'hidden',
          boxSizing: 'border-box',
          boxShadow: 'var(--faction-wow-detail-shadow)',
        },
        sheetPrelude: <Bunting style={{ marginBottom: size.buntingGap }} />,
        header,
        score: scoreBlock,
        duelPanel: panel,
        duelHeading: panelHead('duel', t('duelCrossLink.label')),
        duelInk,
        vote: voteBlock,
        voters: votersBlock,
        proof,
        writeUp,
        crew,
        metatasksHeading: sectionHead('charms', t('detail.metatasks.heading')),
        /* The balloon bunch: the page's one bobbing ornament. */
        commentsHeading: sectionHead(
          'gallery',
          t('detail.sections.comments'),
          <BalloonBunch size={34} />,
        ),
      }}
    />
  )
}
