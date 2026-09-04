import i18n from "../../i18n";
import type { FactionHeroProps } from "../../pages/FactionDetail";
import FactionSigil from "../sigil/FactionSigil";
import { HeroCounts, HeroKicker, HeroWordmark, heroCounts, heroTagline } from "./heroFrame";

/**
 * The na frontispiece (#2504, epic #2496 ruling 11) — the fall-through
 * `factionHero`, and the eighth of eight.
 *
 * WHY IT EXISTS. `pickVariant(surfaceMap('factionHero'), slug)` had no fallback,
 * so seven factions got a frontispiece and anyone else got `PageTitle` plus a
 * bordered blurb — the page's own placeholder chrome, drawn where a hero should
 * be. Albescent is the only slug on that branch today and na has no faction page
 * at all, which is why the epic ruled this in scope explicitly: a future era may
 * give the unaffiliated one, and a fallback that does not exist is a fallback
 * nobody notices is missing.
 *
 * IT IS THE CANVAS'S ALBESCENT HERO WITH THE WASH AND THE MOTION SUBTRACTED. The
 * spectrum IS the border — a 3px transparent frame with the ramp painted into
 * the border box and the sheet over the padding box, the same idiom
 * `DefaultTaskCard` and the select card wear, so na's three biggest surfaces
 * frame themselves identically. The sheet is flat and static; every drifting,
 * blooming, turning thing the design shows belongs to `AlbescentFactionHero`,
 * which wraps this and adds them without forking a line of it.
 *
 * A KIT LIKE THE OTHER EIGHT NOW (#2997). The five-slot contract this file used
 * to be the only written statement of has moved onto {@link heroFrame}, which
 * renders the kicker, the wordmark and the counts row for all nine. What is
 * left here is na's own share: its mark, its ground, and the ONE eyebrow scope
 * that is not the others'.
 *
 * THE MARK IS `FactionSigil`, DISPATCHED, and this file names no slug. na draws
 * its swept ring and Albescent its labyrinth; a hardcoded mark is what makes a
 * "default" archetype quietly wrong for the ninth faction.
 *
 * THE KICKER IS THE SHARED `factions:detail.eyebrow` — the same word the chrome
 * this replaces printed above the name, and a DIFFERENT KEY from the seven
 * bespoke kits' `factionHero.{slug}.eyebrow`. The frame takes the string as a
 * prop precisely so these two scopes cannot collapse into one.
 *
 * THE COUNTS take the shared `factionHero.stats.members`, not a voice of their
 * own: the seven bespoke heroes each rename `members`, and the fall-through has
 * no voice to rename it in.
 *
 * All paint is in `06-faction-chrome-2.css` under `.faction-hero*` — including
 * the phone stack, which is a media query rather than `useFormFactor()`:
 * nothing here branches on width, so there is no reason to make the browser
 * wait for JS to find that out.
 */
export default function DefaultFactionHero({ slug, name, members, tasks, praxes }: FactionHeroProps) {
  const tagline = heroTagline(slug);
  const counts = heroCounts(i18n.t("feed:factionHero.stats.members"), { members, tasks, praxes });

  return (
    <header className="faction-hero">
      <span className="faction-hero-sigil">
        <FactionSigil slug={slug} size={72} />
      </span>

      <div>
        <HeroKicker className="faction-hero-kicker" text={i18n.t("factions:detail.eyebrow")} />
        <HeroWordmark className="faction-hero-name">{name}</HeroWordmark>
        {tagline && <p className="faction-hero-tagline">{tagline}</p>}
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
