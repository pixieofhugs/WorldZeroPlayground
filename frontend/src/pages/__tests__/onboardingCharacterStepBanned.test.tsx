import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { character_creation_banned: true } }),
}))
vi.mock('../characterPaths/useCreateCharacter', () => ({
  useCreateCharacter: () => ({}),
}))

const CharacterStep = (await import('../onboarding/CharacterStep')).default

describe("the flow's character step for a creation-banned account", () => {
  it('shows the notice, not the form', () => {
    const html = renderToStaticMarkup(<CharacterStep onCreated={async () => {}} />)
    expect(html).toContain('until that&#x27;s lifted')
    expect(html).not.toContain('<form')
  })
})
