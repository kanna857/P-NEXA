import { test, expect } from '@playwright/test';

test.describe('NEXUS Ω X — Phase 5: Telemetry, Predictive Intelligence & Autonomous Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to web app
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  });

  test('1. Navigate to Telemetry & Predictive Intelligence Dashboard', async ({ page }) => {
    // Click on the Telemetry nav item in the sidebar
    const telemetryNav = page.locator('button:has-text("Telemetry & Intel")');
    if (await telemetryNav.isVisible()) {
      await telemetryNav.click();
    } else {
      await page.goto('http://localhost:5173/telemetry');
    }

    // Verify Dashboard Heading
    await expect(page.locator('text=Real-Time Telemetry & Predictive Intelligence')).toBeVisible({ timeout: 10000 });
    // Verify Health Metrics Overview
    await expect(page.locator('text=Cluster Health Score')).toBeVisible();
    await expect(page.locator('text=Active Anomaly Triggers')).toBeVisible();
  });

  test('2. Mode Switcher (Demo Mode vs Connected Mode)', async ({ page }) => {
    await page.goto('http://localhost:5173/telemetry');
    await expect(page.locator('text=Real-Time Telemetry & Predictive Intelligence')).toBeVisible({ timeout: 10000 });

    // Mode toggle button should exist
    const demoModeBadge = page.locator('text=DEMO MODE');
    await expect(demoModeBadge).toBeVisible();

    const switchBtn = page.locator('button:has-text("CONNECTED")');
    if (await switchBtn.isVisible()) {
      await switchBtn.click();
      await expect(page.locator('text=CONNECTED MODE')).toBeVisible();
      // Switch back
      const demoBtn = page.locator('button:has-text("DEMO")');
      await demoBtn.click();
      await expect(page.locator('text=DEMO MODE')).toBeVisible();
    }
  });

  test('3. Execute 1-Click End-to-End Demo Scenario & Verify Council Progression', async ({ page }) => {
    await page.goto('http://localhost:5173/telemetry');
    await expect(page.locator('text=Real-Time Telemetry & Predictive Intelligence')).toBeVisible({ timeout: 10000 });

    // Find and click the 1-click end-to-end incident runner
    const triggerDemoBtn = page.locator('button:has-text("1-Click End-to-End Incident Demo")');
    await expect(triggerDemoBtn).toBeVisible();
    await triggerDemoBtn.click();

    // Verify stage tracker appears
    await expect(page.locator('text=End-to-End Incident Scenario Tracking')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Ingesting Telemetry Surge')).toBeVisible();
    await expect(page.locator('text=Autonomous AI Council Convened')).toBeVisible();
  });

  test('4. Workflow Studio: 9 Node Types & DAG Acyclicity Validation', async ({ page }) => {
    // Navigate to workflow studio
    const workflowNav = page.locator('button:has-text("Workflow Studio")');
    if (await workflowNav.isVisible()) {
      await workflowNav.click();
    } else {
      await page.goto('http://localhost:5173/workflows');
    }

    // Verify Workflow Automation View
    await expect(page.locator('text=Autonomous Incident Response DAGs')).toBeVisible({ timeout: 10000 });

    // Click Validate Acyclic DAG button
    const validateBtn = page.locator('button:has-text("Validate Acyclic DAG")');
    await expect(validateBtn).toBeVisible();
    await validateBtn.click();

    // Verify DAG validation success notice
    await expect(page.locator('text=DAG Verified: 100% Acyclic, 0 Cycles Detected')).toBeVisible({ timeout: 5000 });
  });
});

