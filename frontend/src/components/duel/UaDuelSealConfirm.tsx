/**
 * University of Asthmatics duel seal-confirm (#725) — the breath before the
 * stroke.
 *
 * ONE responsive component since #1313 retired the `mobileDuelSeal` twin.
 * `DuelSealSheet` serves this sheet as a centred card on a laptop and full-bleed
 * on a phone; the masthead, the opponent bar, the scrolling middle and the
 * pinned action band are flex regions that behave as the twin did on a phone and
 * as the card always did on a laptop. The twin's extra inner "practice sheet"
 * plate around the body went with it — one sheet, not a sheet on a sheet.
 *
 * UA is the last core faction to get a duel dialog, and it arrives in the
 * practice's own register rather than the mock's. `UaDuel.dc.html` /
 * `UaDuelDialog.dc.html` draw a GILT frame, and #788/#848–#853 removed gold from
 * UA entirely (it went to Warriors of Whimsy, ADR-0050) — the issue's own audit
 * comment says the mock "is no longer buildable as drawn". So the chrome is
 * taken from the sibling seal skins' structure plus UA's shipped kit: a quiet,
 * sun-bleached practice sheet served over the composer, one ensō at its head,
 * hairline rules, Cormorant display over EB Garamond text.
 *
 * The metaphor is the mark itself. An ensō is made in one breath and left open;
 * sealing your side of a duel is the moment the brush touches the paper. In
 * forfeit mode the circle dims — the breath let go — the title drops a tier, and
 * a vermilion rule runs down the body. Quiet, because UA is quiet; marked,
 * because the consequence is permanent.
 *
 * BOTH MODES, ONE FILE (#751). `useDuelSealCopy` owns every string that differs
 * (heading, body, the free-reopen note, the confirm label, the destructive
 * tone); this skin re-derives none of it. What the mode changes here is chrome
 * only.
 *
 * COPY IS FACTION-NEUTRAL (#718) — identity is visual. Every string comes
 * through `t()` from the shipped `duelSeal.*` / `duelStakes.*` / `duelForfeit.*`
 * keys, and this skin adds NO catalog keys and voices nothing. The one label it
 * draws itself, the stakes rubric, is the shipped neutral `duelStakes.heading`,
 * the same key `EphemeristsDuelSealConfirm` uses.
 *
 * Pure frame otherwise: `StakesTiles` computes the figures from the VIEWER's own
 * faction config (Snide's 0.0× lose falls out by construction), `RaceRoster`
 * reads `is_submitted`, and `SealActions` owns the global [Cancel] … [Submit]
 * order (#646). None is dropped in either mode.
 *
 * THE OPPONENT'S HUE IS HELD AS A RING, AN EDGE AND A BAR — NEVER AS INK AND
 * NEVER BEHIND TEXT (#310, #1115). It can be any colour in the palette, so this
 * is what lets a hostile hue sit inside UA's cream without a contrast fix, and
 * there is no text pair to measure. All three marks are DRAWN FILLS through
 * `factionFill`, so an unaffiliated opponent gets the spectrum in the cut its
 * geometry needs (conic ring / vertical rule / horizontal bar) instead of
 * degrading to grey (ADR-0039). The structural guard for this rule died with the
 * duel rail — nothing will catch a violation automatically.
 *
 * CONTRAST, measured with `utils/contrast.ts` on both themes. UA's paper and
 * accent are both warm and light, which makes it the faction most prone to
 * failing pairings (#1155). `--color-danger` reads 3.98:1 on `--faction-ua-card-bg`
 * in light — below AA for 18px body copy — so the forfeit body is NOT painted in
 * it. It takes `--faction-ua-card-notice` (5.85:1 light / 9.87:1 dark on the
 * sheet), one of the two inks minted for exactly this, and the red survives only
 * as a RULE beside the paragraph, where it carries no text. The reopen note
 * takes `--faction-ua-card-credit` (7.51:1 / 9.46:1) for the same reason.
 * Everything in the stakes well sits on `--faction-ua-panel`: card-text 11.32 /
 * 12.28, card-muted 5.13 / 5.10, `--color-success` 7.07 / 8.56, and the Snide
 * zero figure in `--color-danger` at 3.75 / 5.39 — 24px bold, so large text at a
 * 3:1 floor.
 *
 * Both themes come from the `[data-theme="dark"]` cascade; there is no ternary
 * on theme anywhere in this file.
 */
