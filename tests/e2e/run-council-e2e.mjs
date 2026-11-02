import { chromium } from '@playwright/test';

async function runCouncilSuite() {
  console.log('================================================================================');
  console.log('🏛️  NEXUS Ω X — Phase 4 AI Agent Council End-to-End Test Suite');
  console.log('================================================================================');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-setuid-sandbox',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();
  page.on('pageerror', (err) => console.error('  [PAGE ERROR]:', err.message));

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion Failed: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // Setup: Navigate to local dashboard
    // -------------------------------------------------------------------------
    console.log('\n[SETUP] Connecting to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas', { timeout: 15000 });
    console.log('✅ Dashboard loaded, 3D Digital Twin Canvas mounted.');

    // -------------------------------------------------------------------------
    // Test 1: Navigation to /ai-council Command Center
    // -------------------------------------------------------------------------
    console.log('\n[TEST 1] Verifying Navigation to AI Council Command Center...');
    const councilNavBtn = page.locator('button:has-text("AI Council")').first();
    await councilNavBtn.waitFor({ state: 'visible', timeout: 5000 });
    await councilNavBtn.click();

    // Verify AI Council view mounted
    await page.waitForSelector('text=AI Council Command Center', { timeout: 8000 });
    console.log('✅ AI Council Command Center mounted via Sidebar navigation.');
    passedTests++;

    // -------------------------------------------------------------------------
    // Test 2: Five Runtime Council Specialist Cards
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Verifying Five Runtime Council Specialist Cards...');
    const roles = ['investigator', 'cybersecurity', 'simulation', 'planner', 'reviewer'];
    for (const role of roles) {
      const card = page.locator(`[data-testid="council-card-${role}"]`);
      await card.waitFor({ state: 'visible', timeout: 5000 });
      const text = await card.textContent();
      assert(text.includes(role.toUpperCase()) || text.toLowerCase().includes(role), `Card for ${role} is visible and typed`);
    }
    console.log('✅ All 5 runtime council specialist cards rendered with live metrics.');
    passedTests++;

    // -------------------------------------------------------------------------
    // Test 3: Dispatch Investigation & Dossier Verification
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Verifying Investigation Dispatch & Dossier Generation...');
    const dispatchBtn = page.locator('[data-testid="dispatch-council-btn"]');
    await dispatchBtn.waitFor({ state: 'visible', timeout: 5000 });
    await dispatchBtn.click();

    // Wait for dossier to load
    await page.waitForSelector('text=STATUS: AWAITING_APPROVAL', { timeout: 8000 });
    console.log('  Council investigation completed; awaiting human authorization.');

    // Verify Simulated Projection explicit badge
    const simBadge = page.locator('text=Simulated Projection');
    await simBadge.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  Explicit "Simulated Projection" label verified for predictive simulation.');

    // Verify Planner executive summary
    const summary = page.locator('text=Planner Agent Executive Summary');
    await summary.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  Planner executive summary synthesized and visible.');
    passedTests++;

    // -------------------------------------------------------------------------
    // Test 4: Evidence Explorer Tabs
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Verifying Evidence Explorer Interactive Tabs...');
    const telemetryTab = page.locator('button:has-text("Telemetry Facts")');
    await telemetryTab.click();
    await page.waitForSelector('text=Empirical Observed Facts', { timeout: 5000 });
    console.log('  Empirical observed facts vs hypotheses verified.');

    const threatRulesTab = page.locator('button:has-text("Threat Rules")');
    await threatRulesTab.click();
    await page.waitForSelector('text=MITRE ATT&CK', { timeout: 5000 });
    console.log('  MITRE ATT&CK threat rules and explainable scores verified.');

    const blastTab = page.locator('button:has-text("Blast Radius")');
    await blastTab.click();
    await page.waitForSelector('text=BFS Dependency Hop Analysis', { timeout: 5000 });
    console.log('  Blast radius graph dependency analysis verified.');
    passedTests++;

    // -------------------------------------------------------------------------
    // Test 5: Human Authorization Gate (Approval Flow)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Verifying Human Authorization Gate (Approval Flow)...');
    const approveBtn = page.locator('[data-testid="council-approve-btn"]');
    await approveBtn.waitFor({ state: 'visible', timeout: 5000 });
    await approveBtn.click();

    // Confirm form appeared
    const confirmInput = page.locator('input[placeholder*="verification notes"]');
    await confirmInput.waitFor({ state: 'visible', timeout: 5000 });
    await confirmInput.fill('Dual-custody verification signed by Commander during E2E test');

    const confirmApproveBtn = page.locator('[data-testid="confirm-approve-btn"]');
    await confirmApproveBtn.click();

    // Verify status changes to APPROVED
    await page.waitForSelector('text=STATUS: APPROVED', { timeout: 8000 });
    console.log('✅ Action successfully authorized by human operator with dual-custody audit.');
    passedTests++;

    // -------------------------------------------------------------------------
    // Test 6: Digital Twin Viewport Launch Integration
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Verifying 3D Digital Twin Viewport Launch Integration...');
    const dtNavBtn = page.locator('button:has-text("Digital Twin")').first();
    await dtNavBtn.click();
    await page.waitForSelector('canvas', { timeout: 10000 });

    const investigateBtn = page.locator('[data-testid="investigate-incident-btn"]');
    await investigateBtn.waitFor({ state: 'visible', timeout: 8000 });
    await investigateBtn.click();

    // Verify modal opens
    await page.waitForSelector('text=Autonomous Incident Investigation', { timeout: 8000 });
    console.log('  Digital twin incident modal opened via viewport inspector.');

    const openInCouncilBtn = page.locator('button:has-text("Open in AI Council View")');
    await openInCouncilBtn.waitFor({ state: 'visible', timeout: 5000 });
    await openInCouncilBtn.click();

    // Verify navigated back to /ai-council
    await page.waitForSelector('text=AI Council Command Center', { timeout: 8000 });
    console.log('✅ Successfully transitioned from 3D viewport modal to AI Council Command Center.');
    passedTests++;

  } catch (error) {
    console.error('\n❌ TEST FAILURE:', error.message);
    failedTests++;
  } finally {
    await browser.close();
  }

  console.log('\n================================================================================');
  console.log(`🏁 COUNCIL TEST SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runCouncilSuite().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});

