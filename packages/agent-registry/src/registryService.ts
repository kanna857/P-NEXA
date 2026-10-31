import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  RawAgencyRegistry,
  RawAgencyAgent,
  MunderDifflinHire,
  AgentSearchFilter,
  DivisionSummary,
  SupportedProvider
} from './types.js';

let cachedRegistry: RawAgencyRegistry | null = null;
let cachedHires: MunderDifflinHire[] | null = null;

/**
 * Finds the project root containing `.agents/registry.json`.
 */
export function findWorkspaceRoot(startDir = process.cwd()): string {
  let curr = resolve(startDir);
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(curr, '.agents', 'registry.json'))) {
      return curr;
    }
    const parent = resolve(curr, '..');
    if (parent === curr) break;
    curr = parent;
  }
  return resolve(process.cwd());
}

/**
 * Loads the raw Agency Agents registry from `.agents/registry.json`.
 */
export function loadAgencyRegistry(): RawAgencyRegistry {
  if (cachedRegistry) return cachedRegistry;

  const root = findWorkspaceRoot();
  const regPath = join(root, '.agents', 'registry.json');
  if (!existsSync(regPath)) {
    throw new Error(`Agency Agents registry not found at: ${regPath}`);
  }

  const raw = readFileSync(regPath, 'utf8').replace(/^\uFEFF/, '');
  cachedRegistry = JSON.parse(raw) as RawAgencyRegistry;
  return cachedRegistry;
}

/**
 * Returns the exact verified count of Agency Agents in the registry.
 */
export function getAgentCount(): number {
  const reg = loadAgencyRegistry();
  return reg.totalAgents || reg.agents.length;
}

/**
 * Maps a division to an office zone on the Munder Difflin 2D floor.
 */
function getZoneForDivision(division: string): { zone: string; baseCol: number; baseRow: number } {
  switch (division.toLowerCase()) {
    case 'engineering':
      return { zone: 'Engineering Bay Alpha', baseCol: 2, baseRow: 2 };
    case 'security':
      return { zone: 'SOC & Hardened Security Vault', baseCol: 10, baseRow: 2 };
    case 'testing':
      return { zone: 'QA & Automated Testing Lab', baseCol: 2, baseRow: 8 };
    case 'spatial-computing':
    case 'game-development':
      return { zone: 'Spatial 3D & Graphics Studio', baseCol: 10, baseRow: 8 };
    case 'product':
    case 'project-management':
      return { zone: 'Product & Agile Command Deck', baseCol: 6, baseRow: 2 };
    case 'finance':
    case 'sales':
      return { zone: 'Executive & Revenue Suite', baseCol: 6, baseRow: 8 };
    default:
      return { zone: 'Cross-Functional Specialist Atrium', baseCol: 6, baseRow: 14 };
  }
}

/**
 * Selects an appropriate AI CLI provider for the agent role.
 */
function getProviderForAgent(slug: string, division: string): SupportedProvider {
  if (division === 'security') return 'gemini-cli';
  if (division === 'testing') return 'codex';
  if (slug.includes('three') || slug.includes('spatial') || division === 'spatial-computing') return 'antigravity';
  if (division === 'engineering') return 'claude-code';
  return 'antigravity';
}

/**
 * Generates an avatar sprite identifier for Munder Difflin's Pixi.js renderer.
 */
function getSpriteForAgent(index: number, _division: string): string {
  const sprites = ['avatar-lead-m', 'avatar-coder-f', 'avatar-secops-m', 'avatar-arch-f', 'avatar-specialist-m'];
  return sprites[index % sprites.length]!;
}

/**
 * Converts a raw Agency Agent record into the Munder Difflin Shareable Hire schema.
 */
