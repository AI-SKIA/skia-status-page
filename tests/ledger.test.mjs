import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyLedgerHygiene, RETENTION } from "../scripts/apply-ledger-hygiene.mjs";
import { validateLedger } from "../scripts/validate-ledger.mjs";

const read = (rel) => readFileSync(new URL("../" + rel, import.meta.url), "utf8");
const source = read("status.js");

function extractFunction(name) {
    const start = source.indexOf("function " + name + "(");
    assert.ok(start >= 0, name + " not found in status.js");
    let depth = 0;
    for (let i = source.indexOf("{", start); i < source.length; i += 1) {
        if (source[i] === "{") depth += 1;
        if (source[i] === "}") {
            depth -= 1;
            if (depth === 0) return source.slice(start, i + 1);
        }
    }
    throw new Error("unterminated function " + name);
}

const panels = new Function(
    ["esc", "numeric", "isActiveRow", "fmtMark", "supersessionPanelHtml", "driftPanelHtml"].map(extractFunction).join("\n") +
    "\nreturn { supersessionPanelHtml, driftPanelHtml };"
)();

const day = (n) => new Date(Date.UTC(2026, 0, 1 + n)).toISOString();

test("hygiene supersedes rows beyond each type's retention, newest kept, nothing deleted", () => {
    const rows = [];
    for (let i = 0; i < 8; i += 1) rows.push({ type: "strategy_update", taskType: "t" + i, timestamp: day(i), status: "active" });
    for (let i = 0; i < 22; i += 1) rows.push({ id: "w" + i, type: "weakness_analysis", suite: "s", timestamp: day(i), status: "active" });
    rows.push({ id: "inc", type: "incident", title: "x", status: "resolved", start: day(0), impact: "y" });
    const { superseded } = applyLedgerHygiene(rows);
    assert.equal(rows.length, 31);
    assert.deepEqual(superseded, { strategy_update: 3, capability_update: 0, weakness_analysis: 2, supersession_milestone: 0 });
    const activeStrategies = rows.filter((r) => r.type === "strategy_update" && r.status === "active").map((r) => r.taskType);
    assert.deepEqual(activeStrategies.sort(), ["t3", "t4", "t5", "t6", "t7"]);
    assert.ok(rows.filter((r) => r.status === "superseded").every((r) => /ledger-hygiene: \w+ retention/.test(r.supersededReason)));
    assert.equal(rows.find((r) => r.id === "inc").status, "resolved");
    assert.deepEqual(RETENTION, { strategy_update: 5, capability_update: 50, weakness_analysis: 20, supersession_milestone: 20 });
});

test("hygiene never re-activates or rewrites an already superseded row", () => {
    const rows = [
        { type: "strategy_update", taskType: "old", timestamp: day(9), status: "superseded", supersededReason: "manual" },
        { type: "strategy_update", taskType: "new", timestamp: day(1), status: "active" },
    ];
    applyLedgerHygiene(rows);
    assert.equal(rows[0].status, "superseded");
    assert.equal(rows[0].supersededReason, "manual");
    assert.equal(rows[1].status, "active");
});

test("validator accepts the documented shapes, including backend drift and heartbeat rows", () => {
    assert.deepEqual(validateLedger([
        { id: "i1", type: "incident", title: "t", status: "resolved", start: "s", impact: "i" },
        { id: "e1", type: "eval_result", suite: "s", skiaScore: 0.9, timestamp: day(0), status: "active" },
        { id: "c1", type: "capability_update", capability: "c", fromState: "a", toState: "b", timestamp: day(0), status: "active" },
        { id: "m1", type: "supersession_milestone", dimension: "reasoning", timestamp: day(0), status: "active" },
        { type: "weakness_analysis", suite: "s", timestamp: day(0), status: "active" },
        { type: "strategy_update", taskType: "code", timestamp: day(0), status: "superseded", supersededReason: "r" },
        { id: "d1", type: "drift_alert", title: "t", status: "investigating", start: "s" },
        { id: "f1", type: "fairness_drift", title: "t", status: "investigating", start: "s" },
        { id: "skia-status-heartbeat", type: "status_heartbeat", status: "active", timestamp: day(0), systems: {} },
    ]), []);
});

