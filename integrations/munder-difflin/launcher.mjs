import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawn } from 'node:child_process';
import {
  ensureHiveStructure,
  loadHiveTasks,
  getPendingApprovals,
  loadBlackboardEntries
} from '../../packages/agent-orchestrator/dist/index.js';
import { getAgentCount, getDivisionsSummary } from '../../packages/agent-registry/dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isStatusOnly = process.argv.includes('--status');
const hivePath = ensureHiveStructure();
const configPath = join(__dirname, 'config.json');

console.log('\n===============================================================');
console.log('⚡ P-NEXA × MUNDER DIFFLIN · HARNESS LAUNCHER & ADAPTER');
console.log('===============================================================\n');

const agentCount = getAgentCount();
const divisions = getDivisionsSummary();
const tasks = loadHiveTasks();
const pendingApprovals = getPendingApprovals();
const blackboard = loadBlackboardEntries();

console.log(`[Hive Architecture Summary]`);
console.log(`  • Agency Agents Registered : ${agentCount} specialists across ${divisions.length} divisions`);
console.log(`  • Hive Storage Path        : ${hivePath}`);
console.log(`  • Active / Historical Tasks : ${tasks.length} tasks`);
console.log(`  • Human Approvals Pending  : ${pendingApprovals.length} requests awaiting administrator sign-off`);
console.log(`  • Shared Memory Topics     : ${blackboard.length} markdown blackboards active\n`);

if (tasks.length > 0) {
  console.log(`[Recent Task Pipeline]`);
  tasks.slice(0, 5).forEach((t) => {
    const lead = t.squad.find((s) => s.assignedRole === 'LEAD_SPECIALIST');
    console.log(`  • [${t.id}] ${t.status.padEnd(16)} | Lead: ${lead?.name || 'Unknown'} | ${t.title.slice(0, 45)}`);
  });
  console.log('');
}

if (pendingApprovals.length > 0) {
  console.log(`[⚠️ Pending Approval Requests Queue]`);
  pendingApprovals.forEach((req) => {
    console.log(`  • [${req.taskId}] Target: ${req.targetBranch} <- ${req.sourceBranch} | Lead: ${req.leadSpecialist}`);
  });
  console.log('');
}

if (isStatusOnly) {
  console.log('Status query complete. Exiting.\n');
  process.exit(0);
}

// ── Check for Native Munder Difflin Desktop Application ─────────────────────
function findNativeExecutable() {
  const possiblePaths = [
    process.env.MUNDER_DIFFLIN_PATH,
    join(process.env.LOCALAPPDATA || '', 'Programs', 'munder-difflin', 'munder-difflin.exe'),
    join(process.env.LOCALAPPDATA || '', 'munder-difflin', 'munder-difflin.exe'),
    join(process.env.ProgramFiles || '', 'munder-difflin', 'munder-difflin.exe')
  ].filter(Boolean);

  for (const p of possiblePaths) {
    if (existsSync(p)) return p;
  }

  try {
    const whereOut = execSync('where munderdifflin', { stdio: 'pipe', encoding: 'utf8' }).trim();
    if (whereOut) return whereOut.split('\n')[0].trim();
  } catch {
    // Not on PATH
  }

  return null;
}

const nativePath = findNativeExecutable();

if (nativePath) {
  console.log(`✓ Located native Munder Difflin desktop application at: ${nativePath}`);
  console.log(`Launching Munder Difflin with Hive path: ${hivePath}...`);
  const child = spawn(nativePath, [`--hive=${hivePath}`, `--config=${configPath}`], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  console.log('✓ Desktop GUI spawned successfully in separate process.');
} else {
  console.log(`ℹ️ Native Munder Difflin desktop binary not found on local PATH.`);
  console.log(`• Protocol URI: munderdifflin://open?path=${encodeURIComponent(hivePath)}`);
  console.log(`• The P-NEXA Developer Agent Control Center is accessible at:`);
  console.log(`  http://localhost:5173/developer/agents (or Overview -> Developer Tab)`);
  console.log(`• Operating in Headless Hive Multi-Agent Daemon Mode.`);
  console.log(`\n✓ Headless Hive Orchestrator active and ready to process development tasks!\n`);
}
