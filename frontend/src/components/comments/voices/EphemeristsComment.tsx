/**
 * THE EPHEMERISTS' COMMENT VOICE — a note filed on the Valley plate (#1199,
 * epic #1192; design `Ephemerists Comment + Update Cards.dc.html`, whose comment
 * half this is).
 *
 * `DefaultComment` (the Unaffiliated sheet, #1195) is the copy and behaviour
 * spec; read it there. This file owns the dress and nothing else. All seven
 * behaviours are the shared helpers' — edit, withdraw, flag, @mentions, the live
 * character count, the submitting state, and the hover/focus gate on the owner
 * row (`useOwnerReveal`, F3). None of them is re-implemented here.
 *
 * Seven states, ONE component (ADR-0056 / 0058 / 0063 — no mobile twin):
 *   row · default | row · mention | row · edited | row · yours (hover) |
 *   row · editing | composer · empty | composer · submitting
 *
 * ## What changed in the dress
 *
 * The voice moves from the ILLUMINATED CODEX (`--faction-ephemerists-card-*`,
 * foxed vellum, Cinzel-only) to the v2 VALLEY PLATE the sheet is drawn on and
 * every other v2 Ephemerists surface already wears — papyrus stock, a fluted
 * brass rule at the head, incised small caps for every label, Spectral for the
 * note itself, and an ochre margin rule beside the body, marginalia's own mark.
 * The plate is a full metaphor swap (ADR-0055): the two grounds must not mix, so
 * no `--eph-*` atom survives here.
 *
 * **The rubric drop cap is gone, and it was a bug as well as a metaphor.** It was
 * built by slicing the first character off the body and setting it large — so a
 * note that OPENED with a mention (`@molly …`) had its `@` lifted into the drop
 * cap and the remainder handed to `MentionText`, which then found no handle to
 * link. The plate's own answer to "this is a note in the margin" is the ochre
 * rule, which needs no surgery on the text.
 *
 * The last raw hex in this file (`RUBRIC = '#9a3b2e'`) goes with it: the ochre is
 * `--faction-ephemerists-plate-ochre`, which flips in the dark cascade as a
 * literal never did.
 *
 * ## Copy
 *
 * No string from the design sheet appears here. The two faction flavour keys are
 * pre-existing `praxis.json` → `comments.ephemerists.*` entries (the composer
 * prompt and the edited mark); every other word comes from the shared neutral
 * `comments.*` block. Nothing in this file adds or edits a catalog key.
 *
 * Every colour is a `--faction-ephemerists-plate-*` token; light/dark flips
 * through the `[data-theme="dark"]` cascade, never a ternary. `-brass` is a rule
 * colour and never an ink; labels take `-caption` and quiet type `-quiet`, both
 * measured on this ground.
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

/**
 * The plate's affirmative button pair. Declared here rather than beside its
 * siblings in `ephemeristsPlate` only because this issue's footprint is the
 * chassis, the voice and the faction's own token block; a follow-up whose whole
 * diff is a move can hoist both.
 *
 * NOT `-brass`, which is a rule colour the module forbids putting text on, and
 * NOT `-band`, which the dark cascade drives to near-black while the CTA lifts to
 * brass. The pair is measured as a pair.
 */
const CTA_BG = 'var(--faction-ephemerists-plate-cta-bg)'
const CTA_INK = 'var(--faction-ephemerists-plate-cta-ink)'

/** Incised small caps at label tier — every mark on the sheet that is not prose. */
const LABEL = {
  ...SMALL_CAPS,
  fontSize: 'var(--text-md)',
  color: CAPTION,
} as const

/**
 * The leaf both modes sit on: avatar in the margin, a papyrus plate headed by a
 * fluted brass rule. One shape for a row and for the composer, so a thread reads
 * as one stack of filed notes rather than a list plus a form.
 */
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
    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
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
        {/* A rune band headed this leaf — the cavetto flute's replacement
            (#1638), and the OLD glyph vocabulary. #2210 retires that vocabulary
            kit-wide in favour of the masthead's notation band, and this leaf has
            no masthead, so the head of the sheet takes nothing in its place: the
            leaf's own 1px border already rules it off, and a hairline struck
            directly under that border would read as a doubled edge. */}
        {/* The gold wash rides the leaf's own background: the dark plate takes no
            wash at all (`--plate-wash: none`), so there is nothing for a ternary
            or a positioned overlay to decide. NO `overflow: hidden` anywhere on
            this leaf — the composer's @mention listbox is an absolutely
            positioned child, and a clipping ancestor would cut it off. */}
        <div style={{ padding: 'var(--space-md) var(--space-lg)', background: WASH }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * The note itself, struck beside an ochre margin rule. Drawn as a flex sibling
 * rather than a border so it stretches to the note's own height, and so the same
 * block carries the inline editor while editing.
 */
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
      {/* A comment IS content — the §4 role floor, in the resting state and in the
          editing one (the editor's textarea inherits this). */}
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
          {/* The label line above the leaf said "inscribe a note in the margin"
              (`comments.ephemerists.prompt`). #1911 collapsed the four bespoke
              prompts onto `comments.composerPlaceholder`, which the textarea
              below already shows, so the label would have restated it. */}
          <Marginalia>
            <ComposerControls
              value={value}
              onChange={onChange}
              onSubmit={onSubmit}
              submitting={submitting}
              accent={CTA_BG}
              onAccent={CTA_INK}
              // The panel cell, not the plate: a field reads as inset into the
              // sheet rather than painted on it.
              bg={INNER}
              text={INK}
              // The shared string in this sheet's incised label voice — an
              // OVERRIDE of ComposerControls' neutral default, not a new hint.
              hint={<span style={LABEL}>{t('comments.mentionHint')}</span>}
            />
          </Marginalia>
        </div>
      </Leaf>
    )
  }

  const { comment, onEdited, onWithdrawn } = props
  const slug = comment.author.faction_slug
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const canFlag = canFlagComment(comment, user?.character?.id)
  // The foot holds the author's edit/withdraw row and the flag affordance, and is
  // drawn only when one of them has something to show — hidden while editing,
  // since the inline editor owns Save/Cancel then.
  const showControls = !owner.editing && (owner.isOwner || canFlag)
  // The foot RULE is never gated (#2733): on your own comment it always draws,
  // and only the edit/delete cluster fades. `<OwnerControls reveal>` gates
  // itself — and it alone knows to stay pinned through the withdraw-confirm
  // strip, which an outer gate used to fade out from under mid-answer.

  return (
    <Leaf
      avatar={<FactionAvatar character={authorToCharacter(comment.author)} size="sm" />}
      containerProps={reveal.containerProps}
    >
      {/* The byline: the hand that wrote the note, then when. */}
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
          {formatCommentTime(slug, comment.created_at)}
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
          // Resolved @mentions in the plate's Nile ink — the token whose whole job
          // is links and affirmations on this ground.
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
            // A hairline INSIDE the leaf is quieter than the leaf's own edge.
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
