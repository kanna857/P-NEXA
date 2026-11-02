export interface SafetyValidationResult {
  allowed: boolean;
  reason?: string;
  isDestructive?: boolean;
}

// Shell metacharacters and injection vectors that allow command chaining, subshell execution, or redirection
const COMMAND_INJECTION_PATTERN = /[;&|`$><\\]|\r|\n/;

// Disallow dangerous shell interpreters or network exfiltration binaries
const DISALLOWED_BINARIES_PATTERN = /\b(sudo|sh|bash|zsh|csh|powershell|cmd|eval|exec|curl|wget|nc|netcat|ncat|socat)\b/i;

const STRICT_ALLOWED_BASE_COMMANDS: { [base: string]: string[][] } = {
  pnpm: [
    ['test'],
    ['-r', 'run', 'test'],
    ['build'],
    ['-r', 'run', 'build'],
    ['lint'],
    ['-r', 'run', 'lint'],
    ['--filter', '@nexus/agent-orchestrator', 'test'],
    ['--filter', '@nexus/agent-registry', 'test'],
    ['--filter', '@nexus/shared', 'test'],
    ['--filter', '@nexus/api', 'test'],
    ['--filter', '@nexus/web', 'test']
  ],
  vitest: [
    ['run'],
    []
  ],
  tsc: [
    ['--noEmit'],
    []
  ],
  git: [
    ['status'],
    ['diff'],
    ['log'],
    ['branch'],
    ['worktree', 'list'],
    ['worktree', 'prune']
  ],
  node: [
    ['tests/e2e/run-digital-twin-e2e.mjs'],
    ['scripts/agency-orchestrator.mjs']
  ]
};

const BLOCKED_DESTRUCTIVE_PATTERNS = [
  /rm\s+-rf\s+[\/\*]/i,
  /drop\s+database/i,
  /git\s+reset\s+--hard/i,
  /git\s+push\s+.*--force/i,
  /git\s+push/i,
  /git\s+merge/i,
  /format\s+[a-z]:/i,
  /truncate\s+table/i,
  /shutdown/i,
  /mkfs/i,
  /:(){:|:&};:/ // fork bomb
];

const PROTECTED_SYSTEM_PATHS = [
  '.git',
  'node_modules',
  '.env',
  '.env.production',
  '.env.local',
  '.env.test'
];

/**
 * Validates a development command against strict command injection guards and allowlists.
 */
export function validateCommandSafety(command: string): SafetyValidationResult {
  const trimmed = command.trim();
  if (!trimmed) {
    return { allowed: false, reason: 'Command cannot be empty' };
  }

  // 1. Block command injection metacharacters
  if (COMMAND_INJECTION_PATTERN.test(trimmed)) {
    return {
      allowed: false,
      isDestructive: true,
      reason: 'Blocked command injection attempt: shell chaining or redirection metacharacter detected (; & | ` $ > < \\)'
    };
  }

  // 2. Block prohibited interpreters and network exfiltration tools
  if (DISALLOWED_BINARIES_PATTERN.test(trimmed)) {
    return {
      allowed: false,
      isDestructive: true,
      reason: 'Blocked unauthorized binary or subshell invocation'
    };
  }

  // 3. Block destructive patterns
  for (const pattern of BLOCKED_DESTRUCTIVE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        isDestructive: true,
        reason: `Blocked dangerous destructive command pattern: ${pattern}`
      };
    }
  }

  // 4. Tokenize command into tokens by whitespace
  const tokens = trimmed.split(/\s+/);
  const baseBinary = tokens[0]?.toLowerCase();
  const subArgs = tokens.slice(1);

  if (!baseBinary || !STRICT_ALLOWED_BASE_COMMANDS[baseBinary]) {
    return {
      allowed: false,
      reason: `Command binary '${baseBinary}' is not in the development allowlist.`
    };
  }

  const allowedPatterns = STRICT_ALLOWED_BASE_COMMANDS[baseBinary];
  const isMatch = allowedPatterns.some((expectedArgs) => {
    if (expectedArgs.length === 0) return true;
    if (subArgs.length < expectedArgs.length) return false;
    return expectedArgs.every((arg, idx) => subArgs[idx]?.toLowerCase() === arg.toLowerCase());
  });

  if (!isMatch) {
    return {
      allowed: false,
      reason: `Subcommand arguments for '${baseBinary}' are not permitted in development harness.`
    };
  }

  return { allowed: true };
}

/**
 * Validates file paths to prevent accidental modification of secrets, traversal attacks, or git internals.
 */
export function validatePathSafety(targetPaths: string[]): SafetyValidationResult {
  for (const path of targetPaths) {
    const norm = path.replace(/\\/g, '/');

    // Block path traversal attacks
    if (norm.includes('../') || norm.includes('/..') || norm === '..') {
      return {
        allowed: false,
        isDestructive: true,
        reason: `Path traversal pattern '..' detected in path '${path}'.`
      };
    }

    // Check protected system paths
    const segments = norm.split('/').filter(Boolean);
    for (const segment of segments) {
      if (PROTECTED_SYSTEM_PATHS.some((p) => segment === p || segment.startsWith('.env'))) {
        return {
          allowed: false,
          isDestructive: true,
          reason: `Target path '${path}' targets protected system file or directory.`
        };
      }
    }

    if (PROTECTED_SYSTEM_PATHS.some((p) => norm === p || norm.startsWith(`${p}/`))) {
      return {
        allowed: false,
        isDestructive: true,
        reason: `Target path '${path}' is protected by safety rails.`
      };
    }
  }

  return { allowed: true };
}
