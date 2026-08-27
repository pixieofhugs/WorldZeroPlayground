import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FactionAvatar from '../../avatar/FactionAvatar'
import { useAuth } from '../../../auth/AuthContext'
import { factionRoleVars } from '../../../utils/factionRoles'
import { formatCommentTime } from '../../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from '../shared'
import {
  CommentEditor,
  OwnerControls,
  useOwnerEdit,
  useOwnerReveal,
} from '../OwnerControls'
import { CommentFlagControl, canFlagComment } from '../FlagControl'

/**
 * Warriors of Whimsy — COUNSEL IN THE PROCLAMATION (comment voice v2, #1204).
 *
 * A knight speaks on the same instrument the Court proclaims on: the comment
 * card is the update card's chrome exactly (`WowFeedFrame`, this issue's other
 * half) — a 6px gold/plum barber ribbon crowning a cream sheet in a 2px gold
 * frame at radius 9, the crest set in the margin, the name lettered in
 * MedievalSharp, the quiet register in Lora italic, and the ribbon repeating as
 * a 3px section rule where the sheet divides. One sheet draws both halves and
 * they now match; v1's plum-ruled slip at radius 12 predated it.
 *
 * The three invariant slots are unchanged (ADR-0016): author identity · body ·
 * timestamp+edited. A posted row takes the AUTHOR's faction; the composer takes
 * the current character's, which is why both ends carry the crest avatar rather
 * than the bare sigil — `WowAvatar` (#897) is already the crest in a gilt ring.
 *
 * SEVEN STATES, ONE COMPONENT (ADR-0056 / 0058 / 0063 — no mobile twin):
 *   row · default | row · with a mention | row · edited | row · yours (hover) |
 *   row · editing | composer · empty | composer · submitting
 *
 * BEHAVIOUR IS INHERITED, NOT REBUILT. Edit, withdraw, flag, @mention
 * autocomplete, the live character count and the submitting state all live in
 * the shared helpers, and #1195 put the owner's edit/withdraw row behind a
 * hover-OR-focus gate: this voice opts into that gate with the two lines it was
 * designed for (`useOwnerReveal` + spreading `containerProps` on the card root)
 * and re-implements none of it. The foot, its rule and the gate's exact
 * conditions follow `DefaultComment`, which is the copy and behaviour spec for
 * every voice (epic #1192) — including the detail that on your OWN comment the
 * rule fades with the row, since a hairline over empty space is a state the
 * sheet never draws.
 *
 * NO STRING FROM THE SHEET SHIPS. Its dialect is discarded (epic #1192); the
 * words here are the ones already in `praxis.json`. `comments.wow.*` (#898) is
 * pre-existing per-voice copy from WOW's own kit, not lifted off this design —
 * the epic's neutral-copy rule governs the FEED catalog, and whether the nine
 * comment voices should also be neutralised is a call for the owner, not for a
 * dress issue holding a shared locale file eight agents are queued on.
 *
 * THE HUZZAH IS STILL NOT BUILT, AND ITS WORD IS GONE. The kit draws a "✦ Huzzah
 * · 12" reaction pill and #898 shipped the word (`comments.wow.react`), but
 * there is no reaction anywhere in the product — no endpoint, no column, no
 * count on `CommentOut` — so the pill would be a control that no-ops, which UX
 * principle 5 forbids. The key waited for a feature that never came, so #1909
 * deleted it as dead copy: no button is removed here, because none was ever
 * built. "Reply" is absent for the same reason: comments are flat (ADR-0006).
 *
 * Every colour is a shipped `--faction-wow-*` token and both themes come from
 * the `[data-theme="dark"]` cascade. The one AA trap on this palette is avoided
 * rather than re-measured: `--faction-wow-card-muted` is a CREAM-only ink
 * (4.77:1 on `-card-bg`, 4.25:1 on `-chronicle-panel`, #1221), so every muted
 * mark here sits on the cream sheet, and only the composer's inset FIELD — whose
 * ink is `-card-text` at 13:1 — uses the parchment plate.
 */

