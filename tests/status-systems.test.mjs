import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../status.js", import.meta.url), "utf8");

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

const mapSystemValues = new Function(
    extractFunction("normalizeStatus") + "\n" + extractFunction("mapSystemValues") + "\nreturn mapSystemValues;"
)();

test("mapSystemValues exposes video, tts and embedding so live probes can apply", () => {
    const values = mapSystemValues({ status: "resolved", systems: {} });
    for (const key of ["video", "tts", "embedding"]) {
        assert.ok(Object.prototype.hasOwnProperty.call(values, key), key + " missing");
        assert.equal(values[key], "unknown");
    }
});

test("mapSystemValues keeps ledger values for media engines when present", () => {
    const values = mapSystemValues({ status: "resolved", systems: { video: "down", tts: "operational" } });
    assert.equal(values.video, "down");
    assert.equal(values.tts, "operational");
});

const paused = new Function(
    extractFunction("normalizeStatus") + "\n" + extractFunction("statusLabel") + "\n" +
    extractFunction("pausedSystemsFromConfig") + "\n" + extractFunction("applyPausedSystems") +
    "\nreturn { normalizeStatus, statusLabel, pausedSystemsFromConfig, applyPausedSystems };"
)();
const pausedConfig = JSON.parse(readFileSync(new URL("../paused-services.json", import.meta.url), "utf8"));

test("paused-services.json lists skia-serve, image-engine and video-engine with a note", () => {
    const byService = Object.fromEntries(pausedConfig.services.map((s) => [s.service, s]));
    for (const service of ["skia-serve", "image-engine", "video-engine"]) {
        assert.ok(byService[service], service + " missing");
        assert.ok(byService[service].systems.length > 0);
        assert.ok(byService[service].note.length > 0 && byService[service].note.length <= 120);
    }
    assert.deepEqual(byService["skia-serve"].systems, ["llm"]);
});

test("paused systems render Paused instead of Down, including chat while skia-serve is paused", () => {
    const map = paused.pausedSystemsFromConfig(pausedConfig);
    const values = paused.applyPausedSystems(
        { backend: "operational", llm: "down", image: "down", video: "down", tts: "operational" },
        map
    );
    assert.equal(values.llm, "paused");
    assert.equal(values.image, "paused");
    assert.equal(values.video, "paused");
    assert.equal(values.backend, "operational");
    assert.equal(values.tts, "operational");
    assert.equal(paused.statusLabel(paused.normalizeStatus(values.llm)), "Paused");
    assert.equal(paused.statusLabel(paused.normalizeStatus("down")), "Down");
});

test("services not in the paused list still show Down on failure", () => {
    const values = paused.applyPausedSystems({ llm: "down", tts: "down" }, paused.pausedSystemsFromConfig({ services: [] }));
    assert.equal(values.llm, "down");
    assert.equal(values.tts, "down");
});

test("the paused list ships in the image and is read at runtime", () => {
    const dockerfile = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");
    assert.match(dockerfile, /COPY paused-services\.json/);
    assert.match(source, /fetchPausedSystems\(\)/);
});

test("media engines probe the backend /api/health/{engine} endpoints", () => {
    for (const engine of ["video", "tts", "embedding"]) {
        assert.match(source, new RegExp('probeMediaServiceHealth\\("/api/health/' + engine + '"'));
    }
    assert.doesNotMatch(source, /probeMediaServiceHealth\([^)]*"\/health"\]/);
});
