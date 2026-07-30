import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so nav copy keys resolve to English text.
import '../../../i18n'
import MobileTabBar from '../MobileTabBar'

function render(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <MobileTabBar />
    </MemoryRouter>,
  )
}

describe('MobileTabBar', () => {
  it('renders the five core-loop destinations', () => {
    const html = render('/')
    for (const label of ['Home', 'Tasks', 'Praxis', 'Players', 'Factions']) {
      expect(html).toContain(label)
    }
    for (const href of ['href="/"', 'href="/tasks"', 'href="/praxis"', 'href="/leaderboard"', 'href="/factions"']) {
      expect(html).toContain(href)
    }
  })

  it('marks the active route with the primary-text underline', () => {
    // NavLink applies the active style only to the matching tab.
    const activeStyle = 'border-top:2px solid var(--color-text-primary)'
    const onTasks = render('/tasks')
    expect((onTasks.match(/border-top:2px solid var\(--color-text-primary\)/g) || []).length).toBe(1)
    expect(onTasks).toContain(activeStyle)
  })
})
