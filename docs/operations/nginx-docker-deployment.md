# Nginx and Docker Deployment

## Purpose

Define the deployment baseline for the `Skia-Status` static status site.

## Ecosystem dependency

This repository only publishes static operational truth; incident and capability source inputs originate from validated events produced by SKIA runtime/control-plane operations (`Skia-FULL` and, when relevant, `SKIA-Forge`).

## Nginx

- Serves static assets from `/usr/share/nginx/html`.
- `incidents.json` must be served with `Cache-Control: no-cache`.

## Docker

- Base image: `nginx:stable-alpine`
- Copy static assets and nginx config into image.
- Run Nginx in foreground mode.

## Validation

- Confirm all copied assets exist (`index.html`, `incidents.html`, `status.js`, `incidents.js`, `incidents.json`, icons).
- Confirm `incidents.json` updates render correctly in both status pages after deployment.
