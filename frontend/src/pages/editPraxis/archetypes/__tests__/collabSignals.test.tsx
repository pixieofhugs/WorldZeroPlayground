/**
 * Done, Propose, Approve and Withdraw in the composer footer (#1811, ADR-0079).
 *
 * Two claims, and they are different in kind:
 *
 *  1. **The affordances reach every skin.** Each archetype mounts the footer
 *     itself, so a faction that hand-rolled a submit button of its own would
 *     draw one word where there are now three signals. Rendered per skin,
 *     through the surface map, the way `composerDispatch.test.tsx` proves the
 *     waiting-stage swap.
 *  2. **The words are the same on all nine.** Owner ruling, and a deliberate
 *     exception to ADR-0065's per-faction dressing: workflow state is a
 *     mechanical fact a player must read correctly *in order to act*, and nine
 *     vocabularies for one mechanic means somebody loses work or publishes
 *     early. `collabCopy.test.ts` guards the catalog's shape; this guards the
 *     rendered page, which is where a skin would actually substitute a word.
 *
 * Hidden, never disabled, is the third thing asserted throughout: Propose and
 * Approve are mutually exclusive by construction, and Withdraw has nothing to
 * withdraw while the crew is drafting.
 *
 * Harness note: `renderToStaticMarkup`, no DOM, no effects (SPEC-testing.md).
 * The keystroke confirm is not observable here at all — its rule is proved in
 * `editPraxis/__tests__/proposalGuard.test.ts` and its notice in
 * `bodyProposalLive.test.tsx`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import i18n from "../../../../i18n";
import type { PraxisMemberOut, PraxisOut } from "../../../../api/praxis";
import type { TaskOut } from "../../../../api/tasks";
import type { EditPraxisState } from "../../useEditPraxis";
import { surfaceMap } from "../../../../factions";
import { pickVariant } from "../../../../utils/factionDispatch";
import { resolvedArchetype } from "../../../../factions/lazyArchetype";
import { collabCopy } from "../../../../components/collab/collabCopy";
import { CollabSignals, type PublishButtonSkin } from "../controls";
import DefaultEditPraxis from "../DefaultEditPraxis";

const ME = 1;
const THEM = 2;
const PROPOSED_AT = "2026-08-17T10:00:00Z";

/** Every slug that registers `editPraxis`, plus the two that fall through. */
const SLUGS = [
  null,
  "albescent",
  "coven",
  "ephemerists",
  "everymen",
  "singularity",
  "snide",
  "ua",
  "wow",
];

function member(
  id: number,
  over: Partial<PraxisMemberOut> = {},
): PraxisMemberOut {
  return {
    id,
    praxis_id: 1,
    character_id: id,
    character_display_name: `M${id}`,
    character_avatar_url: "",
    has_submitted: false,
    is_done: false,
    joined_at: "2026-01-01T00:00:00Z",
    nudged_at: null,
    submitted_at: null,
    ...over,
  };
}

function task(slug: string | null): TaskOut {
  return {
    id: 7,
    title: "A Very Human Thing",
    description: "Do a small honest thing.",
    point_value: 20,
    level_required: 1,
    status: "active",
    task_type: "standard",
    primary_faction_slug: slug,
    metatask_faction_slug: null,
    allowed_modes: ["solo", "collab", "duel"],
    eligible_for_current_user: true,
    can_sign_up: true,
  } as unknown as TaskOut;
}

interface Scenario {
  slug?: string | null;
  /** A publish window is open — the difference between Propose and Approve. */
  proposalLive?: boolean;
  /** I have already voted on the live proposal. */
  iApproved?: boolean;
  /** I have ticked "my part is finished". */
  iAmDone?: boolean;
  /** The composer's title box. Empty is the entry state a signup mints (#2484). */
  title?: string;
  markDone?: (isDone: boolean) => Promise<void>;
  propose?: () => Promise<void>;
  publish?: () => Promise<void>;
  pullBack?: () => Promise<void>;
}

