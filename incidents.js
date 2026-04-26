(function () {
    function esc(value) {
        return String(value || "").replace(/[&<>"']/g, function (char) {
            if (char === "&") return "&amp;";
            if (char === "<") return "&lt;";
            if (char === ">") return "&gt;";
            if (char === '"') return "&quot;";
            return "&#39;";
        });
    }

    function statusClass(status) {
        var raw = String(status || "").toLowerCase();
        if (raw === "resolved") return "resolved";
        if (raw === "outage" || raw === "down" || raw === "failed") return "outage";
        return "investigating";
    }

    function statusText(status) {
        var raw = String(status || "").toLowerCase();
        if (!raw) return "UNKNOWN";
        return raw.toUpperCase();
    }

    function renderEmpty(container, message) {
        container.innerHTML = "";
        var empty = document.createElement("article");
        empty.className = "incident-item";
        empty.innerHTML = '<div class="incident-body">' + esc(message) + '</div>';
        container.appendChild(empty);
    }

    function buildIncidentItem(incident, index) {
        var article = document.createElement("article");
        article.className = "incident-item";

        var details = document.createElement("details");
        details.open = index === 0;

        var summary = document.createElement("summary");
        summary.className = "incident-header";
        summary.style.cursor = "pointer";
        summary.innerHTML =
            '<div class="incident-title">' + esc(incident.title || "Untitled incident") + '</div>' +
            '<div class="incident-status ' + statusClass(incident.status) + '">' + esc(statusText(incident.status)) + '</div>';

        var meta = document.createElement("div");
        meta.className = "incident-meta";
        meta.textContent = "Start: " + (incident.start || "Unknown") + " · End: " + (incident.end || "Ongoing");

        var body = document.createElement("div");
        body.className = "incident-body";
        body.textContent = incident.impact || incident.description || "No description provided.";

        var status = document.createElement("div");
        status.className = "incident-meta";
        status.textContent = "Status: " + statusText(incident.status);

        details.appendChild(summary);
        details.appendChild(meta);
        details.appendChild(status);
        details.appendChild(body);
        article.appendChild(details);

        return article;
    }

    async function loadIncidents() {
        var container = document.getElementById("incident-list");
        if (!container) return;

        try {
            var response = await fetch("incidents.json?v=" + Date.now(), { cache: "no-store" });
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }

            var raw = await response.text();
            var data = JSON.parse(raw.replace(/^\uFEFF/, ""));
            if (!Array.isArray(data) || data.length === 0) {
                renderEmpty(container, "No incidents have been recorded for this environment.");
                return;
            }

            container.innerHTML = "";
            for (var i = 0; i < data.length; i += 1) {
                container.appendChild(buildIncidentItem(data[i], i));
            }
        } catch (error) {
            renderEmpty(container, "Unable to load incident history at this time.");
        }
    }

    loadIncidents();
})();
