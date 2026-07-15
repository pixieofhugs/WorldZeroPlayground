import { type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import PageTitle from "../components/ui/PageTitle";
import { factionCssVar, factionName, factionDescription } from "../utils/factions";
import { pickVariant } from "../utils/factionDispatch";
import { useFormFactor } from "../hooks/useFormFactor";
import { useFactionDetail, type FactionDetailState } from "./factionDetail/useFactionDetail";
import UaFactionPage from "./factionDetail/mobileArchetypes/UaFactionPage";
import SingularityFactionPage from "./factionDetail/mobileArchetypes/SingularityFactionPage";
import WowFactionPage from "./factionDetail/mobileArchetypes/WowFactionPage";
import DefaultFactionBody from "./factionDetail/archetypes/DefaultFactionBody";
import DefaultFactionPage from "./factionDetail/mobileArchetypes/DefaultFactionPage";
import EverymenFactionBody from "./factionDetail/archetypes/EverymenFactionBody";
import UaFactionBody from "./factionDetail/archetypes/UaFactionBody";
import SingularityFactionBody from "./factionDetail/archetypes/SingularityFactionBody";
import SnideFactionBody from "./factionDetail/archetypes/SnideFactionBody";
import EphemeristsFactionBody from "./factionDetail/archetypes/EphemeristsFactionBody";
import WowFactionBody from "./factionDetail/archetypes/WowFactionBody";
import AlbescentFactionBody from "./factionDetail/archetypes/AlbescentFactionBody";
import EphemeristsFactionHero from "../components/cards/EphemeristsFactionHero";
import SnideFactionHero from "../components/cards/SnideFactionHero";
import SingularityFactionHero from "../components/cards/SingularityFactionHero";
import EverymenFactionHero from "../components/cards/EverymenFactionHero";
import UAFactionHero from "../components/cards/UAFactionHero";
import WowFactionHero from "../components/cards/WowFactionHero";
import AlbescentFactionHero from "../components/cards/AlbescentFactionHero";

/**
 * Faction detail page (`/factions/:slug`). Per-faction surface #13 in
 * SPEC-faction-ui-profile.md: shows the faction's description, its members, its
 * tasks, and recently completed praxis.
 *
 * The frontispiece is dispatched per-faction via FACTION_HEROES: a faction opts
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

const FACTION_HEROES: Record<string, ComponentType<FactionHeroProps>> = {
  ephemerists: EphemeristsFactionHero,
  snide: SnideFactionHero,
  singularity: SingularityFactionHero,
  everymen: EverymenFactionHero,
  ua: UAFactionHero,
  wow: WowFactionHero,
  albescent: AlbescentFactionHero,
};

// The standardized six-section body, dispatched per faction. The explicit
// albescent row renders "The Record" skin now (#232); it beats the albescent→ua
// alias in pickVariant, so it no longer inherits the UA body.
const FACTION_BODIES: Record<string, ComponentType<{ state: FactionDetailState }>> = {
  everymen: EverymenFactionBody,
  ua: UaFactionBody,
  singularity: SingularityFactionBody,
  snide: SnideFactionBody,
  ephemerists: EphemeristsFactionBody,
  wow: WowFactionBody,
  albescent: AlbescentFactionBody,
};

// Parallel MOBILE registry — the phone twin of FACTION_BODIES. Every mobile
// render falls through to the single-column DefaultFactionPage skin unless a
// faction registers its bespoke `factionDetail/mobileArchetypes/*` page here
// (keyed by slug), exactly as the desktop bodies register in FACTION_BODIES. UA
// is the first (its gilt-salon page, #525).
export const MOBILE_ARCHETYPE_BY_SLUG: Record<
  string,
  ComponentType<{ state: FactionDetailState }>
> = {
  ua: UaFactionPage,
  singularity: SingularityFactionPage,
  wow: WowFactionPage,
};

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
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
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
    const Mobile = pickVariant(MOBILE_ARCHETYPE_BY_SLUG, faction.slug, DefaultFactionPage);
    return <Mobile state={state} />;
  }

  const accent = factionCssVar(faction.slug, "border");
  const name = factionName(faction.slug);
  const description = factionDescription(faction.slug);

  // A faction may register a bespoke frontispiece in FACTION_HEROES; otherwise
  // (Hero is undefined) the shared title + description chrome is used. The page
  // backdrop is themed per-faction by useFactionDetail either way.
  const Hero = pickVariant(FACTION_HEROES, faction.slug);
  const Body = pickVariant(FACTION_BODIES, faction.slug, DefaultFactionBody);

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
            style={{ borderLeft: `4px solid ${accent}`, padding: "14px 16px" }}
          >
            <p className="font-body text-sm text-ink">
              {description}
            </p>
          </div>
        </>
      )}

      <Body state={state} />
    </div>
  );
}
