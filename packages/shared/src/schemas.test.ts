import { describe, it, expect } from 'vitest';
import { authRegisterSchema, authLoginSchema } from './schemas/auth.js';
import { tenantCreateSchema } from './schemas/tenant.js';

describe('Shared Zod Schemas Validation', () => {
  it('validates correct registration payload', () => {
    const valid = {
      email: 'officer@cyberdyne.ai',
      password: 'StrongPassword123!',
      firstName: 'Sarah',
      lastName: 'Connor',
      organizationName: 'CyberDyne Orbital',
      organizationSlug: 'cyberdyne-orbital'
    };

    const parsed = authRegisterSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejects short passwords', () => {
    const invalid = {
      email: 'officer@cyberdyne.ai',
      password: 'short',
      firstName: 'Sarah',
      lastName: 'Connor',
      organizationName: 'CyberDyne Orbital'
    };

    const parsed = authRegisterSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('validates tenant creation and rejects invalid slug formats', () => {
    const badSlug = {
      name: 'CyberDyne Orbital',
      slug: 'CyberDyne Orbital With Spaces!'
    };

    const parsed = tenantCreateSchema.safeParse(badSlug);
    expect(parsed.success).toBe(false);

    const goodSlug = {
      name: 'CyberDyne Orbital',
      slug: 'cyberdyne-orbital'
    };

    const parsedGood = tenantCreateSchema.safeParse(goodSlug);
    expect(parsedGood.success).toBe(true);
  });

  it('validates auth login schema', () => {
    const valid = {
      email: 'analyst@cyberdyne.ai',
      password: 'SamplePassword123!',
      tenantSlug: 'cyberdyne-orbital'
    };

    const parsed = authLoginSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });
});
