# Status Site Architecture

This document describes the architecture for `Skia-Status`, the public transparency surface in the SKIA ecosystem.

## Ecosystem placement

- `Skia-FULL` owns product runtime execution and user features.
- `SKIA-Forge` owns orchestration and governance control-plane behavior.
- `Skia-Status` exposes externally consumable health and incident posture.

## Components

- Static HTML views: `index.html`, `incidents.html`
- Client logic: `status.js`, `incidents.js`
- Data source: `incidents.json`
- Web server: `nginx.conf`
- Container: `Dockerfile`

## Data Flow

1. Browser loads static page.
2. Client script fetches `incidents.json`.
3. UI derives status panels and event history from typed events.

## Design constraints

- Keep the site static-first and read-only from the browser perspective.
- Treat `incidents.json` as the canonical published event ledger for the status UI.
- Route all publishing and mutation workflow through runbooks and governed repo changes.
