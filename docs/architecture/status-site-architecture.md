# Status Site Architecture

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
