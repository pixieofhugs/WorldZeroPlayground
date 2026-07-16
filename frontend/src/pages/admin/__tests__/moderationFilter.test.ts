import { describe, it, expect } from 'vitest'
import {
  filterQueueByType,
  type QueueItem,
} from '../ModerationTab'

// The queue merges flagged praxes and comments; the content-type filter is a
// pure client-side narrowing over that merged list (#576). Only `.kind` is read,
// so minimal stand-ins are enough.
const praxis = { kind: 'praxis', praxis: { id: 1 } } as unknown as QueueItem
const comment = { kind: 'comment', comment: { id: 2 } } as unknown as QueueItem
const queue: QueueItem[] = [praxis, comment]

describe('filterQueueByType — moderation queue content-type filter (#576)', () => {
  it('"all" passes the whole queue through', () => {
    expect(filterQueueByType(queue, 'all')).toEqual([praxis, comment])
  })

  it('"comment" hides praxis rows, keeping only comments', () => {
    expect(filterQueueByType(queue, 'comment')).toEqual([comment])
  })

  it('"praxis" hides comment rows, keeping only praxes', () => {
    expect(filterQueueByType(queue, 'praxis')).toEqual([praxis])
  })
})
