# Install and push — vendored design (epic #3700)

Pulled from the "Install and push cards" canvas (claude.ai/artifact/QVubNVUhfV9J4Td1pEUga5,
version 1795157176-42f3) on 2026-11-20: six boards and `canvas.json`. `ds/` and
`support.js` aren't vendored, because the kit is already in the repo. Read the boards as source.

Corrections before building:
- Hex on the boards is presentation only: the `#d9d4cb` board backdrop and the
  LockScreen OS chrome (a mock of the phone, never built). The one hex allowed in
  product code is the WØ icon gradient, copied from `frontend/public/favicon.svg`
  (epic rule).
- The canvas titles tag the nudge boards `#3677`; the nudge card is now #3702.
  `PushAsk` is #3704, and `SettingsPush` + `PushStates` are #3703 (with #3678's states).
- The names and praxis on the boards are sample data.
- The wording is a draft the owner approved by default. It goes in the catalogs.

Each child deletes the boards it has built. The epic's last PR deletes this folder.
