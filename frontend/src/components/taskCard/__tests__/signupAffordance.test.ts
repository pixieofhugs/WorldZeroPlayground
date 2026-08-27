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

  it('falls back to the plain label when there is nothing to land on', () => {
    // Reachable, not theoretical: the denial's population also covers a
    // `pending` praxis, which shuts sign-up while awaiting moderation — no
    // draft to edit and nothing filed to read. A link to /praxis/null/edit is
    // worse than the label it replaced. (`submitted` used to land here too;
    // #2643 below gave it its own door.)
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

/**
 * #2643 — the other half of the SAME denial.
 *
 * `already_active_member` covers a filed praxis as well as an open draft, and
 * the filed half kept the greyed refusal after #2359 because the wire named no
 * praxis to reach. It does now, so the slot becomes a link — to the READ page,
 * because `/edit` redirects a submitted praxis straight back to it (#1164,
 * #1397) and a button that changes nothing is the thing this issue is about.
 *
 * The seam is the same one #2359 uses and for the same reason: no markup
 * assertion can tell a live link from a dead label, but a value-out `href` can.
 */
describe('a praxis you have already filed', () => {
  const filed = (overrides: Partial<TaskOut> = {}) =>
    aTask({
      can_sign_up: false,
      signup_reason: 'already_active_member',
      submitted_praxis_id: 91,
      ...overrides,
    })

  it('offers the praxis to read instead of refusing', () => {
    const cta = taskCardSignupCta(filed(), vi.fn())!
    expect(cta.denied, 'a way in is not a refusal').toBe(false)
    expect(cta.href).toBe('/praxis/91')
    expect(cta.label).toBe(i18n.t('tasks:detail.submitted.view'))
  })

  it('links to the READ page, never to the editor that would bounce', () => {
    const cta = taskCardSignupCta(filed(), vi.fn())!
    expect(cta.href).not.toContain('/edit')
  })

  it('does not sign up — the slot navigates, it does not post', () => {
    const onSignup = vi.fn()
    const cta = taskCardSignupCta(filed(), onSignup)!
    expect(cta.onPress).toBeUndefined()
    expect(onSignup).not.toHaveBeenCalled()
  })

  it('says the same words the task detail says', () => {
    // One table, one copy edit. The detail's submitted block reads this very
    // key, so the card and the detail cannot say different things about the
    // same praxis.
    const cta = taskCardSignupCta(filed(), vi.fn())!
    expect(cta.label).toBe('Read your praxis')
  })

  it('prefers the open draft when a viewer somehow holds both', () => {
    // Double Dipper can leave a filed praxis and a live draft on one task. The
    // draft is the one with work left in it, so it keeps the slot — and this
    // is also the no-regression assertion for #2359's behaviour.
    const cta = taskCardSignupCta(
      filed({ in_progress_praxis_id: 77 }),
      vi.fn(),
    )!
    expect(cta.href).toBe('/praxis/77/edit')
    expect(cta.label).toBe(i18n.t('tasks:detail.signup.workOnThis'))
  })

  it('leaves the other four denials alone — a filed id changes nothing', () => {
    for (const reason of DENIALS.filter((r) => r !== 'already_active_member')) {
      const cta = taskCardSignupCta(
        aTask({
          can_sign_up: false,
          signup_reason: reason,
          submitted_praxis_id: 91,
          level_required: 4,
        }),
        vi.fn(),
      )!
      expect(cta.denied, reason).toBe(true)
      expect(cta.href, reason).toBeUndefined()
      expect(cta.onPress, reason).toBeUndefined()
    }
  })

  it('leaves a PERMITTED sign-up alone — Double Dipper still begins again', () => {
    // A faction that may hold several memberships gets `multi_membership` and a
    // live sign-up, filed praxis or not. Turning that into a read link would
    // take away the claim the server is willing to honour.
    const cta = taskCardSignupCta(
      aTask({ signup_reason: 'multi_membership', submitted_praxis_id: 91 }),
      vi.fn(),
    )!
    expect(cta.denied).toBe(false)
    expect(cta.href).toBeUndefined()
    expect(cta.onPress).toBeTypeOf('function')
    expect(cta.label).toBe(i18n.t('tasks:detail.signup.ctaAgain'))
  })
})
