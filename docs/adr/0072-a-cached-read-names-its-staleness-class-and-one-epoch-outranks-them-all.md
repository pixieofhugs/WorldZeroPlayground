# ADR-0072 — A cached read names its staleness class, and one epoch outranks them all

**Status:** Accepted
**Date:** 2026-08-02

**Relates to:** ADR-0027 (Albescent is a secret society), ADR-0042 (era as
ruleset), ADR-0070 (an unanswered obligation lives in the queue, never in the
stream), #1283 (`/game-config` reads no database), #1284 (the shared read-once
cache), epic #1346 (the refetch family), #1347 (the query-cache spike, closed
`wontfix`)

## Context

`hooks/cachedResource.ts` applied one number — `CACHE_TTL_MS = 5 * 60 * 1000` —
to everything it held, and its docstring argued that number as a *staleness
bound*: five minutes is short enough that an era transition or a visibility flip
surfaces on the next navigation, long enough that ordinary browsing is free.

The argument was written for two endpoints and is not portable to a third. Two
things are wrong with leaving it as the module's default.

**It is meaninglessly conservative at one end.** `/game-config` reads no
database at all; it serialises the `CURRENT_ERA` module constant (#1283). Its
answer cannot change while the process is running. Re-reading it every five
minutes cannot discover anything — it is not a cautious bound, it is a bound over
data that has no staleness.

**It is catastrophically permissive at the other.** Nothing stopped the next
author from reaching for the same module for pending collab invites or duel
challenges. A five-minute-old obligation renders a **live Accept button beside a
request that has already been answered**. That is not lag, it is an actionable
lie, and since ADR-0070 the Requests queue is the *single* place an obligation
gets answered — there is no second surface to correct it.

And underneath both: **an era rollover is not a staleness problem at all.**
There is no push channel, and no number can express *"everything I hold is wrong
now"*. Picking a TTL short enough to paper over the rollover was the only tool
the module had, and it is the wrong tool.

## Decision

**Three classes with their own bounds, plus one global epoch that outranks all
three.** `ttlMs` becomes a required argument of `createResourceCache` /
`createCachedResource` — there is no default, so adding a cache forces the author
to name a class.

### Class A — deploy-scoped. `SESSION_TTL_MS`.

`/game-config` and `/factions`.

**The bound is the session, not five minutes.** Not "a long TTL": within one page
session this data cannot change, because changing it takes a deploy.

`/game-config` is the clean case — a module constant, no database. `/factions`
does read the database, and the honest reason it still qualifies is a frontend
one: **the bundle cannot draw a faction it has never heard of.** A new slug needs
an entry in `utils/factions.ts`, its CSS variables in `index.css` and its copy in
`locales/en/factions.json`, all of which ship with the deploy. `POST
/admin/factions` can insert a row at runtime; it cannot make that row renderable.

The exception that matters is not staleness but **viewer scope**: `/factions`
omits Albescent until the account has been revealed to it (ADR-0027), and joining
is what reveals it. That is a mutation, so it is answered as one —
`chooseFaction()` calls `dropAllCaches()`, and so does sign-out, which must not
hand the departing viewer's directory to whoever signs in next in this tab. A TTL
short enough to catch the reveal would have defeated the class.

### Class B — social / ambient. `AMBIENT_TTL_MS`, five minutes.

The leaderboard, another player's profile, the global activity feed.

**Minutes are fine; five is defensible.** What breaks if the bound is exceeded: a
ranking is a few minutes old. Who notices: nobody. None of it is a control the
viewer is about to act on, and none of it is a claim about the viewer's own
obligations. Five is the smallest number that keeps ordinary browsing at zero
requests and caps the worst case near twelve requests/hour/endpoint.

**Nothing is in this class yet.** The leaderboard, profiles and the feed all read
through `useResource`, which does not cache; every mount is a request. The bound
exists so that whoever caches them first does not have to re-derive it — and so
that reaching for five minutes is a decision rather than a habit.

### Class C — obligations. Never TTL'd. Not in this module at all.

Pending collab invites, duel challenges, awaiting submission, and any number the
viewer just moved.

**Invalidated on mutation, never aged out.** This is what `utils/requestsBus`
already does, and it is why it survives #1347's closure rather than being folded
into a general cache: a twelve-line pub-sub that fires on accept, decline,
submit, unsubmit, leave and delete is not a poor imitation of a cache, it is the
correct shape for data whose freshness requirement is *zero*.

### The era rollover — a version key, not a bound

Both `/auth/me` and `/game-config` already carry `era_name`. `utils/cacheEpoch`
remembers the era last seen and, when a response reports a different one, **drops
the entire cache** and advances a version counter. A request already in flight is
stamped with the version it was issued under and refuses to write its answer back
in behind the drop.

This is orthogonal to staleness, which is exactly why the answer is per-resource
TTLs **plus** one epoch rather than either alone. It makes the rollover correct
by construction instead of by choosing a number small enough to hide it.

**Verdict on one-global-policy vs. per-resource policies: both, at different
levels.** Staleness is per resource, because the three classes disagree by orders
of magnitude and the disagreement is the whole point. Invalidation is global,
because an era rollover is a statement about all of it at once.

## Consequences

**Good.** `/game-config` and `/factions` cost one request per page session
instead of one per five-minute window, and the era case they were being re-read
*for* is now handled by the instrument that can actually express it. A mounted
component re-reads on a drop instead of sitting on the old era until something
remounts it. And a new cache cannot be added without naming a class, so the Class
C mistake this ADR exists to prevent has to be made deliberately.

**Bad — the stamp is coarser than the event.** `era_name` is `EraConfig.name`, a
deploy-time constant. `PUT /admin/era/reset` opens a **new `Era` row with the
same name and the same `config_key`**, so a *same-era reset* — the ordinary
scores-to-zero rollover — does not move the stamp and does not drop the cache.

This is survivable only because of what the cache currently holds: everything a
same-era reset changes (scores, levels, vote budgets, resolved duels) reaches the
client through uncached reads. It stops being survivable the moment a Class B
resource is cached, since a stale leaderboard would then outlive the reset that
zeroed it. **The honest key is `Era.id`**, which changes on every reset — and
today it reaches the client only inside an `era_announcement` feed payload, never
as a per-response stamp. Adding it to `/auth/me` is the follow-up this ADR
implies; until then, do not cache anything derived from era-scoped stats.

**Bad — an admin faction-status flip is now invisible until reload.** Under the
old bound it self-healed in five minutes. The trade is accepted on the argument
above: a faction the bundle cannot style or name is not usefully visible anyway.

**Unverified by the suite.** The repo has no DOM harness (`SPEC-testing.md`), so
the mechanics are proved against an injected clock and a hand-built epoch, and
the React wiring — the `onDrop` re-read, the `dropAllCaches()` on sign-out — is
not exercised end to end by any test.

## Alternatives considered

**Keep one global TTL and shorten it.** Rejected twice over: no number is short
enough for Class C (the requirement there is zero, not small), and any number at
all is wasted on Class A. Shortening it also makes the meaningless re-reads of
`/game-config` more frequent, which is the opposite of the fix.

**Adopt a query cache (react-query) and inherit its policy.** That was #1347, and
it is closed `wontfix`. This decision never depended on it: the classes and the
epoch are statements about the *data*, and would have had to be configured into
any library exactly as they are configured into `cachedResource` here.

**Give Class C a very short TTL — five seconds, say — instead of a bus.**
Rejected. It converts a correctness property into a probability, and it costs a
poll on a surface (the Requests queue) whose entire premise under ADR-0070 is
that it is the one place the answer is given. The mutation is already observed
locally; there is nothing to discover by asking again.

**Put the era stamp in `localStorage` so it survives a reload.** Rejected as
solving nothing: the cache lives in module scope, so a reload already discards
everything the stamp would have invalidated.
