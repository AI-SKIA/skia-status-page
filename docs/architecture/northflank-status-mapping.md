# Northflank status mapping

<!-- last-reviewed: 2026-05-24 -->

## Purpose

Maps **status.skia.ca** UI rows to Northflank services. The status page uses **logical buckets**, not a 1:1 service grid.

## Public edge

| Host | Service | Port |
|------|---------|------|
| `status.skia.ca` | `skia-status-page` | 80 |

Static assets + `incidents.json`; `/api/*` proxied to `https://api.skia.ca` for live health.

## Core systems rows

| UI label | Ledger key | Live probe | Northflank services represented |
|----------|------------|------------|--------------------------------|
| SKIA Frontend | `frontend` | Ledger (optional `/api/health` indirect) | `skia-frontend` :3000 |
| SKIA Backend / OS | `backend` | `/api/health` | `login` :3001, `backend` :4000 |
| Database | `database` | `/api/health/database` | Postgres addon |
| LLM Services | `llm` | `/api/health` LLM section | **`skia-serve` :11500** (primary) |
| Image & Video Engines | `image` | Ledger + LLM health fallback | `image-engine`, `video-engine` :8188 |
| Search & Intelligence | `search` | Ledger | `searxng` :8080 |
| EPAAS Security | `epaas` | Ledger | Governance/EPAAS on login |

## Services not shown as separate rows

| Service | Port | Notes |
|---------|------|-------|
| `skia-forge` | 4173 | Forge has its own status surfaces |
| `skia-docs` | 80 | Documentation host |
| `tts-service` | 8000 | Rolled into product health via backend |
| `embedding-engine` | 5003 | Internal |
| `vector-db` | 5004 | Internal |
| `chat-engine` | 11434 | **Deprecated** — do not surface as primary |

## Intelligence panels

| Panel | Event type |
|-------|------------|
| Benchmark scores | `eval_result` |
| Capability maturity | `capability_update` |
| Reasoning engine | `strategy_update` (filtered) |
| Memory health | `strategy_update` / `weakness_analysis` |
| Intelligence diagnostics | `weakness_analysis` |

See `docs/operations/ledger-hygiene.md` for retention rules.
