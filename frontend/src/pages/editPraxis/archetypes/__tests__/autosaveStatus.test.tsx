import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import i18n from '../../../../i18n'

const room = vi.hoisted(() => ({ value: null as { synced: boolean } | null }))
vi.mock('../../praxisRoom', () => ({ usePraxisRoom: () => room.value }))

import { AutosaveStatus } from '../shared'

const html = () => renderToStaticMarkup(<AutosaveStatus at={new Date()} />)

it('says the edits are on the phone until the server has them (#3580)', () => {
  room.value = { synced: false }
  expect(html()).toContain('Saved on this phone')
})

it('says Saved once the room has synced', () => {
  room.value = { synced: true }
  expect(html()).toContain(i18n.t('forms:autosaveAgo.justNow'))
})