const MED = 'var(--wow-comment-face)' /* MedievalSharp */
const LORA = 'var(--faction-wow-body-font)' /* Lora */
const GOLD = 'var(--faction-wow-chronicle-gold)'
/* `--faction-wow-stamp-total` inked the composer's ✦ prompt line; #1911 took
   the line, and the token has no other slot on this card. */
const INK = 'var(--wow-comment-ink)'
const MUTED = 'var(--wow-comment-quiet)'
const PLUM = 'var(--wow-comment-accent)'
const RIBBON = 'var(--faction-wow-quest-ribbon)'

/**
 * The kit sets the crest beside the counsel at 44px, wider than the shared
 * `sm` (24px) — a seal that small stops reading as a seal. Below #897's 56px
 * motto floor, so the band drops its lettering and keeps its ring, which is
 * exactly what the kit draws here. Ornament geometry, so a raw number (§4a).
 */
const CREST_AVATAR = 44

/** The barber ribbon's two weights — the crown and the section rule (§4a). */
const CROWN_HEIGHT = 6
const RULE_HEIGHT = 3
const RULE_OPACITY = 0.75

/** The quiet register: Lora italic, the face WOW says everything small in. */
const QUIET: CSSProperties = {
  fontFamily: LORA,
  fontStyle: 'italic',
  fontSize: 'var(--text-lg)',
  color: MUTED,
}

/** The sheet's corner. Named because the crown rounds to the same arc. */
const SHEET_RADIUS = 9

/**
 * The sheet both modes sit on — the proclamation card, crest in the margin.
 * One shape for a row and for the composer, so a thread reads as one stack
 * rather than a list plus a form.
 */
function Sheet({
  avatar,
  children,
  containerProps,
}: {
  avatar: ReactNode
  children: ReactNode
  containerProps?: React.ComponentPropsWithoutRef<'div'>
}) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
      {avatar}
      <div
        {...containerProps}
        style={{
          // THE ROLE MAP (#2674). Declared on the SHEET, not on the flex row
          // above it: the crest beside the sheet is a sibling, and a prefix
          // belongs to the surface that reads it. Every read carries today's
          // token as its fallback, so the shared `ComposerControls` this hands
          // strings to is unaware anything moved.
          ...factionRoleVars('wow', 'wow-comment'),
          flex: 1,
          minWidth: 0,
          borderRadius: SHEET_RADIUS,
          // NO `overflow: hidden` here (#1255) — the composer this wraps owns
          // the @mention listbox, an absolutely positioned child, and a
          // clipping ancestor cuts it off. The crown below rounds its own ends
          // instead, which is all the clip was ever doing.
          background: 'var(--wow-comment-paper)',
          color: INK,
          border: `2px solid ${GOLD}`,
          boxShadow: 'var(--faction-wow-quest-shadow)',
          fontFamily: LORA,
        }}
      >
        {/* The crown — a stripe carrying NO text, which is the only reason the
            undimmed gold/plum ships as drawn (§3, #840). It carries the sheet's
            top corners itself: an element's background is clipped by its OWN
            border-radius, so the crown stays inside the curve with nothing
            clipping it from above. */}
        <div
          aria-hidden
          style={{
            height: CROWN_HEIGHT,
            borderRadius: `${SHEET_RADIUS}px ${SHEET_RADIUS}px 0 0`,
            background: RIBBON,
          }}
        />
        <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>{children}</div>
      </div>
    </div>
  )
}

/** The ribbon again, thinner and held back: the sheet's section divider. */
function RibbonRule({ style }: { style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={{ height: RULE_HEIGHT, background: RIBBON, opacity: RULE_OPACITY, ...style }}
    />
  )
}

