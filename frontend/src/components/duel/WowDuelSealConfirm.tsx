/**
 * Warriors of Whimsy duel seal-confirm (#895) — THE LISTS SEAL.
 *
 * ONE responsive component. `DuelSealSheet` frames the enclosure in gold on a
 * plum scrim at laptop width and lets it take the whole screen on a phone —
 * there is nothing for it to float above at 375px, and that is the chassis rule
 * for all eight sheets. The kit's 46px seal buttons survive the collapse through
 * `phoneClassName`; there is no pinned action bar, because the actions sit
 * inside the enclosure on the kit's laptop sheet.
 *
 * The kit's `16-duel-seal.html`: a gold-framed enclosure on a plum scrim, the
 * checkered barrier along its top edge, the crest set beside the title, the
 * roster on a parchment plate, the stakes struck below it, and the ribbon line
 * that makes the loss floor read as generosity rather than punishment.
 *
 * Pure frame. `StakesTiles` computes the win/lose figures from the VIEWER's own
 * faction config, `RaceRoster` reads `is_submitted`, and `useDuelSealCopy` owns
 * the pending/active/forfeit body branch. Nothing here recomputes or drops one.
 *
 * TWO FACES, NOT THREE. The kit draws a three-way beat picker — submit / accept
 * / decline. `DuelSealMode` is `'submit' | 'forfeit'`; `accept` and `decline` do
 * not exist as beats in this codebase and are not built. The FORFEIT face is not
 * drawn by the kit at all, so it is derived: the chrome is the submit face
 * unchanged, and only the words move, taking the withdrawal voice the kit's own
 * rail establishes ("Thou hast withdrawn from the lists…"). `copy.danger` is
 * true there, so the shared confirm button repaints destructive — a forfeit is
 * red in every voice (#751) — and the ribbon line is suppressed, because a
 * rider who quits the field has not earned the ribbon the line promises.
 *
 * WHAT THE KIT DRAWS THAT THIS CONTRACT CANNOT (deliberate, not missed):
 *  - The two roster cards with the ⚔ clash medallion floated between them.
 *    `RaceRoster` arrives as ONE node, and a skin that reached inside it to
 *    re-render each rider would be recomputing a slot. The medallion is kept as
 *    a mark on the roster plate's heading instead.
 *  - The gold "prevail" tile and the plum "fall" tile. `StakesTiles` owns its
 *    own tile chrome and its theme contract is `{accent, muted, bodyFont}` —
 *    no per-tile ground. The pair is mounted on the champion-gold-framed plate
 *    so the block still reads as struck metal.
 *  - The kit's hardcoded ×1.5 / ×0.5 captions. Those are per-faction and the
 *    slot owns them: a S.N.I.D.E. viewer on a WOW task keeps 0.0×, and this
 *    composer skin is chosen by the TASK's faction, not the viewer's. Same
 *    deletion `CovenDuelSealConfirm` made of the design's "+90 / +30".
 *
 * CONTRAST (#1168), measured with `utils/contrast.ts` in both themes. One
 * pairing failed: `--color-danger` reads **4.40:1** on the cream lists ground in
 * light, under the 4.5:1 an 18px forfeit body owes, so the body takes `NOTICE`
 * (6.45 / 10.30) and the red becomes the rule beside it. Everything else clears
 * as shipped and is untouched: the reopen note in `--color-success` at 8.29 /
 * 9.87 on the ground, and on the parchment plate the win figure and the roster's
 * "sealed" mark at 7.39 / 9.03 plus the Snide zero figure in `--color-danger` at
 * 3.92 / 5.69 (24px bold, a 3:1 floor). All are rows in
 * `utils/__tests__/factionContrast.test.ts`.
 *
 * A SECOND pairing failed once the panel itself was measured (#1173): the kit's
 * own metadata olive is chosen against the CREAM, and on the parchment plate
 * inset into it `--faction-wow-card-muted` is 4.24:1 — under the floor for the
 * tie line, the solo-fallback sentence and the roster's "walking" mark, all of
 * which the shared slots set in `theme.muted`. The slots take `PANEL_QUIET`
 * (4.86 / 5.94); the olive keeps every job it has on the lists ground, including
 * this skin's own kicker at 4.76:1.
 */
import { factionCssVar } from '../../utils/factions'
import { WowSigil } from '../sigil/WowSigil'
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
import {
  BODY_FONT,
  CHAMPION,
  DISPLAY_FONT,
  HOLD,
  INK,
  LISTS_BG,
  ListsBand,
  ListsSpark,
  listsEyebrow,
  NOTICE,
  PANEL,
  PANEL_BORDER,
  PANEL_QUIET,
  Rosette,
  SCRIM,
  SHADOW,
} from './wowLists'

