/**
 * The na commit label is one step up the ramp (`--text-xl`); Cancel stays on
 * the label tier (#3073, owner ruling: 12px was hard to read at 1080p).
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

// The size token is the same at both widths.
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

/** Every `<button>`: its opening tag and text (read as text; no DOM). */
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
