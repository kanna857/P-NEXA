export interface DAGStep {
  id: string;
  name: string;
  type: string;
  nextStepIds?: string[];
}

export interface DAGValidationResult {
  isValid: boolean;
  hasCycle: boolean;
  cyclePath?: string[];
  totalSteps: number;
}

export function validateWorkflowAcyclic(steps: DAGStep[]): DAGValidationResult {
  const stepMap = new Map<string, DAGStep>();
  steps.forEach((s) => stepMap.set(s.id, s));

  const adj = new Map<string, string[]>();
  steps.forEach((s) => {
    adj.set(s.id, s.nextStepIds || []);
  });

  const state = new Map<string, number>(); // 0 = unvisited, 1 = visiting, 2 = visited
  const path: string[] = [];
  let cycleFound: string[] | null = null;

  function dfs(curr: string): boolean {
    state.set(curr, 1);
    path.push(curr);

    const neighbors = adj.get(curr) || [];
    for (const nextId of neighbors) {
      if (!stepMap.has(nextId)) continue;
      const s = state.get(nextId) || 0;
      if (s === 1) {
        const cycleStartIndex = path.indexOf(nextId);
        cycleFound = path.slice(cycleStartIndex).concat(nextId);
        return true;
      }
      if (s === 0) {
        if (dfs(nextId)) return true;
      }
    }

    path.pop();
    state.set(curr, 2);
    return false;
  }

  for (const step of steps) {
    if ((state.get(step.id) || 0) === 0) {
      if (dfs(step.id)) {
        return {
          isValid: false,
          hasCycle: true,
          cyclePath: cycleFound || [],
          totalSteps: steps.length
        };
      }
    }
  }

  return {
    isValid: true,
    hasCycle: false,
    totalSteps: steps.length
  };
}
