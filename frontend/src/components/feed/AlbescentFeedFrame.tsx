import { DefaultFeedFrame } from './FactionFeedFrame'
import type { FeedFrameProps } from './feedFrameProps'

/**
 * Albescent — the feed card's tell (#1203, epic #1192, ADR-0048). The FIFTH
 * Albescent surface to unfreeze, after the praxis card (#821), the task card
 * (#1023), the task detail (#1038) and the praxis detail (#1140), and built to
 * the same rule as all four: **this is not a ninth chassis.**
 *
 * It renders the exact {@link DefaultFeedFrame} an unaffiliated player sees and
 * washes light over it. Strip the two ornament spans and the card is `Default`
 * byte for byte — the property a hand-copied skin could never keep, and the
 * reason a change to the chassis seam or to the Unaffiliated card reaches
 * Albescent with no edit here.
 *
 * ### Why a wrapper and not a skin
 *
 * `albescent ≡ na + drift` (ADR-0048). Albescent is a secret society hiding in
 * plain sight (ADR-0027), so it has no `--faction-albescent-*` token block and
 * `isKnownFaction('albescent')` is false on purpose (WORLD_ZERO_STYLE §3). A
 * bespoke chassis — its own band, its own ground, its own chrome — would be a
 * ninth identity, and identity is the one thing this faction may not have. The
 * epic settled it as decision 13 before a line was written.
 *
 * The four slots therefore arrive drawn. `kicker`, `time`, `tag` and `archive`
 * are forwarded whole to the chassis that already places them, so none of the
 * three ways a dress issue loses a feature (swallowing the kind label, dropping
 * the only timestamp, rebuilding the archive control) is even reachable from
 * here. That includes `awaiting_submission`, whose `archive` is `null`: the na
 * chassis renders nothing for it, and this file has no branch that could
 * accidentally draw a disabled stand-in.
 *
 * ### The slug it hands down
 *
 * `'albescent'`, not `null` — and the two are identical by construction.
 * `CSS_KEY` maps this slug to `default` (#783), so `factionCssVar('albescent',
 * 'card-bg')` and its accent resolve to the same `--faction-default-*` pair an
 * unaffiliated card paints with, and a test compares the two slugs rather than
 * pinning a literal so they can never drift apart. Passing the real slug says
 * what is happening; passing `null` would say the card has no faction, which is
 * `era_announcement`'s claim (epic decision 6), not this one's.
 *
 * ### Where the light sits
 *
 * On top, blended, clipped to the card. The chassis paints an OPAQUE sheet, so
 * an ornament behind it is invisible and `z-index: -1` is not a position
 * available here (§5). Both layers are `pointer-events: none` and sit inside an
 * `isolation: isolate` wrapper, so the blend cannot reach the page around the
 * card and the ✕, the links and the companions' accept / decline buttons all
 * stay clickable — the archive interaction lives in `FeedItemSlot` and is
 * untouched by anything in this file.
 *
 * ### The two spans go THROUGH the chassis, not beside it (#1942)
 *
 * They were siblings of the card until #1646's ruling — the drift keeps the
 * chrome and stops at user media — reached this surface. It could not be
 * honoured from outside. `.sidebar-card` declares `backdrop-filter`, and a
 * computed `backdrop-filter` other than `none` makes an element a stacking
 * context: the card paints ATOMICALLY, so no `z-index` on the actor's photograph
 * inside it can rise above a wash mounted outside it. That filter is not
 * removable either — index.css says so at its own site, because #1148's
 * `position: fixed` companion modals need the card as their containing block.
 *
 * So the wash is handed down as `children` and mounts INSIDE the card, where the
 * lift resolves. Nothing else about the mount changes: the chassis appends
 * whatever it is given after its band and body, so both spans still paint last
 * over everything but the photo, and `alb-feed-aurora` / `alb-feed-edge` still
 * cover the card's border box — see the `inset: -1px` in index.css, which is the
 * one compensation the new containing block costs. The card is still
 * `DefaultFeedFrame` byte for byte with the two spans removed.
 *
 * index.css owns both classes, both theme halves and the reduced-motion guard; a
 * component may not inject a stylesheet (#911). It declares no new colour value:
 * the wash reads `--faction-default-aurora` and the travelling hairline reads
 * `--faction-default-rainbow-loop`, both na's own spectrum. Stilled, the card is
 * a static wash and a static edge.
 *
 * ### Two things this file deliberately does not do
 *
 * There is **no `AlbescentComment`** and the `comment` manifest key stays
 * unclaimed (epic decision 13): the card is distinct enough on its own, so
 * Albescent comments keep rendering through the shared default voice.
 *
 * And **no word of the design sheet ships.** The sheet is written in Albescent's
 * own dialect; the copy comes from the neutral `feed` catalog authored in F2
 * (#1194), the same ruling the task detail (#1038) and the praxis detail (#1140)
 * took, and for the same reason: a per-faction WORD is as identifying as a
 * per-faction hue, and it renders to every viewer.
 *
 * No `useFormFactor()` call and no mobile twin (ADR-0056 / 0058 / 0063): the
 * responsive half lives in the chassis this forwards to whole, and the light is
 * the same light at both widths.
 */
export default function AlbescentFeedFrame({ children, ...frame }: FeedFrameProps) {
  return (
    <div className="alb-feed">
      <DefaultFeedFrame slug="albescent" {...frame}>
        {children}
        <span aria-hidden="true" className="alb-feed-aurora" />
        <span aria-hidden="true" className="alb-feed-edge" />
      </DefaultFeedFrame>
    </div>
  )
}
