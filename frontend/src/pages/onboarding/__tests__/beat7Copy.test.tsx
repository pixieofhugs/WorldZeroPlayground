// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import i18n, { lazyShipped } from '../../../i18n'
import Beat7 from '../beats/Beat7'

afterEach(cleanup)

describe('Beat 7 waits for the feed copy', () => {
  it('draws nothing raw before it loads, then the taglines', async () => {
    delete lazyShipped.feed
    i18n.removeResourceBundle('en', 'feed')

    const { container } = render(<Beat7 confidence={1} />)
    expect(container.textContent).not.toMatch(/factionSelect|feed:/)
    expect(container.querySelector('.bub')).toBeNull()

    await waitFor(() => expect(screen.getByText('Make it anyway')).toBeTruthy())
    expect(container.textContent).not.toMatch(/factionSelect/)
  })
})