function state(scenario: Scenario = {}): EditPraxisState {
  const slug = scenario.slug ?? null;
  const proposalLive = scenario.proposalLive ?? false;
  const praxis = {
    id: 55,
    task_id: 7,
    task_title: "A Very Human Thing",
    task_faction_slug: slug,
    task_point_value: 20,
    type: "collab",
    // `pending` is "a proposal is live" since ADR-0079 — not "sealed", and not
    // "some members are in". The timestamp is what identifies the proposal.
    status: proposalLive ? "pending" : "in_progress",
    submit_proposed_at: proposalLive ? PROPOSED_AT : null,
    moderation_status: "visible",
    duel_id: null,
    created_by_id: ME,
    title: "I helped a stranger",
    body_text: "## What I did\n\nCaught the papers.",
    members: [
      member(ME, {
        has_submitted: proposalLive && (scenario.iApproved ?? false),
        is_done: scenario.iAmDone ?? false,
      }),
      // The proposer implicitly approves (ADR-0079), so a live proposal always
      // has at least one approval on the roster — and with a crew of two, mine
      // is then the last one outstanding.
      member(THEM, { has_submitted: proposalLive }),
    ],
    invites: [],
    media_items: [],
    score: 20,
    metatask_points: 0,
    display_multiplier: 1,
    points_from_votes: 0,
    habit_bonus_points: 0,
  } as unknown as PraxisOut;
  return {
    loading: false,
    phase: "composing",
    praxis,
    task: task(slug),
    error: "",
    setError: () => {},
    title: scenario.title ?? praxis.title,
    setTitle: () => {},
    body: "## What I did\n\nCaught the papers.",
    setBody: () => {},
    media: [],
    fileError: "",
    handleFileChange: () => {},
    removeMedia: async () => {},
    pendingImage: null,
    confirmImageEdit: async () => {},
    cancelImageEdit: () => {},
    reportImageError: () => {},
    switchingMode: null,
    changeMode: async () => {},
    inviteQuery: "",
    setInviteQuery: () => {},
    inviteResults: [],
    inviteOpen: false,
    setInviteOpen: () => {},
    inviting: false,
    sendInvite: async () => {},
    cancelInvite: async () => {},
    kickMember: async () => {},
    nudge: async () => {},
    nudgeCrew: async () => {},
    crewNudge: null,
    duel: null,
    sendChallenge: async () => {},
    cancelDuel: async () => {},
    dissolveDuel: async () => {},
    metatasks: [],
    appliedMetatasks: new Set<number>(),
    appliedMetataskList: [],
    applyingMetatask: null,
    toggleMetatask: async () => {},
    addMetatask: async () => {},
    metataskPickerOpen: false,
    openMetataskPicker: () => {},
    closeMetataskPicker: () => {},
    metataskRemovalTarget: null,
    requestRemoveMetatask: () => {},
    confirmRemoveMetatask: async () => {},
    cancelRemoveMetatask: () => {},
    submitting: false,
    publish: scenario.publish ?? (async () => {}),
    markDone: scenario.markDone ?? (async () => {}),
    propose: scenario.propose ?? (async () => {}),
    saveDraft: async () => {},
    pullBack: scenario.pullBack ?? (async () => {}),
    reopenForEdit: async () => {},
    leaveCollab: async () => {},
    cancel: async () => {},
    collabSuccess: false,
    continueFromCollabSuccess: () => {},
    duelSealOpen: false,
    requestDuelSeal: () => {},
    cancelDuelSeal: () => {},
    pendingConfirm: null,
    acceptConfirm: () => {},
    dismissConfirm: () => {},
    autosaveAt: null,
    setAutosaveAt: () => {},
    autoSubmitDays: 10,
    proposalConfirmArmed: proposalLive,
    confirmProposalEdit: () => {},
    isPublished: false,
    controlsLocked: false,
    modeIsLocked: false,
    showInviteBox: true,
    showMetatasks: false,
    canSealMetatask: false,
    showSealStack: false,
    duelMode: false,
    duelChipVisible: false,
    currentCharacterId: ME,
  } as unknown as EditPraxisState;
}

/** The whole archetype, dispatched the way the page dispatches it. */
function renderSkin(scenario: Scenario): string {
  const slug = scenario.slug ?? null;
  const Archetype = resolvedArchetype(
    pickVariant(surfaceMap("editPraxis"), slug, DefaultEditPraxis),
  )!;
  return renderToStaticMarkup(
    <MemoryRouter>
      <Archetype state={state({ ...scenario, slug })} />
    </MemoryRouter>,
  );
}

