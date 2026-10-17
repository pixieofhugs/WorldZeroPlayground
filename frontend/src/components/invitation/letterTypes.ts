import type { ReactNode } from 'react'
import type { JoinControlSkin } from '../JoinControl'

/**
 * One perk: the line that says what it gets you, and, on the mechanic row
 * alone, a name (#2774). A missing `name` is the normal shape.
 */
export interface InvitationPerk {
  name?: string
  desc: string
}

/**
 * Which perk states the faction's real backend mechanic (#1874/#2298).
 *
 * ponytail: positional. Every letter is written flavour -> mechanic -> flavour
 * and the catalog carries no flag. If a faction ever needs its mechanic
 * elsewhere, the upgrade is a `"mechanic": true` field read here.
 */
export const MECHANIC_INDEX = 1

/**
 * What `InvitationLetterPopup` hands the dispatched letter BODY (#3294).
 *
 * The popup owns BEHAVIOUR (scrim, Escape, the join POST, the confirm host,
 * dismiss, queue advance); a letter owns TREE AND PAINT and nothing else
 * (ADR-0090). Copy arrives resolved from `factions.json`, verbatim, so a letter
 * never touches i18n and never branches on a slug.
 *
 * A letter must:
 *  - mark each perk `<li data-perk="mechanic" | "flavour">`, and the mechanic's
 *    name element `data-perk-name` (the perks test reads these, not styles);
 *  - draw its own open CTA with `autoFocus`, calling `onEnlist`, and a dismiss
 *    button calling `onDismiss`, while `!confirming`;
 *  - while `confirming`, draw `renderConfirm(skin)` where `skin` is its own
 *    paint for the confirm pair (a `JoinControlSkin`);
 *  - root itself in `LetterSheet`, which drops the card frame full-bleed on a phone.
 */
export interface InvitationLetterProps {
  /** The faction slug, for token reads (`factionRoleVars`), never for branching. */
  slug: string
  /** The faction's display name (masthead wordmark). */
  name: string
  headline: string
  pitch: string
  perks: InvitationPerk[]
  /** `<slug>.invitation.cta.join` */
  joinLabel: string
  /** Top-level `invitation.dismiss` */
  dismissLabel: string
  confirming: boolean
  onEnlist: () => void
  onDismiss: () => void
  renderConfirm: (skin: JoinControlSkin) => ReactNode
}
