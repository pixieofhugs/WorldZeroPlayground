import { describe, expect, it } from 'vitest'
import { drawings, stickPraxis } from './fixtures'

describe('onboarding fixtures', () => {
  it('hands the cards absolute picture URLs, which mediaUrl() leaves alone', () => {
    for (const url of Object.values(drawings)) expect(url).toMatch(/^https?:\/\//)
    expect(stickPraxis.media_items[0].file_path).toBe(drawings.coolStick)
    expect(stickPraxis.created_by_avatar_url).toBe(drawings.agentTeacup)
  })
})
