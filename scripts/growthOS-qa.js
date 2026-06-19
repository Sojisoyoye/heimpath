#!/usr/bin/env node
/**
 * GrowthOS Product QA Audit
 *
 * Runs Playwright against the live HeimPath app, tests every MVP feature,
 * and POSTs a structured report to the GrowthOS API for the QA Agent to analyse.
 *
 * Usage:
 *   node --env-file=.env scripts/growthOS-qa.js
 *   node --env-file=.env scripts/growthOS-qa.js --url https://staging.heimpath.com
 */

const { chromium } = require('playwright');

const GROWTHOS_API   = process.env.GROWTHOS_API_URL;
const GROWTHOS_TOKEN = process.env.GROWTHOS_TOKEN;
const TARGET_URL     = process.argv.find(a => a.startsWith('--url='))?.split('=')[1]
                    || 'https://www.heimpath.com';
const EMAIL          = process.env.FIRST_SUPERUSER;
const PASSWORD       = process.env.FIRST_SUPERUSER_PASSWORD;

if (!GROWTHOS_API) {
  console.error('GROWTHOS_API_URL not set. Add it to .env');
  process.exit(1);
}
if (!GROWTHOS_TOKEN) {
  console.error('GROWTHOS_TOKEN not set. Add it to .env');
  process.exit(1);
}
if (!EMAIL || !PASSWORD) {
  console.error('FIRST_SUPERUSER / FIRST_SUPERUSER_PASSWORD not set in .env');
  process.exit(1);
}

const results = [];