const SKIN: PublishButtonSkin = {
  style: {},
  idleLabel: "ARCHETYPE_IDLE",
  busyLabel: "ARCHETYPE_BUSY",
};

interface TestButton {
  props: Record<string, unknown> & { onClick: () => void };
}

/** The group on its own, so a click can be fired without a DOM. */
function signals(scenario: Scenario): TestButton[] {
  const element = CollabSignals({ state: state(scenario), skin: SKIN }) as {
    props: { children: unknown };
  };
  const children = Array.isArray(element.props.children)
    ? element.props.children
    : [element.props.children];
  return children.filter(Boolean) as TestButton[];
}

/** A button's visible words — the primary wraps its label between ornaments. */
function label(button: TestButton): string {
  const children = button.props.children;
  return (Array.isArray(children) ? children : [children])
    .filter((child) => typeof child === "string")
    .join("");
}

function press(scenario: Scenario, words: string): void {
  const button = signals(scenario).find((child) => label(child) === words);
  expect(button, `a button labelled "${words}" renders`).toBeTruthy();
  button!.props.onClick();
}

describe("the three signals reach every skin (#1811)", () => {
  it.each(SLUGS)("%s draws Done and Propose while the crew is drafting", (slug) => {
    const markup = renderSkin({ slug });
    expect(markup).toContain(collabCopy(null, "doneAction"));
    expect(markup).toContain(collabCopy(null, "proposeAction"));
    // Hidden, not disabled: there is no proposal to approve or withdraw.
    expect(markup).not.toContain(collabCopy(null, "approveAction"));
    expect(markup).not.toContain(collabCopy(null, "withdrawAction"));
  });

  it.each(SLUGS)("%s draws Done, Approve and Withdraw once a proposal is live", (slug) => {
    const markup = renderSkin({ slug, proposalLive: true });
    expect(markup).toContain(collabCopy(null, "doneAction"));
    expect(markup).toContain(collabCopy(null, "approveAction"));
    expect(markup).toContain(collabCopy(null, "withdrawAction"));
    // A window is open, so there is nothing left to propose.
    expect(markup).not.toContain(collabCopy(null, "proposeAction"));
  });
});

/**
 * The ruling this issue exists to keep (ADR-0079 § "shared, not
 * faction-skinned"). A skin substituting its own word for a state — "still
 * walking" for *hasn't approved* — is caught here rather than in a browser.
 */
describe("submission status speaks one vocabulary on all nine factions", () => {
  const STATE_KEYS = [
    "doneAction",
    "proposeAction",
    "approveAction",
    "withdrawAction",
  ] as const;

  it.each(SLUGS)("%s renders the shared literal, not a voiced one", (slug) => {
    const drafting = renderSkin({ slug });
    const live = renderSkin({ slug, proposalLive: true });
    for (const key of STATE_KEYS) {
      const shared = collabCopy(null, key);
      // Not "the resolver returned the shared string" — that is
      // `collabCopy.test.ts`. This is "the shared string is on the page".
      expect(collabCopy(slug, key), `${slug} resolves ${key}`).toBe(shared);
      expect(`${drafting}${live}`).toContain(shared);
    }
  });
});

