/**
 * Everyone else in this praxis: search, invite/challenge, rescind, kick, nudge.
 * One search box serves collab invitees and duel opponents (#311).
 *
 * Every action returns a {@link RosterOutcome} for `useEditPraxis` to apply
 * (#2880; `__tests__/composerRosterStandsAlone.test.tsx`).
 *
 * Effects key on `user?.character?.id`, never the auth object a `/auth/me`
 * refetch replaces (#1390, `hooks/__tests__/authDepNarrowing.test.ts`).
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
import { nudgeTheCrew, sendNudge, type NudgeResultOut } from "../../api/nudge";
import { listCharacters, type CharacterOut } from "../../api/characters";
import { listRelationships } from "../../api/relationships";
import { useAuth } from "../../auth/AuthContext";
import { extractError } from "../../utils/errors";
import i18n from "../../i18n";

/**
 * What one crew press did (#1418). The 24h per-recipient cooldown makes a
 * partial press normal, so both counts are reported. Words come from `collabCopy`.
 */
export interface CrewNudgeResult {
  sent: number;
  /** Refused: inside their 24h window. */
  skipped: number;
}

/** Each entry has exactly one of `nudge`/`error` (`api/nudge.ts`). Pure for the SSR suite. */
export function summariseCrewNudge(
  results: NudgeResultOut[],
): CrewNudgeResult {
  return {
    sent: results.filter((result) => result.nudge != null).length,
    skipped: results.filter((result) => result.nudge == null).length,
  };
}

/** Read-only facts from the duel pane beside the roster. */
export interface DuelPaneView {
  /** For aiming a nudge at the rival's own side (a duel is two solo praxes, ADR-0011). */
  duel: DuelDetailOut | null;
  /** The box is picking an opponent rather than collab invitees (#311). */
  paneOpen: boolean;
}

/**
 * Assignable to `ComposerOutcome` (`composerOutcome.ts`). `duel` is set after a
 * nudge: the pane's effect keys on `duel_id`, which a nudge never changes.
 * `unchanged` (no praxis yet) leaves the error line as found.
 */
export type RosterOutcome =
  | { kind: "unchanged" }
  | { kind: "failed"; message: string }
  | { kind: "applied"; praxis: PraxisOut; duel?: DuelDetailOut };

const NOTHING_TO_REPORT: RosterOutcome = { kind: "unchanged" };

interface ComposerRoster {
  inviteQuery: string;
  setInviteQuery: (value: string) => void;
  inviteResults: CharacterOut[];
  inviteOpen: boolean;
  setInviteOpen: (value: boolean) => void;
  inviting: boolean;
  sendInvite: (character: CharacterOut) => Promise<RosterOutcome>;
  cancelInvite: (inviteId: number) => Promise<RosterOutcome>;
  kickMember: (memberId: number) => Promise<RosterOutcome>;
  nudge: (characterId: number) => Promise<RosterOutcome>;
  nudgeCrew: () => Promise<RosterOutcome>;
  crewNudge: CrewNudgeResult | null;
  sendChallenge: (character: CharacterOut) => Promise<RosterOutcome>;
}

