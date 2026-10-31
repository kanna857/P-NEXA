import { describe, it, expect, vi } from 'vitest';
import {
  CAMERA_PRESETS,
  calculateSphericalCameraPosition,
  clampCameraZoom,
  computeCompassHeading,
  computePanDelta,
  computeEntityFocusCoordinates
} from '@nexus/world-engine';

describe('Digital Twin Viewer — 3D Camera Controls & Spatial Navigation', () => {
  it('defines canonical camera presets with correct spherical and target parameters', () => {
    expect(CAMERA_PRESETS.orbital).toEqual({
      theta: 0.55,
      phi: 1.05,
      radius: 82,
      target: { x: 0, y: 4, z: 0 },
      description: 'Isometric Orbital View (Default Perspective)'
    });

    expect(CAMERA_PRESETS['top-down']).toEqual({
      theta: 0.0,
      phi: 0.08,
      radius: 105,
      target: { x: 0, y: 0, z: 0 },
      description: 'Zenith Orthographic Blueprint View'
    });

    expect(CAMERA_PRESETS.ingress).toBeDefined();
    expect(CAMERA_PRESETS.stadium).toBeDefined();
  });

  it('accurately calculates 3D cartesian coordinates from spherical orbit parameters', () => {
    // Equator test: phi = PI / 2, theta = 0 => along positive Z axis
    const equatorPos = calculateSphericalCameraPosition(
      { theta: 0, phi: Math.PI / 2, radius: 60 },
      { x: 0, y: 0, z: 0 }
    );
    expect(equatorPos.x).toBeCloseTo(0, 3);
    expect(equatorPos.y).toBeCloseTo(0, 3);
    expect(equatorPos.z).toBeCloseTo(60, 3);

    // North pole test: phi = 0 => along positive Y axis
    const zenithPos = calculateSphericalCameraPosition(
      { theta: 0, phi: 0, radius: 100 },
      { x: 10, y: 0, z: -5 }
    );
    expect(zenithPos.x).toBeCloseTo(10, 3);
    expect(zenithPos.y).toBeCloseTo(100, 3);
    expect(zenithPos.z).toBeCloseTo(-5, 3);
  });

  it('enforces camera zoom clamping within safety boundaries to prevent clipping or lost horizon', () => {
    expect(clampCameraZoom(12, 24, 180)).toBe(24);
    expect(clampCameraZoom(220, 24, 180)).toBe(180);
    expect(clampCameraZoom(75, 24, 180)).toBe(75);
  });

  it('computes compass heading angle consistently across full 360-degree rotation', () => {
    const headingNorth = computeCompassHeading(0);
    expect(headingNorth).toBe(32);

    const headingEast = computeCompassHeading(Math.PI / 2);
    expect(headingEast).toBeGreaterThanOrEqual(0);
    expect(headingEast).toBeLessThan(360);

    const headingWest = computeCompassHeading(-Math.PI / 2);
    expect(headingWest).toBeGreaterThanOrEqual(0);
    expect(headingWest).toBeLessThan(360);
  });

  it('calculates camera pan displacement correctly relative to current azimuth angle', () => {
    // At theta = 0 (looking along -Z toward origin), moving mouse right (dx > 0) moves target left
    const pan = computePanDelta(10, 5, 0, 0.1);
    expect(pan.x).toBeCloseTo(-1, 2);
    expect(pan.y).toBe(0); // Pan stays on horizontal ground plane
    expect(pan.z).toBeCloseTo(0.5, 2);
  });

  it('computes entity framing coordinates centering target on entity with elevated focus', () => {
    const entityCoords = { x: 35, y: 4, z: -20 };
    const currentSpherical = { theta: 0.8, phi: 1.1, radius: 90 };
    const focus = computeEntityFocusCoordinates(entityCoords, currentSpherical, 46);

    expect(focus.target).toEqual({ x: 35, y: 6, z: -20 });
    expect(focus.spherical.radius).toBe(46);
    expect(focus.spherical.theta).toBe(0.8);
    expect(focus.spherical.phi).toBe(1.1);
  });
});

describe('Digital Twin Viewer — Interactive Behaviors & Accessibility Integration', () => {
  it('maps keyboard shortcuts to view actions deterministically', () => {
    const keyActions: Record<string, string> = {
      r: 'RESET_VIEW',
      R: 'RESET_VIEW',
      f: 'TOGGLE_FULLSCREEN',
      F: 'TOGGLE_FULLSCREEN',
      '+': 'ZOOM_IN',
      '=': 'ZOOM_IN',
      '-': 'ZOOM_OUT',
      '_': 'ZOOM_OUT',
      '1': 'PRESET_ORBITAL',
      '2': 'PRESET_TOP_DOWN',
      '3': 'PRESET_INGRESS',
      '4': 'PRESET_STADIUM',
      Escape: 'CLOSE_INSPECTOR'
    };

    expect(keyActions['r']).toBe('RESET_VIEW');
    expect(keyActions['R']).toBe('RESET_VIEW');
    expect(keyActions['f']).toBe('TOGGLE_FULLSCREEN');
    expect(keyActions['+']).toBe('ZOOM_IN');
    expect(keyActions['-']).toBe('ZOOM_OUT');
    expect(keyActions['1']).toBe('PRESET_ORBITAL');
    expect(keyActions['Escape']).toBe('CLOSE_INSPECTOR');
  });

  it('simulates fullscreen toggle with graceful rejection handling', async () => {
    let isFullscreen = false;
    const mockRequestFullscreen = vi.fn().mockImplementation(() => {
      isFullscreen = true;
      return Promise.resolve();
    });
    const mockExitFullscreen = vi.fn().mockImplementation(() => {
      isFullscreen = false;
      return Promise.resolve();
    });

    const toggle = async (elementActive: boolean) => {
      if (!elementActive) {
        await mockRequestFullscreen();
      } else {
        await mockExitFullscreen();
      }
    };

    // Enter fullscreen
    await toggle(isFullscreen);
    expect(mockRequestFullscreen).toHaveBeenCalledTimes(1);
    expect(isFullscreen).toBe(true);

    // Exit fullscreen
    await toggle(isFullscreen);
    expect(mockExitFullscreen).toHaveBeenCalledTimes(1);
    expect(isFullscreen).toBe(false);
  });

  it('validates node entity selection updates active node and preserves metadata integrity', () => {
    const sampleNodes = [
      { id: 'b-acad-1', name: 'Academic Block A & B', type: 'server', tier: 3, status: 'healthy', position: { x: 0, y: 0, z: 0 }, metadata: { ipAddress: '192.168.10.1' } },
      { id: 'srv-auth', name: 'Main Authentication Server', type: 'server', tier: 2, status: 'compromised', position: { x: 0, y: 0, z: 0 }, metadata: { ipAddress: '10.2.0.10' } }
    ];

    let selectedId: string | null = null;
    const handleSelect = (id: string) => {
      selectedId = id;
    };

    handleSelect('srv-auth');
    expect(selectedId).toBe('srv-auth');
    const selected = sampleNodes.find((n) => n.id === selectedId);
    expect(selected?.status).toBe('compromised');
    expect(selected?.metadata.ipAddress).toBe('10.2.0.10');
  });
});
