import i18n from "../../i18n";
import type { FactionHeroProps } from "../../pages/FactionDetail";
import FactionSigil from "../sigil/FactionSigil";
import { membersNounKey } from "./membersNounKey";
import { HeroCounts, HeroKicker, HeroMark, HeroTagline, HeroWordmark, heroCounts } from "./heroFrame";

/**
 * The na fall-through `factionHero` (#2504). The spectrum IS the border (the
 * `DefaultTaskCard` idiom); the sheet is static, and all motion belongs to
 * `AlbescentFactionHero`, which wraps this. The mark is dispatched
 * `FactionSigil` (no slug named here). The kicker is the shared
 * `factions:detail.eyebrow`, not `factionHero.{slug}.eyebrow`. Paint, including
 * the phone stack (a media query, no JS), is `.faction-hero*` in
 * `06-faction-chrome-2.css`.
 */
export default function DefaultFactionHero({ slug, name, members, tasks, praxes }: FactionHeroProps) {
  // The faction's own noun, else the shared one (#3178).
  const noun = i18n.t(membersNounKey(slug, members), {
    count: members,
    defaultValue: "", // lets the computed key past the key union
  });
  const counts = heroCounts(noun, { members, tasks, praxes });

  return (
    <header className="faction-hero">
      <HeroMark>
        <span className="faction-hero-sigil">
          <FactionSigil slug={slug} size={72} />
        </span>
      </HeroMark>

      <div>
        <HeroKicker className="faction-hero-kicker">{i18n.t("factions:detail.eyebrow")}</HeroKicker>
        <HeroWordmark className="faction-hero-name">{name}</HeroWordmark>
        <HeroTagline slug={slug} as="p" className="faction-hero-tagline" />
      </div>

      <HeroCounts className="faction-hero-counts" counts={counts}>
        {(count) => (
          <div>
            <span className="faction-hero-count-value">{count.value}</span>
            <span className="faction-hero-count-label">{count.label}</span>
          </div>
        )}
      </HeroCounts>
    </header>
  );
}
