/**
 * The Ephemerists' comment voice — a note filed on the Valley plate (#1199).
 * Behaviour spec is `DefaultComment`; this owns the dress only. One component, no
 * mobile twin (ADR-0063). Full plate swap (ADR-0055): no `--eph-*` atom here.
 * No drop cap: slicing the body's first character broke a leading `@mention`; the
 * ochre margin rule marks the note instead. `-brass` is a rule colour, never an ink.
 */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import {
  CommentEditor,
  OwnerControls,
  useOwnerEdit,
  useOwnerReveal,
} from '../OwnerControls'
import { CommentFlagControl, canFlagComment } from '../FlagControl'
import { useAuth } from '../../../auth/AuthContext'
import {
  BRASS_LIGHT,
  CAPS,
  CAPTION,
  INK,
  INNER,
  LINE,
  OCHRE,
  PLATE,
  QUIET,
  READING,
  SHADOW,
  SMALL_CAPS,
  WASH,
} from '../../factionMarks/ephemeristsPlate'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/** The plate's CTA pair, measured as a pair. Not `-brass` (no text on it), not `-band` (near-black in dark). */
const CTA_BG = 'var(--faction-ephemerists-plate-cta-bg)'
const CTA_INK = 'var(--faction-ephemerists-plate-cta-ink)'

const LABEL = {
  ...SMALL_CAPS,
  fontSize: 'var(--text-md)',
  color: CAPTION,
} as const

/** The leaf both modes sit on, so a thread reads as one stack of notes. */
function Leaf({
  avatar,
  children,
  containerProps,
}: {
  avatar: React.ReactNode
  children: React.ReactNode
  containerProps?: React.ComponentPropsWithoutRef<'div'>
}) {
  return (
    <div style={{ ...factionBodyVars("ephemerists"), display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
      {avatar}
      <div
        {...containerProps}
        style={{
          flex: 1,
          minWidth: 0,
          background: PLATE,
          border: `1px solid ${LINE}`,
          boxShadow: SHADOW,
          color: INK,
        }}
      >
        {/* No head band (#2210). No `overflow: hidden`: it would clip the @mention listbox. */}
        <div style={{ padding: 'var(--space-md) var(--space-lg)', background: WASH }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/** The note beside an ochre margin rule (a flex sibling, so it stretches to height). */
function Marginalia({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
      <span
        aria-hidden="true"
        style={{
          width: 1,
          flexShrink: 0,
          alignSelf: 'stretch',
          background: OCHRE,
          opacity: 0.55,
        }}
      />
      <div
        className="content-text"
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: READING,
          color: INK,
          lineHeight: 1.6,
          overflowWrap: 'anywhere',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default function EphemeristsComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const reveal = useOwnerReveal()

  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <Leaf avatar={<FactionAvatar character={character} size="sm" />}>
        <div aria-busy={submitting}>
          <Marginalia>
            <ComposerControls
              value={value}
              onChange={onChange}
              onSubmit={onSubmit}
              submitting={submitting}
              accent={CTA_BG}
              onAccent={CTA_INK}
              // The panel cell, so the field reads as inset.
              bg={INNER}
              text={INK}
              hint={<span style={LABEL}>{t('comments.mentionHint')}</span>}
            />
          </Marginalia>
        </div>
      </Leaf>
    )
  }

  const { comment, onEdited, onWithdrawn } = props
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const canFlag = canFlagComment(comment, user?.character?.id)
  const showControls = !owner.editing && (owner.isOwner || canFlag)
  // The foot rule is never gated (#2733); `<OwnerControls reveal>` gates itself.

  return (
    <Leaf
      avatar={<FactionAvatar character={authorToCharacter(comment.author)} size="sm" />}
      containerProps={reveal.containerProps}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-sm)',
          flexWrap: 'wrap',
        }}
      >
        <Link
          to={`/characters/${comment.author.id}`}
          style={{
            fontFamily: CAPS,
            fontSize: 'var(--text-content)',
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: INK,
            textDecoration: 'none',
          }}
        >
          {comment.author.display_name}
        </Link>
        <span style={{ ...LABEL, color: QUIET }}>
          {formatCommentTime(comment.created_at)}
        </span>
        {comment.is_edited && (
          <span style={{ ...LABEL, color: QUIET }}>
            <span aria-hidden="true">· </span>
            {t('comments.edited')}
          </span>
        )}
      </div>

      <Marginalia>
        {owner.editing ? (
          <CommentEditor
            owner={owner}
            accent={CTA_BG}
            onAccent={CTA_INK}
            bg={INNER}
            text={INK}
          />
        ) : (
          <MentionText body={comment.body_text} mentions={comment.mentions} accent={BRASS_LIGHT} />
        )}
      </Marginalia>

      {showControls && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 'var(--space-md)',
            marginTop: 'var(--space-md)',
            paddingTop: 'var(--space-sm)',
            borderTop: `1px solid ${LINE}`,
          }}
        >
          <OwnerControls owner={owner} reveal={reveal} />
          <CommentFlagControl comment={comment} />
        </div>
      )}
    </Leaf>
  )
}
