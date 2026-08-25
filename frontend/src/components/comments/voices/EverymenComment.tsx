/**
 * THE EVERYMEN COMMENT — the same dispatch slip as the faction's feed chassis,
 * at comment scale (ADR-0006 / ADR-0018; epic #1192, dress issue #1200).
 *
 * The card and the comment are one sheet in the design, so they are one object
 * here: `--everymen-paper` stock inside the DOUBLE FRAME (a 2px ink rule, a 4px
 * pad, a 1px hairline), headed by a red band. On the feed card that band carries
 * the event's kind; on a comment it carries the BYLINE — who filed it and on what
 * shift — because that is the comment's masthead. The two read as the same press.
 *
 * NO FACTION NAME. The band used to print `comments.everymen.masthead`
 * ("EVERYMEN · DISPATCH FROM THE FLOOR"). Epic #1192 decision 5 is unqualified —
 * *no faction-name label anywhere, the skin is the identification* — and the
 * author's faction is already carried by the avatar badge and by the whole slip.
 * The byline took the band's place; the key is now unused (see the PR).
 *
 * COMMENTS ARE NEVER ARCHIVABLE. There is no ✕, no swipe and no undo strip on
 * this surface, deliberately: the archive is the FEED's affordance and lives in
 * `FeedItemSlot`, and every sheet in the epic says in its own dialect that a
 * comment is never rolled up.
 *
 * WHY THE BODY SITS ON A PANEL RATHER THAN ON THE PAPER. `MentionText` paints a
 * resolved @mention in the voice's accent, and #1223 measured red at 4.49:1 as
 * TYPE on `--everymen-paper` — below AA. On `--faction-everymen-sheet-panel` the
 * same hue pays 4.95:1 light / 5.45:1 dark via `--faction-everymen-sheet-accent`,
 * so the typed area is the panel and the mention ink is legible on it. On the
 * paper red stays a fill (the band) and never type. This is §3's rule taken the
 * other way round: rather than walk the ink down, give it the ground it was
 * measured on.
 *
 * BEHAVIOUR IS NOT OURS. Edit, withdraw, flag, @mention autocomplete, the live
 * character count, the submitting state and the hover/focus gate on the author's
 * own controls all live in the shared helpers (`useOwnerEdit`, `useOwnerReveal`,
 * `ComposerControls`, `CommentEditor`, `CommentFlagControl`). #1195 built the
 * gate once; this voice wires the two lines and reimplements none of it.
 *
 * Seven states, one component, no mobile twin (ADR-0056 / 0058 / 0063):
 *   row · default | row · mention | row · edited | row · yours (hover) |
 *   row · editing | composer · empty | composer · submitting
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { useAuth } from '../../../auth/AuthContext'
import { useFormFactor } from '../../../hooks/useFormFactor'
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

/** The composer's accent: red as a RULE (the field's edge) and a FILL (the
 *  Post button), never as type. Its AA ink is the one #924 measured on it. */
const ACCENT = 'var(--everymen-red)'
const ON_ACCENT = 'var(--faction-everymen-on-accent)'
/** The typed area — see the docblock on why this is the panel, not the paper. */
const PANEL = 'var(--faction-everymen-sheet-panel)'
/** The field inset INTO the panel. Deeper than the panel in both themes
 *  (#ece1c6 under #f4ecd6 by day; #221a16 under #2c231c by night). */
const FIELD = 'var(--everymen-paper)'
const BODY_INK = 'var(--everymen-paper-text)'

/** Label voice for the marks on the band: the body face, tracked, uppercase. */
const DATELINE = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-md)',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  color: 'inherit',
} as const

