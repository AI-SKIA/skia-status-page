(function () {
    var REFRESH_MS = 30000;
    var API_TIMEOUT_MS = 5000;
    var INTEL_TIMEOUT_MS = 8000;

    function text(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
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
        if (s === "ok" || s === "healthy" || s === "resolved" || s === "operational" || s === "up") return "operational";
        if (s === "warn" || s === "warning" || s === "investigating" || s === "degraded") return "degraded";
        if (s === "outage" || s === "down" || s === "fail" || s === "failed") return "down";
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
        if (normalized === "degraded") el.classList.add("degraded");
        if (normalized === "down") el.classList.add("down");
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
            pill.className = "status-pill down";
            dot.className = "status-dot down";
            systemStatusEl.className = "status-text down";
            return;
        }
        if (hasDegraded) {
            pill.className = "status-pill degraded";
            dot.className = "status-dot degraded";
            systemStatusEl.className = "status-text degraded";
            return;
        }
        pill.className = "status-pill";
        dot.className = "status-dot";
        systemStatusEl.className = "status-text";
    }

    function pickRecentIncident(events) {
        if (!Array.isArray(events)) return null;
        for (var i = 0; i < events.length; i += 1) {
            if (events[i] && events[i].type === "incident") return events[i];
        }
        return null;
    }

    function mapSystemValues(incident) {
        var systems = (incident && incident.systems && typeof incident.systems === "object") ? incident.systems : {};
        var fallback = normalizeStatus(incident && incident.status) === "operational" ? "operational" : "degraded";
        return {
            backend: systems.backend || fallback,
            frontend: systems.frontend || fallback,
            database: systems.database || fallback,
            search: systems.search || fallback,
            llm: systems.llm || fallback
        };
    }

    function fetchWithTimeout(url, options, timeoutMs) {
        var controller = new AbortController();
        var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
        var opts = options || {};
        return fetch(url, {
            method: opts.method || "GET",
            headers: opts.headers || {},
            body: opts.body,
            cache: opts.cache,
            signal: controller.signal
        }).finally(function () {
            clearTimeout(timer);
        });
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
        var start = incident.start || incident.timestamp || "Unknown";
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
            if (normalized === "degraded") riStatus.classList.add("investigating");
            else if (normalized === "down") riStatus.classList.add("outage");
            else riStatus.classList.add("resolved");
        }
    }

    function numeric(value) {
        var n = Number(value);
        return Number.isFinite(n) ? n : null;
    }

    function fmtScore(value) {
        var n = numeric(value);
        if (n === null) return "TBD";
        return (n * 100).toFixed(1) + "%";
    }

    function parseEvidenceObject(evidence) {
        if (!evidence) return null;
        if (typeof evidence === "object") return evidence;
        if (typeof evidence !== "string") return null;
        try { return JSON.parse(evidence); } catch (_e) { return null; }
    }

    function renderBenchmarkPanel(events) {
        var panel = document.getElementById("benchmark-panel");
        if (!panel) return;
        var rows = events.filter(function (e) { return e.type === "eval_result"; });
        if (!rows.length) {
            panel.innerHTML = '<div class="panel-empty">No eval_result entries yet.</div>';
            return;
        }
        panel.innerHTML = rows.slice(0, 10).map(function (e) {
            var skia = numeric(e.skiaScore);
            var baseline = numeric(e.claudeOpus47Baseline != null ? e.claudeOpus47Baseline : e.claudeBaseline);
            var delta = numeric(e.delta);
            if (delta === null && skia !== null && baseline !== null) delta = skia - baseline;
            var up = delta !== null && delta >= 0;
            var arrow = delta === null ? "•" : (up ? "↑" : "↓");
            var deltaText = delta === null ? "TBD" : ((delta * 100).toFixed(1) + "pp");
            var cls = delta === null ? "neutral" : (up ? "up" : "down");
            return '<div class="panel-row">' +
                '<span class="panel-key">' + esc(e.suite || "suite") + '</span>' +
                '<span class="panel-value">SKIA ' + esc(fmtScore(e.skiaScore)) + ' vs Opus ' + esc(fmtScore(baseline)) + '</span>' +
                '<span class="panel-delta ' + cls + '">' + esc(arrow + " " + deltaText) + '</span>' +
                '</div>';
        }).join("");
    }

    function renderCapabilityPanel(events) {
        var panel = document.getElementById("capability-panel");
        if (!panel) return;
        var rows = events.filter(function (e) { return e.type === "capability_update"; });
        if (!rows.length) {
            panel.innerHTML = '<div class="panel-empty">No capability_update entries yet.</div>';
            return;
        }
        panel.innerHTML = rows.slice(0, 10).map(function (e) {
            var fromState = e.fromState || "stub";
            var toState = e.toState || "partial";
            return '<div class="panel-row">' +
                '<span class="panel-key">' + esc(e.capability || e.title || "capability") + '</span>' +
                '<span class="panel-value">' + esc(fromState + " → " + toState) + '</span>' +
                '<span class="panel-meta">' + esc(e.timestamp || "unknown time") + '</span>' +
                '</div>';
        }).join("");
    }

    function renderReasoningPanel(events) {
        var panel = document.getElementById("reasoning-panel");
        if (!panel) return;
        var mode = "unknown";
        var confidences = [];
        var effort = { low: 0, medium: 0, high: 0, max: 0 };
        var candidates = events.filter(function (e) {
            return e.type === "capability_update" && String(e.capability || "").toLowerCase().indexOf("reason") >= 0;
        });
        for (var i = 0; i < candidates.length; i += 1) {
            var ev = candidates[i];
            var parsed = parseEvidenceObject(ev.evidence);
            if (parsed && parsed.mode) mode = String(parsed.mode);
            if (parsed && numeric(parsed.confidence) !== null) confidences.push(numeric(parsed.confidence));
            if (parsed && parsed.effortDistribution && typeof parsed.effortDistribution === "object") {
                effort.low += Number(parsed.effortDistribution.low || 0);
                effort.medium += Number(parsed.effortDistribution.medium || 0);
                effort.high += Number(parsed.effortDistribution.high || 0);
                effort.max += Number(parsed.effortDistribution.max || 0);
            }
        }
        var avg = confidences.length
            ? (confidences.reduce(function (a, b) { return a + b; }, 0) / confidences.length).toFixed(3)
            : "n/a";
        panel.innerHTML =
            '<div class="panel-row"><span class="panel-key">Mode</span><span class="panel-value">' + esc(mode) + '</span></div>' +
            '<div class="panel-row"><span class="panel-key">Avg confidence</span><span class="panel-value">' + esc(avg) + '</span></div>' +
            '<div class="panel-row"><span class="panel-key">Effort distribution</span><span class="panel-value">' +
            esc("low " + effort.low + " · medium " + effort.medium + " · high " + effort.high + " · max " + effort.max) +
            '</span></div>';
    }

    function renderMemoryPanel(events) {
        var panel = document.getElementById("memory-panel");
        if (!panel) return;
        var latest = null;
        var updates = events.filter(function (e) {
            return e.type === "capability_update" && String(e.capability || "").toLowerCase().indexOf("memory") >= 0;
        });
        if (updates.length) {
            latest = parseEvidenceObject(updates[0].evidence);
        }
        var tiers = latest && latest.tiers ? latest.tiers : {};
        var working = Number(tiers.working || 0);
        var episodic = Number(tiers.episodic || 0);
        var semantic = Number(tiers.semantic || 0);
        var procedural = Number(tiers.procedural || 0);
        var lastConsolidation = latest && latest.lastConsolidation ? latest.lastConsolidation : "n/a";
        var semanticCount = latest && latest.semanticEntryCount != null ? latest.semanticEntryCount : semantic;
        panel.innerHTML =
            '<div class="panel-row"><span class="panel-key">Tier sizes</span><span class="panel-value">' +
            esc("W " + working + " · E " + episodic + " · S " + semantic + " · P " + procedural) +
            '</span></div>' +
            '<div class="panel-row"><span class="panel-key">Last consolidation</span><span class="panel-value">' + esc(lastConsolidation) + '</span></div>' +
            '<div class="panel-row"><span class="panel-key">Semantic entries</span><span class="panel-value">' + esc(String(semanticCount)) + '</span></div>';
    }

    function renderIntelligenceDiagnosticsPanel(events) {
        var panel = document.getElementById("intelligence-diagnostics-panel");
        if (!panel) return;
        var rows = events.filter(function (e) { return e.type === "weakness_analysis" || e.type === "strategy_update"; });
        if (!rows.length) {
            panel.innerHTML = '<div class="panel-empty">No diagnostics entries yet.</div>';
            return;
        }
        panel.innerHTML = rows.slice(0, 10).map(function (e) {
            if (e.type === "strategy_update") {
                return '<div class="panel-row">' +
                    '<span class="panel-key">' + esc((e.taskType || "unknown") + " strategy update") + '</span>' +
                    '<span class="panel-value">' + esc(String(e.topStrategyBefore || "n/a") + " → " + String(e.topStrategyAfter || "n/a")) + '</span>' +
                    '<span class="panel-meta">' + esc("Projected: " + String(e.projectedScoreImprovement != null ? Number(e.projectedScoreImprovement).toFixed(3) : "0.000") + " · Evidence pairs: " + String(e.evidencePairs || 0)) + '</span>' +
                    '</div>';
            }
            var insight = Array.isArray(e.actionableInsights) && e.actionableInsights.length
                ? e.actionableInsights[0]
                : "No actionable insight yet";
            return '<div class="panel-row">' +
                '<span class="panel-key">' + esc((e.suite || "unknown") + " diagnostics") + '</span>' +
                '<span class="panel-value">' + esc(e.topPattern || "No top pattern") + '</span>' +
                '<span class="panel-meta">' + esc("Severity: " + String(e.severityScore != null ? Number(e.severityScore).toFixed(2) : "0.00") + " · Trend: " + String(e.trend || "stable")) + '</span>' +
                '<span class="panel-meta">' + esc("Insight: " + insight) + '</span>' +
                '</div>';
        }).join("");
    }

    function renderPanels(events) {
        renderBenchmarkPanel(events);
        renderCapabilityPanel(events);
        renderReasoningPanel(events);
        renderMemoryPanel(events);
        renderIntelligenceDiagnosticsPanel(events);
    }

    async function readIntelligenceResponse(response) {
        var contentType = String(response.headers.get("content-type") || "").toLowerCase();
        if (contentType.indexOf("text/event-stream") !== -1 && response.body) {
            var reader = response.body.getReader();
            var decoder = new TextDecoder("utf-8");
            var buffer = "";
            var assembled = "";
            while (true) {
                var chunk = await reader.read();
                if (chunk.done) break;
                buffer += decoder.decode(chunk.value, { stream: true });
                var frames = buffer.split("\n\n");
                buffer = frames.pop() || "";
                for (var i = 0; i < frames.length; i += 1) {
                    var lines = frames[i].split("\n");
                    for (var j = 0; j < lines.length; j += 1) {
                        var line = lines[j];
                        if (line.indexOf("data: ") !== 0) continue;
                        var payload = line.slice(6).trim();
                        if (!payload || payload === "[DONE]") continue;
                        try {
                            var parsed = JSON.parse(payload);
                            if (typeof parsed.response === "string") assembled += parsed.response;
                            else if (typeof parsed.content === "string") assembled += parsed.content;
                            else if (typeof parsed.message === "string") assembled += parsed.message;
                            else if (typeof parsed.delta === "string") assembled += parsed.delta;
                            else assembled += payload;
                        } catch (_e) {
                            assembled += payload;
                        }
                    }
                }
            }
            return assembled.trim();
        }
        var json = await response.json();
        if (typeof json.response === "string") return json.response;
        if (typeof json.content === "string") return json.content;
        if (typeof json.message === "string") return json.message;
        return "";
    }

    async function renderIntelligenceReport(events) {
        var panel = document.getElementById("intelligence-report-panel");
        if (!panel) return;
        var candidates = events.filter(function (e) {
            if (!e || (e.type !== "incident" && e.type !== "supersession_milestone" && e.type !== "eval_result")) {
                return false;
            }
            return String(e.status || "").toLowerCase() !== "superseded";
        }).slice(0, 5);
        var prompt = "You are SKIA. Summarize the current health and capability status of the SKIA ecosystem in 2-3 sentences based on this data: " +
            JSON.stringify(candidates) +
            " Be concise and sovereign.";
        try {
            var response = await fetchWithTimeout("https://api.skia.ca/api/skia/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    is_guest: true
                })
            }, INTEL_TIMEOUT_MS);
            if (!response.ok) throw new Error("HTTP " + response.status);
            var report = await readIntelligenceResponse(response);
            panel.className = "incident-body";
            panel.textContent = report || "SKIA intelligence unavailable";
        } catch (_error) {
            panel.className = "panel-empty";
            panel.textContent = "SKIA intelligence unavailable";
        }
    }

    async function refreshStatus() {
        var recentWrapper = document.getElementById("recent-incident");
        if (recentWrapper) recentWrapper.classList.add("loading");
        try {
            var response = await fetch("incidents.json?v=" + Date.now(), { cache: "no-store" });
            if (!response.ok) throw new Error("HTTP " + response.status);
            var raw = await response.text();
            var data = JSON.parse(raw.replace(/^\uFEFF/, ""));
            var events = Array.isArray(data) ? data : [];
            var incident = pickRecentIncident(events);
            var systemValues = mapSystemValues(incident);

            // Live backend health check (overrides incidents.json backend/auth)
            try {
                var backendResponse = await fetchWithTimeout("https://api.skia.ca/api/forge/architecture/health", {
                    method: "GET"
                }, API_TIMEOUT_MS);
                if (backendResponse.ok) {
                    systemValues.backend = "operational";
                    if (Object.prototype.hasOwnProperty.call(systemValues, "auth")) {
                        systemValues.auth = "operational";
                    }
                }
            } catch (_backendError) {}

            // Live frontend check (overrides incidents.json frontend)
            try {
                var frontendResponse = await fetchWithTimeout("https://skia.ca", {
                    method: "HEAD"
                }, API_TIMEOUT_MS);
                if (frontendResponse.ok) {
                    systemValues.frontend = "operational";
                }
            } catch (_frontendError) {}

            applySystemStatus("backend-status", systemValues.backend);
            applySystemStatus("frontend-status", systemValues.frontend);
            applySystemStatus("database-status", systemValues.database);
            applySystemStatus("search-status", systemValues.search);
            applySystemStatus("llm-status", systemValues.llm);
            applyOverallStatus(systemValues);
            updateRecentIncident(incident);
            renderPanels(events);
            await renderIntelligenceReport(events);
        } catch (error) {
            updateRecentIncident(null);
            text("system-status", "Status unavailable");
            text("backend-status", "Unknown");
            text("frontend-status", "Unknown");
            text("database-status", "Unknown");
            text("search-status", "Unknown");
            text("llm-status", "Unknown");
            var intelligencePanel = document.getElementById("intelligence-report-panel");
            if (intelligencePanel) {
                intelligencePanel.className = "panel-empty";
                intelligencePanel.textContent = "SKIA intelligence unavailable";
            }
        } finally {
            text("last-updated", toUtcNow());
            if (recentWrapper) recentWrapper.classList.remove("loading");
        }
    }

    refreshStatus();
    setInterval(refreshStatus, REFRESH_MS);
})();
