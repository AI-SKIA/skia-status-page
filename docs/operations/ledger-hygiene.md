# incidents.json ledger hygiene

<!-- last-reviewed: 2026-05-24 -->

## Purpose

Keep `incidents.json` small, truthful, and useful for public panels on **status.skia.ca**.

## Retention by type

| Type | Retention | Notes |
|------|-----------|-------|
| `incident` | Indefinite | Resolve with `end` timestamp; keep audit history |
| `eval_result` | Active + superseded markers | Supersede placeholders; keep provider-backed active row |
| `capability_update` | Last 50 | Drop older duplicates in publish job |
| `strategy_update` | **Last 5** | High-volume narrative; not outages |
| `weakness_analysis` | Last 20 | Diagnostics panel |
| `supersession_milestone` | Last 20 | Benchmark lineage |

## strategy_update policy

- Do **not** append more than one `strategy_update` per automated publish cycle unless content materially changed.
- Mark stale narrative rows `status: "superseded"` instead of deleting.
- Never display `strategy_update` as an unresolved outage on `incidents.html`.

## Publishing

1. Backend ledger sync (GitHub Action) fetches from `api.skia.ca`.
2. Apply retention filters before commit.
3. Validate JSON against `docs/INCIDENT_EVENT_SCHEMA.md`.
4. Sync mirror per `Skia-FULL/docs/operations/skia-status-page-mirror-sync.md`.

## UI contract

- `index.html` panels require at least one non-superseded `eval_result` for benchmark visibility.
- Empty panels should show friendly empty states, not engineering errors.
