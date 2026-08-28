# World Zero on fundies — the digestr's roadmap

*Drafted 2026-08-27, after the email-less sign-in lanes shipped (ADR-0089).
Direction, not prediction: the order below is chosen so each leg is where the
last leg's failure would have been discovered.*

## The target

Every rule World Zero enforces lives in fundies organs riding badb; the Python
backend shrinks to a reverse proxy and then to a tombstone; the browser keeps
only its hands — DOM shell and WebCrypto — with domain logic arriving as
fundies→wasm. Postgres stays at first ("don't wanna replace it just yet"); it
leaves only when nothing but name remains. Precedents are warm: page-site and
scathach already run on badb, and the warp… the atp organ is live in the auth
path tonight.

## The gate before everything: the pg organ

fundies speaks no pg wire. The port begins with **`pg` as its own badb organ**
(`~/projects/pg`): lanes = connect/query/execute, results as row kits. Scope is
deliberately minimal — text-format rows, the simple query path, SCRAM-SHA-256
auth (openssl pipes it), no binary codecs, no COPY, no arrays. The wire's core
is small: startup + SASL exchange + a query cycle is a few hundred lines of
fundies; the typing lattice around it is everything else. Lanes in `tests/`
against the dev database pin it the same way the atp organ's lanes pinned it.
**Phase 1 begins when `pg` can answer `SELECT 1` — then a faction name —
byte-proven.**

## Phases

- **Phase 0 — done (2026-08-27).** ATProto + key identity PROTOCOL lives in the
  atp organ; session law, OAuth, and account affairs stay Python. This is the
  standing identity arrangement; phases below do not touch it until later.
- **Phase 1 — the `pg` organ.** The driver above, lane-proven, with a small
  "rows→kits→JSON" surface. Its first customer is a scratch bench, not the app.
- **Phase 2 — one read leaf** on the pg organ: the factions index or the
  character sheet read lane, proxied from Python. Proves read path under real
  traffic; blast radius is one cacheable page.
- **Phase 3 — social cluster** (invitations, letters, feed lanes) and/or
  identity's session law (JWT/cookies/OAuth state) — whichever is riper when 2
  lands; identity was deferred here on purpose (2026-08-27 evening steer: more
  port before the crown moves its home).
- **Phase 4 — praxis + media.** File bytes through badb; resize/complexity is
  subprocess (the organ law: one tier below is where tools live).
- **Phase 5 — the room.** The praxis room's WebSocket is the last and the one
  that may never move: consider an SSE room served by fundies before porting
  the WS handshake; hand-rolled Origin law survives either way.
- **Frontend, throughout.** New surfaces default to fundies→wasm domain
  modules for any logic the rules own (scoring previews, lineage math);
  React stays skin. Existing TS ports only where the logic is a rule
  (never a paint).

## Standing laws for the migration

- **Digest, never rewrite:** every ported lane is reachable through the
  gateway with the Python original one config flag away, until its lane has
  been green in production for a month.
- **Ratchets port too:** openapi dump, schema snapshot, i18n coverage — the
  language changes; the guard shape does not.
- **Schema owns no era rules today and owns none tomorrow:** migrations keep
  running through Alembic until the Python layer is gone.
- **No two of "new runtime / new schema / new behavior" in one leg.**

## Numbers it starts from (2026-08-27)

Backend ~31k LOC Python, 89 endpoints, 18 migrations; frontend ~125k LOC
TS/TSX, 9557 tests; organ path already carries two live lanes. Sizing note
(2026-08-27 evening steer): the pg core is small and the count of *surfaces* is
the true multiplier; page-site's seventeen days bought habits and badb
bench-time that already exist now. Estimate lean, prove in lanes.