export function convertToMunderHire(agent: RawAgencyAgent, index = 0): MunderDifflinHire {
  const zoneInfo = getZoneForDivision(agent.division);
  const col = zoneInfo.baseCol + (index % 4) * 2;
  const row = zoneInfo.baseRow + Math.floor(index / 4) * 2;

  const provider = getProviderForAgent(agent.slug, agent.division);

  return {
    schema: 'munder-difflin/hire@1',
    id: agent.slug,
    name: agent.name,
    role: `Specialist (${agent.division})`,
    division: agent.division,
    specialty: agent.description || `${agent.name} specialist within the ${agent.division} domain`,
    sprite: getSpriteForAgent(index, agent.division),
    seat: {
      deskId: `desk-${agent.division.slice(0, 3)}-${(index + 1).toString().padStart(3, '0')}`,
      x: col * 64,
      y: row * 64,
      zone: zoneInfo.zone
    },
    provider,
    model: provider === 'gemini-cli' ? 'gemini-2.5-pro' : provider === 'claude-code' ? 'claude-3-7-sonnet' : 'antigravity-hybrid',
    systemPrompt: `You are ${agent.name}, an expert Agency Agent assigned to the ${agent.division} division. Follow your specialized instructions loaded from .agents/skills/${agent.slug}/SKILL.md.`,
    autonomyLevel: agent.division === 'security' ? 'strict-approval' : 'supervised',
    budget: {
      maxTokens: 150000,
      velocityLimit: 8000
    },
    allowedCommands: [
      'pnpm test',
      'pnpm build',
      'git status',
      'git diff',
      'git log',
      'git branch',
      'node',
      'vitest'
    ],
    requiresApprovalFor: [
      'git push',
      'git commit -a',
      'git merge',
      'rm -rf',
      'database drop'
    ],
    status: 'AVAILABLE',
    assignedTasks: [],
    executionHistoryCount: 0,
    workspaceSkillPath: agent.workspaceSkillPath
  };
}

/**
 * Returns all 283 Agency Agents converted to Munder Difflin Hires.
 */
export function getAllMunderHires(): MunderDifflinHire[] {
  if (cachedHires) return cachedHires;

  const reg = loadAgencyRegistry();
  cachedHires = reg.agents.map((agent, i) => convertToMunderHire(agent, i));
  return cachedHires;
}

/**
 * Searches and filters the 283-agent registry.
 */
export function searchAgents(filter: AgentSearchFilter = {}): MunderDifflinHire[] {
  const hires = getAllMunderHires();
  const q = (filter.query || '').trim().toLowerCase();
  const div = (filter.division || '').trim().toLowerCase();
  const prov = (filter.provider || '').trim().toLowerCase();
  const st = (filter.status || '').trim().toUpperCase();

  return hires.filter((h) => {
    if (q) {
      const matchName = h.name.toLowerCase().includes(q);
      const matchId = h.id.toLowerCase().includes(q);
      const matchDiv = h.division.toLowerCase().includes(q);
      const matchSpec = h.specialty.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchDiv && !matchSpec) return false;
    }

    if (div && div !== 'all' && h.division.toLowerCase() !== div) {
      return false;
    }

    if (prov && prov !== 'all' && h.provider.toLowerCase() !== prov) {
      return false;
    }

    if (st && st !== 'ALL' && h.status !== st) {
      return false;
    }

    return true;
  });
}

/**
 * Finds a specific agent by ID/slug.
 */
export function getAgentById(id: string): MunderDifflinHire | undefined {
  const hires = getAllMunderHires();
  return hires.find((h) => h.id === id || h.name.toLowerCase() === id.toLowerCase());
}

/**
 * Returns a summary of divisions and agent allocations.
 */
export function getDivisionsSummary(): DivisionSummary[] {
  const reg = loadAgencyRegistry();
  const entries = Object.entries(reg.divisionCounts || {});
  return entries.map(([division, count]) => ({
    division,
    count,
    primaryZone: getZoneForDivision(division).zone
  })).sort((a, b) => b.count - a.count);
}

/**
 * Loads the complete on-demand markdown instructions for an agent.
 */
export function loadAgentSkillInstructions(slug: string): string {
  const root = findWorkspaceRoot();
  const skillPath = join(root, '.agents', 'skills', slug, 'SKILL.md');
  if (!existsSync(skillPath)) {
    throw new Error(`Skill file not found for agent '${slug}' at: ${skillPath}`);
  }
  return readFileSync(skillPath, 'utf8');
}

