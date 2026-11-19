// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import About from '../../pages/About'
import Donate from '../../pages/Donate'

describe('a page titles itself', () => {
  it('sets "<page> · World Zero" per page', () => {
    render(<MemoryRouter><About /></MemoryRouter>)
    expect(document.title).toBe('About World Zero · World Zero')
    render(<MemoryRouter><Donate /></MemoryRouter>)
    expect(document.title).not.toBe('About World Zero · World Zero')
    expect(document.title).toMatch(/ · World Zero$/)
  })
})
