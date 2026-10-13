/**
 * THE na COMMIT BUTTON IS ONE STEP UP THE LABEL RAMP; CANCEL IS NOT (#3073).
 *
 * Owner ruling, 2026-10-12: 12px bold tracked uppercase monospace was hard to
 * read at 100% on a 1080p display, so the na commit label moves from
 * `--text-lg` to `--text-xl` on the three forms that share
 * `defaultComposerDress`'s `primaryStyle`. Cancel stays on the label tier.
 *
 * The claim is on the RENDERED markup, the way `defaultComposerDressEdges`
 * reads its edges: each page's submit button and its Cancel, read off
 * `renderToStaticMarkup`, enabled and gated.
 */
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../../i18n'
import {
  aCharacter,
  aCreateCharacterState,
  anEditCharacterState,
} from '../../../../test/fixtures'
import { proposeTaskState } from '../../../proposeTask/__tests__/proposeTaskState'

// The phone set: it is the width the one-line question is asked at, and the
// size token is the same at both.
vi.mock('../../../../hooks/useFormFactor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../hooks/useFormFactor')>()),
  useFormFactor: () => 'mobile',
}))

const DefaultCreateCharacter = (await import('../../../characterPaths/archetypes/DefaultCreateCharacter')).default
const DefaultEditCharacter = (await import('../../../characterPaths/archetypes/DefaultEditCharacter')).default
const DefaultProposeTask = (await import('../../../proposeTask/archetypes/DefaultProposeTask')).default

const character = aCharacter({ username: 'molly' })

const ROWS: Array<{ what: string; disabled: boolean; page: ReactElement }> = [
  { what: 'create character, enabled', disabled: false, page: <DefaultCreateCharacter state={aCreateCharacterState()} /> },
  { what: 'create character, gated', disabled: true, page: <DefaultCreateCharacter state={aCreateCharacterState({ canSubmit: false })} /> },
  { what: 'edit character, enabled', disabled: false, page: <DefaultEditCharacter state={anEditCharacterState({ character })} /> },
  { what: 'edit character, gated', disabled: true, page: <DefaultEditCharacter state={anEditCharacterState({ character, canSubmit: false })} /> },
  { what: 'propose a task, enabled', disabled: false, page: <DefaultProposeTask state={proposeTaskState()} /> },
  { what: 'propose a task, gated', disabled: true, page: <DefaultProposeTask state={proposeTaskState({ submitting: true })} /> },
]

/** Every `<button>` on the page: its opening tag and what it says. The suite
 *  runs in node, so the markup is read as text rather than parsed. */
const buttonsIn = (html: string): Array<{ tag: string; text: string }> =>
  [...html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/gs)].map((m) => ({
    tag: m[1],
    text: m[2].replace(/<[^>]*>/g, ''),
  }))

const sizeOf = (tag: string): string | undefined => /font-size:\s*([^;"]+)/.exec(tag)?.[1]

describe.each(ROWS)('the na $what footer', ({ page, disabled }) => {
  const buttons = buttonsIn(renderToStaticMarkup(<MemoryRouter>{page}</MemoryRouter>))
  const commit = buttons.find((b) => b.tag.includes('type="submit"'))
  const cancel = buttons.find((b) => b.text === 'Cancel')

  it('draws the commit label one step above the label tier', () => {
    expect(commit, 'the page has a submit button').toBeDefined()
    expect(/\sdisabled(=|\s|$)/.test(commit!.tag)).toBe(disabled)
    expect(sizeOf(commit!.tag)).toBe('var(--text-xl)')
  })

  it('leaves Cancel on the label tier', () => {
    expect(cancel, 'the footer has a Cancel').toBeDefined()
    expect(sizeOf(cancel!.tag)).toBe('var(--text-lg)')
  })
})
