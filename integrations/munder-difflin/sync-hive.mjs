import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAllMunderHires, getDivisionsSummary } from '../../packages/agent-registry/dist/index.js';
import { ensureHiveStructure } from '../../packages/agent-orchestrator/dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n===============================================================');
console.log('⚡ P-NEXA × MUNDER DIFFLIN · HIVE REGISTRY SYNCHRONIZER');
console.log('===============================================================\n');

// 1. Ensure Hive Directory Structure
console.log('[Step 1/3] Initializing Hive Protocol storage layout...');
const hivePath = ensureHiveStructure();
console.log(`  ✓ Hive storage verified at: ${hivePath}`);

// 2. Fetch all 283 Agency Agents converted to Munder Difflin Hire Schema
console.log('\n[Step 2/3] Translating Agency Agents into munder-difflin/hire@1 specs...');
const hires = getAllMunderHires();
console.log(`  ✓ Loaded ${hires.length} Agency Agents across 18 specialized divisions.`);

const hiresDir = join(__dirname, 'hires');
if (!existsSync(hiresDir)) {
  mkdirSync(hiresDir, { recursive: true });
}

let writtenHires = 0;
for (const hire of hires) {
  const filePath = join(hiresDir, `${hire.id}.json`);
  writeFileSync(filePath, JSON.stringify(hire, null, 2), 'utf8');
  writtenHires++;
}
console.log(`  ✓ Wrote ${writtenHires} individual munder-difflin/hire@1 JSON manifests to: ${hiresDir}`);

// 3. Write Hive Master Roster
console.log('\n[Step 3/3] Emitting Munder Difflin Hive Master Roster...');
const registryPayload = {
  schema: 'munder-difflin/hive-registry@1',
  updatedAt: new Date().toISOString(),
  activeRosterCount: hires.length,
  divisions: getDivisionsSummary(),
  agents: hires
};

const hiveRegistryFile = join(hivePath, 'registry.json');
writeFileSync(hiveRegistryFile, JSON.stringify(registryPayload, null, 2), 'utf8');
console.log(`  ✓ Hive master roster saved to: ${hiveRegistryFile}`);

console.log('\n===============================================================');
console.log(`✓ Munder Difflin Sync Complete: ${hires.length} agents ready for Hive orchestration!`);
console.log('===============================================================\n');