/** The author's name, set as the slip's byline: the poster face, on the band. */
const BYLINE = {
  fontFamily: 'var(--ev-voice-face, var(--faction-everymen-card-font))',
  // Content tier, not the label tier the kind label on the feed card uses: a
  // person's name is identity, and Bebas is narrow enough that 18px reads about
  // as large as 14 of a normal face.
  fontSize: 'var(--text-content)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  lineHeight: 1.15,
  color: 'inherit',
  textDecoration: 'none',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const

/**
 * The slip both modes sit on: avatar in the margin, then the double-framed sheet
 * with its red byline band. One shape for a row and for the composer, so a
 * thread reads as one run of slips rather than a list plus a form.
 */
function Slip({
  avatar,
  byline,
  dateline,
  children,
  containerProps,
}: {
  avatar: ReactNode
  byline: ReactNode
  dateline: ReactNode
  children: ReactNode
  containerProps?: React.ComponentPropsWithoutRef<'div'>
}) {
  const mobile = useFormFactor() === 'mobile'
  return (
    <div
      style={{
        // `Slip` is the surface root for BOTH modes — the row and the composer
        // both render through it — so the role map is declared once here.
        ...factionRoleVars('everymen', 'ev-voice'),
        display: 'flex',
        gap: 'var(--space-md)',
        alignItems: 'flex-start',
      }}
    >
      {avatar}
      <div
        {...containerProps}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'var(--everymen-paper)',
          color: BODY_INK,
          // The double frame, exactly as the feed slip rules it: the plate edge…
          border: '2px solid var(--everymen-frame)',
          // …the 4px pad (--space-xs IS 4px)…
          padding: 'var(--space-xs)',
          boxShadow: 'var(--faction-everymen-slip-shadow)',
        }}
      >
        {/* …and the form's own rule inside it. */}
        <div style={{ border: '1px solid var(--faction-everymen-sheet-hair)' }}>
          {/* The byline band. Red as a FILL, inked in the masthead's own ink —
              the pairing the broadsheet chrome measured (5.24:1 / 4.59:1). */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 'var(--space-md)',
              flexWrap: 'wrap',
              background: 'var(--everymen-red)',
              color: 'var(--everymen-masthead-text)',
              // The ground shows through the band's bottom edge, as on the card.
              borderBottom: '3px double var(--everymen-paper)',
              padding: mobile
                ? 'var(--space-xs) var(--space-sm)'
                : 'var(--space-xs) var(--space-md)',
            }}
          >
            {byline}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 'var(--space-sm)',
                color: 'inherit',
              }}
            >
              {dateline}
            </span>
          </div>
          {/* The typed area. */}
          <div
            style={{
              background: PANEL,
              padding: mobile ? 'var(--space-sm)' : 'var(--space-md)',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EverymenComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const reveal = useOwnerReveal()

  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <Slip
        avatar={<FactionAvatar character={character} size="sm" />}
        byline={<span style={BYLINE}>{character.display_name}</span>}
        dateline={null}
      >
        {/* `.content-text` rides the wrapper because the one slot inside without
            a size of its own is the textarea (`font: inherit`), and a draft is
            content-tier text. Every other slot names its own size. */}
        <div className="content-text" aria-busy={submitting}>
          <ComposerControls
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            accent={ACCENT}
            onAccent={ON_ACCENT}
            bg={FIELD}
            text={BODY_INK}
            // The shared hint in this sheet's own caption voice — an OVERRIDE of
            // the neutral default, not a new string.
            hint={
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-md)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--everymen-muted)',
                }}
              >
                {t('comments.mentionHint')}
              </span>
            }
          />
        </div>
      </Slip>
    )
  }

  const { comment, onEdited, onWithdrawn } = props
  const slug = comment.author.faction_slug
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const canFlag = canFlagComment(comment, user?.character?.id)
  // The foot only exists when it holds something: the author's edit/withdraw or
  // a flag affordance. Hidden while editing — the inline editor owns Save/Cancel.
  const showControls = !owner.editing && (owner.isOwner || canFlag)
  // On your OWN comment the foot holds nothing but the gated owner row, so the
  // rule above it fades with the row: a hairline over empty space is a state the
  // sheet never draws. Someone else's (flaggable) comment keeps its foot.
  const footGate = owner.isOwner && !canFlag ? ownerRevealStyle(reveal.revealed) : null

  return (
    <Slip
      avatar={<FactionAvatar character={authorToCharacter(comment.author)} size="sm" />}
      containerProps={reveal.containerProps}
      byline={
        <Link to={`/characters/${comment.author.id}`} style={BYLINE}>
          {comment.author.display_name}
        </Link>
      }
      dateline={
        <>
          {/* "Shift N" — the faction's timestamp dialect (ADR-0018), at FULL
              masthead ink. The band's 4.59:1 dark pairing has no headroom for
              the customary 0.7 opacity, so face and size do the separating. */}
          <span style={DATELINE}>{formatCommentTime(slug, comment.created_at)}</span>
          {comment.is_edited && (
            <span style={DATELINE}>
              <span aria-hidden="true">· </span>
              {t('comments.edited')}
            </span>
          )}
        </>
      }
    >
      {/* The filed copy: user-authored free text, so the content floor — in the
          resting state and in the editor alike (its textarea inherits this). */}
      <div
        className="content-text"
        style={{
          fontFamily: 'var(--font-body)',
          color: BODY_INK,
          lineHeight: 1.55,
          overflowWrap: 'anywhere',
        }}
      >
        {owner.editing ? (
          <CommentEditor
            owner={owner}
            accent={ACCENT}
            onAccent={ON_ACCENT}
            bg={FIELD}
            text={BODY_INK}
          />
        ) : (
          <MentionText
            body={comment.body_text}
            mentions={comment.mentions}
            // Red as ink, which is only legible on this panel — see the docblock.
            accent="var(--faction-everymen-sheet-accent)"
          />
        )}
      </div>
      {showControls && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 'var(--space-md)',
            marginTop: 'var(--space-md)',
            paddingTop: 'var(--space-sm)',
            // A rule INSIDE the panel is quieter than the form's own edge.
            borderTop: '1px solid var(--faction-everymen-sheet-hair)',
            ...footGate,
          }}
        >
          <OwnerControls owner={owner} reveal={reveal} />
          <CommentFlagControl comment={comment} />
        </div>
      )}
    </Slip>
  )
}
