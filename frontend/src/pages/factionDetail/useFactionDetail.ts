/**
 * useFactionDetail — extracts the data plumbing from the legacy FactionDetail.tsx
 * so the page body (members / tasks / recent-praxis) can dispatch per faction the
 * same way the hero already does, without re-implementing the fetch.
 *
 * Behaviour preserved 1:1 from the original page (out-of-order-safe fetch keyed
 * on slug, not-found when the slug has no match, page backdrop themed to the
 * faction). The returned {@link FactionDetailState} is the stable contract every
 * faction-body archetype consumes. The faction itself is derived from the
 * app-wide `useFactions` cache (#1284), which subsumes the old
 * clear-before-refetch: a derived match cannot lag the slug.
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
import { useGameConfig } from "../../hooks/useGameConfig";
import { extractError } from "../../utils/errors";
import { useFactionBackdrop } from "../../components/backdrop/BackdropContext";
import type { JoinTarget } from "../../components/JoinControl";
import type { FactionConfigOut } from "../../api/gameConfig";

/**
 * The viewer's relationship to THIS faction, resolved from the invite-gated
 * membership model (FactionStatusOut + open invitation letters):
 *   - "none"     → logged out / no character — hide the join block entirely
 *   - "member"   → already on this faction's roll
 *   - "eligible" → invited / can return / holds an open letter — show Join
 *   - "gate"     → not invited yet — show the soft "keep doing tasks" gate
 *   - "burned"   → left this faction this era and it does not take you back —
 *                  show the neutral closed-for-the-era notice (#1305)
 * The standardization's soft gate has no formula/progress bar (ADR-0019: joining
 * is invite-earned and switching factions is irreversible, so Join confirms).
 *
 * "gate" and "burned" must stay distinguishable: "keep doing tasks" is the
 * right message for "not invited yet" (#454) and a lie for the burn, which
 * `can_join_faction` refuses for the rest of the era.
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
 * whether an open invitation letter exists.
 *
 * Exported because this mapping is the whole join-block contract and the hook
 * around it is effect-driven — the seam is unit-testable, the hook is not.
 */
export function resolveMembershipState(
  hasCharacter: boolean,
  rawStatus: string | null,
  hasInvite: boolean,
  slug: string | undefined,
): MembershipState {
  if (!hasCharacter) return "none";
  if (rawStatus === "member") return "member";
  // UA has no chosen-join flow — membership is graduation-gated, not earned by
  // tasking, and has no join design (#200/#243). So UA never surfaces an
  // "eligible" Join CTA nor the "keep tasking" gate: a non-member viewer sees
  // no join block at all ("none"), per the "hide unusable controls"
  // convention. This precedes every status branch below, so no UA viewer can
  // reach one.
  if (slug === "ua") return "none";
  // The burn (#1305) outranks any open letter, exactly as the backend ranks it:
  // `get_faction_status_map` yields "defected" over "invited", and
  // `can_join_faction` refuses the join for the rest of the era. A faction with
  // `can_always_rejoin` reads "can_return" instead and stays eligible below.
  if (rawStatus === "defected") return "burned";
  if (rawStatus === "invited" || rawStatus === "can_return" || hasInvite)
    return "eligible";
  return "gate";
}

/**
 * This page's viewer relationship: the four fields the shared join trio reads
 * ({@link JoinTarget}) plus the one it does not, which decides whether a join
 * block is drawn at all.
 *
 * The four moved to `components/JoinControl` in #2656 rather than being copied:
 * the popup is a second host for the same control, and a contract owned by one
 * page's hook is not one a second host can honestly implement.
 */
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

  // Viewer context — for per-faction display-point multipliers in the task list
  viewerFactionSlug: string | null | undefined;
  gameFactions: FactionConfigOut[];

  /**
   * Take one of this faction's tasks (#2188) — threaded to whichever
   * `<TaskCard>` the skin mounts. Passed for any signed-in viewer and
   * `undefined` otherwise; the card reads `task.signup_reason` itself and draws
   * the refusal, so nothing here re-derives eligibility.
   */
  onSignup: ((id: number) => void) | undefined;
  /** Why the last sign-up failed, or null. Drawn by `FactionDetail`, not a skin. */
  signupMsg: string | null;

  // Join / leave / gate block (section ③) — shared across every skin.
  membership: Membership;
}

