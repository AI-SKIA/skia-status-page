# SKIA Status Site

This repository serves the public SKIA status experience as a static site on Nginx.

## Ecosystem Role

- `Skia-FULL` provides core product runtime and APIs.
- `SKIA-Forge` provides orchestration, governance, and control-plane intelligence.
- `Skia-Status` publishes externally visible health, incidents, and capability updates.

## Runtime Files

- `index.html` (overview dashboard)
- `incidents.html` (history view)
- `status.js` (overview data/render logic)
- `incidents.js` (history rendering)
- `incidents.json` (event data source)
- `nginx.conf` and `Dockerfile` (deployment)

## Goal

Provide transparent operational, benchmark, and capability visibility.

## Event Schema (Current)

`incidents.json` is an append-style event ledger consumed by the static status UI.

### Supported event types

- `incident`
  - Purpose: service-impacting production event.
  - Typical fields: `id`, `title`, `status`, `start`, `end`, `impact`, `systems`.
  - `systems` is a map of subsystem -> status (`operational`, `degraded`, `down`).
- `eval_result`
  - Purpose: benchmark/eval output snapshot for a named suite.
  - Typical fields: `id`, `suite`, `skiaScore`, `claudeOpus47Baseline`, `delta`, `timestamp`, `status`.
  - Required governance rule: non-provider or placeholder runs must be marked `superseded` with explicit reason metadata.
- `capability_update`
  - Purpose: lifecycle transition of a capability (for example `partial -> active`).
  - Typical fields: `id`, `capability`, `fromState`, `toState`, `evidence`, `timestamp`, `status`.

### Versioning and compatibility guidance

- Backward compatibility is maintained at field level; consumers should ignore unknown fields.
- New event types should only be introduced with corresponding renderer support in `status.js`/`incidents.js`.
- Any field rename must be done in a dual-write window (old + new key) for at least one release cycle.
- Supersession policy: stale or placeholder entries are not hard-deleted; they are marked with `status: "superseded"` and a reason field so audit history remains intact.
