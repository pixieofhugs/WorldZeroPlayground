import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { UaSigil } from '../../sigil/UaSigil'
import { UA_DISPLAY, UA_EYEBROW, UA_TEXT } from '../../factionMarks/uaAtoms'
import { useAuth } from '../../../auth/AuthContext'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import {
  CommentEditor,
  OwnerControls,
  useOwnerEdit,
  useOwnerReveal,
} from '../OwnerControls'
import { CommentFlagControl, canFlagComment } from '../FlagControl'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'

/**
 * UA comment — the marginal note (kit §14, #851, #1201; supersedes ADR-0026).
 * Paper stock, a dashed orange left rule, an ensō on the composer; no mandala (the
 * densest text surface, brief §5). The owner row sits in a foot, not the header:
 * revealing it there reflowed the timestamp. One component, no mobile twin.
 */

function note(active: boolean): CSSProperties {
  return {
    /* Role map on the root style; its own declarations below can read it (#2673). */
    ...factionBodyVars("ua"), ...factionRoleVars('ua', 'leaf-comment'),
    display: 'flex',
    gap: 'var(--space-lg)',
    alignItems: 'flex-start',
    padding: 'var(--space-lg) var(--space-lg)',
    borderRadius: 'var(--radius-sm)',
    border: active
      ? '1px solid var(--leaf-comment-fill)'
      : '1px solid var(--faction-ua-rule)',
    borderLeft: '2px dashed var(--leaf-comment-fill)',
    background: 'var(--faction-ua-parchment)',
    color: 'var(--leaf-comment-ink)',
  }
}

function meta(extra?: CSSProperties): CSSProperties {
  return { ...UA_EYEBROW, ...extra }
}

export default function UaComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const reveal = useOwnerReveal()
  if (props.mode === 'composer') {
    const { value, onChange, onSubmit, submitting } = props
    return (
      <div style={note(true)} aria-busy={submitting}>
        {/* The mark replaces the portrait on the composer, per the kit. */}
        <span aria-hidden="true" style={{ flexShrink: 0 }}>
          <UaSigil width={38} height={38} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ComposerControls
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            accent="var(--leaf-comment-accent)"
            onAccent="var(--faction-ua-on-accent)"
            bg="var(--faction-ua-panel)"
            text="var(--leaf-comment-ink)"
            hint={<span style={meta()}>{t('comments.mentionHint')}</span>}
          />
        </div>
      </div>
    )
  }

  const { comment, onEdited, onWithdrawn } = props
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const canFlag = canFlagComment(comment, user?.character?.id)
  const showFoot = !owner.editing && (owner.isOwner || canFlag)
  // The foot rule is never gated (#2733); `<OwnerControls reveal>` gates itself.
  return (
    <div style={note(false)} {...reveal.containerProps}>
      <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 'var(--space-md)',
          }}
        >
          <Link
            to={`/characters/${comment.author.id}`}
            style={{
              fontFamily: UA_DISPLAY,
              fontWeight: 600,
              fontSize: 'var(--text-content)',
              color: 'var(--leaf-comment-ink)',
              textDecoration: 'none',
            }}
          >
            {comment.author.display_name}
          </Link>
          <span style={meta({ whiteSpace: 'nowrap' })}>
            {formatCommentTime(comment.created_at)}
            {comment.is_edited ? ` · ${t('comments.edited')}` : ''}
          </span>
        </div>
        <div
          style={{
            fontFamily: UA_TEXT,
            fontSize: 'var(--text-content)',
            lineHeight: 1.55,
            color: 'var(--faction-ua-card-body)',
            marginTop: 'var(--space-sm)',
            overflowWrap: 'anywhere',
          }}
        >
          {owner.editing ? (
            <CommentEditor
              owner={owner}
              accent="var(--leaf-comment-accent)"
              onAccent="var(--faction-ua-on-accent)"
              bg="var(--faction-ua-panel)"
              text="var(--leaf-comment-ink)"
            />
          ) : (
            <MentionText
              body={comment.body_text}
              mentions={comment.mentions}
              accent="var(--leaf-comment-accent)"
            />
          )}
        </div>
        {showFoot && (
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 'var(--space-md)',
              marginTop: 'var(--space-md)',
              paddingTop: 'var(--space-sm)',
              borderTop: '1px solid var(--faction-ua-hair)',
              }}
          >
            <OwnerControls owner={owner} reveal={reveal} />
            <CommentFlagControl comment={comment} />
          </div>
        )}
      </div>
    </div>
  )
}
