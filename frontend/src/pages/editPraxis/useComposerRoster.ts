/**
 * Everyone else in this praxis: finding them, inviting or challenging them,
 * rescinding, kicking, and poking — one at a time or the whole crew at once.
 *
 * One search box serves two jobs (#311) — collab invitees while the praxis is a
 * collab, an opponent while a duel is being set up — so the filter, the two
 * "send" calls that clear it, and the roster writes that follow all live
 * together. The one viewer-keyed read the filter still depends on (active foes,
 * for ordering) comes with it.
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
import { nudgeTheCrew, sendNudge } from "../../api/nudge";
import { listCharacters, type CharacterOut } from "../../api/characters";
import { listRelationships } from "../../api/relationships";
import { useAuth } from "../../auth/AuthContext";
import { extractError } from "../../utils/errors";
import i18n from "../../i18n";

/**
 * What one crew press actually did (#1418).
 *
 * `sent + skipped` is every member the server considered — the whole crew still
 * owing a part, minus you — so both halves are needed to say anything true. The
 * cooldown is per (sender → recipient → praxis) per 24h, which makes a partly
 * refused press the ordinary case rather than an error, and reporting only
 * `sent` would read as "and that was all of them".
 *
 * Counts, not a sentence: the words are the waiting surface's, resolved through
 * `collabCopy` in the faction's voice like every other line it draws.
 */
export interface CrewNudgeResult {
  /** Nudges the server actually wrote. */
  sent: number;
  /** Crew it refused — in this path, always someone inside their 24h window. */
  skipped: number;
}

interface ComposerRoster {
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
  nudgeCrew: () => Promise<void>;
  crewNudge: CrewNudgeResult | null;
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
  const [crewNudge, setCrewNudge] = useState<CrewNudgeResult | null>(null);

  useEffect(() => {
    if (!user?.character) return;
    listRelationships({ type: "foe", status: "active" })
      .then((rels) => setFoeIds(new Set(rels.map((r) => r.to_character_id))))
      .catch(() => {
        /* foes-first ordering is a nicety; ignore failures */
      });
  }, [user?.character?.id]);

  // ---- Invite search (debounced via input change handler in caller, but
  // we keep the actual fetch here so archetypes can wire the input directly) ----
  useEffect(() => {
    if (!praxis) return;
    if (inviteQuery.length < 2) {
      setInviteResults([]);
      setInviteOpen(false);
      return;
    }
    // The picker is choosing an *opponent* only while a duel is being set up;
    // with a challenge already attached it is hidden, and otherwise it is
    // choosing collab invitees.
    const pickingOpponent = praxis.duel_id == null && duelPaneOpen;
    let cancelled = false;
    void (async () => {
      try {
        const results = await listCharacters({
          search: inviteQuery,
          exclude_active_task_id: praxis.task_id,
          // Duel mode withholds the viewer's whole ACCOUNT, not just the life
          // they are carrying: #1237 blocked both sides of a duel landing on one
          // account, so offering an alt could only ever earn a 400 on Challenge.
          // The server answers that (#1385) — it is the only party that knows
          // which characters share an account, and asking it costs no request.
          // Collab invites deliberately do NOT set this: inviting your own alt to
          // a collab is allowed, so only the carried life is withheld below.
          exclude_own_account: pickingOpponent || undefined,
          limit: 8,
        });
        if (cancelled) return;
        const memberIds = new Set(praxis.members.map((m) => m.character_id));
        const pendingInviteIds = new Set(
          praxis.invites
            .filter((i) => i.status === "pending")
            .map((i) => i.invitee_id),
        );
        const filtered = results.filter(
          (c) =>
            c.id !== user?.character?.id &&
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
  }, [inviteQuery, praxis, user?.character?.id, duelPaneOpen, foeIds]);

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

  // Poke everyone the collab is still waiting on, in ONE request (#1418).
  //
  // It sends no recipient list. The server derives the crew from the roster and
  // applies the same per-person 24h window the single form does, which is the
  // whole reason this is not a fan-out of `nudge()` over the outstanding
  // members: that would put the cooldown rule on the client, spend N requests,
  // and leave a half-succeeded press to be reassembled from N rejected promises.
  //
  // A 200 therefore does NOT mean everyone was poked, so the counts are kept and
  // handed to the surface to report. The refresh that follows is the same one
  // `nudge` does and for the same reason: `nudged_at` on the refreshed rows is
  // the only thing the per-row buttons believe.
  const nudgeCrew = useCallback(async () => {
    if (!praxis) return;
    setError("");
    setCrewNudge(null);
    try {
      const results = await nudgeTheCrew(praxis.id);
      setCrewNudge({
        sent: results.filter((result) => result.nudge != null).length,
        skipped: results.filter((result) => result.nudge == null).length,
      });
      setPraxis(await getPraxis(praxis.id));
    } catch (err) {
      setError(extractError(err, i18n.t("forms:editPraxis.errors.nudgeCrew")));
    }
  }, [praxis, setPraxis, setError]);

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
    nudgeCrew,
    crewNudge,
    sendChallenge,
  };
}
