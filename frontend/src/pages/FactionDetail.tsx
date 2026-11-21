import { useTranslation } from "react-i18next";
import { useDocumentTitle } from "../hooks/useDocumentTitle"
import { useParams, Link } from "react-router-dom";
import { factionName } from "../utils/factions";
import { resolveVariant } from "../utils/factionDispatch";
import { surfaceMap } from "../factions";
import { useFactionDetail } from "./factionDetail/useFactionDetail";
import { ErrorBanner } from "../components/ui/ErrorBanner";

/**
 * Faction detail page (`/factions/:slug`), surface #13 in
 * SPEC-faction-ui-profile.md. Dispatches `factionHero` and `factionBody` by
 * slug (Default fallbacks, #2504). One component per faction at both widths
 * (#1314 / ADR-0078): no mobile registry, which would fork the copy.
 */
/**
 * The hero is the identity band; no `description` — the body owns it (#2137).
 */
export interface FactionHeroProps {
  /** Required: the Default hero dispatches `FactionSigil` on it (#2504). */
  slug: string;
  name: string;
  /** Raw counts; each hero labels them in its own voice. */
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
  useDocumentTitle(faction ? factionName(faction.slug) : null)

  if (loading)
    return <div className="py-8 font-body text-muted">{t("index.loading")}</div>;
  if (fetchError)
    return (
      <div className="py-8">
        <ErrorBanner message={<>{fetchError}{" "}
          <button onClick={() => window.location.reload()} className="underline">
            {t("detail.retry")}
          </button></>} />
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

  const Hero = resolveVariant(surfaceMap('factionHero'), faction.slug);
  const Body = resolveVariant(surfaceMap('factionBody'), faction.slug);

  return (
    <div className="py-8">
      <Hero
        slug={faction.slug}
        name={name}
        members={members.length}
        tasks={tasks.length}
        praxes={recentPraxis.length}
      />

      {/* Sign-up failure only (#2188); no body skin owns a message slot. */}
      {state.signupMsg && (
        <ErrorBanner className="mb-4" message={state.signupMsg} />
      )}

      <Body state={state} />
    </div>
  );
}
