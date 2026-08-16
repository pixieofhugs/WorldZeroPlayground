import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import PageTitle from "../components/ui/PageTitle";
import { factionCssVar, factionName, factionDescription } from "../utils/factions";
import { pickVariant } from "../utils/factionDispatch";
import { surfaceMap } from "../factions";
import { useFormFactor } from "../hooks/useFormFactor";
import { useFactionDetail } from "./factionDetail/useFactionDetail";
import DefaultFactionBody from "./factionDetail/archetypes/DefaultFactionBody";
import DefaultFactionPage from "./factionDetail/mobileArchetypes/DefaultFactionPage";

/**
 * Faction detail page (`/factions/:slug`). Per-faction surface #13 in
 * SPEC-faction-ui-profile.md: shows the faction's description, its members, its
 * tasks, and recently completed praxis.
 *
 * The frontispiece is dispatched per-faction via the `factionHero` surface: a faction opts
 * into a bespoke hero by registering here; otherwise the shared title +
 * description chrome is used. The body (members / tasks / recent-praxis) is
 * always DefaultFactionBody for now — add a pickVariant dispatch here when a
 * faction wants a bespoke body.
 *
 * Data + the page backdrop come from useFactionDetail; this component only
 * routes the loading / error / not-found guards and the hero dispatch.
 */
export interface FactionHeroProps {
  name: string;
  description?: string | null;
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
  const formFactor = useFormFactor();
  const { loading, faction, fetchError, members, tasks, recentPraxis } = state;

  if (loading)
    return <div className="py-8 font-body text-muted">{t("detail.loading")}</div>;
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

  // Phone: dispatch to a single-column mobile skin (Default fallback), keyed by
  // faction slug so a per-faction mobile treatment can register in the registry.
  if (formFactor === "mobile") {
    const Mobile = pickVariant(surfaceMap('mobileFactionPage'), faction.slug, DefaultFactionPage);
    return <Mobile state={state} />;
  }

  const accent = factionCssVar(faction.slug, "border");
  const name = factionName(faction.slug);
  const description = factionDescription(faction.slug);

  // A faction may claim `factionHero` in its manifest; otherwise
  // (Hero is undefined) the shared title + description chrome is used. The page
  // backdrop is themed per-faction by useFactionDetail either way.
  const Hero = pickVariant(surfaceMap('factionHero'), faction.slug);
  const Body = pickVariant(surfaceMap('factionBody'), faction.slug, DefaultFactionBody);

  return (
    <div className="py-8">
      {Hero ? (
        <Hero
          name={name}
          description={description}
          members={members.length}
          tasks={tasks.length}
          praxes={recentPraxis.length}
        />
      ) : (
        <>
          <PageTitle title={name} eyebrow={t("detail.eyebrow")} />

          {/* ── Description ── PLACEHOLDER: design to restyle ── */}
          <div
            className="sidebar-card mb-6"
            style={{ borderLeft: `4px solid ${accent}`, padding: "var(--space-md) var(--space-lg)" }}
          >
            <p className="font-body content-text text-ink">
              {description}
            </p>
          </div>
        </>
      )}

      <Body state={state} />
    </div>
  );
}