export default function WowComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const reveal = useOwnerReveal()

  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <Sheet avatar={<FactionAvatar character={character} size={CREST_AVATAR} />}>
        {/* `.content-text` rides the wrapper: the one slot inside without a size
            of its own is the textarea (`font: inherit`), and a comment draft is
            content-tier text (§4). Every other slot names its own size. */}
        <div className="content-text" aria-busy={submitting}>
          {/* The gilt ✦ prompt line above the rule said "Add thy counsel to the
              chronicle…" (`comments.wow.prompt`). #1911 collapsed the four
              bespoke prompts onto `comments.composerPlaceholder`, which the
              shared ComposerControls textarea below already shows — so keeping
              the line would have printed the same sentence twice on one
              composer. It goes, and this composer reads like the four voices
              that never had a prompt line. */}
          <RibbonRule style={{ marginBottom: 'var(--space-md)' }} />
          <ComposerControls
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            accent={PLUM}
            onAccent="var(--faction-wow-on-accent)"
            // The field tier, not the sheet: an inset plate reads as written ON
            // rather than painted over. Its ink is `-card-text` at 13:1 — the
            // one WOW ink measured against the parchment plate.
            bg="var(--faction-wow-chronicle-panel)"
            text={INK}
            // The submit label was `comments.wow.post` ("Proclaim"). #1909
            // deleted it: the generic `praxis:comments.post` ("Post comment")
            // already covers the slot, and `ComposerControls` reads it as its
            // own default — so dropping the override IS the repoint.
            // The shared string in the decree's own quiet register — an OVERRIDE
            // of ComposerControls' neutral default, not a new hint.
            hint={<span style={QUIET}>{t('comments.mentionHint')}</span>}
          />
        </div>
      </Sheet>
    )
  }

  const { comment, onEdited, onWithdrawn } = props
  const slug = comment.author.faction_slug
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const canFlag = canFlagComment(comment, user?.character?.id)
  // The foot exists only when it holds something: the author's edit/withdraw or
  // a flag affordance. Hidden while editing — the inline editor owns Save/Cancel.
  const showControls = !owner.editing && (owner.isOwner || canFlag)
  // The foot RULE is never gated (#2733): on your own comment it always draws,
  // and only the edit/delete cluster fades. `<OwnerControls reveal>` gates
  // itself — and it alone knows to stay pinned through the withdraw-confirm
  // strip, which an outer gate used to fade out from under mid-answer.

  return (
    <Sheet
      avatar={<FactionAvatar character={authorToCharacter(comment.author)} size={CREST_AVATAR} />}
      containerProps={reveal.containerProps}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
        }}
      >
        <Link
          to={`/characters/${comment.author.id}`}
          style={{
            fontFamily: MED,
            fontSize: 'var(--text-content)',
            color: INK,
            textDecoration: 'none',
          }}
        >
          {comment.author.display_name}
        </Link>
        <span style={QUIET}>{formatCommentTime(slug, comment.created_at)}</span>
        {comment.is_edited && (
          <span style={QUIET}>
            <span aria-hidden="true">· </span>
            {t('comments.edited')}
          </span>
        )}
      </div>

      {/* The body is user-authored free text — the content floor, resting and
          editing alike (the editor's textarea inherits it). */}
      <div
        className="content-text"
        style={{
          marginTop: 'var(--space-sm)',
          fontFamily: LORA,
          color: INK,
          lineHeight: 1.55,
          overflowWrap: 'anywhere',
        }}
      >
        {owner.editing ? (
          <CommentEditor
            owner={owner}
            accent={PLUM}
            onAccent="var(--faction-wow-on-accent)"
            bg="var(--faction-wow-chronicle-panel)"
            text={INK}
          />
        ) : (
          <MentionText body={comment.body_text} mentions={comment.mentions} accent={PLUM} />
        )}
      </div>

      {showControls && (
        <div>
          <RibbonRule style={{ marginTop: 'var(--space-md)' }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 'var(--space-md)',
              marginTop: 'var(--space-sm)',
            }}
          >
            <OwnerControls owner={owner} reveal={reveal} />
            <CommentFlagControl comment={comment} />
          </div>
        </div>
      )}
    </Sheet>
  )
}
