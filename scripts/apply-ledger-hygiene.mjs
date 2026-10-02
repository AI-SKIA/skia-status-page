/**
 * Ledger retention (docs/operations/ledger-hygiene.md): keep the newest N active rows per type and
 * mark older ones superseded with a reason. Rows are never deleted or re-activated.
 * Run: node scripts/apply-ledger-hygiene.mjs [path/to/incidents.json]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const RETENTION = {
  strategy_update: 5,
  capability_update: 50,
  weakness_analysis: 20,
  supersession_milestone: 20,
};

function rowTime(row) {
  const t = Date.parse(String(row.timestamp ?? row.start ?? ''));
  return Number.isFinite(t) ? t : 0;
}

/** Mutates and returns `rows`; reports how many rows were newly superseded per type. */
export function applyLedgerHygiene(rows) {
  const superseded = {};
  for (const [type, keep] of Object.entries(RETENTION)) {
    const active = rows
      .filter((row) => row && row.type === type && String(row.status ?? '').toLowerCase() !== 'superseded')
      .sort((a, b) => rowTime(b) - rowTime(a));
    superseded[type] = 0;
    for (const row of active.slice(keep)) {
      row.status = 'superseded';
      row.supersededReason = row.supersededReason ?? `ledger-hygiene: ${type} retention (last ${keep} active)`;
      superseded[type] += 1;
    }
  }
  return { rows, superseded };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const ledgerPath = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'incidents.json'));
  const rows = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  if (!Array.isArray(rows)) throw new Error(`${ledgerPath} is not a JSON array`);
  const { superseded } = applyLedgerHygiene(rows);
  if (Object.values(superseded).some((n) => n > 0)) fs.writeFileSync(ledgerPath, `${JSON.stringify(rows, null, 2)}\n`);
  console.log(`Ledger hygiene applied to ${rows.length} rows; newly superseded: ${JSON.stringify(superseded)}`);
}
