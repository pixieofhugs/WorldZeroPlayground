/**
 * The muster bill never paints WOW's spine hue as an ink (#951).
 *
 * `WowFactionCard` is the one card in this folder that does NOT mount the
 * shared `StatusBadge` / `InvitationNote`, and the reason is a measurement
 * rather than a preference: both helpers colour their text
 * `factionCssVar(slug)`, which for WOW resolves to `--faction-wow` — the spine
 * GOLD, `#e0a800`. That is a fill, not an ink. On this card's cream parchment
 * (`--faction-wow-card-bg`, `#fbf4e0`) it measures **1.96:1** in light mode,
 * and it is a light-only defect (dark reaches 11.19:1) so a dark-mode eyeball
 * would never catch it.
 *
 * The obvious future edit is "why does WOW duplicate the badge? — use the
 * shared one", which reintroduces the failure on two of the four standings and
 * on every invitation, silently and green. So the rule is pinned here rather
 * than left in a docblock: whatever this card draws, `var(--faction-wow)` must
 * not appear in it as a colour.
 *
 * The guard is deliberately a NEGATIVE on the exact token string. It cannot be
 * satisfied by accident (`var(--faction-wow-card-text)` and its eighty siblings
 * all share the prefix, so the closing paren is load-bearing) and it does not
 * pin the dress, only the arithmetic — the bill is free to be redrawn.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import WowCard from "../WowFactionCard";
import i18n from "../../../i18n";
import { factionCssVar } from "../../../utils/factions";
import type { FactionOut } from "../../../api/factions";

const WOW: FactionOut = { slug: "wow", status: "visible" };

/** The exact string the spine hue resolves to — not a prefix. */
const SPINE_FILL = factionCssVar("wow");

/** Every standing the card can be handed, including both API aliases. */
const STANDINGS = [
  "member",
  "invited",
  "burned",
  "defected",
  "welcome_back",
  "can_return",
  "not_invited",
];

describe("WOW muster bill", () => {
  it("resolves the spine hue to the token this guard is about", () => {
    // If `factionCssVar` ever stops returning this, the negative below would
    // start passing for the wrong reason.
    expect(SPINE_FILL).toBe("var(--faction-wow)");
  });

  it.each(STANDINGS)("never inks the spine fill — standing %s", (status) => {
    const html = renderToStaticMarkup(
      <WowCard faction={WOW} status={status} invitationNote="Bring a trowel." />,
    );
    expect(html).not.toContain(`${SPINE_FILL};`);
    expect(html).not.toContain(`${SPINE_FILL}"`);
  });

  it("says the shared standing words, in WOW's dress", () => {
    const text = renderToStaticMarkup(
      <WowCard faction={WOW} status="welcome_back" />,
    ).replace(/<[^>]*>/g, "");
    // The word is the catalog's, not the faction's: ADR-0057, and #1909 cut
    // every per-faction string this surface used to carry.
    expect(text).toContain(i18n.t("feed:factionCard.status.welcomeBack"));
  });

  it("posts the summons strip only when an invitation is held", () => {
    const withNote = renderToStaticMarkup(
      <WowCard faction={WOW} status="invited" invitationNote="Bring a trowel." />,
    );
    const without = renderToStaticMarkup(<WowCard faction={WOW} status="invited" />);
    expect(withNote).toContain(i18n.t("feed:factionCard.newInvitation"));
    expect(without).not.toContain(i18n.t("feed:factionCard.newInvitation"));
  });
});
