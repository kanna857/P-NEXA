import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const workspaceRoot = process.cwd();
const registryPath = join(workspaceRoot, '.agents', 'registry.json');
const outputPath = join(workspaceRoot, 'docs', 'AGENCY_AGENTS_REGISTRY.md');

const rawData = readFileSync(registryPath, 'utf8').replace(/^\uFEFF/, '');
const registry = JSON.parse(rawData);

let md = `# P-NEXA — Complete Agency Agents Searchable Registry

**Catalog Source:** [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)  
**Total Verified & Installed Agents:** ${registry.totalAgents}  
**Total Divisions:** ${registry.divisionsCount}  
**Host Environment:** Google Antigravity (Workspace: \`.agents/skills/\`, Global: \`~/.gemini/config/skills/\`)  
**Activation Model:** Progressive Disclosure on demand (\`agency-<slug>\`)

---

## 📊 Agent Roster Breakdown by Division

| Division | Agent Count | Antigravity Scope | Status |
|:---|:---:|:---:|:---:|
`;

for (const [divName, count] of Object.entries(registry.divisionCounts)) {
  md += `| **${divName.toUpperCase()}** | ${count} | Installed in \`.agents/skills/\` | Verified Active |\n`;
}

md += `
---

## 🔍 Searchable Directory of All ${registry.totalAgents} Agency Specialists

| # | Specialist Name | Antigravity Skill Slug | Division | Core Specialty & Responsibilities | Status |
|:---:|:---|:---|:---:|:---|:---:|
`;

registry.agents.forEach((ag, index) => {
  const cleanDesc = (ag.description || '')
    .replace(/\|/g, '/')
    .replace(/\r?\n/g, ' ')
    .trim();
  const truncated = cleanDesc.length > 130 ? cleanDesc.slice(0, 127) + '...' : cleanDesc;
  md += `| ${index + 1} | **${ag.name}** | \`${ag.slug}\` | ${ag.division} | ${truncated} | Active |\n`;
});

md += `
---

## 🎯 How to Activate and Use Agency Agents in Antigravity

### 1. In Antigravity Direct Chat & Subagents
Invoke any specialist by its unique \`agency-\` prefixed slug:
\`\`\`markdown
Use the agency-frontend-developer skill to review this React component.
\`\`\`

### 2. Using the Automated Development Orchestrator
Run the multi-stage specialist pipeline:
\`\`\`bash
pnpm agency:orchestrate --task "Refactor the 3D viewport canvas for performance"
\`\`\`
`;

writeFileSync(outputPath, md, 'utf8');
console.log(`Successfully generated docs/AGENCY_AGENTS_REGISTRY.md with ${registry.totalAgents} agents.`);
