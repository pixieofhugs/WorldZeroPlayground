import { type ComponentType } from "react";
import { useParams, Link } from "react-router-dom";
import PageTitle from "../components/ui/PageTitle";
import { factionCssVar } from "../utils/factions";
import { pickVariant } from "../utils/factionDispatch";
import { useFactionDetail, type FactionDetailState } from "./factionDetail/useFactionDetail";
import DefaultFactionBody from "./factionDetail/archetypes/DefaultFactionBody";
import EverymenFactionBody from "./factionDetail/archetypes/EverymenFactionBody";
import UaFactionBody from "./factionDetail/archetypes/UaFactionBody";
import SingularityFactionBody from "./factionDetail/archetypes/SingularityFactionBody";
import SnideFactionBody from "./factionDetail/archetypes/SnideFactionBody";
import EphemeristsFactionBody from "./factionDetail/archetypes/EphemeristsFactionBody";
import WowFactionBody from "./factionDetail/archetypes/WowFactionBody";
import EphemeristsFactionHero from "../components/cards/EphemeristsFactionHero";
import SnideFactionHero from "../components/cards/SnideFactionHero";
import SingularityFactionHero from "../components/cards/SingularityFactionHero";
import EverymenFactionHero from "../components/cards/EverymenFactionHero";
import UAFactionHero from "../components/cards/UAFactionHero";
import WowFactionHero from "../components/cards/WowFactionHero";

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
};

// The standardized six-section body, dispatched per faction. albescent is not
// registered: it aliases to ua (FACTION_ALIASES) and so inherits the UA body
// via pickVariant until its own vellum skin lands with the alias removal.
const FACTION_BODIES: Record<string, ComponentType<{ state: FactionDetailState }>> = {
  everymen: EverymenFactionBody,
  ua: UaFactionBody,
  singularity: SingularityFactionBody,
  snide: SnideFactionBody,
  ephemerists: EphemeristsFactionBody,
  wow: WowFactionBody,
};

export default function FactionDetail() {
  const { slug } = useParams<{ slug: string }>();
  const state = useFactionDetail(slug);
  const { loading, faction, fetchError, members, tasks, recentPraxis } = state;

  if (loading)
    return <div className="py-8 font-body text-muted">Loading...</div>;
  if (fetchError)
    return (
      <div className="py-8">
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {fetchError}{" "}
          <button onClick={() => window.location.reload()} className="underline">
            Try refreshing.
          </button>
        </p>
      </div>
    );
  if (!faction)
    return (
      <div className="py-8 font-body text-muted">
        Faction not found.{" "}
        <Link to="/factions" className="underline">
          Back to factions.
        </Link>
      </div>
    );

  const accent = factionCssVar(faction.slug, "border");

  // A faction may register a bespoke frontispiece in FACTION_HEROES; otherwise
  // (Hero is undefined) the shared title + description chrome is used. The page
  // backdrop is themed per-faction by useFactionDetail either way.
  const Hero = pickVariant(FACTION_HEROES, faction.slug);
  const Body = pickVariant(FACTION_BODIES, faction.slug, DefaultFactionBody);

  return (
    <div className="py-8">
      {Hero ? (
        <Hero
          name={faction.name}
          description={faction.description}
          members={members.length}
          tasks={tasks.length}
          praxes={recentPraxis.length}
        />
      ) : (
        <>
          <PageTitle title={faction.name} eyebrow="Faction" />

          {/* ── Description ── PLACEHOLDER: design to restyle ── */}
          <div
            className="sidebar-card mb-6"
            style={{ borderLeft: `4px solid ${accent}`, padding: "14px 16px" }}
          >
            <p className="font-body text-sm text-ink">
              {faction.description ?? "No description yet."}
            </p>
          </div>
        </>
      )}

      <Body state={state} />
    </div>
  );
}
