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
  ownerRevealStyle,
  useOwnerEdit,
  useOwnerReveal,
} from '../OwnerControls'
import { CommentFlagControl, canFlagComment } from '../FlagControl'
import { factionRoleVars } from '../../../utils/factionRoles'

/**
 * UA comment — THE MARGINAL NOTE (kit §14, #851; redressed by #1201).
 *
 * SUPERSEDES ADR-0026's gilt salon. A UA comment is a note written in the margin
 * of the work: the practice's own paper stock, one dashed orange rule down the
 * left edge, an ensō on the composer, and nothing else. No gold-leaf frame, no
 * house line, no ornament. The mandala is ABSENT — a comment thread is the
 * densest text surface in the app (brief §5).
 *
 * The three invariant slots are unchanged (ADR-0016): author identity · body ·
 * timestamp+edited. A posted row takes the AUTHOR's faction; the composer takes
 * the current character's.
 *
 * #1201 changes three things, all dress:
 *
 *  - the sheet is `--faction-ua-parchment`, the three-stop stock the design draws
 *    (`--cardGrad`), rather than the flat `card-bg` fill;
 *  - the metadata speaks in the kit's one label shape (`UA_EYEBROW`) instead of a
 *    hand-rolled small serif, and the composer's mention hint is overridden into
 *    that same voice rather than inheriting the neutral caption;
 *  - the owner's edit/withdraw row leaves the header for a FOOT row under a
 *    hairline, and is hover/focus-gated with F3's shared `useOwnerReveal` — not a
 *    gate of this file's own. The move is what makes the gate usable: revealing a
 *    control inside the baseline header reflowed the timestamp every time the
 *    pointer crossed the note.
 *
 * Seven states, one component (ADR-0056 / 0058 / 0063 — no mobile twin):
 *   row · default | row · mention | row · edited | row · yours (hover) |
 *   row · editing | composer · empty | composer · submitting
 *
 * Both themes come from the `[data-theme="dark"]` cascade. The salon that never
 * dimmed is gone.
 */

/** The margin — a dashed orange rule down the left of the note. */
function note(active: boolean): CSSProperties {
  return {
    /* The nine roles under this surface's prefix (#2659/#2673). This helper
       builds the note's ROOT style, and a custom property declared on an
       element is visible to that element's own declarations, so the reads
       below resolve against it. */
    ...factionRoleVars('ua', 'leaf-comment'),
    display: 'flex',
    gap: 'var(--space-lg)',
    alignItems: 'flex-start',
    padding: 'var(--space-lg) var(--space-lg)',
    borderRadius: 'var(--radius-sm)',
    border: active
      ? '1px solid var(--leaf-comment-fill, var(--faction-ua))'
      : '1px solid var(--faction-ua-rule)',
    borderLeft: '2px dashed var(--leaf-comment-fill, var(--faction-ua))',
    // The practice's paper stock, both modes: a note and the pad it is written
    // on are the same sheet. Composed from the surface primitives, so it dims
    // with the faction and needs no ternary.
    background: 'var(--faction-ua-parchment)',
    color: 'var(--leaf-comment-ink, var(--faction-ua-card-text))',
  }
}

/** Metadata voice — the kit's one label shape, quiet on the stock. */
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
        {/* The mark stands in for the portrait on the composer, as the kit
            draws it: you are writing in the practice's margin, not signing.
            The three invariant slots (ADR-0016) belong to the posted row. */}
        <span aria-hidden="true" style={{ flexShrink: 0 }}>
          <UaSigil width={38} height={38} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* The italic prompt line here said "Leave a note in the margin…"
              (`comments.ua.prompt`). #1911 collapsed the four bespoke prompts
              onto `comments.composerPlaceholder`, which the textarea below
              already shows, so the line would have repeated it verbatim. */}
          <ComposerControls
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            accent="var(--leaf-comment-accent, var(--faction-ua-card-accent))"
            onAccent="var(--faction-ua-on-accent)"
            bg="var(--faction-ua-panel)"
            text="var(--leaf-comment-ink, var(--faction-ua-card-text))"
            // The shared string in the practice's own label voice — an OVERRIDE
            // of ComposerControls' neutral caption, not a new hint (#1195).
            hint={<span style={meta()}>{t('comments.mentionHint')}</span>}
          />
        </div>
      </div>
    )
  }

  const { comment, onEdited, onWithdrawn } = props
  const slug = comment.author.faction_slug
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const canFlag = canFlagComment(comment, user?.character?.id)
  // The foot exists only when it has something to hold: the author's own row, or
  // a flag affordance on somebody else's note. Hidden while editing — the inline
  // editor owns Save/Cancel then.
  const showFoot = !owner.editing && (owner.isOwner || canFlag)
  // On your OWN note the foot holds nothing but the gated row, so its hairline
  // fades with the row: a rule over empty space is a state the sheet never draws.
  const footGate = owner.isOwner && !canFlag ? ownerRevealStyle(reveal.revealed) : null
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
              color: 'var(--leaf-comment-ink, var(--faction-ua-card-text))',
              textDecoration: 'none',
            }}
          >
            {comment.author.display_name}
          </Link>
          <span style={meta({ whiteSpace: 'nowrap' })}>
            {formatCommentTime(slug, comment.created_at)}
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
              accent="var(--leaf-comment-accent, var(--faction-ua-card-accent))"
              onAccent="var(--faction-ua-on-accent)"
              bg="var(--faction-ua-panel)"
              text="var(--leaf-comment-ink, var(--faction-ua-card-text))"
            />
          ) : (
            <MentionText
              body={comment.body_text}
              mentions={comment.mentions}
              accent="var(--leaf-comment-accent, var(--faction-ua-card-accent))"
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
              // The faintest divider UA has: a rule inside the note is quieter
              // than the note's own edge.
              borderTop: '1px solid var(--faction-ua-hair)',
              ...footGate,
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
