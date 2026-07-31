/**
 * Everyone else in this praxis: finding them, inviting or challenging them,
 * rescinding, kicking, and poking.
 *
 * One search box serves two jobs (#311) — collab invitees while the praxis is a
 * collab, an opponent while a duel is being set up — so the filter, the two
 * "send" calls that clear it, and the roster writes that follow all live
 * together. The two viewer-keyed reads the filter depends on (active foes for
 * ordering, the account's own lives for exclusion) come with it.
 *
 * Split out of `useEditPraxis.ts` (#1392); behaviour unchanged. It reads
 * `useAuth()` directly rather than taking the viewer as a parameter, which is
 * what keeps its three effects inside the #1390 ratchet
 * (`hooks/__tests__/authDepNarrowing.test.ts`): they key on
 * `user?.character?.id`, a value a `/auth/me` refetch cannot disturb, never on
 * the auth object itself — which that endpoint replaces on every answer,
 * changed or not.
 *
 * A star cast was the loudest source of those refetches until #1382 returned
 * the tally from the vote POST and retired it. The rule outlives the example.
 */
import { useCallback, useEffect, useState } from "react";
import {
  cancelInvite as cancelInviteApi,
  getPraxis,
  inviteToPraxis,
  kickMember as kickMemberApi,
  type PraxisOut,
} from "../../api/praxis";
import { getDuelDetail, issueChallenge, type DuelDetailOut } from "../../api/duel";
import { sendNudge } from "../../api/nudge";
import { listCharacters, type CharacterOut } from "../../api/characters";
import { listRelationships } from "../../api/relationships";
import { getMyCharacters } from "../../api/me";
import { useAuth } from "../../auth/AuthContext";
import { extractError } from "../../utils/errors";
import i18n from "../../i18n";

/**
 * Which of the viewer's own lives the invite/opponent picker withholds (#1257).
 *
 * Collab invites withhold only the life you are carrying — inviting your own alt
 * to a collab is doing a task with yourself, which splits no points unfairly and
 * which the backend allows. Duel mode withholds the whole account roster: #1237
 * blocked both sides of a duel landing on one account, so offering an alt as an
 * opponent could only ever earn a 400 on Challenge.
 *
 * `ownCharacterIds` is empty until the lazy `/me/characters` read lands (and
 * stays empty if it fails), so the carried life is unioned in rather than
 * assumed present — the narrow old rule remains the floor.
 */
export function selfExcludedPickIds(
  carriedCharacterId: number | undefined,
  ownCharacterIds: Set<number>,
  duelMode: boolean,
): Set<number> {
  const excluded = new Set<number>(duelMode ? ownCharacterIds : []);
  if (carriedCharacterId != null) excluded.add(carriedCharacterId);
  return excluded;
}

export interface ComposerRoster {
  inviteQuery: string;
  setInviteQuery: (value: string) => void;
  inviteResults: CharacterOut[];
  inviteOpen: boolean;
  setInviteOpen: (value: boolean) => void;
  inviting: boolean;
  sendInvite: (character: CharacterOut) => Promise<void>;
  cancelInvite: (inviteId: number) => Promise<void>;
  kickMember: (memberId: number) => Promise<void>;
  nudge: (characterId: number) => Promise<void>;
  sendChallenge: (character: CharacterOut) => Promise<void>;
}

