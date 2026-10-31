export * from './types.js';
export * from './nl-generator.js';
export * from './workflow-state-machine.js';
export * from './workflow-manager.js';

// Backward compatibility
export interface WorkflowGate {
  id: string;
  name: string;
  requiresDualApproval: boolean;
  status: 'pending' | 'approved' | 'rejected';
  approvals: string[];
}
