# Doc & File Cleanup Audit — SKIA-STATUS — 2026-04-25

## Files No Longer Needed
| File path | Reason |
|-----------|--------|

## Files That Need To Be Updated  
| File path | What is outdated |
|-----------|------------------|
| C:/Skia-Status/incidents.json | Contains older `eval_result` entries with `skiaScore: 0` / pending-provider placeholders mixed with newer provider-backed milestones, causing historical status ambiguity and contradictory benchmark signals. |
| C:/Skia-Status/README.md | Runtime file list is present, but there is no documented event schema/versioning guidance even though `incidents.json` now carries multiple event types and evolving payload fields. |

## Files Unsure Of
| File path | Why unsure |
|-----------|-----------|

## Folders No Longer Needed
| Folder path | Reason |
|-------------|--------|

## Files That Should Exist But Do Not
| Expected file path | Why it should exist |
|-------------------|---------------------|
| C:/Skia-Status/docs/INCIDENT_EVENT_SCHEMA.md | `incidents.json` uses multiple event types (`incident`, `eval_result`, `capability_update`, etc.) with no formal schema reference for producers/consumers. |
| C:/Skia-Status/docs/STATUS_UPDATE_RUNBOOK.md | Status site data appears manually updated; no runbook documents lifecycle/cleanup rules for stale events or benchmark supersession semantics. |
