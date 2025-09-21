/* eslint-disable */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function run() {
  const outDir = path.join(__dirname, '..', 'artifacts');
  const outPath = path.join(outDir, 'json-viewer.png');
  await ensureDir(outDir);

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  // Navigate to dev server JSON tool
  const baseUrl = process.env.TOOLS_BASE_URL || 'http://localhost:3000';
  const url = `${baseUrl}/json`;
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Seed example JSON to render UI
  await page.waitForSelector('textarea');
  const sample = JSON.stringify({
    user: { id: 123, name: 'Ada', tags: ['engineer', 'math'], profile: { url: 'https://example.com/ada', active: true } },
    items: [{ sku: 'A1', price: 9.99 }, { sku: 'B2', price: 5.25 }]
  }, null, 2);
  await page.type('textarea', sample);

  // Wait a bit for live parse
  await new Promise((resolve) => setTimeout(resolve, 600));

  const cardSelector = 'div.min-h-screen div.max-w-3xl';
  await page.waitForSelector(cardSelector);
  const card = await page.$(cardSelector);
  if (card) {
    await card.screenshot({ path: outPath });
  } else {
    await page.screenshot({ path: outPath, fullPage: true });
  }

  await browser.close();
  console.log(`Saved screenshot to ${outPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

