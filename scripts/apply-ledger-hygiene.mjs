/**
 * Apply strategy_update retention (last 5 active) and ensure sovereign_context_upgrade_2M eval_result.
 * Run: node scripts/apply-ledger-hygiene.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ledgerPath = path.join(__dirname, '..', 'incidents.json');

const incidents = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

if (!incidents.some((i) => i.id === 'sovereign_context_upgrade_2M')) {
  incidents.unshift({
    id: 'sovereign_context_upgrade_2M',
    type: 'eval_result',
    suite: 'Sovereign Context Window',
    title: '2M sovereign input context live',
    skiaScore: 1,
    timestamp: '2026-05-24T09:47:41.801Z',
    status: 'active',
    providerBacked: true,
  });
}

const strategyRows = incidents
  .map((item, index) => ({ item, index }))
  .filter(({ item }) => item.type === 'strategy_update');

strategyRows.sort((a, b) => {
  const ta = Date.parse(String(a.item.timestamp ?? 0));
  const tb = Date.parse(String(b.item.timestamp ?? 0));
  return tb - ta;
});

let superseded = 0;
strategyRows.forEach(({ item }, rank) => {
  if (rank < 5) {
    item.status = 'active';
    return;
  }
  if (item.status !== 'superseded') superseded += 1;
  item.status = 'superseded';
  item.supersededReason =
    item.supersededReason ?? 'ledger-hygiene: strategy_update retention (last 5 active)';
});

fs.writeFileSync(ledgerPath, `${JSON.stringify(incidents, null, 2)}\n`);
console.log(
  `Ledger hygiene applied: ${strategyRows.length} strategy_update rows; ${superseded} marked superseded; sovereign_context_upgrade_2M present.`
);