export function useFactionDetail(
  slug: string | undefined,
): FactionDetailState {
  const { t } = useTranslation("factions");
  const { user, applyUser } = useAuth();
  const characterId = user?.character?.id;
  const { signupMsg, handleSignup } = useTaskSignup();

  // Section ③ — the viewer's relationship to this faction. Raw status ("member"
  // | "invited" | "not_invited" | "defected" | "can_return") plus whether an open
  // invitation letter exists (either signal means "eligible"), refetched when the
  // slug or the active character changes.
  const [rawStatus, setRawStatus] = useState<string | null>(null);
  const [hasInvite, setHasInvite] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // The directory list is app-wide cached (#1284), so `faction` is DERIVED from
  // it rather than fetched and mirrored here. That also replaces the old
  // clear-before-refetch: change the slug and the derived match changes with it,
  // with no window where the previous faction is still on screen.
  const allFactions = useFactions();
  const faction: FactionOut | null =
    allFactions?.find((f) => f.slug === slug) ?? null;

  const [members, setMembers] = useState<CharacterOut[]>([]);
  const [tasks, setTasks] = useState<TaskOut[]>([]);
  const [recentPraxis, setRecentPraxis] = useState<PraxisCardOut[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // App-wide cached game config — used for per-faction display-point multipliers.
  const gameConfig = useGameConfig();

  // Theme the page backdrop to this faction (Tier-3 surface #10). Falls back to
  // the global watercolor for factions without a backdrop variant.
  //
  // THE ONE PAGE EXEMPT FROM THE ORNAMENT ALTERNATION (#2195). The law is that a
  // card on an ornamented ground goes plain; the owner carved this page out of
  // it on 2026-08-18 — "for the complex background rule, faction pages are
  // exempt. We can have a busy faction background page with busy task and praxis
  // cards on it." A faction page IS the kit at full volume, so its roster of
  // task and praxis cards keeps every ornament however loud the wall behind it.
  // This leaves `CharacterProfile` as the only route where a card goes plain.
  useFactionBackdrop(slug, { cardsKeepOrnament: true });

  useEffect(() => {
    if (!slug) return;
    // Guard against out-of-order responses: if the slug changes mid-fetch, the
    // stale request must not overwrite the newer faction's data.
    let cancelled = false;
    setEntitiesLoading(true);
    setFetchError(null);
    Promise.all([
      listCharacters({ faction: slug }),
      // `faction` is a repeated union param on both endpoints now — #1364 for
      // tasks, #1362 for praxes. One slug is a one-element union, not a scalar.
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

  // Membership status for this faction — only meaningful with a logged-in
  // character; cleared otherwise so the join block hides.
  useEffect(() => {
    if (!slug || !characterId) {
      setRawStatus(null);
      setHasInvite(false);
      return;
    }
    let cancelled = false;
    // One request, not two: the letters ride on the status payload (#1384),
    // which is the same query the status map was derived from anyway.
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
    slug,
  );

  const join = useCallback(async () => {
    if (!slug) return;
    setJoining(true);
    setJoinError(null);
    try {
      // Membership dresses the whole site off `/auth/me` — faction slug, the
      // level-jump allowance, `albescent_revealed`. The POST now answers that
      // whole object, so adopting it replaces the follow-up `/auth/me` (#1383).
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
    // "Nothing to draw yet" still means both halves: an unresolved directory
    // must not fall through to the not-found state, which is what a settled
    // `entitiesLoading` with `allFactions` still null would do.
    loading: entitiesLoading || allFactions === null,
    faction,
    fetchError,

    members,
    tasks,
    recentPraxis,

    viewerFactionSlug: user?.character?.faction_slug,
    gameFactions: gameConfig?.factions ?? [],

    // The gate is the viewer, not `can_sign_up` — gating on the flag is what
    // made `/tasks` go silent about tasks it was still showing (#1976).
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
