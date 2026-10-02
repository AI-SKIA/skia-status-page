/**
 * Validates incidents.json against docs/INCIDENT_EVENT_SCHEMA.md: type enum, per-type required
 * fields, unique ids, and a supersededReason on every superseded row.
 * Run: node scripts/validate-ledger.mjs [path/to/incidents.json]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const REQUIRED_FIELDS = {
  incident: ['id', 'title', 'status', 'start', 'impact'],
  eval_result: ['id', 'suite', 'skiaScore', 'timestamp', 'status'],
  capability_update: ['id', 'capability', 'fromState', 'toState', 'timestamp', 'status'],
  supersession_milestone: ['id', 'dimension', 'timestamp', 'status'],
  weakness_analysis: ['suite', 'timestamp', 'status'],
  strategy_update: ['taskType', 'timestamp', 'status'],
  drift_alert: ['id', 'title', 'status', 'start'],
  fairness_drift: ['id', 'title', 'status', 'start'],
  status_heartbeat: ['id', 'status', 'timestamp', 'systems'],
};

const present = (value) => value !== undefined && value !== null && value !== '';

/** Returns a list of human-readable problems; empty when the ledger is valid. */
export function validateLedger(rows) {
  if (!Array.isArray(rows)) return ['ledger must be a JSON array'];
  const errors = [];
  const seen = new Map();
  rows.forEach((row, i) => {
    const where = `row ${i}${row && row.id ? ` (${row.id})` : ''}`;
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      errors.push(`${where}: not an object`);
      return;
    }
    const required = REQUIRED_FIELDS[row.type];
    if (!required) {
      errors.push(`${where}: unknown type ${JSON.stringify(row.type)}`);
      return;
    }
    for (const field of required) {
      if (!present(row[field])) errors.push(`${where}: ${row.type} missing ${field}`);
    }
    if (row.type === 'eval_result' && present(row.skiaScore)) {
      const score = Number(row.skiaScore);
      if (!Number.isFinite(score) || score < 0 || score > 1) errors.push(`${where}: skiaScore must be 0..1`);
    }
    if (String(row.status ?? '').toLowerCase() === 'superseded' && !present(row.supersededReason)) {
      errors.push(`${where}: superseded without supersededReason`);
    }
    if (present(row.id)) {
      if (seen.has(row.id)) errors.push(`${where}: duplicate id (also row ${seen.get(row.id)})`);
      else seen.set(row.id, i);
    }
  });
  return errors;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const ledgerPath = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'incidents.json'));
  const errors = validateLedger(JSON.parse(fs.readFileSync(ledgerPath, 'utf8')));
  if (errors.length) {
    console.error(`incidents ledger invalid (${errors.length} problem(s)):\n${errors.slice(0, 50).join('\n')}`);
    process.exit(1);
  }
  console.log(`incidents ledger valid: ${ledgerPath}`);
}
