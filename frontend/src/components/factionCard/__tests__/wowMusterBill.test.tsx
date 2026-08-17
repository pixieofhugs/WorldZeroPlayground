/**
 * The muster bill never paints WOW's spine hue as an ink (#951, re-aimed #2078).
 *
 * `WowFactionCard` is the one card in this folder that does NOT mount the
 * shared `StatusBadge` / `InvitationNote`, because both helpers colour their
 * text `factionCssVar(slug)`, which for WOW resolves to `--faction-wow` — the
 * SPINE hue. That is a fill, not an ink, and this card's ground is its own
 * cream parchment (`--faction-wow-card-bg`, `#fbf4e0` light / `#1b1508` dark)
 * rather than the app's page the spine was measured on.
 *
 * WHAT THIS GUARD IS ABOUT CHANGED IN #2068, AND IT IS WHY IT IS NOT DELETED.
 * The original reading was arithmetic: the spine was the gold `#e0a800`, which
 * measured **1.96:1** on the cream — a light-only defect (dark reached 11.19:1)
 * that a dark-mode eyeball would never catch. #2068 made the spine the plum
 * `#7a4a9e` / `#a875c9`, which reads 5.79:1 light and 5.23:1 dark on that same
 * card, so the failure this test caught is gone FOR TODAY'S VALUE. The rule it
 * was an instance of is not: a spine hue belongs to the rainbow, its value is an
 * owner ruling and has already moved once, and nothing measures it against this
 * cream — `factionContrast.test.ts` carries no `--faction-wow`-as-ink pair, only
 * `--faction-wow-card-accent`. Deleting the guard would let the next spine swap
 * put an unmeasured fill back into this card's type, silently and green; keeping
 * it is what makes the bill's legibility independent of a hue it does not own.
 *
 * The obvious future edit is still "why does WOW duplicate the badge? — use the
 * shared one", and it is still wrong, now for the token's provenance rather than
 * its ratio. Whatever this card draws, `var(--faction-wow)` must not appear in
 * it as a colour; the measured plum pair it draws instead
 * (`--faction-wow-plum-surface` / `-on-plum`, 5.16:1 both themes) is a different
 * token that happens to share the plum's value in light.
 *
 * The guard is deliberately a NEGATIVE on the exact token string. It cannot be
 * satisfied by accident (`var(--faction-wow-card-text)` and its eighty siblings
 * all share the prefix, so the closing paren is load-bearing) and it does not
 * pin the dress, only the provenance — the bill is free to be redrawn.
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
