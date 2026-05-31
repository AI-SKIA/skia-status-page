# Status Site Test Checklist

## Functional

- `index.html` loads without JS errors.
- `incidents.html` timeline renders **incident** events only.
- Benchmark/capability/reasoning/memory panels populate correctly.

## Data

- `incidents.json` is valid JSON.
- Event type coverage includes all six types (`incident`, `eval_result`, `capability_update`, `strategy_update`, `weakness_analysis`, `supersession_milestone`).

## Infra

- `incidents.json` returns `Cache-Control: no-cache`.
- Docker build succeeds with all copied assets present.