describe("what each signal does", () => {
  it("Done marks me done, and says nothing about consequences", () => {
    const markDone = vi.fn(async () => {});
    press({ markDone }, collabCopy(null, "doneAction"));
    expect(markDone).toHaveBeenCalledWith(true);
  });

  it("Done reverses, which is the whole point of its being separate", () => {
    const markDone = vi.fn(async () => {});
    press({ iAmDone: true, markDone }, collabCopy(null, "doneUndoAction"));
    expect(markDone).toHaveBeenCalledWith(false);
  });

  it("Done reports its state to a screen reader rather than only relabelling", () => {
    expect(signals({ iAmDone: true })[0].props["aria-pressed"]).toBe(true);
    expect(signals({})[0].props["aria-pressed"]).toBe(false);
  });

  it("Propose goes through the confirm, never straight to the endpoint", () => {
    // The only consequential one: it starts a clock on everybody else, and
    // silence is consent. `propose()` is `publish()` behind `askConfirm`.
    const propose = vi.fn(async () => {});
    const publish = vi.fn(async () => {});
    press({ propose, publish }, collabCopy(null, "proposeAction"));
    expect(propose).toHaveBeenCalledTimes(1);
    expect(publish).not.toHaveBeenCalled();
  });

  it("Approve is a vote on the live proposal and asks nothing", () => {
    const propose = vi.fn(async () => {});
    const publish = vi.fn(async () => {});
    press(
      { proposalLive: true, propose, publish },
      collabCopy(null, "approveFinalAction"),
    );
    expect(publish).toHaveBeenCalledTimes(1);
    expect(propose).not.toHaveBeenCalled();
  });

  it("Withdraw cancels the proposal for the group", () => {
    const pullBack = vi.fn(async () => {});
    press({ proposalLive: true, pullBack }, collabCopy(null, "withdrawAction"));
    expect(pullBack).toHaveBeenCalledTimes(1);
  });

  it("says which approval publishes, so nobody has to count the roster", () => {
    // Two members, one already in: mine is the last one outstanding.
    const markup = renderSkin({ proposalLive: true });
    expect(markup).toContain(collabCopy(null, "approveFinalAction"));
  });

  it("drops Approve once I have voted, and keeps Withdraw", () => {
    const labels = signals({ proposalLive: true, iApproved: true }).map(label);
    expect(labels).not.toContain(collabCopy(null, "approveAction"));
    expect(labels).not.toContain(collabCopy(null, "approveFinalAction"));
    expect(labels).toContain(collabCopy(null, "withdrawAction"));
    expect(labels).toContain(collabCopy(null, "doneAction"));
  });
});

/**
 * The title precondition, on the one signal of the three that publishes (#2484).
 *
 * This is where "hidden, never disabled" bends, and deliberately. That rule is
 * about Propose / Approve / Withdraw being mutually exclusive *by construction*
 * — a window is open or it is not — and not about preconditions. Hiding is not
 * available here anyway: a collab composer with no primary at all is worse than
 * the dead end this replaces, and a crew signup is exactly where an untitled
 * praxis comes from (`handleSignup` posts a task id and a type, nothing else).
 */
describe("the crew's primary waits for a title (#2484)", () => {
  function signal(scenario: Scenario, words: string): TestButton {
    const button = signals(scenario).find((child) => label(child) === words);
    expect(button, `a button labelled "${words}" renders`).toBeTruthy();
    return button!;
  }

  it("disables Propose while the write-up is unnamed", () => {
    const button = signal({ title: "" }, collabCopy(null, "proposeAction"));
    expect(button.props.disabled).toBe(true);
    expect(button.props.className).toContain("control-off");
  });

  it("disables Approve too — it is the same endpoint by another name", () => {
    const button = signal(
      { title: "  ", proposalLive: true },
      collabCopy(null, "approveFinalAction"),
    );
    expect(button.props.disabled).toBe(true);
  });

  it("enables it again once the crew names the praxis", () => {
    const button = signal({}, collabCopy(null, "proposeAction"));
    expect(button.props.disabled).toBe(false);
    expect(button.props.className ?? "").not.toContain("control-off");
  });

  // Neither of the other two publishes, so neither goes dead. Done is a social
  // toggle; Withdraw takes a proposal back.
  it("leaves Done live on an untitled draft", () => {
    expect(signal({ title: "" }, collabCopy(null, "doneAction")).props.disabled).toBe(
      false,
    );
  });

  it("leaves Withdraw live on an untitled draft", () => {
    const button = signal(
      { title: "", proposalLive: true },
      collabCopy(null, "withdrawAction"),
    );
    expect(button.props.disabled).toBe(false);
  });

  it("says why, beside the control it disables", () => {
    const markup = renderSkin({ title: "" });
    expect(markup).toContain(
      i18n.t("forms:editPraxis.composer.publishNeedsTitle"),
    );
    expect(markup).toContain('role="status"');
  });

  it("says nothing at all once there is a title", () => {
    expect(renderSkin({})).not.toContain(
      i18n.t("forms:editPraxis.composer.publishNeedsTitle"),
    );
  });
});
