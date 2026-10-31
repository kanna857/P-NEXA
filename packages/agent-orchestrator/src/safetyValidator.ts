export interface SafetyValidationResult {
  allowed: boolean;
  reason?: string;
  isDestructive?: boolean;
}

const ALLOWED_COMMAND_PREFIXES = [
  'pnpm test',
  'pnpm -r run test',
  'pnpm build',
  'pnpm -r run build',
  'pnpm lint',
  'git status',
  'git diff',
  'git log',
  'git branch',
  'git worktree',
  'vitest',
  'tsc',
  'node'
];

const BLOCKED_DESTRUCTIVE_PATTERNS = [
  /rm\s+-rf\s+[\/\*]/i,
  /drop\s+database/i,
  /git\s+reset\s+--hard/i,
  /git\s+push\s+.*--force/i,
  /format\s+[a-z]:/i,
  /truncate\s+table/i,
  /shutdown/i,
  /mkfs/i
];

const PROTECTED_SYSTEM_PATHS = [
  '.git',
  'node_modules',
  '.env',
  '.env.production',
  '.env.local'
];

/**
 * Validates a development command against the safety allowlist and destructive pattern guards.
 */
export function validateCommandSafety(command: string): SafetyValidationResult {
  const trimmed = command.trim();

  // 1. Check for known destructive patterns
  for (const pattern of BLOCKED_DESTRUCTIVE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        isDestructive: true,
        reason: `Blocked dangerous destructive command pattern: ${pattern}`
      };
    }
  }

  // 2. Check against safe allowed command prefixes
  const isAllowed = ALLOWED_COMMAND_PREFIXES.some((prefix) =>
    trimmed.startsWith(prefix)
  );

  if (!isAllowed) {
    return {
      allowed: false,
      reason: `Command '${trimmed}' is not in the development allowlist.`
    };
  }

  return { allowed: true };
}

/**
 * Validates file paths to prevent accidental modification of secrets or git internals.
 */
export function validatePathSafety(targetPaths: string[]): SafetyValidationResult {
  for (const path of targetPaths) {
    const norm = path.replace(/\\/g, '/');
    if (PROTECTED_SYSTEM_PATHS.some((p) => norm.startsWith(p) || norm.includes(`/${p}/`))) {
      return {
        allowed: false,
        isDestructive: true,
        reason: `Target path '${path}' is protected by safety rails.`
      };
    }
  }

  return { allowed: true };
}

