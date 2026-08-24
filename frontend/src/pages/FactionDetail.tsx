import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { factionName } from "../utils/factions";
import { pickVariant } from "../utils/factionDispatch";
import { surfaceMap } from "../factions";
import { useFactionDetail } from "./factionDetail/useFactionDetail";
import DefaultFactionBody from "./factionDetail/archetypes/DefaultFactionBody";
import DefaultFactionHero from "../components/factionHero/DefaultFactionHero";

/**
 * Faction detail page (`/factions/:slug`). Per-faction surface #13 in
 * SPEC-faction-ui-profile.md: shows the faction's description, its members, its
 * tasks, and recently completed praxis.
 *
 * The frontispiece is dispatched per-faction via the `factionHero` surface: a
 * faction opts into a bespoke hero by registering here, and anything else falls
 * through to `DefaultFactionHero` (#2504). The body (members / tasks /
 * recent-praxis) dispatches the same way, through `factionBody`, falling through
 * to DefaultFactionBody.
 *
 * ONE COMPONENT PER FACTION, AT BOTH WIDTHS (#1314 / ADR-0078). There used to be
 * a `formFactor === "mobile"` early return here that dispatched a whole second
 * registry, `mobileFactionPage`. Those eight skins did not hold a narrow
 * rendering of the body below — they held DIFFERENT COPY, generic chrome in a
 * faction dress, so every faction's manifesto, spotlight and bespoke join flow
 * simply did not exist on a phone. The surface is retired and cannot be
 * re-registered; a skin that needs the viewport reads `useFormFactor()` itself,
 * the way `DefaultFactionBody` does for its pinned action band.
 *
 * Data + the page backdrop come from useFactionDetail; this component only
 * routes the loading / error / not-found guards and the two dispatches.
 */
/**
 * A hero is the IDENTITY BAND — seal, wordmark, motto, counts. It carries no
 * `description` (#2137): the blurb used to arrive here AND be read again out of
 * the catalog by every `*FactionBody`, so every faction page said the same
 * sentence twice. The body keeps it, because the body is the half that treats
 * it as paragraphs rather than a blob.
 */
export interface FactionHeroProps {
  /**
   * The faction being drawn. REQUIRED, and it arrived with the na fallback
   * (#2504): the seven bespoke heroes each hardcode their own mark, and the
   * eighth cannot — it dispatches `FactionSigil` on this and would silently draw
   * the unaffiliated ring for every faction if the field were optional and a
   * caller forgot it. The six `/design-sync` previews construct these props and
   * are updated with it.
   */
  slug: string;
  name: string;
  /** Raw counts — each hero labels them in its own faction voice. */
  members: number;
  tasks: number;
  praxes: number;
}

export default function FactionDetail({ slug: slugProp }: { slug?: string } = {}) {
  const { t } = useTranslation("factions");
  const { slug: slugParam } = useParams<{ slug: string }>();
  const slug = slugProp ?? slugParam;
  const state = useFactionDetail(slug);
  const { loading, faction, fetchError, members, tasks, recentPraxis } = state;

  if (loading)
    return <div className="py-8 font-body text-muted">{t("index.loading")}</div>;
  if (fetchError)
    return (
      <div className="py-8">
        <p className="font-body content-text danger-text border-2 danger-edge px-3 py-2">
          {fetchError}{" "}
          <button onClick={() => window.location.reload()} className="underline">
            {t("detail.retry")}
          </button>
        </p>
      </div>
    );
  if (!faction)
    return (
      <div className="py-8 font-body text-muted">
        {t("detail.notFound")}{" "}
        <Link to="/factions" className="underline">
          {t("detail.backToFactions")}
        </Link>
      </div>
    );

  const name = factionName(faction.slug);

  // Every faction has a frontispiece since #2504. A faction may claim its own
  // through `factionHero`; anything else falls through to the na one, which
  // dispatches its mark on the slug it is handed. The page backdrop is themed
  // per-faction by useFactionDetail either way.
  //
  // THE PLACEHOLDER CHROME THIS REPLACED took a `PageTitle` plus a bordered
  // description card, and that card held the ONLY copy of the blurb on this
  // branch (#2137). It did not simply go: `DefaultFactionBody` grew the About
  // plate the other seven bodies have always drawn, so the description still
  // appears exactly once and now sits where every other faction's does.
  const Hero = pickVariant(surfaceMap('factionHero'), faction.slug, DefaultFactionHero);
  const Body = pickVariant(surfaceMap('factionBody'), faction.slug, DefaultFactionBody);

  return (
    <div className="py-8">
      <Hero
        slug={faction.slug}
        name={name}
        members={members.length}
        tasks={tasks.length}
        praxes={recentPraxis.length}
      />

      {/* A failed sign-up from one of the task cards below (#2188). The success
          path navigates to the new praxis composer, so this is only ever a
          failure and only ever the page's to draw — the eight bodies are eight
          different skins and none of them owns a message slot. */}
      {state.signupMsg && (
        <p className="font-body content-text border-2 danger-edge danger-text px-3 py-2 mb-4">
          {state.signupMsg}
        </p>
      )}

      <Body state={state} />
    </div>
  );
}
