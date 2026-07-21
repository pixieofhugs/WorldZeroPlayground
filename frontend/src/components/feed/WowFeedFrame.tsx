import type { ReactNode } from 'react'

import i18n from '../../i18n'

/**
 * Warriors of Whimsy — THE HERALD'S DISPATCH (kit §07, #899).
 *
 * The decree's chrome, folded down to a feed row: a gold-framed sheet of cream
 * parchment headed by a parchment-plate band that carries a twinkling ✦ and the
 * words HERALD'S DISPATCH. Frame-level chrome only (surface #12,
 * SPEC-faction-ui-profile.md) — the neutral card arrives as `{children}` and
 * renders untouched, exactly as in `CovenFeedFrame` / `EverymenFeedFrame`.
 *
 * WHAT THE KIT DRAWS THAT THIS DOES NOT:
 *
 *  • the WAX SEAL beside the dispatch text. In the kit that seal is the actor's
 *    portrait; in the app the card already renders one, and for a WOW actor that
 *    portrait IS the crest (`WowAvatar`, #897). Adding a second seal here would
 *    put two crests on one row;
 *  • the DATE on the right of the band, and the "+140 points" pill under the
 *    sentence. Both are card content, not frame chrome — the neutral row already
 *    owns the timestamp and the points, and re-drawing them in the wrapper would
 *    print each twice.
 *
 * `feed:row.wow.*` (#898) belongs to the row SENTENCE, which `FeedRowContent`
 * composes generically; it is not readable from a frame that only sees
 * `children`. Those three keys stay unclaimed until the row copy is dispatched.
 *
 * Both themes come from the `[data-theme="dark"]` cascade.
 */
export default function WowFeedFrame({ children }: { children: ReactNode }) {
  return (
    <article
      style={{
        borderRadius: 11,
        overflow: 'hidden',
        background: 'var(--faction-wow-chronicle-bg)',
        color: 'var(--faction-wow-card-text)',
        border: '2px solid var(--faction-wow-chronicle-border)',
        boxShadow: '0 12px 28px -16px var(--faction-wow-chronicle-shadow)',
        fontFamily: 'var(--faction-wow-body-font)',
      }}
    >
      {/* the dispatch band — a strip of the inset parchment plate */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-xs) var(--space-md)',
          background: 'var(--faction-wow-chronicle-panel)',
          borderBottom: '1px solid var(--faction-wow-chronicle-rule)',
        }}
      >
        <span
          className="wow-tw"
          aria-hidden
          style={{ color: 'var(--faction-wow-stamp-total)' }}
        >
          ✦
        </span>
        <span
          className="eyebrow"
          style={{
            fontFamily: 'var(--faction-wow-card-font)',
            letterSpacing: '0.14em',
            color: 'var(--faction-wow-card-accent)',
          }}
        >
          {i18n.t('feed:identity.wow.dispatch')}
        </span>
      </div>

      <div style={{ padding: 'var(--space-md)' }}>{children}</div>
    </article>
  )
}
