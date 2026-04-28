# Incident Publishing Runbook

## Purpose

Entry-point runbook for incident publishing in `Skia-Status`.

## Source of truth

The full operational lifecycle runbook is:

- `docs/STATUS_UPDATE_RUNBOOK.md`

It defines authority, supersession workflow, pruning policy, validation gates, and rollback procedure.

## Ecosystem context

- Incident source evidence is produced from runtime behavior in `Skia-FULL`.
- Governance/control-plane corroboration may come from `SKIA-Forge`.
- Public publishing is executed in `Skia-Status` only.
