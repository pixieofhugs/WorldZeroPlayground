import type { PraxisCardOut } from '../../api/praxis'
import type { TaskOut } from '../../api/tasks'
import agentTeacupSrc from './drawings/agent-teacup.webp?no-inline'
import coolStickSrc from './drawings/cool-stick.webp?no-inline'
import laundryDragonSrc from './drawings/laundry-dragon.webp?no-inline'
import nightGardenerSrc from './drawings/night-gardener.webp?no-inline'

// The cards' mediaUrl() puts the API host in front of any path that is not absolute.
const here = typeof location === 'undefined' ? 'http://localhost/' : location.href
const absolute = (path: string) => new URL(path, here).href

/** The drawn photos and avatars the beats' cards show (one request each, only on /start). */
export const drawings = {
  coolStick: absolute(coolStickSrc),
  laundryDragon: absolute(laundryDragonSrc),
  agentTeacup: absolute(agentTeacupSrc),
  nightGardener: absolute(nightGardenerSrc),
}

export const NOW = '2026-07-01T15:04:00Z'

export function makeTask(over: Partial<TaskOut>): TaskOut {
  return {
    id: 101,
    title: '',
    description: '',
    point_value: 30,
    level_required: 1,
    status: 'active',
    task_type: 'standard',
    created_by: 7,
    primary_faction_slug: 'na',
    metatask_faction_slug: null,
    created_at: NOW,
    in_progress_count: 0,
    created_by_display_name: '',
    created_by_avatar_url: '',
    created_by_faction_slug: null,
    created_by_level: 0,
    signup_reason: null,
    in_progress_praxis_id: null,
    submitted_praxis_id: null,
    can_sign_up: false,
    allowed_modes: ['solo', 'collab'],
    eligible_for_current_user: false,
    start_here: false,
    viewer_faction_multiplier: 1,
    ...over,
  }
}

export function makePraxis(over: Partial<PraxisCardOut>): PraxisCardOut {
  return {
    id: 501,
    task_id: 24,
    task_title: '',
    task_point_value: 5,
    task_level_required: 1,
    task_faction_slug: null,
    type: 'solo',
    status: 'submitted',
    title: '',
    body_text: '',
    moderation_status: 'visible',
    submitted_at: NOW,
    submit_proposed_at: null,
    created_by_id: 7,
    created_by_display_name: '',
    created_by_avatar_url: '',
    created_by_faction_slug: null,
    created_at: NOW,
    updated_at: NOW,
    members: [],
    media_items: [],
    metatask_points: 0,
    display_multiplier: 1,
    points_from_votes: 0,
    habit_bonus_points: 0,
    score: 0,
    is_top_for_task: false,
    duel_id: null,
    opponent_praxis_id: null,
    opponent_display_name: null,
    opponent_faction_slug: null,
    opponent_avatar_url: '',
    applied_metatasks: [],
    voter_count: 0,
    member_count: 1,
    viewer_can_vote: false,
    viewer_vote: null,
    voted_by_name: null,
    ...over,
  }
}

export const dragonTask = makeTask({
  primary_faction_slug: 'wow',
  title: 'Slay a dragon',
  description: 'Or something dragon-shaped. Bring proof.',
  point_value: 30,
  level_required: 2,
})

export const stickTask = makeTask({
  id: 24,
  title: 'Find a Cool Stick',
  description: 'and do something cool with it',
  point_value: 5,
  level_required: 1,
  primary_faction_slug: 'everymen',
  created_by: 1,
  created_at: '2026-09-24T23:58:24Z',
  created_by_display_name: 'Pixie',
  created_by_faction_slug: 'na',
  created_by_level: 1,
  allowed_modes: [],
})

export const stickPraxis = makePraxis({
  task_title: stickTask.title,
  task_faction_slug: 'everymen',
  title: 'His Majesty, the Stick',
  body_text: 'Found him under an oak in the park. Gave him a crown and my second-best sunglasses. He is coming home with me.',
  created_by_display_name: 'Agent Teacup',
  created_by_avatar_url: drawings.agentTeacup,
  media_items: [{ id: 9001, praxis_id: 501, type: 'image', file_path: drawings.coolStick, display_path: null, display_order: 0, created_at: NOW }],
  points_from_votes: 12,
  score: 17,
})

/** Another player's proof, never the viewer's own; Beat 5 adds the judges' and the player's votes to `score`. */
export const dragonPraxis = makePraxis({
  id: 502,
  task_id: 101,
  task_title: dragonTask.title,
  task_point_value: dragonTask.point_value,
  task_level_required: 2,
  task_faction_slug: 'wow',
  title: 'Laundry Dragon, slain',
  body_text: 'It had been growing in the corner for weeks. Two sock horns, one cardboard sword. The floor is free again.',
  created_by_id: 9,
  created_by_display_name: 'Wizard Wobblewand',
  created_by_avatar_url: drawings.nightGardener,
  media_items: [{ id: 9002, praxis_id: 502, type: 'image', file_path: drawings.laundryDragon, display_path: null, display_order: 0, created_at: NOW }],
  score: dragonTask.point_value,
  viewer_can_vote: true,
})
