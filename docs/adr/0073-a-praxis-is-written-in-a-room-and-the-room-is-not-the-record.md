# ADR-0073 — A praxis is written in a room, and the room is not the record

**Status:** Accepted
**Date:** 2026-08-14

**Relates to:** ADR-0011 (a duel is two solo praxes), ADR-0012 (lazy consensus;
"an edit means we're not done"), ADR-0013 (any member may edit), ADR-0059
(submitting holds the composer; re-entry routes through `pullBack`),
ADR-0065 (one composer layout every faction dresses), #360 / #1081 / #1164
(the debounced autosave this retires), #590 (`pullBack`)

## Amendment

The status this record carried until 2026-08-24 read: *"Accepted — **built, except
presence.** The room server and its two auth doors (#1740), the CodeMirror binding (#1742),
the one write path — `body_text` as a derived column, the `PUT` deleted, offline in
`y-indexeddb` (#1743) — and the freeze, with the publish-time discard (#1745), are live.
Still design only: presence (#1744)."*

**2026-08-24 (#2536): the "still design only" half is stale.** Presence shipped —
`frontend/src/pages/editPraxis/roomPresence.ts` is a full module, consumed by
`praxisRoom.tsx` and `archetypes/controls.tsx`, with `__tests__/roomPresence.test.ts` and
`__tests__/roomPresenceContrast.test.ts` beside it. Every part of this record is built.

## Context

Praxis authoring is single-writer by construction. The composer holds title and
body in React state and persists both with one debounced `PUT`
(`useComposerDraft.ts`). On a collab — one shared praxis with many members
(ADR-0013) — two members typing at once is last-write-wins with **no signal to
either of them**: the loser's paragraphs vanish on the next autosave and nothing
in the UI ever said so.

The ask is a Google-Docs-style experience: live co-editing, visible collaborators.
That is a CRDT, and Yjs is the mature one. But dropping Yjs beside the existing
`PUT` collides with three rules this codebase already committed to:

1. **ADR-0012's hard reset** keys on an edit being a *discrete event*. A CRDT
   has no discrete event; text simply moves.
2. **`body_text` is markdown**, rendered by `react-markdown` on every read
   surface. A rich-text editor stops that being true everywhere at once.
3. **Two write paths is the disease this repo has already been bitten by** —
   a rule stated twice and never reconciled (#1692 shipped three prod bugs of
   exactly that shape).

## Decision

**Every praxis is written in a room. The room is a workspace; the praxis is the
record it leaves behind.**

### The room

- A **room** is the live editing space for one praxis: a server-held CRDT
  document plus the members currently connected. `pycrdt` + `pycrdt-websocket`
  mount as an `ASGIServer` route inside the existing FastAPI app — one process,
  one deploy.
- The server **seeds the document from `body_text` exactly once**, when a room
  first opens. Clients never seed. Seeding per-client is the standard Yjs
  duplication footgun: two docs built independently from the same text merge
  into two copies of it.
- `body_text` becomes a **derived column**, flushed on debounce and on freeze.
  It stays markdown. Praxis detail, the feed, search, `react-markdown` and the
  OpenAPI contract are untouched by this ADR — deliberately.
- The title is **one last-write-wins key** in the room's map, not co-edited
  text. A praxis title is 200 characters; character-level interleaving of two
  people typing one produces garbage more often than it helps.

### One write path

Rooms serve **solo, collab and duel parts alike**, and the debounced `PUT`
path — its dirty check, its cancel-then-write flush ordering, its
last-persisted refs — is **deleted**, not kept as a fallback. A fallback is the
second write path wearing a different hat, and it would need a reconciliation
rule for a `PUT` landing behind a room's document.

Offline authoring moves to local persistence (`y-indexeddb`) and syncs on
reconnect — strictly better than today's `PUT`, which simply fails.

### Freeze, not reset

ADR-0012 survives **verbatim**, because the room never has to infer what an
edit is:

- **Drafting** — the room is open; every member co-writes freely.
- **Pending publish** — submitting **freezes** the document read-only for
  everyone. There is nothing to reset, because nothing can change.
- Reopening is **`pullBack()`** (#590), which already exists and already resets
  consensus. ADR-0059 established that re-entry is not a raw write; this makes
  that the only door.

Making it the only door changed it (#1745). `pullBack` on a *pending* collab
cleared the caller's submission alone and left the others' standing, so the
praxis often stayed pending. That was coherent only while typing was the second
door: a member who had pulled back could still write, and their first keystroke
ran ADR-0012's hard reset. With the document frozen until the praxis is drafting
again, a partial pull-back hands a member a write-up they still cannot write in
— and it never had anything to offer the **holdout**, who never submitted and so
had nothing of their own to take back. So reopening a pending collab *is* the
edit ADR-0012 resets on: the window closes, everyone's `has_submitted` clears,
and any member may do it.

### The document is discarded on publish

On publish, the text is flattened to `body_text` and the room's stored document
is **deleted**. `pullBack` re-seeds a fresh one through the same single
server-side seed.

A CRDT retains **tombstones** — text a player typed and deleted stays in the
document's history. Praxes are permanent; their drafts are not, and text a
player removed should not outlive the draft they removed it from.

Squashing is not that guarantee, and it looks enough like one to be worth
writing down (#1745). Folding a document's history re-encodes it and Yjs does
garbage-collect deleted content on the way out — but only once the document
passes the squash threshold, so the raw tail beneath it holds every recent
retraction verbatim. A player who cuts a sentence and submits is exactly the
case that never reaches a squash. Deleting the rows is the only complete answer,
which is why the discard is a delete and never an archive. The **client's** copy
goes with it: `y-indexeddb` holds the same document, tombstones included, and a
surviving local copy merged into the re-seeded room is the duplication footgun
arriving by its back door.

### Authorization has two doors

- **At connect:** `on_connect` decodes the existing `access_token` cookie, runs
  the existing member check against the praxis id in the path, and **validates
  `Origin` by hand** — `CORSMiddleware` does not apply to WebSockets, so the
  allowlist that protects every REST route would silently not protect the room.
  The allowlist is the existing `CORS_ORIGINS` value — one list read in two
  places, never a second copy. A handshake carrying **no `Origin` at all fails
  closed** (non-browser clients send none) unless an explicit test/dev setting
  allows it: cross-site hijacking is browser-only, so this costs nothing real
  and keeps the production rule "a valid known `Origin`, or nothing".
- **At revoke:** kick and leave **close the socket**. A gate checked only on
  the way in is the capability-flag/enforcement drift this codebase has shipped
  before; a removed member must stop writing at removal, not at tab close.

### The editor

`BodyTextarea` becomes **CodeMirror 6** bound with `y-codemirror.next`. It is a
*plain-text* editor, which is the whole point: `body_text` stays markdown, so
`BodyPreview`, the #1181 toolbar and every reader survive. The eight faction
`textareaStyle` skins become CodeMirror themes; the composer is one shared
layout (ADR-0065), so this is one component and eight style objects.

Presence is drawn in **faction colour** via `factionCssVar()` — each co-author's
caret and selection in their own faction's hue, plus a live dot in
`CollabRoster`. Presence state is client-supplied and relayed: it is
**decoration, never authorization**.

### The single-instance constraint

Rooms live in-process, so **exactly one backend instance may run**. ADR-0012's
lazy-on-access timeout already depends on this same fact. It is therefore
stated **once**, here, and cited by both — not restated in two places that can
drift.

Enforcement is a **Postgres session-level advisory lock** taken at boot: an
instance that cannot acquire it exits loudly. A process cannot see its own
replica count, so a bare startup assertion would only catch the multi-*worker*
mistake, not the multi-*instance* one — two replicas each pass their own check
happily. The lock catches a scale-out however it arises (a Render setting, a
stray local uvicorn, a blue-green deploy overlap), at the cost of one
connection held for process life. `render.yaml` declares no instance count and
gets a comment saying why, for the human reading the config.

## Consequences

- The first realtime infrastructure in the app. `EditPraxis` is already a lazy
  route (`App.tsx`), so CodeMirror and Yjs land in a chunk nobody downloads
  unless they open the composer — the payload budget's concern is first paint.
- **Verification moves backend-side.** The frontend harness runs in the `node`
  environment with no DOM ("renderToStaticMarkup needs no DOM"), so an
  effect-driven binding is untestable there by construction, and e2e is
  deliberately not PR-blocking. Seed-once, freeze, flush and both auth doors are
  server rules, and are tested by driving **two `pycrdt` clients at the room**
  in the existing pytest-against-Postgres suite. The frontend keeps
  static-render tests for the eight skins; one nightly two-context Playwright
  spec covers carets.
- Scaling out later needs a broker (or advisory-lock room ownership) **before**
  a second instance, not after.
- `pycrdt-websocket`'s bundled stores are SQLite/file; a Postgres `YStore`
  subclass (`read`/`write`) is ours to write, with a squash policy.

## Alternatives rejected

**Keep the `PUT` for solo, rooms for collab only.** The narrowest change, and
the surface with two humans is the only one with a real problem. Rejected: two
ways to persist a body means every future rule about saving must be stated
twice — the exact defect class that produced #1692.

**Any CRDT update resets consensus.** Truest to "an edit means we're not done"
and needs no freeze UI. Rejected: one stray keystroke silently destroys a
10-day countdown, and awareness traffic has to be carefully excluded from
counting as an edit.

**Tiptap or Quill.** Closest to the literal Google Docs feel. Rejected: it ends
`body_text`-as-markdown, taking the preview pane, the toolbar and every
`react-markdown` reader with it — a far larger blast radius than the feature.

**Keep the document permanently, squashed on a TTL.** Would open the door to
real version history. Rejected: unbounded growth across every praxis ever
written, and indefinite retention of text players deleted.

**A short-lived room ticket instead of the cookie.** Immune to cross-site
hijacking by construction. Rejected as unnecessary: the cookie is host-only on
`api.worldzero.org` and same-site with the frontend, so the handshake already
carries it — an explicit `Origin` check closes the same hole without a new
credential to mint, expire and track.
