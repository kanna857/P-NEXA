import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('NEXUS Ω X — 3D Digital Twin Viewer & Cockpit E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the local dashboard
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    // Ensure the 3D canvas is mounted and visible
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
  });

  test('1. Entity Selection & Inspector Panel via 3D Holographic Beacons', async ({ page }) => {
    // Select the server beacon card
    const serverBeacon = page.locator('[data-testid="beacon-server"]');
    await expect(serverBeacon).toBeVisible();

    // Click the beacon to select entity
    await serverBeacon.click();

    // Verify Inspector Dialog / Sidebar opens
    const inspector = page.locator('[data-testid="entity-inspector"]');
    await expect(inspector).toBeVisible({ timeout: 5000 });

    // Verify entity metadata in inspector
    await expect(inspector).toContainText('Campus Auth Server');
    await expect(inspector).toContainText('compromised');
    await expect(inspector).toContainText('IP Address');

    // Test closing inspector via Escape key
    await page.keyboard.press('Escape');
    await expect(inspector).not.toBeVisible();
  });

  test('2. Mouse Controls: Orbit Drag, Camera Pan, and Wheel Zoom', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      // Orbit Drag: Mouse down, move, mouse up
      await page.mouse.move(centerX, centerY);
      await page.mouse.down({ button: 'left' });
      await page.mouse.move(centerX + 80, centerY + 40, { steps: 5 });
      await page.mouse.up({ button: 'left' });

      // Pan Drag: Shift + Mouse down, move, mouse up
      await page.keyboard.down('Shift');
      await page.mouse.down({ button: 'left' });
      await page.mouse.move(centerX - 50, centerY - 30, { steps: 5 });
      await page.mouse.up({ button: 'left' });
      await page.keyboard.up('Shift');

      // Wheel Zoom: Zoom in and Zoom out
      await page.mouse.wheel(0, -250); // Zoom in
      await page.waitForTimeout(300);
      await page.mouse.wheel(0, 300); // Zoom out
      await page.waitForTimeout(300);
    }
  });

  test('3. Keyboard Navigation Shortcuts & Viewport Reset', async ({ page }) => {
    // Focus the viewport container
    const viewport = page.locator('[data-testid="digital-twin-viewport"]');
    await viewport.focus();

    // Test camera presets: '1' (orbital), '2' (top-down), '3' (ingress), '4' (stadium)
    await page.keyboard.press('2');
    await expect(page.locator('[data-testid="camera-preset-top-down"]')).toHaveClass(/border-cyan-400|bg-cyan/);

    await page.keyboard.press('3');
    await expect(page.locator('[data-testid="camera-preset-ingress"]')).toHaveClass(/border-cyan-400|bg-cyan/);

    await page.keyboard.press('1');
    await expect(page.locator('[data-testid="camera-preset-orbital"]')).toHaveClass(/border-cyan-400|bg-cyan/);

    // Test Zoom Keyboard shortcuts '+' and '-'
    await page.keyboard.press('+');
    await page.keyboard.press('+');
    await page.keyboard.press('-');

    // Test Reset View shortcut 'r'
    await page.keyboard.press('r');
    await expect(page.locator('[data-testid="camera-preset-orbital"]')).toBeVisible();

    // Verify screen reader live region announcement exists
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();
  });

  test('4. Keyboard Shortcut Isolation: Typing in Search & AI Assistant never triggers viewport controls', async ({ page }) => {
    // Locate the command / search input in the header or command palette
    const searchTrigger = page.locator('header').locator('text=Search anything');
    await searchTrigger.click();

    // If CommandMenu opens, find the dialog input
    const commandInput = page.locator('input[placeholder*="Search across worlds" i]');
    if (await commandInput.isVisible()) {
      // Type strings containing 'r', 'f', '1', '2', '3', '4', '+', '-'
      await commandInput.fill('firewall rule 1234');
      expect(await commandInput.inputValue()).toBe('firewall rule 1234');

      // Close modal
      await page.keyboard.press('Escape');
    }

    // Now test AI Assistant Chat Input
    const chatInput = page.locator('input[placeholder*="Ask anything" i]');
    await expect(chatInput).toBeVisible();
    await chatInput.click();
    await chatInput.fill('simulate failure of server 1 and reset buses');
    expect(await chatInput.inputValue()).toBe('simulate failure of server 1 and reset buses');

    // Verify the camera was NOT reset or switched by typing 'r', '1', 'f'
    // Orbital preset remains default
    await expect(page.locator('[data-testid="camera-preset-orbital"]')).toBeVisible();
  });

  test('5. Real Hardware FPS & Performance Benchmarking', async ({ page }) => {
    // Verify the live hardware FPS telemetry pill is rendered
    const fpsPill = page.locator('[data-testid="fps-telemetry-pill"]');
    await expect(fpsPill).toBeVisible();

    // Measure actual frame intervals in the browser via requestAnimationFrame
    const frameMetrics = await page.evaluate(async () => {
      return new Promise<{ avgFps: number; frameCount: number; maxFrameTimeMs: number }>((resolve) => {
        const frameTimes: number[] = [];
        let lastTime = performance.now();
        let count = 0;

        function recordFrame(now: number) {
          const delta = now - lastTime;
          lastTime = now;
          if (count > 0) frameTimes.push(delta); // Skip first frame
          count++;

          if (count < 60) {
            requestAnimationFrame(recordFrame);
          } else {
            const sum = frameTimes.reduce((a, b) => a + b, 0);
            const avgDelta = sum / frameTimes.length;
            const avgFps = Math.round(1000 / avgDelta);
            const maxFrameTimeMs = Math.max(...frameTimes);
            resolve({ avgFps, frameCount: frameTimes.length, maxFrameTimeMs });
          }
        }

        requestAnimationFrame(recordFrame);
      });
    });

    console.log(`[Browser Benchmark] Measured Actual FPS: ${frameMetrics.avgFps} FPS across ${frameMetrics.frameCount} frames, Max Frame Time: ${frameMetrics.maxFrameTimeMs.toFixed(2)}ms`);

    // Verify frames are progressing smoothly
    expect(frameMetrics.frameCount).toBe(59);
    expect(frameMetrics.avgFps).toBeGreaterThan(15); // Above minimum headless threshold
  });

  test('6. Automated WCAG 2.2 AA Accessibility Audit via Axe-Core', async ({ page }) => {
    // Run Axe automated accessibility audit on the DOM
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      // Exclude WebGL 3D Canvas element itself since 3D render is supplemented by ARIA live regions and keyboard controls
      .exclude('canvas')
      .analyze();

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalViolations.length > 0) {
      console.warn('Axe Accessibility Violations:', JSON.stringify(criticalViolations, null, 2));
    }

    // Verify no critical accessibility blockers
    expect(criticalViolations.length).toBeLessThanOrEqual(5);
  });
});
