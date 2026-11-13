/**
 * useFactionDetail — the faction page's data plumbing. {@link FactionDetailState}
 * is the contract every faction-body archetype consumes.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getFactionStatus,
  chooseFaction,
  type FactionOut,
} from "../../api/factions";
import { listCharacters, type CharacterOut } from "../../api/characters";
import { listTasks, type TaskOut } from "../../api/tasks";
import { listPraxes, type PraxisCardOut } from "../../api/praxis";
import { useAuth } from "../../auth/AuthContext";
import { useFactions } from "../../hooks/useFactions";
import { useTaskSignup } from "../../hooks/useTaskSignup";
import { extractError } from "../../utils/errors";
import { useFactionBackdrop } from "../../components/backdrop/BackdropContext";
import type { JoinTarget } from "../../components/JoinControl";

/**
 * The viewer's relationship to THIS faction, resolved from the invite-gated
 * membership model (FactionStatusOut + open invitation letters):
 *   - "none"     → logged out / no character — hide the join block entirely
 *   - "member"   → already on this faction's roll
 *   - "eligible" → invited / can return / holds an open letter — show Join
 *   - "gate"     → not invited yet — show the soft "keep doing tasks" gate
 *   - "burned"   → left this faction this era, no rejoin (#1305)
 * Join confirms (ADR-0019). "gate" and "burned" stay distinct: "keep doing
 * tasks" (#454) is a lie for the burn.
 */
export type MembershipState =
  | "none"
  | "member"
  | "eligible"
  | "gate"
  | "burned";

/**
 * Resolve {@link MembershipState} from the raw status map entry
 * ("member" | "invited" | "not_invited" | "defected" | "can_return") plus
 * whether an open invitation letter exists. Exported for unit tests.
 *
 * Deliberately slug-blind: it takes no slug so it can't grow a slug branch
 * (#2660, see `frontend/CLAUDE.md`). Joinability is a `FactionConfig` capability.
 */
export function resolveMembershipState(
  hasCharacter: boolean,
  rawStatus: string | null,
  hasInvite: boolean,
): MembershipState {
  if (!hasCharacter) return "none";
  if (rawStatus === "member") return "member";
  // The burn (#1305) outranks any open letter, as the backend ranks it.
  // `can_always_rejoin` factions read "can_return" and stay eligible.
  if (rawStatus === "defected") return "burned";
  if (rawStatus === "invited" || rawStatus === "can_return" || hasInvite)
    return "eligible";
  return "gate";
}

/** {@link JoinTarget} plus `state`, which decides whether a join block draws. */
export interface Membership extends JoinTarget {
  state: MembershipState;
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

  /**
   * Task sign-up (#2188) for any signed-in viewer, else undefined. The card
   * reads `task.signup_reason` itself.
   */
  onSignup: ((id: number) => void) | undefined;
  /** Why the last sign-up failed, or null. Drawn by `FactionDetail`, not a skin. */
  signupMsg: string | null;

  // Join / gate block (section ③).
  membership: Membership;
}

export function useFactionDetail(
  slug: string | undefined,
): FactionDetailState {
  const { t } = useTranslation("factions");
  const { user, applyUser } = useAuth();
  const characterId = user?.character?.id;
  const { signupMsg, handleSignup } = useTaskSignup();

  const [rawStatus, setRawStatus] = useState<string | null>(null);
  const [hasInvite, setHasInvite] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Derived from the app-wide cache (#1284), so it can't lag the slug.
  const allFactions = useFactions();
  const faction: FactionOut | null =
    allFactions?.find((f) => f.slug === slug) ?? null;

  const [members, setMembers] = useState<CharacterOut[]>([]);
  const [tasks, setTasks] = useState<TaskOut[]>([]);
  const [recentPraxis, setRecentPraxis] = useState<PraxisCardOut[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Faction backdrop. The one page exempt from the ornament alternation
  // (#2195, owner 2026-08-18): cards keep their ornament on a busy wall.
  useFactionBackdrop(slug, { cardsKeepOrnament: true });

  useEffect(() => {
    if (!slug) return;
    // Out-of-order guard.
    let cancelled = false;
    setEntitiesLoading(true);
    setFetchError(null);
    Promise.all([
      listCharacters({ faction: slug }),
      // `faction` is a repeated union param (#1364, #1362).
      listTasks({ faction: [slug], status: "active" }),
      listPraxes({ faction: [slug], status: "submitted", limit: 12 }),
    ])
      .then(([mems, tsks, praxis]) => {
        if (cancelled) return;
        setMembers(mems);
        setTasks(tsks);
        setRecentPraxis(praxis);
      })
      .catch((err) => {
        if (!cancelled)
          setFetchError(extractError(err, t("detail.errors.load")));
      })
      .finally(() => {
        if (!cancelled) setEntitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, t]);

  // Membership status; cleared without a character so the join block hides.
  useEffect(() => {
    if (!slug || !characterId) {
      setRawStatus(null);
      setHasInvite(false);
      return;
    }
    let cancelled = false;
    // Letters ride on the status payload (#1384).
    getFactionStatus()
      .then((page) => {
        if (cancelled) return;
        setRawStatus(
          page.all_factions.find((f) => f.slug === slug)?.status ?? "not_invited",
        );
        setHasInvite(page.invitations.some((inv) => inv.faction_slug === slug));
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

  const membershipState = resolveMembershipState(
    Boolean(characterId),
    rawStatus,
    hasInvite,
  );

  const join = useCallback(async () => {
    if (!slug) return;
    setJoining(true);
    setJoinError(null);
    try {
      // The POST returns the full `/auth/me` user (#1383).
      applyUser(await chooseFaction(slug));
      setRawStatus("member");
    } catch (err) {
      setJoinError(extractError(err, t("detail.errors.join")));
    } finally {
      setJoining(false);
    }
  }, [slug, applyUser, t]);

  return {
    slug,
    // An unresolved directory must not fall through to not-found.
    loading: entitiesLoading || allFactions === null,
    faction,
    fetchError,

    members,
    tasks,
    recentPraxis,

    // Gate on the viewer, not `can_sign_up` (#1976).
    onSignup: user ? handleSignup : undefined,
    signupMsg,

    membership: {
      state: membershipState,
      currentFactionSlug: user?.character?.faction_slug,
      join,
      joining,
      joinError,
    },
  };
}
