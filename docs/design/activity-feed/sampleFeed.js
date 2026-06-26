/**
 * sampleFeed — the exact data behind the sample mixed activity feed.
 *
 * One row = one activity. The shape varies by card type because each faction
 * archetype surfaces different fields (that is the whole point — the card
 * type IS the faction). Common to most rows: actor, time, initial (avatar
 * monogram letter), and a points/level pair. `faction: null` marks a
 * factionless row, routed to FactionlessActivityCard by its `kind`.
 *
 * Real implementations will derive these fields from your activity/event
 * model; this array documents what each card needs to render.
 */
export const sampleFeed = [
  // 1 · FACTIONLESS — World Zero dispatch (admin announcement)
  {
    id: "a1", faction: null, kind: "announcement",
    eyebrow: "World Zero Dispatch", tag: "All Factions", time: "Just now",
    title: "Season II — The Long Thaw — opens at dawn",
  },

  // 2 · SINGULARITY — terminal printout (intercepted a signal)
  {
    id: "a2", faction: "singularity", handle: "nyx", time: "2m ago",
    action: "intercepted a transmission", object: "PROTOCOL-7 · NORTH RELAY",
    points: 18, level: 9, motto: "the signal does not sleep",
  },

  // 3 · EVERYMEN — union dispatch slip (completed a task)
  {
    id: "a3", faction: "everymen", actor: "Rook", initial: "R", time: "2 hours ago",
    action: "completed a task", badge: "Completed",
    task: { title: "Clear the East Drains", points: 40, level: 6 },
    motto: "no one stands alone",
  },

  // 4 · FACTIONLESS — new player joined (global)
  {
    id: "a4", faction: null, kind: "join", actor: "Marlow", initial: "M",
    action: "joined World Zero", badge: "New", time: "Moments ago",
    note: "Unaffiliated — has not yet chosen a faction.", cta: "Recruit them?",
  },

  // 5 · WARRIORS OF WHIMSY — whimsy.exe window (leveled up)
  {
    id: "a5", faction: "wow", actor: "willow", initial: "W", time: "12m ago",
    action: "leveled up", headline: "reached level 12!",
    hearts: 248, level: 12, motto: "a little magic, a lot of mischief",
  },

  // 6 · UA — gilt salon (submitted to the Salon)
  {
    id: "a6", faction: "ua", actor: "Beatrix", initial: "B", time: "1 hour ago",
    action: "submitted to the Salon", work: '"Study of the Brass Lung"',
    critique: "IV", points: 32,
  },

  // 7 · S.N.I.D.E. — ransom dispatch slip (accepted an assignment)
  {
    id: "a7", faction: "snide", actor: "Cass", initial: "C", time: "24m ago",
    dispatch: "№0931", action: "accepted the assignment —",
    ransomWords: ["TAG", "THE", "OVERPASS"], points: 25, level: 4,
    motto: "your assignment, should you ignore it",
  },

  // 8 · FACTIONLESS — duel challenge
  {
    id: "a8", faction: null, kind: "duel", actor: "Devi", initial: "D",
    action: "challenged you to a duel", badge: "Duel", time: "5m ago",
    contestTitle: "Best of three · Riddle Run", contestNote: "— 30 pts at stake",
  },

  // 9 · THE EPHEMERISTS — the discordant map (sealed a praxis)
  {
    id: "a9", faction: "ephemerists", actor: "Quill", initial: "Q", time: "3h ago",
    action: "sealed a praxis", title: "The Road That", titleAccent: "Lengthens",
    grade: "VII", pvncta: 41, motto: "there is no single here",
  },

  // 10 · ALBESCENT — vellum correspondence (bore witness; logs no points)
  {
    id: "a10", faction: "albescent", actor: "A. Verre", initial: "A", time: "Yesterday",
    action: "bore witness", quote: '"Some work leaves no record."',
  },
];