function pass(name, detail = '') {
  results.push({ name, status: 'pass', detail });
  console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`);
}
function fail(name, detail = '') {
  results.push({ name, status: 'fail', detail });
  console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
}
function warn(name, detail = '') {
  results.push({ name, status: 'warn', detail });
  console.log(`  ⚠️  ${name}${detail ? ' — ' + detail : ''}`);
}

async function check(name, fn) {
  try {
    await fn();
  } catch (e) {
    fail(name, e.message.slice(0, 120));
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ baseURL: TARGET_URL });
  const page = await ctx.newPage();

  console.log(`\n🔍 HeimPath QA Audit — ${TARGET_URL}\n`);

  // ── 1. HOMEPAGE ───────────────────────────────────────────────────────────
  console.log('📄 Homepage & Public Pages');

  await check('Homepage loads', async () => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const title = await page.title();
    if (!title || title.length < 5) throw new Error(`Weak title: "${title}"`);
    pass('Homepage loads', title);
  });

  await check('Hero value proposition visible', async () => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 20000 });
    const body = await page.textContent('body');
    const hasHero = /property|real estate|germany|heimpath|calculator|expat/i.test(body);
    if (!hasHero) throw new Error('No recognisable value prop in hero');
    pass('Hero value proposition visible');
  });

  await check('Primary CTA button present', async () => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 20000 });
    const cta = await page.locator('a[href*="signup"], a[href*="register"], button:has-text("Get Started"), button:has-text("Sign Up"), a:has-text("Get Started"), a:has-text("Start"), a:has-text("Calculate")').first().isVisible({ timeout: 8000 });
    if (!cta) throw new Error('No CTA button found');
    pass('Primary CTA button present');
  });

  await check('Free calculator accessible without login', async () => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 20000 });
    const calcVisible = await page.locator('input[type="number"], input[placeholder*="price"], input[placeholder*="Price"], [class*="calculator"], [data-testid*="calculator"], form').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (calcVisible) {
      pass('Free calculator on homepage (no login required)');
    } else {
      // Check if there's at least a link to calculator
      const calcLink = await page.locator('a[href*="tool"], a[href*="calculator"], a:has-text("Calculate")').first().isVisible({ timeout: 3000 }).catch(() => false);
      if (calcLink) warn('Calculator linked from homepage but not embedded', 'Consider embedding for conversion');
      else fail('No free calculator on homepage', 'Visitors see nothing to try — critical for conversion');
    }
  });

  // ── 2. SEO & META ─────────────────────────────────────────────────────────
  console.log('\n🔎 SEO & Meta Tags');

  await check('Page title is keyword-optimised', async () => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const title = await page.title();
    const hasKeyword = /property|real estate|germany|buy|foreigner|calculator/i.test(title);
    if (!hasKeyword) throw new Error(`Title lacks keywords: "${title}"`);
    pass('Title tag has keywords', title.slice(0, 60));
  });

  await check('Meta description present and meaningful', async () => {
    const desc = await page.$eval('meta[name="description"]', el => el.content).catch(() => '');
    if (!desc || desc.length < 30) throw new Error(`Weak/missing meta description: "${desc}"`);
    const hasKeyword = /property|real estate|germany|buy|foreigner|calculator/i.test(desc);
    if (!hasKeyword) warn('Meta description present but lacks keywords', desc.slice(0, 80));
    else pass('Meta description with keywords', desc.slice(0, 80));
  });

  await check('OG image set', async () => {
    const og = await page.$eval('meta[property="og:image"]', el => el.content).catch(() => '');
    if (!og || og.includes('default')) throw new Error(`Generic/missing OG image: "${og}"`);
    pass('OG image set', og.split('/').pop());
  });

  await check('Sitemap accessible', async () => {
    const res = await page.goto('/sitemap.xml', { timeout: 10000 });
    if (!res || res.status() !== 200) throw new Error(`Sitemap status: ${res?.status()}`);
    const body = await page.textContent('body');
    if (!body.includes('<url>') && !body.includes('urlset')) throw new Error('Sitemap empty or malformed');
    const count = (body.match(/<url>/g) || []).length;
    pass('Sitemap accessible', `${count} URLs`);
  });

  await check('robots.txt present', async () => {
    const res = await page.goto('/robots.txt', { timeout: 10000 });
    if (!res || res.status() !== 200) throw new Error(`robots.txt status: ${res?.status()}`);
    pass('robots.txt present');
  });

  // ── 3. LEGAL ──────────────────────────────────────────────────────────────
  console.log('\n⚖️  Legal Pages');

  for (const [label, path] of [['Imprint/Impressum', '/imprint'], ['Privacy Policy', '/privacy'], ['Terms of Service', '/terms']]) {
    await check(`${label} page exists`, async () => {
      const res = await page.goto(path, { waitUntil: 'networkidle', timeout: 15000 });
      if (!res || res.status() !== 200) throw new Error(`Status ${res?.status()}`);
      await page.waitForSelector('h1', { timeout: 5000 });
      const body = await page.textContent('body');
      if (body.length < 200) throw new Error('Page content too short — may be empty');
      pass(`${label} page exists`, `${body.length} chars`);
    });
  }

  // ── 4. AUTH FLOWS ─────────────────────────────────────────────────────────
  console.log('\n🔐 Authentication');

  await check('Login page loads', async () => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first().isVisible({ timeout: 5000 });
    if (!emailInput) throw new Error('Email input not found on login page');
    pass('Login page loads with email input');
  });

  await check('Sign up page loads', async () => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const emailInput = await page.locator('input[type="email"], input[name="email"]').first().isVisible({ timeout: 5000 });
    if (!emailInput) throw new Error('Email input not found on signup page');
    pass('Sign up page loads');
  });

  // Login with real credentials
  let loggedIn = false;
  await check('Login with valid credentials', async () => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
    await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/dashboard|home|journeys/, { timeout: 15000 });
    loggedIn = true;
    pass('Login succeeds', `→ ${page.url().split('/').pop()}`);
  });

  // ── 5. AUTHENTICATED FEATURES ─────────────────────────────────────────────
  if (loggedIn) {
    console.log('\n🏠 Authenticated Features');

    await check('Dashboard loads', async () => {
      await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 20000 });
      const url = page.url();
      if (url.includes('login')) throw new Error('Redirected to login — auth not persisting');
      pass('Dashboard loads', page.url().split('/').pop() || 'dashboard');
    });

    await check('Journeys page loads', async () => {
      const res = await page.goto('/journeys', { waitUntil: 'domcontentloaded', timeout: 15000 });
      if (res?.status() !== 200) throw new Error(`Status ${res?.status()}`);
      pass('Journeys page loads');
    });

    await check('New journey creation page accessible', async () => {
      const res = await page.goto('/journeys/new', { waitUntil: 'domcontentloaded', timeout: 15000 });
      if (res?.status() !== 200) throw new Error(`Status ${res?.status()}`);
      const body = await page.textContent('body');
      if (body.length < 100) throw new Error('Journey creation page appears empty');
      pass('New journey page accessible');
    });

    // Calculators
    for (const [label, path] of [
      ['Property Cost Calculator', '/tools/property-cost-calculator'],
      ['Mortgage Calculator', '/tools/mortgage-calculator'],
      ['Rent vs Buy Calculator', '/tools/rent-vs-buy-calculator'],
      ['ROI Calculator', '/tools/roi-calculator'],
    ]) {
      await check(`${label} loads`, async () => {
        const res = await page.goto(path, { waitUntil: 'networkidle', timeout: 15000 });
        if (res?.status() !== 200) throw new Error(`Status ${res?.status()}`);
        const hasInput = await page.locator('input[type="number"], input[type="text"], input[type="range"]').first().isVisible({ timeout: 8000 }).catch(() => false);
        if (!hasInput) warn(`${label} — no input fields found`, 'May not be interactive');
        else pass(`${label} loads with inputs`);
      });
    }

    // Core resource pages
    for (const [label, path] of [
      ['Mortgage Guide', '/mortgage-guide'],
      ['Bank Account Guide', '/bank-account-guide'],
      ['Glossary', '/glossary'],
      ['Articles', '/articles'],
    ]) {
      await check(`${label} loads`, async () => {
        const res = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 15000 });
        if (res?.status() !== 200) throw new Error(`Status ${res?.status()}`);
        pass(`${label} accessible`);
      });
    }

    await check('Portfolio page loads', async () => {
      const res = await page.goto('/portfolio', { waitUntil: 'domcontentloaded', timeout: 15000 });
      if (res?.status() !== 200) throw new Error(`Status ${res?.status()}`);
      pass('Portfolio page accessible');
    });
  } else {
    fail('Authenticated features skipped', 'Login failed — cannot test protected routes');
  }

  // ── 6. MOBILE RESPONSIVENESS ──────────────────────────────────────────────
  console.log('\n📱 Mobile');

  await check('Homepage renders on mobile viewport', async () => {
    await ctx.setExtraHTTPHeaders({});
    const mobilePage = await ctx.newPage();
    await mobilePage.setViewportSize({ width: 390, height: 844 }); // iPhone 14
    await mobilePage.goto('/', { waitUntil: 'networkidle', timeout: 20000 });
    await mobilePage.waitForSelector('h1, h2, [class*="hero"], nav', { timeout: 5000 }).catch(() => {});
    const bodyText = await mobilePage.textContent('body');
    if (!bodyText || bodyText.length < 50) throw new Error('Mobile page appears empty');
    pass('Homepage renders on mobile (390px)');
    await mobilePage.close();
  });

  await browser.close();

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total  = results.length;
  const score  = Math.round((passed / total) * 100);

  let verdict;
  if (failed === 0 && score >= 90)       verdict = 'MVP_READY';
  else if (failed <= 2 && score >= 75)   verdict = 'NEARLY_READY';
  else if (failed <= 5 && score >= 50)   verdict = 'NEEDS_WORK';
  else                                   verdict = 'NOT_READY';

  const summary = { total, passed, warned, failed, score, verdict };

  console.log('\n══════════════════════════════════════════');
  console.log(`Score: ${score}% (${passed} pass / ${warned} warn / ${failed} fail)`);
  console.log(`Verdict: ${verdict}`);
  console.log('══════════════════════════════════════════\n');

  // POST to GrowthOS
  console.log('→ Posting report to GrowthOS...');
  try {
    const res = await fetch(`${GROWTHOS_API}/api/qa-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROWTHOS_TOKEN}` },
      body: JSON.stringify({ targetUrl: TARGET_URL, summary, tests: results }),
    });
    const data = await res.json();
    if (data.success) console.log(`✓ Report saved (ID: ${data.report?.id})`);
    else console.error('✗ Failed to save report:', data);
  } catch (e) {
    console.error('✗ Could not reach GrowthOS API:', e.message);
  }
  console.log('\nOpen GrowthOS → QA Agent to see the full analysis.\n');
})();