export function useComposerRoster(options: {
  praxis: PraxisOut | null;
  duelPane: DuelPaneView;
}): ComposerRoster {
  const { praxis, duelPane } = options;
  // Destructured: callers mint the wrapper fresh each render.
  const { duel, paneOpen: duelPaneOpen } = duelPane;
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
        /* foes-first ordering is a nicety */
      });
  }, [user?.character?.id]);

  // Invite search; the fetch lives here so archetypes wire the input directly.
  useEffect(() => {
    if (!praxis) return;
    if (inviteQuery.length < 2) {
      setInviteResults([]);
      setInviteOpen(false);
      return;
    }
    // Opponent only while a duel is being set up; otherwise collab invitees.
    const pickingOpponent = praxis.duel_id == null && duelPaneOpen;
    let cancelled = false;
    void (async () => {
      try {
        const results = await listCharacters({
          search: inviteQuery,
          exclude_active_task_id: praxis.task_id,
          // Duels can't pit one account against itself (#1237), so withhold the
          // viewer's alts server-side (#1385). Collabs allow alts: not set there.
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
        // Duel mode: foes first (soft ordering).
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
    // Narrowed to the id (#1390).
  }, [inviteQuery, praxis, user?.character?.id, duelPaneOpen, foeIds]);

  const clearPicker = useCallback(() => {
    setInviteQuery("");
    setInviteOpen(false);
    setInviteResults([]);
  }, []);

  const sendInvite = useCallback(
    async (character: CharacterOut): Promise<RosterOutcome> => {
      if (!praxis) return NOTHING_TO_REPORT;
      setInviting(true);
      clearPicker();
      try {
        await inviteToPraxis(praxis.id, character.id);
        return { kind: "applied", praxis: await getPraxis(praxis.id) };
      } catch (err) {
        return {
          kind: "failed",
          message: extractError(
            err,
            i18n.t("forms:editPraxis.errors.invite", {
              name: character.display_name,
            }),
          ),
        };
      } finally {
        setInviting(false);
      }
    },
    [praxis, clearPicker],
  );

  // Rescind a pending invite (#421).
  const cancelInvite = useCallback(
    async (inviteId: number): Promise<RosterOutcome> => {
      if (!praxis) return NOTHING_TO_REPORT;
      try {
        await cancelInviteApi(praxis.id, inviteId);
        return { kind: "applied", praxis: await getPraxis(praxis.id) };
      } catch (err) {
        return {
          kind: "failed",
          message: extractError(
            err,
            i18n.t("forms:editPraxis.errors.rescindInvite"),
          ),
        };
      }
    },
    [praxis],
  );

  // Kick a collab member (#959); confirm lives in CollabRoster. The response
  // carries the reset roster + cast state (ADR-0013).
  const kickMember = useCallback(
    async (memberId: number): Promise<RosterOutcome> => {
      if (!praxis) return NOTHING_TO_REPORT;
      try {
        return { kind: "applied", praxis: await kickMemberApi(praxis.id, memberId) };
      } catch (err) {
        const kicked = praxis.members.find(
          (member) => member.character_id === memberId,
        );
        return {
          kind: "failed",
          message: extractError(
            err,
            i18n.t("forms:editPraxis.errors.kick", {
              name: kicked?.character_display_name ?? "",
            }),
          ),
        };
      }
    },
    [praxis],
  );

  // Nudge (#1083). Rules are server-side, so fire then RE-READ: no local
  // "nudged" flag — only the refreshed `nudged_at` is believed.
  const nudge = useCallback(
    async (characterId: number): Promise<RosterOutcome> => {
      if (!praxis) return NOTHING_TO_REPORT;
      // A rival's nudge targets THEIR side's praxis (ADR-0011).
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
        // ponytail: a duel-detail 500 after a good nudge reports only the
        // failure; add `message?` to the arm if "applied AND failed" matters.
        return {
          kind: "applied",
          praxis: refreshed,
          duel:
            refreshed.duel_id != null
              ? await getDuelDetail(refreshed.duel_id)
              : undefined,
        };
      } catch (err) {
        return {
          kind: "failed",
          message: extractError(
            err,
            i18n.t("forms:editPraxis.errors.nudge", { name }),
          ),
        };
      }
    },
    [praxis, duel],
  );

  // Nudge the whole outstanding crew in ONE request (#1418); the server picks
  // recipients and applies the cooldown (not a client fan-out). A 200 may still
  // skip people, hence the counts.
  const nudgeCrew = useCallback(async (): Promise<RosterOutcome> => {
    if (!praxis) return NOTHING_TO_REPORT;
    setCrewNudge(null);
    try {
      setCrewNudge(summariseCrewNudge(await nudgeTheCrew(praxis.id)));
      return { kind: "applied", praxis: await getPraxis(praxis.id) };
    } catch (err) {
      return {
        kind: "failed",
        message: extractError(err, i18n.t("forms:editPraxis.errors.nudgeCrew")),
      };
    }
  }, [praxis]);

  // Duel challenge (#311).
  const sendChallenge = useCallback(
    async (character: CharacterOut): Promise<RosterOutcome> => {
      if (!praxis) return NOTHING_TO_REPORT;
      setInviting(true);
      clearPicker();
      try {
        await issueChallenge({
          challenger_praxis_id: praxis.id,
          opponent_character_id: character.id,
        });
        // Reload for the new duel_id; the pane's effect fetches the detail.
        return { kind: "applied", praxis: await getPraxis(praxis.id) };
      } catch (err) {
        return {
          kind: "failed",
          message: extractError(
            err,
            i18n.t("forms:editPraxis.errors.challenge", {
              name: character.display_name,
            }),
          ),
        };
      } finally {
        setInviting(false);
      }
    },
    [praxis, clearPicker],
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
