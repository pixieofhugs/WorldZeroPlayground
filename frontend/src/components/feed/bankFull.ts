import { ErrorCode, extractError, extractErrorCode } from '../../utils/errors'

/**
 * "Was this failure a full task bank?" — the trigger for the drop-to-accept
 * flow (#322, #314).
 *
 * WHY THIS IS A FUNCTION AND NOT AN INLINE `if`. It used to be inline, and it
 * read `err.response.data.detail` raw, outside `extractError`, asking
 * `typeof detail === "string"`. When #1401 turned that `detail` into
 * `{code, message}` the test stayed green — the branch that dies is a UI
 * affordance, not an assertion — and the modal would simply have stopped
 * opening (#1598). Here it is one exported predicate with its own tests, so
 * the next shape change fails loudly.
 *
 * TWO ACCEPTED SHAPES, and the second is not legacy-for-its-own-sake:
 *
 *  - the code, which is what every live backend path now sends. All three
 *    bank-full raise sites are coded — `services/praxis.py::respond_to_invite`
 *    (409, the collab accept this card drives), the shared signup denial
 *    `_signup_denial_to_http` (400), and `services/duel.py` (400).
 *  - the prose, which survives a **deploy skew**. Frontend and API ship
 *    separately, so between the two deploys this bundle talks to a backend
 *    that still answers a bare string. That window is exactly why #1401 is
 *    sequenced client-first, and dropping the prose arm would reintroduce the
 *    outage it is sequenced to avoid — for the same flow, in the same window.
 *    Deletable once no deployed API predates the coded raise.
 *
 * The prose arm reads through `extractError` rather than the response body, so
 * this module never grows the second raw `detail` reader again.
 */
const BANK_FULL_PROSE = 'Task bank is full'

export function isTaskBankFull(err: unknown): boolean {
  if (extractErrorCode(err) === ErrorCode.taskBankFull) return true
  return extractError(err, '').includes(BANK_FULL_PROSE)
}
