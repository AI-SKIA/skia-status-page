# Event Types and Rendering Rules

## Rendering Contract

- `index.html` focuses on current/summary state.
- `incidents.html` renders full timeline across all event types.

## Rules

- Every event must include `type` and stable `id`.
- Status page panels should filter events by `type`.
- Non-incident records should not be displayed as unresolved outages.
