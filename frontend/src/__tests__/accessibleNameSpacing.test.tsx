/**
 * Accessible-name spacing across the per-word / per-letter typographic
 * treatments (#1043).
 *
 * THE BUG CLASS. Several surfaces slice a string into one span per word (or per
 * letter) so each fragment can carry its own font, ground and rotation. Two
 * shapes of that lose the spaces from the string's TEXT while leaving it
 * looking correctly spaced:
 *
 *   1. the fragments are laid out as a flex row spaced with `gap` — a flex
 *      container discards whitespace-only children, so the spaces never reach
 *      the box tree at all;
 *   2. the space character is rendered as an EMPTY fixed-width span — the gap
 *      is drawn, but there is no space in the text.
 *
 * Either way the surface's text content, and with it the accessible name a
 * screen reader announces, comes out as "Namethethingeveryone…".
 *
 * WHAT THIS TEST CAN AND CANNOT PROVE. The repo's frontend harness is
 * `renderToStaticMarkup` only — no jsdom, no layout, no accessibility tree — so
 * nothing here computes what a browser's accname algorithm would return. What
 * it asserts is the input that algorithm reads: the text nodes actually
 * emitted, with the tags stripped. A test that counted spans, or that asserted
 * each word appears somewhere in the markup, would pass against the broken
 * version; only the concatenated text catches this.
 *
 * The reference fix is `SnideTaskCard`'s ransom headline (#1023): a REAL space
 * text node in ordinary inline flow, outside the styled `inline-block` span.
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

/** The text a screen reader has to work from: markup with every tag removed. */
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
    can_sign_up: false,
    allowed_modes: [],
    eligible_for_current_user: false,
    start_here: false,
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
    // Per-letter spans in ordinary block flow, but the space branch drew an
    // empty 0.3em box — the gap was real, the space was not.
    expect(text(<PageTitle title="Edit Praxis" />)).toContain('Edit Praxis')
  })

  it('SnideSeal: the clipped condition reads as a sentence', () => {
    // Per-word "cut from a magazine" chips, previously a `flex flex-wrap` row
    // spaced with `gap`. The router is the seal's masthead band, an anchor
    // since #2562.
    expect(
      text(
        <MemoryRouter>
          <MetataskSeal metatasks={[metatask()]} />
        </MemoryRouter>,
      ),
    ).toContain(CONDITION)
  })

  it('SnideComment: the ransom byline reads as a name', () => {
    // Per-LETTER tiles in an `inline-flex` row: the byline is the accessible
    // name of the link to the author's profile.
    const markup = text(
      <MemoryRouter>
        <SnideComment mode="row" comment={COMMENT} />
      </MemoryRouter>,
    )
    expect(markup).toContain('Vex Line Crane')
  })
})
