# Status Site Test Checklist

## Functional

- `index.html` loads without JS errors.
- `incidents.html` timeline renders all event types.
- Benchmark/capability/reasoning/memory panels populate correctly.

## Data

- `incidents.json` is valid JSON.
- Event type coverage includes all four types.

## Infra

- `incidents.json` returns `Cache-Control: no-cache`.
- Docker build succeeds with all copied assets present.
