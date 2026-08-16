# Carrying a destination through the Google OAuth round trip

Research for [#1734](https://github.com/pixieofhugs/WorldZeroPlayground/issues/1734), part of the
onboarding map [#1732](https://github.com/pixieofhugs/WorldZeroPlayground/issues/1732).

> **Status: none of this was built.** #1734 was superseded — the onboarding arc carries nothing
> through the round trip and remembers its place client-side instead. §7's recommendation is
> live only as an answer to a *future* destination that must survive OAuth. Why the arc went the
> other way: `docs/spec/SPEC-onboarding.md` § Authentication.

**The question.** The intended arc is *scan → read what this is → accept terms → auth → create a
character → do the one task → level 1*. It breaks at the arrow after auth, because the OAuth
callback redirects to one fixed place. How should a destination survive the round trip to Google
and back, and what makes that safe?

**What this document is.** Facts a decision waits on, with sources. It does not decide *what* the
destination should be for a new player — that belongs to the tickets about the flow's shape — and
it contains no implementation. Code fragments below are illustrative, to make a mechanism legible.

**A note on where this lives.** `docs/research/` is a new kind of document in this repo; `CLAUDE.md`'s
routing table has no row for it. If research notes are meant to be discoverable, that table needs one.

---

## 1. What the code does today

Verified against `main` at `21dba581`.

| Fact | Where |
|---|---|
| Leg 1 passes no destination. `authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)` — no `state=`, no extra kwargs. | `backend/routers/auth.py:67` |
| Leg 2 redirects to one hardcoded place. `Response(status_code=302, headers={"location": settings.FRONTEND_URL})` | `backend/routers/auth.py:109` |
| `FRONTEND_URL` has exactly two uses in the whole backend: that line and the docstring above it. | `backend/routers/auth.py:77,109`; `backend/config.py:13` |
| `request.session` is used **nowhere** in `backend/` explicitly. authlib is its only consumer. | repo-wide grep: zero hits |
| The frontend sends the browser to `/auth/google` as a bare full-document navigation with **no query string**, from one function with two call sites (NavBar guest button, Home hero CTA). | `frontend/src/api/auth.ts:68-71`; `frontend/src/components/NavBar.tsx:214`; `frontend/src/pages/Home.tsx:82-85` |
| On return, nothing reads the URL. `RootLanding` renders `FieldDesk` if `useAuth()` resolves a user, `Home` otherwise. No query string, no hash, no token parse. | `frontend/src/App.tsx:68-91` |
| **No test anywhere** exercises `/auth/google` or `/auth/google/callback`. Nothing mocks authlib. The redirect target at `auth.py:109` is unpinned. | `backend/tests/integration/test_auth.py` covers `/auth/me` + `/auth/logout` only; `test_openapi_response_shapes.py:76` merely exempts the two 302s from the body-shape gate |

**The ticket's four premises, checked.** All four hold. Two need a correction of emphasis:

1. ✅ `auth_google` calls `authorize_redirect` with no destination parameter.
2. ✅ `auth_google_callback` returns a 302 to a fixed `settings.FRONTEND_URL` with no `state`/`next`/return-to handling of its own.
3. ✅ Nothing else in the repo carries application state across the OAuth leg — **but** near prior art exists that a design should mirror rather than reinvent (§6).
4. ⚠️ **Two different cookies are in play, and the premise describes the wrong one.** The `access_token` JWT cookie is indeed `httponly`, `samesite=lax`, `secure` outside development (`auth.py:110-121`). The cookie that actually carries OAuth state across the round trip is Starlette's *session* cookie, installed at `backend/main.py:75` as `add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)` — every other argument falls to the library default. Those defaults are `session_cookie="session"`, `max_age=14 days`, `path="/"`, `same_site="lax"`, **`https_only=False`**, `domain=None` (`starlette/middleware/sessions.py:18-36`). So the state-bearing cookie is `httponly; samesite=lax` with **no `Secure` flag, in production**, and it is **signed but not encrypted** — `b64encode(json.dumps(session))` under an `itsdangerous.TimestampSigner`, which the client can read.

---

## 2. How authlib handles `state`

**Version.** `backend/requirements-prod.txt:8` says `authlib` with **no version pin**. Installed and
current is **authlib 1.7.2** (`backend/.venv/Lib/site-packages`), on starlette 1.2.1. Everything
below is read from that installed source. The absence of a pin is itself a decision input: a design
that leans on library internals is a design that can break on a redeploy.

### Leg 1 — `authorize_redirect`

`authlib/integrations/starlette_client/apps.py:22-36`:

```python
async def authorize_redirect(self, request, redirect_uri=None, **kwargs):
    rv = await self.create_authorization_url(redirect_uri, **kwargs)
    await self.save_authorize_data(request, redirect_uri=redirect_uri, **rv)
    return RedirectResponse(rv["url"], status_code=302)
```

Three things follow, and each matters:

- **Extra kwargs do not become stored data.** They go to `create_authorization_url`, which forwards
  unrecognised parameters into the *authorization URL sent to Google*. Only `rv` — the returned
  `{url, state, nonce, code_verifier}` — plus `redirect_uri` reaches `save_authorize_data`. So
  `authorize_redirect(request, uri, next="onboarding")` sends `next` to Google and keeps nothing.
- **`state` is generated unless you supply one.** `OAuth2Client.create_authorization_url`
  (`authlib/oauth2/client.py:144-155`) does `if state is None: state = generate_token()`, and
  `generate_token` (`authlib/common/security.py:8-10`) draws 30 characters from an ASCII set using
  `random.SystemRandom()`. Its own docstring: *"An optional state string for CSRF protection. If not
  given it will be generated for you."* **A caller-supplied `state=` is public, documented API and
  flows through `authorize_redirect` untouched.**
- **`state` is the key, not the payload.** `save_authorize_data` pops `state` and calls
  `framework.set_state_data(request.session, state, kwargs)`, which writes
  `session["_state_google_<state>"] = {"data": …, "exp": now + 3600}`
  (`starlette_client/integration.py`).

### Leg 2 — `authorize_access_token`

`authlib/integrations/starlette_client/apps.py`:

```python
state_data = await self.framework.get_state_data(request.session, params.get("state"))
await self.framework.clear_state_data(request.session, params.get("state"))
params = self._format_state_params(state_data, params)
```

and `_format_state_params` (`authlib/integrations/base_client/sync_app.py:274-286`) opens with
`if state_data is None: raise MismatchingStateError()`.

**So the CSRF check is exactly this: was the returned `state` string a key in *this browser's*
session?** authlib's own comment in `integration.py` says the session entry exists *"to prove the
callback originates from the user-agent that started the flow (RFC 6749 §10.12)"*. It is not a
signature check and not a comparison against a single stored value — it is a dictionary lookup in a
per-browser store.

### Consequences worth writing into a spec

- **Application data may ride in `state` without breaking its CSRF role — provided the string stays
  unguessable.** The property that stops login-CSRF is that an attacker cannot produce a `state`
  that is already a key in the victim's session. `f"{random}.{destination}"` keeps that; a
  predictable `state="onboarding"` destroys it, and destroys it in the worst way: a victim who has
  a flow in progress would accept the attacker's authorization code and be silently signed into the
  attacker's account.
- **State data is read and then cleared, and never returned.** Anything stashed via authlib's store
  must be read *before* `authorize_access_token` runs, using `framework.get_state_data` — a
  semi-internal call, against an unpinned dependency.
- **One in-flight flow per browser.** `set_state_data` pops *every* existing `_state_google_*` key
  before writing the new one, commented *"clear old state data to avoid session size growing"*.
  Two tabs starting sign-in concurrently means the first tab's callback fails. This is already true
  today; no return-to design makes it worse, but none can fix it either without moving state
  storage to a cache backend.
- **The 3600s `exp` is not enforced on read.** `FrameworkIntegration.expires_in = 3600` is stamped
  into the stored dict, but the Starlette `get_state_data` returns `value.get("data")` without
  checking it; expiry is only swept opportunistically inside `clear_state_data`. The practical
  lifetime of a stashed value is the session cookie's 14-day `max_age`.

---

## 3. Does the carrier survive the return from Google?

The callback request is a **top-level GET navigation initiated by a 302 from `accounts.google.com`**
— a cross-site context, whatever the relationship between the frontend and the API.

`SameSite=Lax` is defined to carve out exactly this case: cookies are sent with cross-site requests
*"if and only if they are top-level navigations which use a 'safe' … HTTP method"*
(RFC 6265bis §5.6.7.1; MDN says the same, listing top-level navigation + safe method as the two
criteria). So:

- ✅ **`SameSite=Lax` survives.** This is why the current flow works at all — authlib's state comes
  back in the `session` cookie.
- ❌ **`SameSite=Strict` does *not* survive, and fails silently.** The initiator is Google, so the
  cookie is withheld, `get_state_data` returns `None`, and the player gets `MismatchingStateError`.
  This is the trap: Strict is the instinctively "safer" choice and it breaks the flow.
- ✅ `SameSite=None; Secure` survives, and is strictly weaker than Lax here for no gain.

**Production topology.** `render.yaml` sets `FRONTEND_URL=https://worldzero.org`,
`GOOGLE_REDIRECT_URI=https://api.worldzero.org/auth/google/callback`, and deliberately leaves
`COOKIE_DOMAIN` unset so the session cookie is host-only on `api.worldzero.org`. Frontend and API
are **different origins but the same registrable domain** — cross-origin, same-site. That matters
for the JWT cookie's journey, but it does not rescue Strict on the callback leg, because the
relevant site comparison there is against Google.

---

## 4. The carriers, and what each costs

| # | Carrier | Survives the return? | Cost |
|---|---|---|---|
| **A** | **The `state` value itself** — supply `state=f"{random}.{key}"` to `authorize_redirect` | ✅ Google echoes `state` back verbatim | Public, documented authlib API; no session bookkeeping; the destination is **bound to this flow** for free. The key becomes visible to Google (URL, its logs) and to anyone reading the address bar. The random half must carry at least the entropy authlib would have used. |
| **B** | **A World Zero key in the same Starlette session** — `request.session["wz_destination"] = key` | ✅ same cookie, same Lax rule | Touches no authlib API at all; survives `set_state_data`'s prefix sweep (it only clears `_state_google_*`). But it is **not bound to a flow**: an abandoned sign-in leaves a stale value that a later, unrelated sign-in would consume. Binding requires generating `state` yourself anyway — i.e. A's mechanism plus a second store. |
| **C** | **authlib's own state-data store** — two-step `create_authorization_url` + `save_authorize_data(..., destination=key)` | ✅ same cookie | Bound to `state` for free. Requires calling `framework.get_state_data` in the callback *before* `authorize_access_token`, because that method reads and clears without returning the data. That is semi-internal API against an **unpinned** dependency. |
| **D** | **A separate short-lived signed cookie** set by the backend on leg 1 | ✅ if `Lax` or `None; Secure` | A second cookie, a second signing scheme, and a second expiry to maintain, when a signed session cookie is already installed and already crossing the same boundary. Buys nothing B does not. |
| **E** | **A `SameSite=Strict` cookie** | ❌ **silently withheld** — see §3 | — |
| **F** | **A query parameter on the redirect URI** — vary `GOOGLE_REDIRECT_URI` per flow | ❌ | Redirect URIs are matched by exact string comparison (RFC 9700 §2.1; Google enforces registration), so every variant would need registering. authlib also stores `redirect_uri` in the state data and replays it at token exchange, where it must match again. |
| **G** | **Frontend `sessionStorage`** — stash before `window.location.href = …/auth/google`, read after landing | ✅ if the player returns to the same tab and origin | Needs **no backend change at all**, and the open-redirect surface never leaves the frontend's own router. Breaks if the flow completes in a different tab or on a different device. Still needs the same allow-list before `navigate()`. Worth naming because it is the cheapest thing that could work, and because a hybrid is plausible: the backend decides the *new-player* destination, the frontend remembers *"I was reading task 42"*. |
| **H** | **Carry nothing; derive it** | n/a | The callback already knows whether the account is new — `create_or_get_account` (`auth.py:96-101`) runs before the redirect is built. For the arc in #1732, a brand-new account's destination is deterministic. **Zero open-redirect surface, zero new plumbing.** It cannot express "resume what I was doing", and it cannot distinguish "arrived via QR code" from "clicked Login in the nav". |

---

## 5. The security constraint: open redirects

This is the exact shape that produces one. A callback that takes something from the client and puts
it in a `Location` header is the textbook open redirector, and in an OAuth callback it is worse than
usual: an open redirector on a registered redirect URI is a known vector for exfiltrating
authorization codes.

**The normative rule.** RFC 9700 (*OAuth 2.0 Security Best Current Practice*, January 2025) §2.1:

> Clients and authorization servers MUST NOT expose URLs that forward the user's browser to
> arbitrary URIs obtained from a query parameter (open redirectors).

restated for redirect-URI hosts in §4.1.3 — web servers hosting redirection URIs MUST NOT expose
open redirectors — and §4.11 requires that clients only redirect where the target is allowed or the
request's origin and integrity can be authenticated.

**On putting the destination in `state`, the RFC is explicit that this is a contemplated use** —
§4.7.1: *"If `state` is used for carrying application state, and the integrity of its contents is a
concern, clients MUST protect `state` against tampering and swapping."* Google's own OAuth
web-server guide says the same in its own words: `state` may be used *"for several purposes, such as
directing the user to the correct resource in your application, sending nonces, and mitigating
cross-site request forgery."*

**OWASP's mitigation, which is the one to spec:**

> Where possible, have the user provide short name, ID or token which is mapped server-side to a
> full target URL. This provides the highest degree of protection against the attack tampering with
> the URL.

### Concretely enough to write into a spec

1. **The only thing that crosses the wire is a member of a closed set** defined in backend Python —
   an `Enum` or a module-level mapping, not a path and never a URL. The repo's conventions already
   forbid bare string literals for domain values.
2. **The entrance validates too.** `GET /auth/google?destination=<key>` accepts the key only if it
   is in the set; anything else is dropped, not echoed, not errored.
3. **The callback maps key → constant.** The `Location` header is built from `settings.FRONTEND_URL`
   plus a **literal relative path taken from the mapping's values**. No string that originated with
   the client is ever concatenated into it.
4. **Unknown, missing, or malformed ⇒ the default destination.** Never an error page, never an echo.
5. **Never accept a path, and never accept a URL.** This retires the whole class in one move — no
   scheme check, no host check, no `//` check, no backslash check, no percent-decoding round, no
   `urljoin` subtleties. (Worth naming why: `urljoin("https://worldzero.org", "//evil.com")` yields
   `https://evil.com`. Joining *constants* is safe; joining *inputs* is the bug. The rule above
   means only constants are ever joined.)
6. **If a mapping value ever needs a parameter** (`/tasks/{id}`), the parameter is typed and
   validated server-side (an `int`), never interpolated from a raw string.
7. **"Resume where I was" is a frontend concern.** If that is ever wanted, the frontend remembers it
   and routes itself (carrier G). It must not become a path travelling through the backend's
   `Location` header.

---

## 6. Prior art in this repo

**Nothing round-trips state across the OAuth leg.** But three existing patterns are directly
relevant, and a design that ignores them will reinvent them badly.

**`?login=required` — a bounce that carries a *reason* and discards the *destination*.**
`ProtectedRoute` does `<Navigate to="/?login=required" replace />`
(`frontend/src/auth/ProtectedRoute.tsx:52`); `Home` reads it with
`searchParams.get('login') === 'required'` (`frontend/src/pages/Home.tsx:54-55`) and renders a
notice. The path the guest was trying to reach is thrown away — no `location.state.from`, no
capture of `location.pathname`. Pinned by `frontend/src/auth/__tests__/protectedRoute.test.tsx:148`.
This is the natural second consumer of any return-to mechanism, and the natural second ticket.

**`Admin.tsx` — the repo's existing "validate an untrusted URL fragment against a closed set".**
`getInitialTab()` (`frontend/src/pages/Admin.tsx:13-17`) reads `window.location.hash`, checks it
against a `TABS` allow-list, and falls back to a default. This is precisely the shape §5 asks for,
already written once in this codebase, on the frontend side.

**`homeDestinations.ts` — the repo's existing "one constant per internal destination".**
`FIND_TASK_LINK = '/tasks?can_sign_up=1'`, `CAST_VOTES_LINK = '/praxis?voted=no'`, `UPDATES_LINK`
(`frontend/src/pages/fieldDesk/homeDestinations.ts:35,45,55`), each pinned by a test that feeds the
URL back through the destination page's own reader. A backend-side destination map would be the
same idea one layer down, and the two will want to agree.

**How the frontend would read a resumed destination.** It would not need to. If the backend redirects
to `FRONTEND_URL + path`, the browser lands on a real route and React Router resolves it — the app
needs no post-OAuth handoff code at all. The full route list is `frontend/src/App.tsx:110-188`; there
is **no `/login` or `/auth/*` frontend route and no `*` 404 route**, so a destination map must only
name paths that exist. The one signal that exists today, `hadSessionLastVisit()`
(`frontend/src/auth/AuthContext.tsx:60-66`, reading `localStorage['wz_session_hint']`), is documented
as *a hint, never an authority* and only picks which chunk to prefetch.

---

## 7. Recommendation

**Carry an opaque key from a closed server-side set, inside the OAuth `state` value (carrier A), and
map it to a constant path in the callback.**

The mechanism, at spec level:

- Leg 1 accepts `?destination=<key>`, validates the key against the closed set, drops anything else,
  generates `state = f"{secrets.token_urlsafe(32)}.{key}"`, and passes it through the public
  `state=` kwarg of `authorize_redirect`.
- Leg 2 calls `authorize_access_token` **first**. Only after it returns — which proves the whole
  `state` string was a key this server wrote into this browser's session — does the callback split
  the string and look the key up in the destination map. The `Location` header is
  `FRONTEND_URL` + the map's constant value, defaulting to `/`.

**Why this one:**

- **The integrity requirement of RFC 9700 §4.7.1 is satisfied structurally, not by adding a
  signature.** A tampered or swapped `state` is simply not a key in the session, so
  `_format_state_params` raises before the destination is ever parsed. Nothing needs signing because
  nothing is trusted until authlib's own check has passed.
- **The destination is bound to the flow.** Carrier B's failure mode — a stale value from an
  abandoned sign-in consumed by a later one — cannot occur, because the key and the CSRF token are
  the same string.
- **It uses only stable public API.** `state=` is documented on `create_authorization_url` and flows
  through `authorize_redirect` unchanged. Given `requirements-prod.txt` pins no authlib version,
  this matters more here than it would elsewhere: carrier C's `framework.get_state_data` is the kind
  of call a minor release can move.
- **It is what the provider documents.** Google names "directing the user to the correct resource in
  your application" as a use of `state`.

**Its one real cost, stated plainly:** the destination key becomes visible to Google and in the
address bar. For keys like `onboarding` that is not a disclosure; if a future key would be
(a character id, a task id), that is the moment to move the payload to carrier B or C and keep only
the random half in `state`.

**The cheaper thing to consider first.** If the answer to "what should the destination be?"
(#1732's other tickets) turns out to be *"whatever a brand-new account needs, always"*, then
**carrier H — derive it, carry nothing — needs no mechanism at all.** The callback already knows
whether the account is new before it builds the redirect. Carrier A is the right answer to *"the
destination varies by how the player arrived"*; it is over-built for *"new players go one place"*.
That question is decided elsewhere, and this recommendation should be read as conditional on it.

---

## 8. Adjacent findings, each arguably its own ticket

Surfaced while verifying the above. Not decisions this ticket should make.

1. **The session cookie has no `Secure` flag in production.** `main.py:75` passes only `secret_key`,
   so `https_only` defaults to `False` (`starlette/middleware/sessions.py:31-33`). The deployment is
   HTTPS-only so the practical exposure is small, but this is the cookie that carries OAuth state
   and would carry any return-to value. `auth.py` already got this right for the JWT cookie, with a
   fail-closed `secure=not _is_development()` and a comment explaining why. The session middleware
   never received the same treatment.
2. **The callback's failure branch answers with JSON.** The unverified-email guard does
   `raise_coded(403, ErrorCode.oauth_email_unverified, …)` (`auth.py:87-93`) *from inside a handler
   whose only other outcome is a 302*. A player hitting it sees a raw JSON body, not a page. Any
   return-to design has to decide what this branch does — and the answer is probably "redirect to
   the frontend with an error key", which is the same mechanism as the success path.
3. **The redirect target is untested.** No test in the repo calls either OAuth leg or mocks authlib.
   Whatever is built here should arrive with the first test that pins `auth.py:109`.
4. **PKCE is not in use.** `client_kwargs={"scope": "openid email profile"}` (`auth.py:44-50`) sets
   no `code_challenge_method`, so `_create_oauth2_authorization_url` skips the verifier
   (`sync_app.py:277-284`). RFC 9700 §2.1.1 requires PKCE for public clients; this is a confidential
   client, so it is not a violation, and the OIDC `nonce` *is* generated and checked. Noted because
   §4.7.1 names PKCE as an alternative CSRF protection, and a reader of this document will wonder.

---

## Sources

Primary, in the order they are relied on.

**Installed source, read directly** (`backend/.venv/Lib/site-packages`, authlib 1.7.2 / starlette 1.2.1):
- `authlib/integrations/starlette_client/apps.py` — `authorize_redirect`, `save_authorize_data`, `authorize_access_token`
- `authlib/integrations/starlette_client/integration.py` — `set_state_data` / `get_state_data` / `clear_state_data`
- `authlib/integrations/base_client/framework_integration.py` — `expires_in = 3600`
- `authlib/integrations/base_client/sync_app.py` — `_format_state_params`, `_create_oauth2_authorization_url`
- `authlib/oauth2/client.py` — `OAuth2Client.create_authorization_url`
- `authlib/common/security.py` — `generate_token`
- `starlette/middleware/sessions.py` — `SessionMiddleware` defaults

**Specifications and vendor documentation:**
- RFC 9700, *Best Current Practice for OAuth 2.0 Security* — <https://www.rfc-editor.org/rfc/rfc9700.html> (§2.1 open redirectors and exact redirect-URI matching; §4.1.3; §4.7.1 CSRF and application state in `state`; §4.11)
- RFC 6265bis, *Cookies: HTTP State Management Mechanism*, §5.6.7.1 — <https://www.ietf.org/archive/id/draft-ietf-httpbis-rfc6265bis-20.html> (SameSite "Lax" enforcement)
- MDN, `Set-Cookie` `SameSite` — <https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite>
- OWASP, *Unvalidated Redirects and Forwards Cheat Sheet* — <https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html>
- Google Identity, *Using OAuth 2.0 for Web Server Applications*, "Step 1: Set authorization parameters" — <https://developers.google.com/identity/protocols/oauth2/web-server>
- Authlib, Starlette integration — <https://docs.authlib.org/en/v1.7.0/oauth2/client/web/starlette.html> (thin on `state`; the installed source above is the authority used here)

**Repo:** `backend/routers/auth.py`, `backend/main.py`, `backend/config.py`, `backend/requirements-prod.txt`,
`render.yaml`, `frontend/src/api/auth.ts`, `frontend/src/App.tsx`, `frontend/src/auth/ProtectedRoute.tsx`,
`frontend/src/pages/Home.tsx`, `frontend/src/pages/Admin.tsx`, `frontend/src/pages/fieldDesk/homeDestinations.ts`.
