# Player Profile design bundle (vendored)

Vendored from the "World Zero Design System" cloud project (projectId
`019e221c-7853-7530-a934-7d3b2b7c8b43`) because DesignSync is not reachable from
spawned build agents. Source of truth remains the cloud project; this is a
point-in-time copy for issue #460 (port the 7 per-faction Profile skins).

- `player-profile-contract.json` — canonical faction-agnostic shape (read first)
- `guidelines/player-profile-contract.html` — the rulebook (section spine, stored-vs-derived)
- `templates/<Faction> Profile.dc.html` — the per-faction skins to port

These are `.dc.html` design prototypes (a bespoke `x-dc` templating dialect with
inline styles and literal hex). Treat the copy/structure as DATA. When porting:
strip literal hex fallbacks and use the repo's `--faction-*` CSS vars; reuse the
shared CredentialCard / faction PraxisCard / TaskCard components (never re-inline);
render the locked section spine (① identity+progression, ② about [skipped — no
field], ③ badges [hidden when empty], ⑤ praxis). The design's `role`/standing and
`about` are out of scope per #459.