import { useTranslation } from 'react-i18next'
import { factionCssVar, factionFill } from '../../utils/factions'
import { factionRoleVars } from '../../utils/factionRoles'
import { UaSigil } from '../sigil/UaSigil'
import { UA_DISPLAY, UA_EYEBROW, UA_TEXT, uaShade } from '../factionMarks/uaAtoms'
import {
  duelSides,
  RaceRoster,
  SealActions,
  StakesTiles,
  useDuelSealCopy,
  type DuelSlotTheme,
} from './shared'
import type { DuelSealConfirmProps } from './DuelSealConfirm'
import DuelSealSheet from './DuelSealSheet'

const SHEET = 'var(--leaf-duel-seal-paper, var(--faction-ua-card-bg))'
const PANEL = 'var(--faction-ua-panel)'
const LIFT = 'var(--faction-ua-lift)'
const INK = 'var(--leaf-duel-seal-ink, var(--faction-ua-card-text))'
const MUTED = 'var(--leaf-duel-seal-quiet, var(--faction-ua-card-muted))'
const RULE = 'var(--faction-ua-rule)'
const HAIR = 'var(--faction-ua-hair)'
const NOTICE = 'var(--faction-ua-card-notice)'
const CREDIT = 'var(--faction-ua-card-credit)'