export default function WowDuelSealConfirm({
  duel,
  viewerCharacterId,
  taskPointValue,
  onConfirm,
  onCancel,
  busy,
  mode = 'submit',
}: DuelSealConfirmProps) {
  const { me, foe } = duelSides(duel, viewerCharacterId)
  const copy = useDuelSealCopy(mode, duel, viewerCharacterId, taskPointValue)
  // `useWowSealVoice` supplied nine strings on top of `copy` — the kicker, the
  // two section headings, the ribbon line and the two button labels per mode.
  // #1909 CUT all nine; see the note where the hook used to live in
  // `wowLists.tsx`. This skin now renders `copy` alone, like the other eight.

  // The opponent's tokens (#310) — spent on the rosette ring only. See the note
  // in `wowLists.tsx`: a foreign hue is never a ground and never an ink here.
  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const soft = factionCssVar(foe.faction_slug, 'light')

  // The stakes tiles take the champion gold as their rule colour, which is what
  // makes the pair read as struck metal rather than as a form.
  //
  // `muted` is PANEL_QUIET, not MUTED: this theme reaches only `StakesTiles`,
  // `RaceRoster` and `SealActions`, and both slots that paint muted text are
  // mounted on the parchment plate below, where the metadata olive is 4.24:1
  // (#1173). The kicker above stays MUTED — it is on the lists ground.
  const theme: DuelSlotTheme = { accent: CHAMPION, muted: PANEL_QUIET, bodyFont: BODY_FONT }

  return (
    <DuelSealSheet
      label={copy.heading}
      scrim={SCRIM}
      ground={{ background: LISTS_BG, color: INK, fontFamily: BODY_FONT }}
      card={{
        borderRadius: 15,
        overflow: 'hidden',
        border: `2px solid ${HOLD}`,
        boxShadow: `0 26px 54px -22px ${SHADOW}`,
      }}
      // The kit's 46px seal buttons, phone only — see `DuelSealSheet`.
      phoneClassName="wow-seal-actions--mobile"
    >
      <ListsBand />

      <div style={{ flex: 1, padding: 'var(--space-lg)' }}>
        {/* ── crest + title ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-md)',
          }}
        >
          <WowSigil size={46} />
          <div style={{ minWidth: 0 }}>
            {/* The kicker above the heading was WOW's ("Enter the lists ·
                submitting proof" / "Leave the lists · yielding the joust");
                #1909 cut both. The HEADING below is the shared, neutral one
                (#718 — and `duelSkinSlots.test.tsx` enforces it), unchanged. */}
            <h2
              className="content-title"
              style={{ fontFamily: DISPLAY_FONT, color: INK, lineHeight: 1.15 }}
            >
              {copy.heading} <ListsSpark />
            </h2>
          </div>
        </div>

        {/* ── the shared, figure-bearing copy ── the forfeit face takes the
            sheet-measured NOTICE ink rather than the global red (#1168); the
            red is the rule beside it, where it carries no text. */}
        <p
          className="content-text"
          style={{
            fontFamily: BODY_FONT,
            lineHeight: 1.55,
            ...(copy.danger
              ? {
                  color: NOTICE,
                  fontWeight: 700,
                  paddingLeft: 'var(--space-md)',
                  borderLeft: `3px solid var(--color-danger)`,
                }
              : {}),
          }}
        >
          {copy.body}
        </p>

        {copy.note && (
          <p
            className="content-text"
            style={{
              marginTop: 'var(--space-sm)',
              fontFamily: BODY_FONT,
              color: 'var(--color-success)',
            }}
          >
            {copy.note}
          </p>
        )}

        {/* ── the roster, on a parchment plate ── */}
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <span
            style={{
              ...listsEyebrow,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-sm)',
            }}
          >
            {/* "The Roster" (`duelSeal.wow.rosterLabel`) stood here; #1909 cut
                it. The rosette stays — it is drawn, not written. */}
            <Rosette accent={accent} soft={soft} size={18} />
          </span>
          <div
            style={{
              background: PANEL,
              border: `1.5px solid ${PANEL_BORDER}`,
              borderRadius: 11,
              padding: 'var(--space-md) var(--space-lg)',
            }}
          >
            <RaceRoster me={me} foe={foe} theme={theme} />
          </div>
        </div>

        {/* ── the stakes, struck in gold. Its "The Stakes" eyebrow
            (`duelSeal.wow.stakesLabel`) was cut by #1909. ── */}
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <div
            style={{
              background: PANEL,
              border: `1.5px solid ${HOLD}`,
              borderRadius: 11,
              padding: 'var(--space-md) var(--space-lg)',
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
          </div>

          {/* The ribbon promise ("A ribbon for the courage to enter — in our
              lists both riders are honoured.", `duelSeal.wow.ribbonLine`) sat
              here, suppressed on the forfeit face where it would be a lie.
              #1909 cut the string, and the plum band existed only to carry it —
              a coloured plate holding nothing is not a survivor. */}
        </div>

        <div style={{ marginTop: 'var(--space-lg)' }}>
          <SealActions
            onConfirm={onConfirm}
            onCancel={onCancel}
            busy={busy}
            /* WOW's own verbs ("Take the Field" / "Yield the Field",
               "Withdraw" / "Hold thy Ground") were cut by #1909. `copy` already
               carries the right confirm label in both modes, and `SealActions`
               falls back to `duelSeal.cancel` for the other. */
            confirmLabel={copy.confirmLabel}
            danger={copy.danger}
            theme={theme}
          />
        </div>
      </div>
    </DuelSealSheet>
  )
}