export function useComposerRoster(options: {
  praxis: PraxisOut | null;
  setPraxis: (praxis: PraxisOut) => void;
  /** The attached duel, for aiming a nudge at the rival's own side. */
  duel: DuelDetailOut | null;
  setDuel: (duel: DuelDetailOut | null) => void;
  /** The challenge pane is open, i.e. the box is picking an opponent. */
  duelPaneOpen: boolean;
  setError: (message: string) => void;
}): ComposerRoster {
  const { praxis, setPraxis, duel, setDuel, duelPaneOpen, setError } = options;
  const { user } = useAuth();

  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<CharacterOut[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [foeIds, setFoeIds] = useState<Set<number>>(new Set());
  // Every life on the viewer's account (#1257) — read lazily when the duel pane
  // opens, since only duel mode withholds them and there is no app-wide cache of
  // the roster to read. Empty until it lands, and on failure.
  const [ownCharacterIds, setOwnCharacterIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user?.character) return;
    listRelationships({ type: "foe", status: "active" })
      .then((rels) => setFoeIds(new Set(rels.map((r) => r.to_character_id))))
      .catch(() => {
        /* foes-first ordering is a nicety; ignore failures */
      });
  }, [user?.character?.id]);

  // The account's own roster, for the duel opponent picker only (#1257). The
  // picker already fetches per keystroke, so one read on a pane the player has
  // just opened costs nothing on mount.
  useEffect(() => {
    if (!duelPaneOpen || !user?.character) return;
    let cancelled = false;
    getMyCharacters()
      .then((roster) => {
        if (!cancelled) setOwnCharacterIds(new Set(roster.map((c) => c.id)));
      })
      .catch(() => {
        /* the carried life stays withheld either way — see selfExcludedPickIds */
      });
    return () => {
      cancelled = true;
    };
  }, [duelPaneOpen, user?.character?.id]);

  // ---- Invite search (debounced via input change handler in caller, but
  // we keep the actual fetch here so archetypes can wire the input directly) ----
  useEffect(() => {
    if (!praxis) return;
    if (inviteQuery.length < 2) {
      setInviteResults([]);
      setInviteOpen(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const results = await listCharacters({
          search: inviteQuery,
          exclude_active_task_id: praxis.task_id,
          limit: 8,
        });
        if (cancelled) return;
        const memberIds = new Set(praxis.members.map((m) => m.character_id));
        const pendingInviteIds = new Set(
          praxis.invites
            .filter((i) => i.status === "pending")
            .map((i) => i.invitee_id),
        );
        // The picker is choosing an *opponent* only while a duel is being set up;
        // with a challenge already attached it is hidden, and otherwise it is
        // choosing collab invitees.
        const pickingOpponent = praxis.duel_id == null && duelPaneOpen;
        const selfExcluded = selfExcludedPickIds(
          user?.character?.id,
          ownCharacterIds,
          pickingOpponent,
        );
        const filtered = results.filter(
          (c) =>
            !selfExcluded.has(c.id) &&
            !memberIds.has(c.id) &&
            !pendingInviteIds.has(c.id),
        );
        // In duel mode, surface the viewer's foes first (soft ordering; anyone
        // eligible can still be challenged).
        if (pickingOpponent && foeIds.size > 0) {
          filtered.sort(
            (a, b) => Number(foeIds.has(b.id)) - Number(foeIds.has(a.id)),
          );
        }
        setInviteResults(filtered);
        setInviteOpen(filtered.length > 0);
      } catch {
        if (!cancelled) {
          setInviteResults([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // `user` narrowed to the id the filter actually reads (#1390) — otherwise
    // every `/auth/me` refetch re-ran the character search behind an open
    // invite box.
  }, [
    inviteQuery,
    praxis,
    user?.character?.id,
    duelPaneOpen,
    foeIds,
    ownCharacterIds,
  ]);

  /** Empty the box the way both "send" paths do: query, results, dropdown. */
  const clearPicker = useCallback(() => {
    setInviteQuery("");
    setInviteOpen(false);
    setInviteResults([]);
  }, []);

  const sendInvite = useCallback(
    async (character: CharacterOut) => {
      if (!praxis) return;
      setInviting(true);
      setError("");
      clearPicker();
      try {
        await inviteToPraxis(praxis.id, character.id);
        const refreshed = await getPraxis(praxis.id);
        setPraxis(refreshed);
      } catch (err) {
        setError(
          extractError(
            err,
            i18n.t("forms:editPraxis.errors.invite", {
              name: character.display_name,
            }),
          ),
        );
      } finally {
        setInviting(false);
      }
    },
    [praxis, setPraxis, setError, clearPicker],
  );

  // Inviter rescinds a still-pending invite (#421).
  const cancelInvite = useCallback(
    async (inviteId: number) => {
      if (!praxis) return;
      setError("");
      try {
        await cancelInviteApi(praxis.id, inviteId);
        const refreshed = await getPraxis(praxis.id);
        setPraxis(refreshed);
      } catch (err) {
        setError(
          extractError(err, i18n.t("forms:editPraxis.errors.rescindInvite")),
        );
      }
    },
    [praxis, setPraxis, setError],
  );

  // Remove another member from the collab (#959). Any member may kick any other
  // (mirrors the backend guard); the confirm step lives in CollabRoster, so this
  // just fires the call and reloads — the kick resets the group to editing, so
  // the refreshed praxis carries the reset roster + cast state (ADR-0013).
  const kickMember = useCallback(
    async (memberId: number) => {
      if (!praxis) return;
      setError("");
      try {
        const updated = await kickMemberApi(praxis.id, memberId);
        setPraxis(updated);
      } catch (err) {
        const kicked = praxis.members.find(
          (member) => member.character_id === memberId,
        );
        setError(
          extractError(
            err,
            i18n.t("forms:editPraxis.errors.kick", {
              name: kicked?.character_display_name ?? "",
            }),
          ),
        );
      }
    },
    [praxis, setPraxis, setError],
  );

  // Poke whoever this praxis is waiting on (#1083). Every rule lives on the
  // server — who may nudge, and the one-per-24h limit — so this fires and then
  // RE-READS. It deliberately keeps no local "nudged" flag: the design's version
  // did exactly that, which made the button read as sent when nothing had been,
  // and let a reload clear it. `nudged_at` on the refreshed roster row / duel
  // side is the only thing the button believes.
  const nudge = useCallback(
    async (characterId: number) => {
      if (!praxis) return;
      setError("");
      // A duel is two linked solo praxes (ADR-0011): the praxis the rival owes
      // is THEIR side, not the one this composer is holding.
      const duelSide =
        duel != null
          ? [duel.challenger, duel.opponent].find(
              (side) => side.character_id === characterId,
            )
          : undefined;
      const targetPraxisId = duelSide?.praxis_id ?? praxis.id;
      const name =
        duelSide?.display_name ??
        praxis.members.find((member) => member.character_id === characterId)
          ?.character_display_name ??
        "";
      try {
        await sendNudge(targetPraxisId, characterId);
        const refreshed = await getPraxis(praxis.id);
        setPraxis(refreshed);
        if (refreshed.duel_id != null) {
          setDuel(await getDuelDetail(refreshed.duel_id));
        }
      } catch (err) {
        setError(
          extractError(err, i18n.t("forms:editPraxis.errors.nudge", { name })),
        );
      }
    },
    [praxis, duel, setPraxis, setDuel, setError],
  );

  // ---- Duel challenge (#311): the same box, picking an opponent ----
  const sendChallenge = useCallback(
    async (character: CharacterOut) => {
      if (!praxis) return;
      setInviting(true);
      setError("");
      clearPicker();
      try {
        await issueChallenge({
          challenger_praxis_id: praxis.id,
          opponent_character_id: character.id,
        });
        // Reload so the praxis carries its new duel_id; the effect fetches detail.
        const refreshed = await getPraxis(praxis.id);
        setPraxis(refreshed);
      } catch (err) {
        setError(
          extractError(
            err,
            i18n.t("forms:editPraxis.errors.challenge", {
              name: character.display_name,
            }),
          ),
        );
      } finally {
        setInviting(false);
      }
    },
    [praxis, setPraxis, setError, clearPicker],
  );

  return {
    inviteQuery,
    setInviteQuery,
    inviteResults,
    inviteOpen,
    setInviteOpen,
    inviting,
    sendInvite,
    cancelInvite,
    kickMember,
    nudge,
    sendChallenge,
  };
}
