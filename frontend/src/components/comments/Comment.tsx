/**
 * THE SHARED COMMENT — one chassis, nine looks, and not a colour in this file.
 *
 * Epic #2649's rule, built (#2650): **chrome resolves from tokens; ornament is
 * drawn by an archetype; a surface that is only chrome has no archetype file at
 * all.** Everything below reads `--faction-<key>-comment-*` off the slug and
 * paints nothing of its own, so a faction whose comment is a sheet, an ink and a
 * rule needs a token set here and no component anywhere.
 *
 * THIS IS ALSO `na`'S OWN VOICE — the spectrum bubble — and that is not a
 * compromise. `default ≡ na ≡ Unaffiliated` is one identity (ADR-0039 / 0046 /
 * 0048), `resolveCssKey` sends every unregistered slug to `default`, and
 * `factions/default.ts` registers this component. So the fallback and the
 * unaffiliated kit are the same object, which is what makes a tenth faction a
 * token set: declare `--faction-<key>-comment-*`, register nothing, render
 * correctly.
 *
 * ── THE ONE THING HERE THAT IS NOT A TOKEN ──────────────────────────────────
 * `rainbow` on the body. Resolved @mentions are gradient-clipped spectrum ink
 * for the `default` family (#970, `.rainbow-ink`), and a gradient CLIP is not a
 * colour: `MentionText` takes an ink STRING, so no `--…-comment-mention` value
 * can carry it. The predicate is `isKnownFaction`, which is false for exactly
 * the slugs that resolve to `default` — na, Albescent, and anything unknown —
 * so this reproduces what `DefaultComment` did unconditionally when those were
 * the only slugs that reached it.
 *
 * ── WHAT IS NOT MINE ────────────────────────────────────────────────────────
 * The three invariant slots and the composer mechanics are `shared.tsx`'s
 * (ADR-0016); edit / withdraw / the hover-OR-focus gate are `OwnerControls`';
 * flagging is `FlagControl`'s. This file wires them and hands them a skin.
 *
 * Six states, one component (ADR-0056 / 0058 / 0063 — no mobile twin):
 *   row · default | row · mention + edited | row · yours (hover) |
 *   row · editing | composer · empty | composer · submitting
 */
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import FactionAvatar from '../avatar/FactionAvatar'
import { useAuth } from '../../auth/AuthContext'
import { factionCssVar, isKnownFaction } from '../../utils/factions'
import { formatCommentTime } from '../../utils/commentTime'
import { type CommentProps, authorToCharacter, ComposerControls, MentionText } from './shared'
import {
  CommentEditor,
  OwnerControls,
  useOwnerEdit,
  useOwnerReveal,
  ownerRevealStyle,
} from './OwnerControls'
import { CommentFlagControl, canFlagComment } from './FlagControl'

/**
 * THE CHROME VOCABULARY — every slot a comment has, named once.
 *
 * It is FIFTY, not the eight-to-twelve #2650 estimated, and the gap is the
 * finding rather than an accident: a slot is not "the byline" but each property
 * of it that any voice varies. Typography is most of the list, because the nine
 * voices differ on face, size, weight, style and tracking independently.
 *
 * `commentChrome.test.ts` walks this list against index.css, so a slot added
 * here without a declaration for every chassis-painted faction fails there
 * rather than rendering an unstyled sheet. A slot with no opinion takes
 * `inherit` (typography) or `0` / `none` / `transparent` (everything else) —
 * never a hardcoded neutral, which would override an inherited value instead of
 * standing aside from it.
 */
