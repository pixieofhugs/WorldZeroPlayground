# Hardening the session cookie that carries OAuth state

Research for [#1755](https://github.com/pixieofhugs/WorldZeroPlayground/issues/1755).

Companion to [`oauth-return-to.md`](./oauth-return-to.md), whose §8.1 first surfaced this. That
document asked *how a destination survives the OAuth round trip*; this one asks *how the carrier
itself should be configured*. Where they overlap this document re-verified rather than inherited.

**What this document is.** Facts with sources, and one recommended line. It contains no
implementation — nothing under `backend/` was modified.

---

## The answer, first

```python
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    # Fail closed: Secure unless we KNOW this is local development — the posture
    # routers/auth.py already takes for the access_token cookie.
    https_only=not settings.is_development,
    # This cookie exists to survive one OAuth round trip. Starlette feeds max_age
    # to TimestampSigner.unsign, so this is a server-enforced ceiling on how long
    # an abandoned `state` stays usable — and it is the ONLY such ceiling, because
    # authlib never checks the `exp` it stamps into the value it stores here.
    max_age=600,
    # LOAD-BEARING — do not "harden" this to "strict". The callback is a top-level
    # GET navigation initiated cross-site by the provider; Strict withholds the
    # cookie and sign-in fails with an unhelpful 500.
    same_site="lax",
)
```

`path`, `domain` and `session_cookie` are deliberately left at their defaults; §6 argues each
omission. `settings.is_development` does not exist yet — §7.1 explains why introducing it beats
importing the private `_is_development` from a router.

**The three facts that most constrain this line:**

1. **`max_age` is a server-enforced TTL, not a browser hint** — Starlette passes it to
   `TimestampSigner.unsign()`. And it is the *only* expiry OAuth state has, because authlib stamps
   an `exp` into the stored value and then never reads it on the callback path. Today that means an
   abandoned `state` stays valid for **14 days**.
2. **`SameSite=Lax` is what makes sign-in work at all.** The callback is a cross-site top-level GET
   navigation from the provider. `Strict` is withheld and fails silently.
3. **Nothing in the cookie is secret from the user.** The exposure `Secure` closes is not
   confidentiality — it is a network attacker *planting* a state cookie (§5.2).

---

## 1. What the code does today

Verified against `research/session-cookie-hardening`, branched at `8153e246`. Re-checked against
`origin/main` at `b420a73c`: **no commit newer than the branch point touches** `backend/main.py`,
`backend/routers/auth.py`, `backend/config.py` or `render.yaml`, so every fact below is current.
(The last commit to touch `main.py` at all is `9ec7a39a`.)

| Fact | Where |
|---|---|
| `app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)` — `secret_key` is the only argument. | `backend/main.py:92` |
| `request.session` is read or written **nowhere** in `backend/` outside the middleware import. authlib is its only consumer. | repo-wide grep: `backend/main.py:10,92` are the only hits |
| **Two** providers now ride this cookie, not one. | `backend/routers/auth.py:122-125` (`/google`), `161-167` (`/discord`) |
| Google is registered via OIDC discovery with scope `openid email profile`; Discord is plain OAuth2 with explicit endpoints and scope `identify email`. | `auth.py:42-79` |
| The `access_token` JWT cookie is separately and correctly hardened: `httponly=True`, `samesite="lax"`, `secure=not _is_development()`, `max_age=7 days`, `domain=settings.COOKIE_DOMAIN or None`. | `auth.py:96-107` |
| `_is_development()` is `settings.ENVIRONMENT == "development"`, deliberately fail-closed: anything unrecognised counts as production. | `auth.py:23-38` |
| Production is HTTPS end to end, and `ENVIRONMENT: production` is set. | `render.yaml:29-51` |
| `COOKIE_DOMAIN` is deliberately unset, so cookies are host-only on `api.worldzero.org`. | `render.yaml:52-53` |
| **No test anywhere asserts a cookie flag.** The only `set-cookie` assertion in the suite checks the string contains `access_token`. | `backend/tests/integration/test_auth.py:128-129` |
| **No HSTS** is set on either service, and `start.sh` runs uvicorn with no `--proxy-headers`. | `render.yaml`; `backend/start.sh:36` |

**Installed versions** (`backend/.venv/Lib/site-packages/*.dist-info`): `starlette 1.2.1`,
`fastapi 0.136.3`, `authlib 1.7.2`, `itsdangerous 2.2.0`.

> Starlette really is on a `1.x` line — it reached `1.0.0` on 2026-03-22. `oauth-return-to.md` said
> "starlette 1.2.1" and was right; I doubted it on the assumption Starlette was still `0.x`.

**But the local venv is not what production runs.** Nothing is pinned: `requirements-prod.txt`
lists bare `fastapi`, `authlib`, `itsdangerous`, and `starlette` is not a direct dependency at all —
it arrives via fastapi, whose constraint is an unbounded `starlette>=0.46.0`. A fresh prod image
built today resolves **starlette 1.6.0**. `sessions.py` on `master` is byte-identical to the
installed 1.2.1 in every respect this document relies on (signature, `security_flags`,
`unsign(max_age=...)`, `except BadSignature`), so the drift is harmless here — but it is the reason
§6 checks each kwarg's introduction version rather than assuming availability.

**One piece of history.** Commit `06e96815`, *"Fourteen security findings, fixed"*, added a whole
new `@app.middleware("http")` block to `main.py` directly beneath this line and left
`add_middleware(SessionMiddleware, ...)` untouched. A dedicated security sweep has already walked
past this exact statement once.

---

## 2. What Starlette actually does with each parameter

Read directly from `backend/.venv/Lib/site-packages/starlette/middleware/sessions.py`.
Upstream: <https://github.com/encode/starlette/blob/master/starlette/middleware/sessions.py>

### The signature and its defaults — `sessions.py:16-36`

```python
def __init__(
    self,
    app: ASGIApp,
    secret_key: str | Secret,
    session_cookie: str = "session",
    max_age: int | None = 14 * 24 * 60 * 60,  # 14 days, in seconds
    path: str = "/",
    same_site: Literal["lax", "strict", "none"] = "lax",
    https_only: bool = False,
    domain: str | None = None,
) -> None:
```

| Parameter | Default | Effect |
|---|---|---|
| `session_cookie` | `"session"` | Cookie name. |
| `max_age` | **1209600** (14 days) | `Max-Age` attribute **and** the signature TTL. |
| `path` | `"/"` | `Path` attribute. |
| `same_site` | `"lax"` | `SameSite` attribute. |
| `https_only` | **`False`** | Appends `; secure`. |
| `domain` | `None` | Appends `; domain=…` when set; host-only otherwise. |

The issue's premise is exactly right: with only `secret_key` supplied, the state-bearing cookie
ships as `httponly; samesite=lax` with **no `Secure`**, in production.

### `https_only` never consults the request — `sessions.py:33-34`

```python
self.security_flags = "httponly; samesite=" + same_site
if https_only:  # Secure flag can be used with HTTPS only
    self.security_flags += "; secure"
```

`security_flags` is a string built **once, at construction**. The request scheme is never read.
Two consequences:

1. **No proxy-header dependency.** Render terminates TLS and speaks plain HTTP to the container,
   and `start.sh` passes no `--proxy-headers`. Irrelevant here: `Secure` is emitted because the
   flag says so, not because Starlette detected HTTPS.
2. **The value is frozen at import time**, which is what makes this awkward to test — §8.

### `httponly` is hardcoded

It is a literal in that format string with no parameter behind it. It cannot be turned off, and
nothing wants to: no frontend code reads this cookie.

### Signed, not encrypted — `sessions.py:49-51, 65-67`

```python
data = b64encode(json.dumps(session).encode("utf-8"))   # write
data = self.signer.sign(data)

data = self.signer.unsign(data, max_age=self.max_age)   # read
scope["session"] = Session(json.loads(b64decode(data)))
```

`itsdangerous.TimestampSigner` appends a timestamp and an HMAC; it does not encrypt. The payload is
base64-encoded JSON, and decoding it needs no key at all. The signature stops *tampering*, not
*reading*. Starlette's own docs concede it: "Session information is readable but not modifiable"
(<https://www.starlette.io/middleware/>).

Precision worth keeping: `HttpOnly` still blocks page JavaScript. "Client-readable" means readable
by whoever holds the bytes — a network observer on a plain-HTTP hop, anyone with devtools or the
cookie jar, a malicious extension. §5.1 asks whether that actually matters here.

### `max_age` is a server-enforced TTL

`self.max_age` is used in **two** places:

- the `Max-Age` attribute — `sessions.py:71`, `f"Max-Age={self.max_age}; " if self.max_age else ""`
- **`TimestampSigner.unsign(data, max_age=self.max_age)`** — `sessions.py:49`

itsdangerous raises `SignatureExpired` when the embedded timestamp is older than `max_age`, so a
client that ignores `Max-Age` and replays an old cookie is still rejected server-side. Lowering it
genuinely shortens the window. (<https://itsdangerous.palletsprojects.com/en/stable/timed/>)

Three traps in that mechanism:

- `max_age=None` omits `Max-Age` **and** disables the signature TTL — an unbounded cookie.
- The guard is `if self.max_age`, so `max_age=0` is falsy and behaves like `None`, not
  "expire immediately".
- `TimestampSigner.sign` re-stamps on **every** write (`itsdangerous/timed.py:44-50`), so the
  window slides from the last session *mutation*, not from first issue. For this app that is the
  same instant — the only write is `authorize_redirect` — but it stops being true the moment
  anything else writes to `request.session`.

### An expired or tampered cookie does not fail the request — `sessions.py:52-53`

```python
except BadSignature:
    scope["session"] = Session()
```

The request proceeds with an **empty session**; nothing is logged at this layer. In itsdangerous
2.2.0 the hierarchy is `SignatureExpired` ⊂ `BadTimeSignature` ⊂ `BadSignature` (`itsdangerous/exc.py`),
so this bare `except` swallows expiry along with forgery. Where the failure actually surfaces is §4.

### There is no cookie-size guard

The write path formats and appends the header unconditionally — no 4096-byte check, no warning.
A realistic Google payload measures ~769 B for the whole `Set-Cookie`, so this app is nowhere near
the limit. Noted only because the failure is silent truncation:
[starlette discussion #2414](https://github.com/Kludex/starlette/discussions/2414) is an
unanswered report of exactly that, hit with authlib + FastAPI.

### Reading the session adds `Vary: Cookie`

`sessions.py:62-63` adds it whenever `session.accessed`, and every read of `request.session` marks
accessed (`starlette/requests.py:170-175`). Only the `/auth/*` routes touch it, so nothing
cacheable is affected — but it is worth knowing before anyone reasons about CDN caching there.

---

## 3. What is actually in the cookie, per provider

Read from `backend/.venv/Lib/site-packages/authlib/` (authlib 1.7.2).

The write is three hops. `StarletteAppMixin.authorize_redirect`
(`integrations/starlette_client/apps.py:32-33`):

```python
rv = await self.create_authorization_url(redirect_uri, **kwargs)
await self.save_authorize_data(request, redirect_uri=redirect_uri, **rv)
```

`save_authorize_data` (`apps.py:14-19`) pops `state` out to use as the key; **everything else
becomes the stored value**. `StarletteIntegration.set_state_data` (`starlette_client/integration.py:41-57`)
then writes:

```python
session[f"_state_{self.name}_{state}"] = {"data": data, "exp": now + self.expires_in}
```

with `expires_in = 3600` (`base_client/framework_integration.py:6`). `state` is a 30-character
token (`authlib/oauth2/client.py:155` → `common/security.py:8`).

`data` is the `rv` dict from `_create_oauth2_authorization_url` (`base_client/sync_app.py:276-304`)
minus `state`, plus `redirect_uri`:

| field | present when | our providers |
|---|---|---|
| `redirect_uri` | always | both |
| `url` | always — the **full** authorization URL | both |
| `nonce` | `"openid"` in scope; `generate_token(20)` | **google only** |
| `code_verifier` | `client.code_challenge_method` truthy; `generate_token(48)` | **neither** |

So concretely:

- **google** → `{"redirect_uri": "https://api.worldzero.org/auth/google/callback", "url": "https://accounts.google.com/o/oauth2/v2/auth?…", "nonce": "<20 chars>"}`
- **discord** → `{"redirect_uri": "https://api.worldzero.org/auth/discord/callback", "url": "https://discord.com/oauth2/authorize?…"}`

**Neither provider does PKCE**, and it cannot arrive by accident. Google's discovery document
publishes `code_challenge_methods_supported`, not `code_challenge_method`, so when
`async_app.py:110` splats the metadata into the client constructor, `OAuth2Client.code_challenge_method`
stays at its `None` default and the `if client.code_challenge_method:` guard at `sync_app.py:279`
never fires. This confirms `oauth-return-to.md` §8.4 for both providers rather than one.

**What is not in there:** no `client_secret`, no access token, no refresh token, no `id_token`, no
email, no account id. `auth.py` discards the provider token immediately after use in both callbacks.

---

## 4. Lifetime: the `exp` authlib stamps is decorative

`StarletteIntegration.get_state_data` (`starlette_client/integration.py:19-36`) reads the value and
returns `value.get("data")`. **It never compares `exp` against the clock** — there is no
`time.time()` call on that path. `exp` is read in exactly one place, `_clear_session_state`
(`base_client/framework_integration.py:21-29`), which sweeps *sibling* keys and only runs *after* a
callback has already been processed.

**So authlib's 3600-second expiry does not exist in practice.** The real TTL of an OAuth `state` and
`nonce` is the session cookie's `unsign(max_age=…)` window — **14 days** today. An abandoned sign-in
leaves a replayable `state` for a fortnight.

Two mitigations already in the code, which bound the damage but do not remove the reason to fix it:

- `set_state_data` (`integration.py:53-56`) deletes **every** existing `_state_<name>_*` key before
  writing, regardless of `exp`. So there is at most one in-flight state per provider — and starting
  a second Google sign-in silently invalidates the first, which is the two-tab collision
  `oauth-return-to.md` describes.
- `authorize_access_token` (`apps.py:125-129`) calls `clear_state_data` **unconditionally and before
  validating**, so a successful state is genuinely single-use. `_format_state_params`
  (`sync_app.py:262-274`) then raises `MismatchingStateError` when the data is `None`.

Because the cookie goes empty on a successful callback, Starlette's clear branch
(`sessions.py:76-84`) fires and the cookie is actively deleted. It does not linger after sign-in.

### What `max_age` should be, and what breaks if it expires mid-flow

The value is meaningful only between leaving for the provider and coming back. OWASP's reasoning
applies directly: "The shorter the session interval is, the lesser the time an attacker has to use
the valid session ID"
(<https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html>).

**The failure mode sets the floor, and it is ugly.** On expiry the session is empty (§2), so
`get_state_data` returns `None` and `authorize_access_token` raises `MismatchingStateError`. There
is no `try`/`except` anywhere in `backend/routers/auth.py`, so it propagates to the catch-all
`@app.exception_handler(Exception)` at `main.py:80-86` and the player gets an HTTP **500** with a
raw JSON body — `{"detail": "Something went wrong on our end. Please try again in a moment."}` —
stranded on `api.worldzero.org`, with no way back and no hint to retry sign-in.

That branch already exists today; shortening `max_age` makes it more reachable. It is the same
defect as `oauth-return-to.md` §8.2 (the callback's failure branch answers with JSON from a handler
whose only other outcome is a 302) and deserves its own ticket either way.

**Recommendation: `max_age=600`.** Ten minutes comfortably covers a real consent leg including
account chooser, password entry and 2FA, and matches the order of magnitude providers use for
authorization codes. The defensible band is roughly **300–900**; below ~300 you start failing real
users who hit a password reset or a slow 2FA push mid-flow, and given the failure is a dead-end 500
rather than a graceful retry, the generous end of "short" is the right side to err on. Anything in
that band is a ~2000× improvement on 14 days.

**This lever is free.** `request.session` has no application consumers (§1), so shortening it
cannot log anyone out or drop anything else — the login session is the separate `access_token` JWT
cookie with its own 7-day `max_age`.

---

## 5. Signed-not-encrypted: does it matter here?

### 5.1 Confidentiality — no

Every field in §3 was already in the address bar of the user's own browser. `redirect_uri` is
registered and public. `url` is the URL the browser was just navigated to. `state` and `nonce` were
query parameters on that navigation, and `nonce` comes back inside the `id_token`. The `client_id`
is public by OAuth's own design. There is no credential, no token and no PII in this cookie.

So "signed but not encrypted" is **not** a finding that needs fixing on its own, and encrypting the
session would buy nothing. The issue is right that it is client-readable; that fact just does not
carry the weight it looks like it carries.

### 5.2 Integrity — yes, and this is the real argument for `Secure`

RFC 6265bis §8.6 ("Weak Integrity") is explicit that "the `Secure` attribute does not provide
integrity in the presence of an active network attacker", and §5.7 step 16 gives the partial
protection that does exist: a non-secure cookie **cannot overwrite** a `Secure` cookie of the same
name, domain and path.

Invert that. Without `Secure`, an attacker on any plain-HTTP path can *set* the `session` cookie for
`api.worldzero.org`, and the browser will send it to the HTTPS site — cookies are not isolated by
scheme. That is the classic OAuth login-CSRF: plant a `session` containing the attacker's own
`_state_google_X`, lure the victim to `/auth/google/callback?state=X&code=<attacker's code>`, and
the victim's browser gets signed into the *attacker's* account. Binding `state` to the user-agent
is the entire job of this cookie (authlib's own comment at `integration.py:23-24` cites RFC 6749
§10.12 for it), and no-`Secure` is what re-opens it.

**No HSTS anywhere in the repo** makes this concrete rather than theoretical. Render redirects
HTTP→HTTPS, but the browser attaches the non-`Secure` cookie to that first plain-HTTP request
*before* it ever sees the redirect.

OWASP puts the same point plainly: without `Secure`, attackers "can trick browsers into disclosing
session IDs over unencrypted HTTP, even when HTTPS is available."

---

## 6. Every parameter, decided

| Parameter | Recommendation | Why |
|---|---|---|
| `https_only` | **`not settings.is_development`** | §5.2. Fail closed, matching `auth.py:102`. Available in every Starlette version. |
| `max_age` | **`600`** | §4. The only real TTL OAuth state has. |
| `same_site` | **`"lax"` — stated explicitly** | §6.1. Same as the default; written down because the trap is that `"strict"` looks safer. |
| `path` | **leave `"/"`** | §6.2. |
| `domain` | **leave `None`** | Host-only on `api.worldzero.org` is already right, and matches the deliberate `COOKIE_DOMAIN` decision at `render.yaml:52-53`. Setting it can only widen scope. |
| `session_cookie` | **leave `"session"`** | §6.3 covers the `__Host-` idea and why not. |

Kwarg availability under the unpinned floor: `path` arrived in Starlette **0.19.0** (PR #1512),
`domain` in **0.32.0** (PR #2280), `max_age=None` support in **0.18.0** (PR #1387); `same_site` and
`https_only` predate the file's changelog history. FastAPI 0.136.3 floors starlette at `>=0.46.0`,
so **every kwarg here is guaranteed present** regardless of what pip resolves.
(<https://github.com/encode/starlette/blob/master/docs/release-notes.md>)

### 6.1 `SameSite` — settled, and must not regress

The prior finding holds, re-verified against the spec. RFC 6265bis §5.6.7.1 defines Lax as sending
the cookie with cross-site requests "if and only if they are top-level navigations which use a
'safe' (in the HTTP sense) HTTP method", and Strict as: "Same-site cookies in 'Strict' enforcement
mode will not be sent along with top-level navigations which are triggered from a cross-site
document context."
(<https://www.ietf.org/archive/id/draft-ietf-httpbis-rfc6265bis-20.html>)

Our callback is precisely that excluded case: a **top-level GET navigation triggered by a 302 from
`accounts.google.com` / `discord.com`**. `frontend/src/api/auth.ts:70` starts the flow with
`window.location.href`, and both legs are `@router.get` (`auth.py:122,128,161,169`).

- ✅ `"lax"` — survives. This is why sign-in works today.
- ❌ `"strict"` — cookie withheld, `get_state_data` returns `None`, `MismatchingStateError`, 500.
  **Silent**: nothing logs "the cookie was not sent", and it will pass any test that does not drive
  a real cross-site navigation.
- ⚠️ `"none"` — survives, but requires `Secure` and is strictly weaker than Lax for no gain.

Note that OWASP's cheat sheet recommends "`SameSite=Strict` (preferred) or `SameSite=Lax`" for
session cookies. That guidance is written for a login session cookie, not for an OAuth state
carrier whose entire purpose is to survive a cross-site return. **Following it literally here breaks
sign-in.** This is exactly the kind of line a future hardening pass will quote at this file, which
is why the recommendation writes `same_site="lax"` explicitly with a comment rather than leaving it
implicit in the default.

### 6.2 `path` — a real option, not taken

`path="/auth"` would stop the cookie riding along on every request to every other route, which is
genuine defence in depth: the only writers and readers are `/auth/{google,discord}` and their
callbacks, all under `/auth`.

Not recommended, on balance. It is a latent trap rather than a live one — the day someone adds any
`request.session` use outside `/auth`, it fails as "the session is mysteriously empty", which is
the same confusing signature as the Strict failure. The exposure it closes is small given the
cookie is already `HttpOnly` and host-only and contains nothing secret (§5.1). Worth revisiting if
`/auth` ever grows a wider session, but not worth bundling into this fix.

### 6.3 `__Host-` prefix — checked, and rejected for a specific reason

RFC 6265bis §4.1.3.2 requires a `__Host-`-prefixed cookie to be set with `Secure`, with `Path=/`,
and with **no** `Domain`. Production would satisfy all three for free once `https_only` is on, and
OWASP explicitly calls `__Host-` "Recommended for session IDs".

It still should not be done here. The prefix requires `Secure` **unconditionally**, and our
`https_only` is deliberately `False` in development — a browser rejects a `__Host-` cookie with no
`Secure` outright, so local OAuth sign-in would break entirely. Making the *name* conditional on
the environment as well means the cookie is called different things in different environments, for
a cookie that lives ten minutes and carries no secret. The cost/benefit does not clear.

---

## 7. Also noticed — separate from the fix

Distinguishing what #1755 should change from what it merely reveals.

**Must fix (this issue):** `https_only`, and `max_age`. Nothing else.

### 7.1 `_is_development()` is private, and in the wrong module

`main.py` needs the same predicate `auth.py:37` already has, but it is a private name inside a
router. `main.py` already imports `routers.auth` at line 13, so `from routers.auth import
_is_development` would work — it just imports a private symbol from a router into the app factory
to configure middleware, which is backwards.

`backend/db.py:8` has already open-coded the same comparison a third time
(`settings.ENVIRONMENT == "development"`), without the fail-closed reasoning that `auth.py:23-33`
documents at length.

Cleanest: promote it to `config.py` as a property on `Settings`, keeping that comment with it, and
let `auth.py`, `db.py` and `main.py` all read `settings.is_development`. That is a small refactor
adjacent to the fix; whoever does #1755 should decide whether to bundle it or file it.

### 7.2 An expired or missing state answers 500 with JSON

§4. Pre-existing, made more reachable by a short `max_age`, and the same shape as
`oauth-return-to.md` §8.2. Should be its own ticket: catch `OAuthError` in both callbacks and
redirect to the frontend with an error key.

### 7.3 Nothing tests any cookie flag

§1 and §8. The comment at `auth.py:88-94` already names this fear — "a session cookie that ships
without `Secure`, which nothing in the test suite would notice" — and it is literally what happened
on the other cookie.

### 7.4 No HSTS

§5.2. Not this issue, but it is the reason the missing `Secure` is exploitable rather than
theoretical. Worth a ticket against `render.yaml`.

### 7.5 `CLAUDE.md` still has no routing row for `docs/research/`

`oauth-return-to.md` flagged this when it created the directory. There are now two documents here
and the routing table still has no row. Grep confirms: no match for "research" in `CLAUDE.md`.

---

## 8. Testing the fix

The value is frozen at import (§2), so `monkeypatch.setattr(settings, "ENVIRONMENT", "production")`
— the pattern `tests/integration/test_dev_login.py:120` already uses — **cannot** exercise this.
`add_middleware` ran when `conftest.py` did `from main import app`.

What does work, given `starlette.middleware.Middleware` stores `.cls`, `.args`, `.kwargs`
(`starlette/middleware/__init__.py:21-27`):

```python
session_mw = next(m for m in app.user_middleware if m.cls is SessionMiddleware)
assert session_mw.kwargs["max_age"] == 600
assert session_mw.kwargs["same_site"] == "lax"
assert session_mw.kwargs["https_only"] is (settings.ENVIRONMENT != "development")
```

That pins the wiring and fails loudly if a future edit drops a kwarg — which is the actual
regression to guard against, and the one the suite currently cannot see at all. Exercising the
production branch itself needs `importlib.reload(main)` under a patched environment.

**What does not break.** PR CI (`.github/workflows/test.yml`) sets no `ENVIRONMENT`, so it falls to
the `"development"` default at `config.py:14` and `https_only` resolves to `False`. The integration
client runs at `base_url="http://test"` (`tests/integration/conftest.py:159`), where a `Secure`
cookie would not be echoed back by httpx — but that situation never arises. `e2e.yml:45` sets
`ENVIRONMENT: development` explicitly. Neither suite changes behaviour, and no test today drives a
real OAuth leg at all.

---

## 9. Local development

Local dev is plain HTTP on both sides: `frontend/.env.local:1` sets `VITE_API_URL=http://localhost:8000`,
`config.py:16` defaults `FRONTEND_URL` to `http://localhost:3000`, and `CLAUDE.md` documents
`uvicorn main:app --reload`.

**`Secure` cookies are, in fact, usually fine on `localhost` now.** Browsers moved from a
scheme check to the Secure Contexts definition of a *potentially trustworthy origin*, which includes
`localhost` and `127.0.0.1`. MDN states it directly: the cookie is sent "only when a request is made
with the `https:` scheme (**except on localhost**)", and "the `https:` requirements are ignored when
the `Secure` attribute is set by localhost"
(<https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie>). Firefox
implemented this in [bug 1618113](https://bugzilla.mozilla.org/show_bug.cgi?id=1618113) and Chrome
followed.

**Do not rely on it.** Cross-browser behaviour is documented as inconsistent — the httpwg tracker
carries [an open issue](https://github.com/httpwg/http-extensions/issues/2605) titled *"Inconsistent
browser behavior with secure and prefix cookies on localhost"*, and Chrome's support is described as
partial rather than complete. Betting local sign-in on partially-implemented behaviour, to save one
kwarg, is a bad trade.

**So gate it, exactly as the JWT cookie already does.** `https_only=not settings.is_development`
yields `Secure` in production and no `Secure` on `localhost`, needs no answer to the cross-browser
question, and — the better argument — makes the two cookies say the same thing in the same way.
Divergence between them is what produced this issue in the first place.

The dev seam is unaffected regardless: `dev_login` (`auth.py:339-345`) sets its own cookie with
`secure=False` and never touches `request.session`.

---

## Sources

**Installed source, read directly** (`backend/.venv/Lib/site-packages`; starlette 1.2.1,
authlib 1.7.2, itsdangerous 2.2.0, fastapi 0.136.3):

- `starlette/middleware/sessions.py` — signature and defaults, `security_flags`, sign/unsign, `except BadSignature`, the write and clear paths, absence of a size guard
- `starlette/middleware/__init__.py` — `Middleware.cls` / `.args` / `.kwargs`
- `starlette/requests.py` — `request.session` marks accessed → `Vary: Cookie`
- `authlib/integrations/starlette_client/apps.py` — `authorize_redirect`, `save_authorize_data`, `authorize_access_token`
- `authlib/integrations/starlette_client/integration.py` — `set_state_data` / `get_state_data` / `clear_state_data`
- `authlib/integrations/base_client/framework_integration.py` — `expires_in = 3600`, `_clear_session_state`
- `authlib/integrations/base_client/sync_app.py` — `_create_oauth2_authorization_url`, `_format_state_params`
- `authlib/integrations/base_client/async_app.py` — discovery metadata splat
- `authlib/oauth2/client.py`, `authlib/common/security.py` — `state` / `nonce` generation
- `itsdangerous/exc.py`, `itsdangerous/timed.py` — exception hierarchy, re-stamping on sign

**Specifications and documentation:**

- RFC 6265bis, *Cookies: HTTP State Management Mechanism* (draft-20) — <https://www.ietf.org/archive/id/draft-ietf-httpbis-rfc6265bis-20.html> — §4.1.2.5 + §5.6.5 `Secure`; §5.6.7.1 SameSite Lax/Strict; §4.1.2.2 `Max-Age` precedence over `Expires`; §4.1.3.1/§4.1.3.2 `__Secure-`/`__Host-` prefixes; §5.7 step 16 and §8.6 "Weak Integrity"
- OWASP, *Session Management Cheat Sheet* — <https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html> — Secure, HttpOnly, SameSite, cookie prefixes, idle/absolute timeouts, non-persistent cookies
- Starlette, middleware docs — <https://www.starlette.io/middleware/> — "readable but not modifiable"
- Starlette release notes — <https://github.com/encode/starlette/blob/master/docs/release-notes.md> — `path` 0.19.0, `domain` 0.32.0, `max_age=None` 0.18.0
- itsdangerous, timed signing — <https://itsdangerous.palletsprojects.com/en/stable/timed/>
- MDN, `Set-Cookie` — <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie> — the localhost exception to `Secure`
- Mozilla bug 1618113, *Allow 'secure' cookies when set by localhost* — <https://bugzilla.mozilla.org/show_bug.cgi?id=1618113>
- httpwg/http-extensions issue #2605, *Inconsistent browser behavior with secure and prefix cookies on localhost* — <https://github.com/httpwg/http-extensions/issues/2605>
- Kludex/starlette discussion #2414, silent session-cookie truncation with authlib — <https://github.com/Kludex/starlette/discussions/2414>

**Repo:** `backend/main.py`, `backend/routers/auth.py`, `backend/config.py`, `backend/db.py`,
`backend/start.sh`, `backend/requirements-prod.txt`, `backend/tests/integration/conftest.py`,
`backend/tests/integration/test_auth.py`, `.github/workflows/{test,e2e}.yml`, `render.yaml`,
`frontend/.env.local`, `frontend/src/api/auth.ts`, `docs/research/oauth-return-to.md`.
