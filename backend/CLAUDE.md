# Python conventions
- async/await throughout FastAPI routes; Pydantic for request/response bodies
- Models in `models/`, business logic in `services/`. Routes stay thin.
- Frozen dataclasses over tuples/dicts unless mutation is required
- Full names, no abbreviations (`task` not `t`, `index` not `idx`)
- Type-annotate every parameter and return
- No bare string literals for domain values — use a constant or Enum
- Adding a model or an `ErrorCode` touches several test-checked files: `docs/agents/db-migrations.md` § "Adding a model / adding an ErrorCode"

The root `CLAUDE.md` holds the routing table, the config architecture, and the
`Do NOT` list — all of which still apply here.
