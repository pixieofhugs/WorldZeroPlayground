import i18n from "../../i18n";

/** Member-noun key (#3178): the faction's own if the catalogue has it, else shared. */
export function membersNounKey(slug: string, count: number): string {
  const own = `feed:factionHero.${slug}.stats.members`;
  return i18n.exists(own, { count }) ? own : "feed:factionHero.stats.members";
}
