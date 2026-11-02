import { describe, it, expect } from 'vitest';
import {
  loadAgencyRegistry,
  getAgentCount,
  getAllMunderHires,
  searchAgents,
  getAgentById,
  getDivisionsSummary,
  loadAgentSkillInstructions
} from './registryService.js';

describe('Agency Agents Registry & Munder Difflin Hire Spec Adapter', () => {
  it('loads the full agency registry and verifies the exact 283 agent count', () => {
    const reg = loadAgencyRegistry();
    expect(reg).toBeDefined();
    expect(reg.catalog).toBe('Agency Agents');
    expect(reg.totalAgents).toBe(283);
    expect(reg.agents.length).toBe(283);
    expect(getAgentCount()).toBe(283);
  });

  it('translates all 283 agents into valid munder-difflin/hire@1 schemas with virtual seating', () => {
    const hires = getAllMunderHires();
    expect(hires.length).toBe(283);

    const first = hires[0]!;
    expect(first.schema).toBe('munder-difflin/hire@1');
    expect(first.id).toBeDefined();
    expect(first.name).toBeDefined();
    expect(first.seat).toBeDefined();
    expect(first.seat.deskId).toMatch(/^desk-/);
    expect(first.seat.x).toBeGreaterThan(0);
    expect(first.seat.y).toBeGreaterThan(0);
    expect(first.budget.maxTokens).toBeGreaterThan(0);
    expect(first.allowedCommands.length).toBeGreaterThan(0);
    expect(first.requiresApprovalFor.length).toBeGreaterThan(0);
  });

  it('searches agents by keyword across name, slug, specialty, and division', () => {
    const threeDMatches = searchAgents({ query: '3d' });
    expect(threeDMatches.length).toBeGreaterThan(0);
    expect(threeDMatches.some((a) => a.id.includes('3d') || a.specialty.includes('3D'))).toBe(true);

    const secMatches = searchAgents({ division: 'security' });
    expect(secMatches.length).toBe(12);
    secMatches.forEach((s) => expect(s.division).toBe('security'));

    const provMatches = searchAgents({ provider: 'gemini-cli' });
    expect(provMatches.length).toBeGreaterThan(0);
  });

  it('fetches single agent by ID and loads real on-demand SKILL.md instructions', () => {
    const agent = getAgentById('agency-3d-scene-developer');
    expect(agent).toBeDefined();
    expect(agent?.name).toBeDefined();

    const instructions = loadAgentSkillInstructions('agency-3d-scene-developer');
    expect(instructions).toBeDefined();
    expect(instructions.length).toBeGreaterThan(50);
  });

  it('summarizes divisions and assigns agents to designated office zones', () => {
    const summary = getDivisionsSummary();
    expect(summary.length).toBe(18);

    const engSummary = summary.find((s) => s.division === 'engineering');
    expect(engSummary).toBeDefined();
    expect(engSummary?.count).toBe(66);
    expect(engSummary?.primaryZone).toBe('Engineering Bay Alpha');
  });
});

