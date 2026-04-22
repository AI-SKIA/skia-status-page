# Use the stable Nginx Alpine image as the base
FROM nginx:stable-alpine

# 1. THE CACHE-BUSTER
# Change this value (or pass a new one via --build-arg) to force a full rebuild.
ARG CACHE_BYPASS=2026-04-19_1300
ENV DEPLOYED_AT=$CACHE_BYPASS

# 2. SET WORKING DIRECTORY
WORKDIR /usr/share/nginx/html

# 3. ATOMIC CLEANUP
# Wipe everything so stale files from previous layers can't linger.
RUN rm -rf ./*

# 4. COPY STATIC ASSETS
COPY index.html     ./index.html
COPY incidents.html ./incidents.html
COPY incidents.json ./incidents.json
COPY favicon.ico    ./favicon.ico
COPY icon.ico       ./icon.ico

# *** NEW REQUIRED FILES ***
# These were missing — without them the dashboard is dead.
COPY status.js      ./status.js
COPY incidents.js   ./incidents.js

# 5. COPY NGINX CONFIG
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 6. PORT & EXECUTION
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
