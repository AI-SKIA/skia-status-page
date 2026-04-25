# Incident Publishing Runbook

## Standard Procedure

1. Add or update a typed event in `incidents.json`.
2. Validate JSON shape and required fields.
3. Verify rendering in `index.html` and `incidents.html`.
4. Deploy and confirm cache-refresh behavior.

## Priority Rules

- Put newest incident/event first unless timeline sorting is automated.
- Keep status transitions explicit (`investigating` -> `resolved`).
