import i18n from "../../i18n";

/**
 * The key for a faction's member noun (#3178): its own `factionHero.{slug}.stats.members`
 * when the catalogue has one, else the shared noun. ONE rule for the header and the
 * select tile, asked of the catalogue rather than of a slug, so na, an unregistered
 * slug and any faction without a block all fall through the same way.
 */
export function membersNounKey(slug: string, count: number): string {
  const own = `feed:factionHero.${slug}.stats.members`;
  return i18n.exists(own, { count }) ? own : "feed:factionHero.stats.members";
}
