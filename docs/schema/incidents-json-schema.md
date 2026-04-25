# incidents.json Schema Contract

## Event Types

- `incident`
- `eval_result`
- `capability_update`
- `supersession_milestone`

## Common Fields

- `id` (string)
- `type` (enum)
- `status` (string)
- `timestamp` or `start`/`end`

## Type-Specific Fields

- `incident`: `title`, `impact`, optional `systems`
- `eval_result`: `suite`, `skiaScore`, `claudeOpus47Baseline`, `delta`, `timestamp`
- `capability_update`: `capability`, `fromState`, `toState`, `evidence`, `timestamp`
- `supersession_milestone`: `dimension`, `skiaMark`, `claudeOpus47Mark`, `evidence`, `timestamp`
