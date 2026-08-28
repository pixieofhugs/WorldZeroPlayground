# ADR-0089: Email-less sign-in — ATProto and a public key, both proven by the atp organ

**Status:** Accepted
**Date:** 2026-08-27

## Context

A World Zero account has always arrived through someone else's account: Google,
Discord, or a mailbox (forgot-password is the plain-logic shadow of that). Every
one of those can be lost, suspended, or refused — a player who will not make a
Google account *cannot play*, which is a strange boss for a game about doing
things to have. Issue: an account should be able to be born from something the
player already is: a decentralized identity, or a key their own machine holds.

## Decision

Two new `AuthProvider`s: `ATPROTO` and `KEY`. Neither carries an email; the
column is NULL and the wire shape stays `""`. **The protocol work does not live
in this repo.** It lives in the `atp` organ (`~/projects/atp`, a fundies
daemon): session exchange, resolution ladder, zero-credential challenge scan,
and — since this decision — Ed25519 challenge/verify (openssl one tier below
the organ). `backend/services/atproto_identity.py` is a thin client; the
backend's only authority stays the session law: mint the JWT, key the
tombstone/link machinery on the stable id.

- ATProto `provider_user_id` is the DID. Handles are addresses, not selves.
- Key `provider_user_id` is the base64 raw 32 bytes — the shortest honest name
  a key has.
- Challenges live in the organ's one-shot book, not a browser session row. A
  bad attempt burns the challenge either way; the message carries the realm
  ("World Zero key login v1", `{realm}` at the organ) so a signature minted
  here mints nothing anywhere else.
- **Register is born proven.** `POST /auth/key/register` takes a signature over
  a live challenge, verified BEFORE the link exists: first claimant wins, and a
  link without possession would let an attacker capture every future sign-in a
  stranger's key makes — the hole this lane exists to not have.
- Paused sign-ins (deleted-then-returned players, ADR-0081) flow identically
  here: the XHR lanes answer coded 409 `RETURNING_PLAYER_CONSENT_REQUIRED` and
  the frontend navigates to `/start/again`; the parked payload is the identical
  four fields, so the gate cannot tell which door the returner came through.
- Browser key custody: the pair mints on first use in WebCrypto (Ed25519,
  non-extractable false — exported JWK pair in localStorage under `wz-…`, full
  disclosure on the Settings privacy card). Deleting cookies does not orphan an
  account; moving browsers starts a new key, and re-link from the old browser
  is the transfer.
- No-provider-name copy law (#1738) survives: provider names ride the buttons,
  `signIn.title` frames the stop; the new lanes get lanes, not primacy.

## Consequences

- The email column is nullable from migration 0018; `Account.email == ""` on
  the wire keeps every consumer of the old shape truthful.
- Organ down ⇒ the new lanes answer coded 5xx (`ATPROTO_UNAVAILABLE`);
  redirect-family sign-in never touches it. One organ = one crypto library in
  the warren verifies a signature.
- Coverage floor 92% stands; both lanes' WZ halves are pinned with the organ
  stubbed at the router's bound names — custody, one-shot law, and crypto
  verdicts are the organ's own lanes' burden (`make test` in `~/projects/atp`).
- Any storage write is disclosed (cookiesSection census): the keyring entry
  was ratcheted into KNOWLEDGE the moment `keyLane.ts` shipped.
