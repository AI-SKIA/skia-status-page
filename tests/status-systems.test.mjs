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

test("media engines probe the backend /api/health/{engine} endpoints", () => {
    for (const engine of ["video", "tts", "embedding"]) {
        assert.match(source, new RegExp('probeMediaServiceHealth\\("/api/health/' + engine + '"'));
    }
    assert.doesNotMatch(source, /probeMediaServiceHealth\([^)]*"\/health"\]/);
});
