import i18n from "../../i18n";
import type { FactionHeroProps } from "../../pages/FactionDetail";
import FactionSigil from "../sigil/FactionSigil";

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
 * FIVE SLOTS, AND NOT ONE OF THEM KNOWS A SLUG.
 *   sigil    `FactionSigil`, dispatched. na draws its swept ring and Albescent
 *            its labyrinth; this file names neither and must not start to. A
 *            hardcoded mark is what makes a "default" archetype quietly wrong
 *            for the ninth faction.
 *   kicker   the shared `detail.eyebrow` — the same word the chrome this
 *            replaces printed above the name.
 *   name     `factionName(slug)`, resolved by the page (ADR-0038).
 *   tagline  the faction's tagline out of the copy catalog — the same string
 *            its select tile draws, and since #2805 the same KEY, drawn only
 *            when the catalog has one. A LOOKUP, not a branch: the key is built
 *            from the slug, so a faction gets a tagline by having copy rather
 *            than by this file learning its name. (It is therefore invisible to
 *            a grep for `t("…")` literals — `factionCopyCollapse.test.ts` skips
 *            computed keys by design; `heroDrawsTheTileTagline.test.tsx` is
 *            what covers it, across all nine.)
 *   counts   the three raw numbers the page passes, under the shared labels.
 *            NOT a faction's own words for them: the seven bespoke heroes each
 *            rename `members` in their own voice, and the fall-through has no
 *            voice to rename it in.
 *
 * NO DESCRIPTION (#2137). A hero is the identity band; the blurb is the body's,
 * and moving this in front of the old chrome is what took the description down
 * to `DefaultFactionBody`'s About plate rather than deleting it.
 *
 * All paint is in index.css under `.faction-hero*` — including the phone stack,
 * which is a media query rather than `useFormFactor()`: nothing here branches on
 * width, so there is no reason to make the browser wait for JS to find that out.
 */
export default function DefaultFactionHero({ slug, name, members, tasks, praxes }: FactionHeroProps) {
  // ONE STRING, READ FROM THE TILE'S KEY (#2805). The hero's own
  // `factionHero.{F}.motto` family said exactly what `factionSelect.{F}.tagline`
  // says — #2782 ruled the two surfaces speak with one voice and then nothing
  // held them to it. `defaultValue` stays for an unregistered slug; every
  // faction has a tagline, including `na`, which had no `factionHero` block at
  // all and so printed nothing here.
  const tagline: string = i18n.t(`feed:factionSelect.${slug}.tagline`, { defaultValue: "" });
  const counts = [
    { value: members, label: i18n.t("feed:factionHero.stats.members") },
    { value: tasks, label: i18n.t("feed:factionHero.stats.tasks") },
    { value: praxes, label: i18n.t("feed:factionHero.stats.praxes") },
  ];

  return (
    <header className="faction-hero">
      <span className="faction-hero-sigil">
        <FactionSigil slug={slug} size={72} />
      </span>

      <div>
        <p className="faction-hero-kicker">{i18n.t("factions:detail.eyebrow")}</p>
        {/* No `overflow-wrap`: a wordmark never breaks mid-word (#2000). The
            column is `minmax(0, 1fr)`, so a long name wraps between words and
            the plate grows rather than clipping. */}
        <h1 className="faction-hero-name">{name}</h1>
        {tagline && <p className="faction-hero-tagline">{tagline}</p>}
      </div>

      <div className="faction-hero-counts">
        {counts.map((count) => (
          <div key={count.label}>
            <span className="faction-hero-count-value">{count.value}</span>
            <span className="faction-hero-count-label">{count.label}</span>
          </div>
        ))}
      </div>
    </header>
  );
}
