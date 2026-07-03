/**
 * useFactionDetail — extracts the data plumbing from the legacy FactionDetail.tsx
 * so the page body (members / tasks / recent-praxis) can dispatch per faction the
 * same way the hero already does, without re-implementing the fetch.
 *
 * Behaviour preserved 1:1 from the original page (out-of-order-safe fetch keyed
 * on slug, faction-cleared-before-refetch, not-found when the slug has no match,
 * page backdrop themed to the faction). The returned {@link FactionDetailState}
 * is the stable contract every faction-body archetype consumes.
 */
import { useCallback, useEffect, useState } from "react";
import {
  getFactions,
  getFactionStatus,
  getInvitations,
  chooseFaction,
  type FactionOut,
} from "../../api/factions";
import { listCharacters, type CharacterOut } from "../../api/characters";
import { listTasks, type TaskOut } from "../../api/tasks";
import { listPraxes, type PraxisCardOut } from "../../api/praxis";
import { useAuth } from "../../auth/AuthContext";
import { useGameConfig } from "../../hooks/useGameConfig";
import { extractError } from "../../utils/errors";
import { useFactionBackdrop } from "../../components/backdrop/BackdropContext";
import type { FactionConfigOut } from "../../api/gameConfig";

/**
 * The viewer's relationship to THIS faction, resolved from the invite-gated
 * membership model (FactionStatusOut + open invitation letters):
 *   - "none"     → logged out / no character — hide the join block entirely
 *   - "member"   → already on this faction's roll
 *   - "eligible" → invited / can return / holds an open letter — show Join
 *   - "gate"     → not invited yet — show the soft "keep doing tasks" gate
 * The standardization's soft gate has no formula/progress bar (ADR-0019: joining
 * is invite-earned and switching factions is irreversible, so Join confirms).
 */
export type MembershipState = "none" | "member" | "eligible" | "gate";

export interface Membership {
  state: MembershipState;
  /** Display name of the faction the viewer would leave by joining (for the confirm copy); null if unaffiliated. */
  currentFactionSlug: string | null | undefined;
  join: () => Promise<void>;
  joining: boolean;
  joinError: string | null;
}

export interface FactionDetailState {
  // Routing / loading
  slug: string | undefined;
  loading: boolean;
  faction: FactionOut | null;
  fetchError: string | null;

  // Entities
  members: CharacterOut[];
  tasks: TaskOut[];
  recentPraxis: PraxisCardOut[];

  // Viewer context — for per-faction display-point multipliers in the task list
  viewerFactionSlug: string | null | undefined;
  gameFactions: FactionConfigOut[];

  // Join / leave / gate block (section ③) — shared across every skin.
  membership: Membership;
}

export function useFactionDetail(
  slug: string | undefined,
): FactionDetailState {
  const { user, refetch } = useAuth();
  const characterId = user?.character?.id;

  // Section ③ — the viewer's relationship to this faction. Raw status ("member"
  // | "invited" | "not_invited" | "defected" | "can_return") plus whether an open
  // invitation letter exists (either signal means "eligible"), refetched when the
  // slug or the active character changes.
  const [rawStatus, setRawStatus] = useState<string | null>(null);
  const [hasInvite, setHasInvite] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [faction, setFaction] = useState<FactionOut | null>(null);
  const [members, setMembers] = useState<CharacterOut[]>([]);
  const [tasks, setTasks] = useState<TaskOut[]>([]);
  const [recentPraxis, setRecentPraxis] = useState<PraxisCardOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // App-wide cached game config — used for per-faction display-point multipliers.
  const gameConfig = useGameConfig();

  // Theme the page backdrop to this faction (Tier-3 surface #10). Falls back to
  // the global watercolor for factions without a backdrop variant.
  useFactionBackdrop(slug);

  useEffect(() => {
    if (!slug) return;
    // Guard against out-of-order responses: if the slug changes mid-fetch, the
    // stale request must not overwrite the newer faction's data.
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    // Clear any prior faction so an unknown slug falls through to "not found"
    // instead of showing the previously-viewed faction during/after the fetch.
    setFaction(null);
    Promise.all([
      getFactions(),
      listCharacters({ faction: slug }),
      listTasks({ faction: slug, status: "active" }),
      listPraxes({ faction: slug, status: "submitted", limit: 12 }),
    ])
      .then(([factions, mems, tsks, praxis]) => {
        if (cancelled) return;
        const match = factions.find((f) => f.slug === slug);
        if (!match) return; // faction stays null → renders the not-found state
        setFaction(match);
        setMembers(mems);
        setTasks(tsks);
        setRecentPraxis(praxis);
      })
      .catch((err) => {
        if (!cancelled)
          setFetchError(extractError(err, "Couldn't load this faction."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Membership status for this faction — only meaningful with a logged-in
  // character; cleared otherwise so the join block hides.
  useEffect(() => {
    if (!slug || !characterId) {
      setRawStatus(null);
      setHasInvite(false);
      return;
    }
    let cancelled = false;
    Promise.all([getFactionStatus(), getInvitations()])
      .then(([page, invites]) => {
        if (cancelled) return;
        setRawStatus(
          page.all_factions.find((f) => f.slug === slug)?.status ?? "not_invited",
        );
        setHasInvite(invites.some((inv) => inv.faction_slug === slug));
      })
      .catch(() => {
        if (!cancelled) {
          setRawStatus(null);
          setHasInvite(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, characterId]);

  // UA has no chosen-join flow — membership is graduation-gated, not earned by
  // tasking, and has no join design (#200/#243). So UA never surfaces an
  // "eligible" Join CTA nor the "keep tasking" gate: a non-member viewer sees no
  // join block at all ("none"), per the "hide unusable controls" convention.
  const isGraduationGated = slug === "ua"

  const membershipState: MembershipState = !characterId
    ? "none"
    : rawStatus === "member"
      ? "member"
      : isGraduationGated
        ? "none"
        : rawStatus === "invited" || rawStatus === "can_return" || hasInvite
          ? "eligible"
          : "gate";

  const join = useCallback(async () => {
    if (!slug) return;
    setJoining(true);
    setJoinError(null);
    try {
      await chooseFaction(slug);
      await refetch();
      setRawStatus("member");
    } catch (err) {
      setJoinError(extractError(err, "Could not join faction."));
    } finally {
      setJoining(false);
    }
  }, [slug, refetch]);

  return {
    slug,
    loading,
    faction,
    fetchError,

    members,
    tasks,
    recentPraxis,

    viewerFactionSlug: user?.character?.faction_slug,
    gameFactions: gameConfig?.factions ?? [],

    membership: {
      state: membershipState,
      currentFactionSlug: user?.character?.faction_slug,
      join,
      joining,
      joinError,
    },
  };
}
