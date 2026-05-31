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

Canonical list (see `docs/INCIDENT_EVENT_SCHEMA.md`):

- `incident` — service-impacting production event (`systems` map per subsystem).
- `eval_result` — benchmark/eval snapshot (`suite`, `skiaScore`, provider-backed active rows).
- `capability_update` — capability lifecycle transition (`fromState`, `toState`, `evidence`).
- `strategy_update` — non-outage intelligence narrative (retention policy in `docs/operations/ledger-hygiene.md`).
- `weakness_analysis` — diagnostics for intelligence panels.
- `supersession_milestone` — benchmark supersession markers.

`incidents.html` lists **`incident`** events only. `index.html` renders all types in their respective panels.

### Versioning and compatibility guidance

- Backward compatibility is maintained at field level; consumers should ignore unknown fields.
- New event types should only be introduced with corresponding renderer support in `status.js`/`incidents.js`.
- Any field rename must be done in a dual-write window (old + new key) for at least one release cycle.
- Supersession policy: stale or placeholder entries are not hard-deleted; they are marked with `status: "superseded"` and a reason field so audit history remains intact.
