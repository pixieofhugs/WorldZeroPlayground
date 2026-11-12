import { ErrorCode, extractError, extractErrorCode } from '../../utils/errors'

/**
 * Was this failure a full task bank? Triggers drop-to-accept (#322, #314). A
 * tested predicate because an inline raw `detail` read broke silently (#1598).
 *
 * Accepts the code (all live raise sites send it) and the prose, for deploy
 * skew while an older API may still answer a bare string (#1401). Delete the
 * prose arm once no deployed API predates the code. Prose goes through
 * `extractError`, never a raw body read.
 */
const BANK_FULL_PROSE = 'Task bank is full'

export function isTaskBankFull(err: unknown): boolean {
  if (extractErrorCode(err) === ErrorCode.taskBankFull) return true
  return extractError(err, '').includes(BANK_FULL_PROSE)
}
