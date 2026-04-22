(function () {
    var REFRESH_MS = 30000;

    function text(id, value) {
        var el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }

    function esc(value) {
        return String(value || "").replace(/[&<>"']/g, function (char) {
            if (char === "&") return "&amp;";
            if (char === "<") return "&lt;";
            if (char === ">") return "&gt;";
            if (char === '"') return "&quot;";
            return "&#39;";
        });
    }

    function toUtcNow() {
        var now = new Date();
        var pad = function (n) { return (n < 10 ? "0" : "") + n; };
        return now.getUTCFullYear() + "-" +
            pad(now.getUTCMonth() + 1) + "-" +
            pad(now.getUTCDate()) + " " +
            pad(now.getUTCHours()) + ":" +
            pad(now.getUTCMinutes()) + " UTC";
    }

    function normalizeStatus(value) {
        var s = String(value || "").toLowerCase();
        if (s === "ok" || s === "healthy" || s === "resolved" || s === "operational" || s === "up") {
            return "operational";
        }
        if (s === "warn" || s === "warning" || s === "investigating" || s === "degraded") {
            return "degraded";
        }
        if (s === "outage" || s === "down" || s === "fail" || s === "failed") {
            return "down";
        }
        return "operational";
    }

    function statusLabel(value) {
        if (value === "down") return "Down";
        if (value === "degraded") return "Degraded";
        return "Operational";
    }

    function applySystemStatus(id, statusValue) {
        var el = document.getElementById(id);
        if (!el) return;
        var normalized = normalizeStatus(statusValue);
        el.textContent = statusLabel(normalized);
        el.className = "system-status";
        if (normalized === "degraded") {
            el.classList.add("degraded");
        } else if (normalized === "down") {
            el.classList.add("down");
        }
    }

    function applyOverallStatus(statusMap) {
        var keys = ["backend", "frontend", "database", "search", "llm"];
        var hasDown = false;
        var hasDegraded = false;

        for (var i = 0; i < keys.length; i += 1) {
            var normalized = normalizeStatus(statusMap[keys[i]]);
            if (normalized === "down") hasDown = true;
            if (normalized === "degraded") hasDegraded = true;
        }

        var label = hasDown ? "Major outage" : (hasDegraded ? "System degraded" : "All systems operational");
        text("system-status", label);

        var pill = document.querySelector(".status-pill");
        var dot = document.querySelector(".status-dot");
        var systemStatusEl = document.getElementById("system-status");
        if (!pill || !dot || !systemStatusEl) return;

        if (hasDown) {
            pill.style.background = "rgba(255,79,79,0.08)";
            pill.style.borderColor = "rgba(255,79,79,0.4)";
            dot.style.background = "var(--err)";
            dot.style.boxShadow = "0 0 12px rgba(255,79,79,0.8)";
            systemStatusEl.style.color = "var(--err)";
            return;
        }

        if (hasDegraded) {
            pill.style.background = "rgba(245,166,35,0.1)";
            pill.style.borderColor = "rgba(245,166,35,0.45)";
            dot.style.background = "var(--warn)";
            dot.style.boxShadow = "0 0 12px rgba(245,166,35,0.8)";
            systemStatusEl.style.color = "var(--warn)";
            return;
        }

        pill.style.background = "rgba(12,179,102,0.08)";
        pill.style.borderColor = "rgba(61,214,140,0.4)";
        dot.style.background = "var(--ok)";
        dot.style.boxShadow = "0 0 12px rgba(61,214,140,0.8)";
        systemStatusEl.style.color = "var(--ok)";
    }

    function pickRecentIncident(incidents) {
        if (!Array.isArray(incidents) || incidents.length === 0) return null;
        return incidents[0];
    }

    function updateRecentIncident(incident) {
        var recentWrapper = document.getElementById("recent-incident");
        if (recentWrapper) recentWrapper.classList.remove("loading");

        if (!incident) {
            text("recent-incident-title", "No recent incidents");
            text("recent-incident-description", "All systems have been running normally.");
            text("recent-incident-time", "No recent activity");
            text("ri-badge", "Operational");
            text("ri-status", "Resolved");
            return;
        }

        var title = incident.title || "Untitled incident";
        var description = incident.impact || incident.description || "No description provided.";
        var start = incident.start || "Unknown";
        var end = incident.end || "Ongoing";
        var statusRaw = String(incident.status || "");
        var statusText = statusRaw ? statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1) : "Investigating";

        text("recent-incident-title", title);
        text("recent-incident-description", description);
        text("recent-incident-time", "Start: " + start + " · End: " + end);
        text("ri-badge", statusText);
        text("ri-status", statusText);

        var riStatus = document.getElementById("ri-status");
        if (riStatus) {
            riStatus.className = "incident-status";
            var normalized = normalizeStatus(statusRaw);
            if (normalized === "degraded") {
                riStatus.classList.add("investigating");
            } else if (normalized === "down") {
                riStatus.classList.add("outage");
            } else {
                riStatus.classList.add("resolved");
            }
        }
    }

    function mapSystemValues(incident) {
        var systems = (incident && incident.systems && typeof incident.systems === "object") ? incident.systems : {};
        var fallbackFromIncident = normalizeStatus(incident && incident.status) === "operational" ? "operational" : "degraded";
        return {
            backend: systems.backend || fallbackFromIncident,
            frontend: systems.frontend || fallbackFromIncident,
            database: systems.database || fallbackFromIncident,
            search: systems.search || fallbackFromIncident,
            llm: systems.llm || fallbackFromIncident
        };
    }

    async function refreshStatus() {
        var recentWrapper = document.getElementById("recent-incident");
        if (recentWrapper) recentWrapper.classList.add("loading");

        try {
            var response = await fetch("incidents.json?v=" + Date.now(), { cache: "no-store" });
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            var data = await response.json();
            var incident = pickRecentIncident(data);
            var systemValues = mapSystemValues(incident);

            applySystemStatus("backend-status", systemValues.backend);
            applySystemStatus("frontend-status", systemValues.frontend);
            applySystemStatus("database-status", systemValues.database);
            applySystemStatus("search-status", systemValues.search);
            applySystemStatus("llm-status", systemValues.llm);
            applyOverallStatus(systemValues);
            updateRecentIncident(incident);

            var historyLink = document.getElementById("history-link");
            if (historyLink) {
                historyLink.setAttribute("href", "incidents.html");
            }
        } catch (error) {
            updateRecentIncident(null);
            text("system-status", "Status unavailable");
            text("backend-status", "Unknown");
            text("frontend-status", "Unknown");
            text("database-status", "Unknown");
            text("search-status", "Unknown");
            text("llm-status", "Unknown");
        } finally {
            text("last-updated", toUtcNow());
            if (recentWrapper) recentWrapper.classList.remove("loading");
        }
    }

    refreshStatus();
    setInterval(refreshStatus, REFRESH_MS);
})();