export default function UaDuelSealConfirm({
  duel,
  viewerCharacterId,
  taskPointValue,
  onConfirm,
  onCancel,
  busy,
  mode = 'submit',
}: DuelSealConfirmProps) {
  const { t } = useTranslation('praxis')
  const { me, foe } = duelSides(duel, viewerCharacterId)
  const copy = useDuelSealCopy(mode, duel, viewerCharacterId, taskPointValue)

  // Opponent tokens, the same rule as the Default dialog and every sibling skin:
  // the foreign duelist looks foreign even inside UA's own sheet (#310). This
  // scalar reaches the shared slots' tile rings; the three marks this file draws
  // itself go through `factionFill` instead, so `na` keeps its spectrum.
  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const theme: DuelSlotTheme = { accent, muted: MUTED, bodyFont: UA_TEXT }

  const relinquishing = copy.danger

  return (
    <DuelSealSheet
      label={copy.heading}
      ground={{
        /* The nine roles under this surface's prefix (#2659/#2673). `ground` is
           the sheet's outermost element, so the three constants above and the
           `theme` handed to the shared slots all resolve inside it. */
        ...factionRoleVars('ua', 'leaf-duel-seal'),
        position: 'relative',
        background: SHEET,
        color: INK,
        fontFamily: UA_TEXT,
      }}
      card={{
        overflow: 'hidden',
        border: `1px solid ${RULE}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: `0 22px 54px -26px ${uaShade(60)}`,
      }}
    >
      {/* ── OPPONENT EDGE ── the foreign hue down the sheet's spine, as a
          drawn fill so an unaffiliated opponent gets the vertical ramp. */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 4,
          ...factionFill(foe.faction_slug, 'rule'),
        }}
      />

      {/* ── Masthead: the mark, the beat, the foe ── */}
      <div
        style={{
          flexShrink: 0,
          padding: 'var(--space-lg) var(--space-xl)',
          background: LIFT,
          borderBottom: `1px solid ${HAIR}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            minWidth: 0,
          }}
        >
          {/* The circle dims when the brush is being set down rather than
              lifted. Ornament only — UaSigil is aria-hidden throughout. */}
          <span style={{ display: 'flex', opacity: relinquishing ? 0.35 : 1 }}>
            <UaSigil width={38} height={38} />
          </span>
          <h2
            style={{
              margin: 0,
              minWidth: 0,
              fontFamily: UA_DISPLAY,
              fontWeight: 600,
              // The costly dialog speaks a tier quieter than the routine one.
              // Both rungs are Content tier (§4a).
              fontSize: relinquishing ? 'var(--text-title)' : 'var(--text-heading)',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              color: INK,
            }}
          >
            {copy.heading}
          </h2>
        </div>

        {/* ── OPPONENT RING ── a drawn ring (outer fill, inner UA disc), so the
            monogram sits on UA's own stock and never on the foreign hue. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            marginTop: 'var(--space-lg)',
            minWidth: 0,
          }}
        >
          <span
            aria-hidden
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: '50%',
              ...factionFill(foe.faction_slug, 'dot'),
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: LIFT,
                color: INK,
                fontFamily: UA_DISPLAY,
                fontWeight: 600,
                fontSize: 'var(--text-content)',
                lineHeight: 1,
              }}
            >
              {foe.display_name.slice(0, 1)}
            </span>
          </span>
          <span
            className="content-text"
            style={{ fontFamily: UA_DISPLAY, fontWeight: 600, color: INK, minWidth: 0 }}
          >
            {foe.display_name}
          </span>
        </div>
      </div>

      {/* ── OPPONENT BAR ── the hue laid across the sheet under the masthead. */}
      <span
        aria-hidden
        style={{ flexShrink: 0, display: 'block', height: 3, ...factionFill(foe.faction_slug, 'bar') }}
      />

      {/* The sheet's middle. `flex: 1` + its own scroll pins the masthead and
          the footer band to the edges when the sheet IS the screen; on a
          laptop the card is auto-height and neither fires. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-xl)' }}>
        {/* The body line. In forfeit mode the ink is UA's notice ink on UA's
            sheet — `--color-danger` measures 3.98:1 on this cream and is body
            copy here — and the red survives as the rule beside it. */}
        <p
          className="content-text"
          style={{
            lineHeight: 1.6,
            color: relinquishing ? NOTICE : INK,
            ...(relinquishing
              ? {
                  fontWeight: 600,
                  paddingLeft: 'var(--space-md)',
                  borderLeft: '3px solid var(--color-danger)',
                }
              : {}),
          }}
        >
          {copy.body}
        </p>

        {/* The free-reopen half of the truth — the shared condition, not a UA
            one. A forfeit has no such note and `copy.note` is null there. */}
        {copy.note && (
          <p
            className="content-text"
            style={{ marginTop: 'var(--space-sm)', lineHeight: 1.6, color: CREDIT }}
          >
            {copy.note}
          </p>
        )}

        {/* ── The stakes well: an inset panel inside a hairline, the idiom
            `UaEditPraxis` already wears. ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            marginTop: 'var(--space-xl)',
          }}
        >
          <span style={{ ...UA_EYEBROW, whiteSpace: 'nowrap' }}>
            {t('duelStakes.heading')}
          </span>
          <span aria-hidden style={{ height: 1, flex: 1, background: HAIR }} />
        </div>

        <div
          style={{
            marginTop: 'var(--space-md)',
            padding: 'var(--space-md)',
            background: PANEL,
            color: INK,
            border: `1px solid ${RULE}`,
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <StakesTiles
            viewerFactionSlug={me.faction_slug}
            opponentFactionSlug={foe.faction_slug}
            opponentName={foe.display_name}
            taskPointValue={taskPointValue}
            status={duel.status}
            theme={theme}
          />
          <RaceRoster me={me} foe={foe} theme={theme} />
        </div>
      </div>

      {/* ── Footer band ── */}
      <div
        style={{
          flexShrink: 0,
          padding: 'var(--space-md) var(--space-xl)',
          background: LIFT,
          borderTop: `1px solid ${HAIR}`,
        }}
      >
        {/* ponytail: SealActions keeps its shared btn-outline / btn-primary
            pair rather than growing a UA seal-button slot. The global
            [Cancel] … [Submit] order (#646) and the shared `danger` tone are
            worth more than a sienna button, and adding a skin prop to the
            shared component would be foundation work, not a skin change. */}
        <SealActions
          onConfirm={onConfirm}
          onCancel={onCancel}
          busy={busy}
          confirmLabel={copy.confirmLabel}
          danger={copy.danger}
          theme={theme}
        />
      </div>
    </DuelSealSheet>
  )
}
