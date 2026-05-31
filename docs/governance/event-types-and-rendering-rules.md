# Event Types and Rendering Rules

## Rendering Contract

- `index.html` focuses on current/summary state.
- `incidents.html` renders the **incident** timeline only (`type === "incident"`). Other types appear on `index.html` panels.

## Rules

- Every event must include `type` and stable `id`.
- Status page panels should filter events by `type`.
- Non-incident records should not be displayed as unresolved outages.