test("validator reports unknown types, missing fields, bad scores, superseded without reason and duplicate ids", () => {
    const errors = validateLedger([
        { id: "a", type: "mystery" },
        { type: "capability_update", capability: "c", fromState: "a", toState: "b", timestamp: day(0), status: "active" },
        { id: "e", type: "eval_result", suite: "s", skiaScore: 4, timestamp: day(0), status: "superseded" },
        { id: "dup", type: "drift_alert", title: "t", status: "investigating", start: "s" },
        { id: "dup", type: "drift_alert", title: "t", status: "investigating", start: "s" },
    ]);
    assert.ok(errors.some((e) => e.includes('unknown type "mystery"')));
    assert.ok(errors.some((e) => e.includes("capability_update missing id")));
    assert.ok(errors.some((e) => e.includes("skiaScore must be 0..1")));
    assert.ok(errors.some((e) => e.includes("superseded without supersededReason")));
    assert.ok(errors.some((e) => e.includes("duplicate id")));
    assert.deepEqual(validateLedger({}), ["ledger must be a JSON array"]);
});

test("the sync job applies hygiene and validates before committing, and CI validates the schema", () => {
    const sync = read(".github/workflows/sync-incidents-ledger.yml");
    const hygiene = sync.indexOf("node scripts/apply-ledger-hygiene.mjs incidents.json.new");
    const validate = sync.indexOf("node scripts/validate-ledger.mjs incidents.json.new");
    const move = sync.indexOf("mv incidents.json.new incidents.json");
    assert.ok(hygiene > 0 && validate > hygiene && move > validate);
    assert.match(read(".github/workflows/status-ci.yml"), /node scripts\/validate-ledger\.mjs incidents\.json/);
});

test("index.html renders supersession milestones", () => {
    const html = panels.supersessionPanelHtml([
        { id: "m1", type: "supersession_milestone", dimension: "reasoning", title: "Reasoning baseline passed", skiaMark: 0.91, claudeOpus47Mark: 0.88, timestamp: day(2), status: "active" },
        { id: "m0", type: "supersession_milestone", dimension: "old", title: "Old milestone", timestamp: day(1), status: "superseded", supersededReason: "r" },
    ]);
    assert.match(html, /Reasoning baseline passed/);
    assert.match(html, /SKIA 91\.0% vs Opus 88\.0%/);
    assert.doesNotMatch(html, /Old milestone/);
    assert.match(panels.supersessionPanelHtml([]), /panel-empty/);
    assert.match(read("index.html"), /id="supersession-panel"/);
});

test("index.html shows drift_alert and fairness_drift as informational rows", () => {
    const html = panels.driftPanelHtml([
        { id: "d1", type: "drift_alert", title: "Operational drift detected", status: "investigating", start: "2026-01-01 10:00 UTC", impact: "Moderation flag drift 4.0%" },
        { id: "f1", type: "fairness_drift", title: "Fairness monitoring drift", status: "investigating", start: "2026-01-01 11:00 UTC", impact: "Samples=40" },
        { id: "x", type: "incident", title: "Real outage", status: "investigating", start: "s", impact: "i" },
    ]);
    assert.match(html, /Operational drift detected/);
    assert.match(html, /Moderation flag drift 4\.0%/);
    assert.match(html, /Fairness drift · Investigating/);
    assert.doesNotMatch(html, /Real outage/);
    assert.match(panels.driftPanelHtml([]), /informational/);
    assert.match(read("index.html"), /id="drift-panel"/);
    assert.match(source, /renderSupersessionPanel\(events\);\s*\n\s*renderDriftPanel\(events\);/);
});