export const COMMENT_CHROME_SLOTS = [
  // the sheet
  'sheet',
  'edge',
  'radius',
  'shadow',
  'ink',
  'crown',
  'crown-h',
  'pad',
  'panel',
  // the author line
  'name-face',
  'name-size',
  'name-weight',
  'name-style',
  'name-track',
  'name-ink',
  // the caption voice — the timestamp, and the composer's hint
  'label-face',
  'label-size',
  'label-weight',
  'label-track',
  'label-case',
  'label-ink',
  'hint-ink',
  // the edited mark, where a voice speaks it in a different hand
  'edited-face',
  'edited-size',
  'edited-weight',
  'edited-track',
  'edited-case',
  // the body
  'body-face',
  'body-weight',
  'body-ink',
  'body-line',
  'body-edge',
  'body-inset',
  'mention',
  // the foot
  'foot-gap',
  'foot-pad',
  'rule-edge',
  'rule-h',
  'rule-img',
  'rule-alpha',
  // the composer
  'field',
  'accent',
  'on-accent',
  'composer-face',
  'composer-weight',
  'composer-ink',
  'composer-line',
  'composer-gap',
  'composer-wrap',
] as const

type CommentSlot = (typeof COMMENT_CHROME_SLOTS)[number]

/** Every slot as a `var()` reference for one slug. One reach, fifty names. */
function chrome(slug: string | null | undefined): Record<CommentSlot, string> {
  const out = {} as Record<CommentSlot, string>
  for (const slot of COMMENT_CHROME_SLOTS) out[slot] = factionCssVar(slug, `comment-${slot}`)
  return out
}

/** The caption voice, and the edited mark's variation on it. */
function caption(c: Record<CommentSlot, string>, edited = false): CSSProperties {
  return {
    fontFamily: edited ? c['edited-face'] : c['label-face'],
    fontSize: edited ? c['edited-size'] : c['label-size'],
    fontWeight: edited ? c['edited-weight'] : c['label-weight'],
    letterSpacing: edited ? c['edited-track'] : c['label-track'],
    textTransform: (edited ? c['edited-case'] : c['label-case']) as CSSProperties['textTransform'],
    color: c['label-ink'],
  }
}

/**
 * The sheet both modes sit on: avatar in the margin, the faction's own ground
 * under its own crown. One shape for a row and for the composer, so a thread
 * reads as one stack rather than a list plus a form.
 *
 * NO `overflow: hidden` here (#1255) — the composer this wraps owns the @mention
 * listbox, an absolutely positioned child, and a clipping ancestor cuts it off.
 * The crown rounds its own ends instead, which is all the clip was ever doing.
 */
function Sheet({
  c,
  avatar,
  children,
  containerProps,
}: {
  c: Record<CommentSlot, string>
  avatar: React.ReactNode
  children: React.ReactNode
  containerProps?: React.ComponentPropsWithoutRef<'div'>
}) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
      {avatar}
      <div
        {...containerProps}
        style={{
          flex: 1,
          minWidth: 0,
          background: c.sheet,
          border: c.edge,
          borderRadius: c.radius,
          boxShadow: c.shadow,
          color: c.ink,
        }}
      >
        {/* The crown — the stripe across the head of the sheet. It carries the
            sheet's top corners itself: an element's background is clipped by its
            OWN border-radius, so it stays inside the curve with nothing clipping
            it from above. A faction with no crown sets `crown-h: 0` and the
            element occupies nothing. */}
        <div
          aria-hidden="true"
          style={{
            height: c['crown-h'],
            borderRadius: `${c.radius} ${c.radius} 0 0`,
            background: c.crown,
          }}
        />
        <div style={{ padding: c.pad, background: c.panel }}>{children}</div>
      </div>
    </div>
  )
}

/**
 * The body block, in both modes. A voice that rules its prose off with a margin
 * line draws it as this block's own left edge rather than as a sibling — the
 * border box is the prose's height either way, and a border is a token where a
 * stretched flex child is a component.
 */
function Body({
  c,
  mode,
  children,
  busy,
}: {
  c: Record<CommentSlot, string>
  mode: 'row' | 'composer'
  children: React.ReactNode
  busy?: boolean
}) {
  const row = mode === 'row'
  return (
    // A comment IS content, resting and editing alike — the §4 role floor. The
    // class rides here because the ONE slot inside without a size of its own is
    // the composer's textarea (`font: inherit`).
    <div
      className="content-text"
      aria-busy={busy}
      style={{
        marginTop: row ? 'var(--space-sm)' : c['composer-gap'],
        fontFamily: row ? c['body-face'] : c['composer-face'],
        fontWeight: row ? c['body-weight'] : c['composer-weight'],
        color: row ? c['body-ink'] : c['composer-ink'],
        lineHeight: row ? c['body-line'] : c['composer-line'],
        overflowWrap: (row ? 'anywhere' : c['composer-wrap']) as CSSProperties['overflowWrap'],
        borderLeft: c['body-edge'],
        paddingLeft: c['body-inset'],
      }}
    >
      {children}
    </div>
  )
}

