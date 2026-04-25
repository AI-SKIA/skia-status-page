# Nginx and Docker Deployment

## Nginx

- Serves static assets from `/usr/share/nginx/html`.
- `incidents.json` must be served with `Cache-Control: no-cache`.

## Docker

- Base image: `nginx:stable-alpine`
- Copy static assets and nginx config into image.
- Run Nginx in foreground mode.

## Validation

- Confirm all copied assets exist (`index.html`, `incidents.html`, `status.js`, `incidents.js`, `incidents.json`, icons).
