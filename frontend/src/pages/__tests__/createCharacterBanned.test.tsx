import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'

const auth = vi.hoisted(() => ({ banned: true }))
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { character_creation_banned: auth.banned } }),
}))
vi.mock('../characterPaths/useCreateCharacter', () => ({
  useCreateCharacter: () => ({ factionSlug: '' }),
}))
vi.mock('../../factions', () => ({ surfaceMap: () => ({}) }))
vi.mock('../../utils/factionDispatch', () => ({
  resolveVariant: () => () => <form>the form</form>,
}))

const CreateCharacter = (await import('../CreateCharacter')).default

describe('CreateCharacter for a creation-banned account', () => {
  it('shows the notice, not the form', () => {
    const html = renderToStaticMarkup(<CreateCharacter />)
    expect(html).toContain('until that&#x27;s lifted')
    expect(html).not.toContain('the form')
  })

  it('shows the form otherwise', () => {
    auth.banned = false
    expect(renderToStaticMarkup(<CreateCharacter />)).toContain('the form')
  })
})