export default function Comment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const reveal = useOwnerReveal()

  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    const c = chrome(character.faction_slug)
    return (
      <Sheet c={c} avatar={<FactionAvatar character={character} size="sm" />}>
        <Body c={c} mode="composer" busy={submitting}>
          <ComposerControls
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            accent={c.accent}
            onAccent={c['on-accent']}
            // The field tier, not the sheet: an input reads as inset rather
            // than painted on.
            bg={c.field}
            text={c['body-ink']}
            // The shared string in this sheet's own caption voice — an OVERRIDE
            // of ComposerControls' neutral default, not a new hint.
            hint={<span style={{ ...caption(c), color: c['hint-ink'] }}>{t('comments.mentionHint')}</span>}
          />
        </Body>
      </Sheet>
    )
  }

  const { comment, onEdited, onWithdrawn } = props
  const slug = comment.author.faction_slug
  const c = chrome(slug)
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const canFlag = canFlagComment(comment, user?.character?.id)
  // A quiet control row lives at the sheet's foot — but only when there is
  // something to show: the author's edit/withdraw or a flag affordance. Hidden
  // while editing, since the inline editor owns Save/Cancel then.
  const showControls = !owner.editing && (owner.isOwner || canFlag)
  // On your OWN comment the foot holds nothing but the gated owner row, so the
  // rule above it fades with the row — a hairline over empty space is a state
  // the sheet never draws. A flaggable (someone else's) comment keeps its foot.
  const footGate = owner.isOwner && !canFlag ? ownerRevealStyle(reveal.revealed) : null

  return (
    <Sheet
      c={c}
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
            fontFamily: c['name-face'],
            fontSize: c['name-size'],
            fontWeight: c['name-weight'],
            fontStyle: c['name-style'] as CSSProperties['fontStyle'],
            letterSpacing: c['name-track'],
            color: c['name-ink'],
            textDecoration: 'none',
          }}
        >
          {comment.author.display_name}
        </Link>
        <span style={caption(c)}>{formatCommentTime(slug, comment.created_at)}</span>
        {comment.is_edited && (
          <span style={caption(c, true)}>
            <span aria-hidden="true">· </span>
            {t('comments.edited')}
          </span>
        )}
      </div>
      <Body c={c} mode="row">
        {owner.editing ? (
          <CommentEditor
            owner={owner}
            accent={c.accent}
            onAccent={c['on-accent']}
            bg={c.field}
            text={c['body-ink']}
          />
        ) : (
          <MentionText
            body={comment.body_text}
            mentions={comment.mentions}
            accent={c.mention}
            // See the docblock: the spectrum @mention is a gradient CLIP rather
            // than an ink, and `isKnownFaction` is false for exactly the slugs
            // that resolve to the `default` family.
            rainbow={!isKnownFaction(slug)}
          />
        )}
      </Body>
      {showControls && (
        <div style={{ marginTop: c['foot-gap'], ...footGate }}>
          {/* The rule that divides the foot from the body. A hairline for most
              — quieter INSIDE the sheet than the sheet's own edge — and a
              repeating mark for a voice whose divider is drawn rather than
              ruled. Both are the same element: a border, or a height and an
              image, and the other half sits at zero. */}
          <span
            aria-hidden="true"
            style={{
              display: 'block',
              width: '100%',
              height: c['rule-h'],
              borderTop: c['rule-edge'],
              backgroundImage: c['rule-img'],
              backgroundRepeat: 'repeat-x',
              backgroundPosition: 'left center',
              opacity: c['rule-alpha'],
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 'var(--space-md)',
              marginTop: c['foot-pad'],
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
