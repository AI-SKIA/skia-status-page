# Incident Event Schema

## Purpose

This document defines the canonical schema for `incidents.json` used by the SKIA status site.  
It supersedes minimal schema notes in `docs/schema/incidents-json-schema.md` and should be treated as the primary contract for event producers and UI consumers.

## File-level contract

- File type: JSON array.
- Ordering: newest events first unless a publishing run explicitly preserves grouped chronology.
- Encoding: UTF-8.
- Backward compatibility: consumers must ignore unknown fields.

## Supported event types

- `incident`
- `eval_result`
- `capability_update`
- `supersession_milestone`
- `weakness_analysis`

## Common fields

These fields apply to most event records:

- `id` (string, recommended; required for all new writes)
- `type` (string enum)
- `status` (string)
- `timestamp` (ISO timestamp) or explicit lifecycle timestamps (`start`, `end`)

Recommended status values:

- `active`
- `resolved`
- `superseded`
- `pending` (allowed only for in-flight operational records, not canonical benchmark baseline rows)

## Type-specific schemas

### `incident`

Required:

- `id` (string)
- `type = "incident"`
- `title` (string)
- `status` (string)
- `start` (string)
- `impact` (string)

Optional:

- `end` (string)
- `systems` (object map of subsystem name -> status)

Example:

```json
{
  "id": "skia-health-2026-04-21",
  "type": "incident",
  "title": "System degraded — backend, database failure",
  "status": "resolved",
  "start": "2026-04-21 10:25 UTC",
  "end": "2026-04-25T00:00:00.000Z",
  "impact": "Critical systems recovered.",
  "systems": {
    "frontend": "operational",
    "backend": "operational"
  }
}
```

### `eval_result`

Required:

- `id` (string)
- `type = "eval_result"`
- `suite` (string)
- `skiaScore` (number, 0..1)
- `timestamp` (string)
- `status` (string)

Optional:

- `claudeOpus47Baseline` (number or null)
- `delta` (number or null)
- `title` (string)
- `providerBacked` (boolean)
- `supersededReason` (string, required if `status = "superseded"`)

Governance rules:

- Canonical active benchmark rows must be provider-backed.
- Placeholder/non-provider rows must be removed or marked `superseded` with explicit reason.

### `capability_update`

Required:

- `id` (string)
- `type = "capability_update"`
- `capability` (string)
- `fromState` (string)
- `toState` (string)
- `timestamp` (string)
- `status` (string)

Optional:

- `evidence` (string)

### `supersession_milestone`

Required:

- `id` (string)
- `type = "supersession_milestone"`
- `dimension` (string)
- `timestamp` (string)
- `status` (string)

Optional:

- `title` (string)
- `evidence` (string)
- `skiaMark` (number)
- `claudeOpus47Mark` (number)

### `weakness_analysis`

Required:

- `type = "weakness_analysis"`
- `suite` (string)
- `timestamp` (string)
- `status` (string)

Optional:

- `failedCaseCount` (number)
- `topPattern` (string)
- `recommendedStrategy` (string)
- `estimatedScoreGain` (number)

## Producer/consumer contract

### Producers

- Must emit valid JSON and stable `id` values for new events.
- Must not publish canonical benchmark entries with placeholder values.
- Must mark replaced/stale rows as `superseded` instead of silently mutating historical meaning.

### Consumers (`status.js`, `incidents.js`)

- Must branch by `type`.
- Must treat non-incident rows as informational, not outage state.
- Must degrade safely when optional fields are missing.

## Versioning guidance

- Current schema version is implicit (`v1`) and backward-compatible.
- For breaking schema changes:
  1. Add dual-write fields.
  2. Update UI consumers.
  3. Migrate existing records.
  4. Remove deprecated keys in a later cycle.

## Validation checklist

- JSON parses successfully.
- Every new event includes `type`, status, and stable ID.
- `eval_result` rows either have provider-backed real values or are explicitly superseded.
- Rendering on `index.html` and `incidents.html` remains correct after update.
