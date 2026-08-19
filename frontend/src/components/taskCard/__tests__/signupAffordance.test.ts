/**
 * The task card's action slot, decided (#1976).
 *
 * This suite exists because the render suites cannot ask the one question that
 * matters most: `renderToStaticMarkup` never serialises an event handler, so no
 * markup assertion can tell a button that does nothing from a button that posts
 * a sign-up. The nine skins spread `cta.onPress` onto their button, so the
 * absence of that field IS the un-pressability — and it is checkable right here,
 * value-out.
 */
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import { aTask } from '../../../test/fixtures'
import { taskCardSignupCta } from '../signupAffordance'
import type { TaskOut } from '../../../api/tasks'

/** The one shared verb all nine cards now read (#1911 collapsed the nine). */
const SIGNUP_VERB = i18n.t('feed:taskCard.signup')

/** Every value of `services/praxis.py`'s `SignupDenialReason`. */
const DENIALS = [
  'below_level',
  'task_status_closed',
  'already_active_member',
  'bank_full',
  'is_metatask',
] as const

describe('the card asks for a slot at all', () => {
  it('gives none to a surface that withheld onSignup, however shut sign-up is', () => {
    const shut = aTask({ can_sign_up: false, signup_reason: 'below_level' })
    expect(taskCardSignupCta(shut, undefined)).toBeNull()
  })
})

describe.each(DENIALS)('a %s denial', (reason) => {
  const task = aTask({ can_sign_up: false, signup_reason: reason, level_required: 4 })

  it('carries no press handler — the dead end cannot be reattached by a skin', () => {
    const cta = taskCardSignupCta(task, vi.fn())!
    expect(cta.denied).toBe(true)
    expect(cta.onPress, 'a denied slot has nothing to press').toBeUndefined()
  })

  it('says why, in the words the shared mapper holds, not the sign-up verb', () => {
    const cta = taskCardSignupCta(task, vi.fn())!
    expect(cta.label).not.toBe(SIGNUP_VERB)
    expect(cta.label, 'no unfilled placeholder').not.toContain('{{')
    expect(cta.label.length, 'a reason, not an empty string').toBeGreaterThan(0)
  })
})

describe('a permitted sign-up', () => {
  it('keeps the shared verb and calls the surface back with the task id', () => {
    const onSignup = vi.fn()
    const cta = taskCardSignupCta(aTask({ id: 42 }), onSignup)!
    expect(cta.denied).toBe(false)
    expect(cta.label).toBe(SIGNUP_VERB)
    cta.onPress!()
    expect(onSignup).toHaveBeenCalledWith(42)
  })

  it('says "begin again" for multi_membership, as the detail page already does', () => {
    // Double Dipper: the server ALLOWS the claim and explains why it is unusual.
    // A denial check that read `signup_reason` as "any reason means no" would
    // turn this permit into a dead button, which is the regression this pins.
    const cta = taskCardSignupCta(
      aTask({ signup_reason: 'multi_membership' }),
      vi.fn(),
    )!
    expect(cta.denied).toBe(false)
    expect(cta.onPress).toBeTypeOf('function')
    expect(cta.label).toBe(i18n.t('tasks:detail.signup.ctaAgain'))
  })

  it('falls back to the sign-up verb for a reason this build has never heard of', () => {
    // A backend that ships a sixth ALLOWING reason must not blank the button.
    const cta = taskCardSignupCta(
      aTask({ signup_reason: 'a_gate_from_the_future' }),
      vi.fn(),
    )!
    expect(cta.denied).toBe(false)
    expect(cta.label).toBe(SIGNUP_VERB)
  })

  it('hides rather than lying when sign-up is shut and no reason came with it', () => {
    // A sixth DENYING gate, or any payload where the two fields disagree. The
    // pre-#1976 behaviour was to hide — a card cannot state a reason it has no
    // copy for, and offering the claim anyway is the doomed button the whole
    // issue is about. `pages/tasks/__tests__/dispatch.test.tsx` pins the same
    // invariant end to end.
    expect(
      taskCardSignupCta(
        aTask({ can_sign_up: false, signup_reason: 'a_gate_from_the_future' }),
        vi.fn(),
      ),
    ).toBeNull()
    expect(
      taskCardSignupCta(aTask({ can_sign_up: false }), vi.fn()),
    ).toBeNull()
  })

  it('interpolates the level the viewer is short of', () => {
    const cta = taskCardSignupCta(
      aTask({ can_sign_up: false, signup_reason: 'below_level', level_required: 7 }),
      vi.fn(),
    )!
    expect(cta.label).toBe(i18n.t('tasks:detail.signup.denied.belowLevel', { level: 7 }))
    expect(cta.label).toContain('7')
  })
})


/**
 * #2359 — the one denial that is not a dead end.
 *
 * `already_active_member` means the viewer holds an OPEN DRAFT on this task, so
 * the useful thing is one press away and the card was spending its only slot
 * saying so. The wire now carries the draft's id, and the slot becomes a link
 * to its editor.
 *
 * The seam is still value-out: a `href` a skin can hang on a `<Link>`, and no
 * `onPress`, because navigating is not signing up.
 */
describe('a draft you already hold', () => {
  const held = (overrides: Partial<TaskOut> = {}) =>
    aTask({
      can_sign_up: false,
      signup_reason: 'already_active_member',
      in_progress_praxis_id: 77,
      ...overrides,
    })

  it('offers the draft instead of announcing it', () => {
    const cta = taskCardSignupCta(held(), vi.fn())!
    expect(cta.denied, 'a way in is not a refusal').toBe(false)
    expect(cta.href).toBe('/praxis/77/edit')
    expect(cta.label).toBe(i18n.t('tasks:detail.signup.workOnThis'))
  })

  it('does not sign up — the slot navigates, it does not post', () => {
    const onSignup = vi.fn()
    const cta = taskCardSignupCta(held(), onSignup)!
    expect(cta.onPress).toBeUndefined()
    expect(onSignup).not.toHaveBeenCalled()
  })

  it('falls back to the plain label when there is no draft to land on', () => {
    // Reachable, not theoretical: the denial's population includes `submitted`
    // and `pending` praxes, which shut sign-up with nothing left to edit. A
    // link to /praxis/null/edit is worse than the label it replaced.
    const cta = taskCardSignupCta(held({ in_progress_praxis_id: null }), vi.fn())!
    expect(cta.denied).toBe(true)
    expect(cta.href).toBeUndefined()
    expect(cta.onPress).toBeUndefined()
    expect(cta.label).toBe(i18n.t('tasks:detail.signup.denied.alreadyActiveMember'))
  })

  it('leaves the other four denials alone — an id on the row changes nothing', () => {
    for (const reason of DENIALS.filter((r) => r !== 'already_active_member')) {
      const cta = taskCardSignupCta(
        aTask({
          can_sign_up: false,
          signup_reason: reason,
          in_progress_praxis_id: 77,
          level_required: 4,
        }),
        vi.fn(),
      )!
      expect(cta.denied, reason).toBe(true)
      expect(cta.href, reason).toBeUndefined()
      expect(cta.onPress, reason).toBeUndefined()
    }
  })
})
