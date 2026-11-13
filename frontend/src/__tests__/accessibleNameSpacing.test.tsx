/**
 * Per-word/per-letter span treatments must keep real spaces in their text, or
 * the accessible name reads "Namethethingeveryone…" (#1043). Spaces are lost by
 * a `gap`-spaced flex row (drops whitespace children) or an empty fixed-width
 * span. Asserts the concatenated emitted text, the accname algorithm's input.
 * Reference fix: `SnideTaskCard` (#1023), a real space text node in inline flow.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'

import '../i18n'
import type { CommentOut } from '../api/comments'
import type { TaskOut } from '../api/tasks'
import PageTitle from '../components/ui/PageTitle'
import MetataskSeal from '../components/metataskSeal/MetataskSeal'
import SnideComment from '../components/comments/voices/SnideComment'

function text(element: React.ReactElement): string {
  return renderToStaticMarkup(element).replace(/<[^>]*>/g, '')
}

const CONDITION = 'do it underwater. no cuts.'

function metatask(): TaskOut {
  return {
    id: 42,
    title: CONDITION,
    description: '',
    point_value: 50,
    level_required: 1,
    status: 'active',
    task_type: 'metatask',
    created_by: 1,
    primary_faction_slug: 'na',
    metatask_faction_slug: 'snide',
    created_at: '2026-01-01T00:00:00Z',
    in_progress_count: 0,
    created_by_display_name: '',
    created_by_avatar_url: '',
    created_by_faction_slug: null,
    created_by_level: 0,
    signup_reason: null,
    in_progress_praxis_id: null,
    submitted_praxis_id: null,
    can_sign_up: false,
    allowed_modes: [],
    eligible_for_current_user: false,
    start_here: false,
    viewer_faction_multiplier: 1,
  }
}

const COMMENT: CommentOut = {
  id: 7,
  praxis_id: 1,
  task_id: null,
  body_text: 'the sign was already crooked when we got there',
  is_edited: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  author: {
    id: 42,
    username: 'vex',
    display_name: 'Vex Line Crane',
    avatar_url: '',
    faction_slug: 'snide',
  },
  mentions: [],
}

describe('per-word and per-letter treatments keep their spaces in the text', () => {
  it('PageTitle: the per-letter underlined title reads as words', () => {
    expect(text(<PageTitle title="Edit Praxis" />)).toContain('Edit Praxis')
  })

  it('SnideSeal: the clipped condition reads as a sentence', () => {
    // Router: the seal's `factionBands` band is a `<Link>` (#2648).
    expect(
      text(
        <MemoryRouter>
          <MetataskSeal metatasks={[metatask()]} />
        </MemoryRouter>,
      ),
    ).toContain(CONDITION)
  })

  it('SnideComment: the ransom byline reads as a name', () => {
    // The byline is the accessible name of the author link.
    const markup = text(
      <MemoryRouter>
        <SnideComment mode="row" comment={COMMENT} />
      </MemoryRouter>,
    )
    expect(markup).toContain('Vex Line Crane')
  })
})
