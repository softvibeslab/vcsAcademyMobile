import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseUrl = process.env.MOBILE_WEB_URL || 'http://127.0.0.1:8082';
const chromePath = process.env.CHROME_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outputDir = 'doc/qa/sprint18/screenshots';

const shots = [
  ['01-welcome.png', async (page) => {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('SMART AGENT', { exact: true }).first().waitFor();
  }],
  ['02-login.png', async (page) => {
    await page.getByText('Get Started', { exact: true }).click();
    await page.getByText('Secure access', { exact: true }).waitFor();
  }],
  ['03-home.png', async (page) => {
    await page.getByText('Enter Sales Academy', { exact: true }).click();
    await page.getByText('Good morning, Chris', { exact: true }).waitFor();
  }],
  ['04-roadmap.png', async (page) => {
    await page.getByText('Roadmap', { exact: true }).click();
    await page.getByText('Top Producer Roadmap', { exact: true }).waitFor();
  }],
  ['05-step-detail.png', async (page) => {
    await page.getByText('5. Remake the Pact (YES/NO TODAY)', { exact: true }).click();
    await page.getByText('Exact Words That Close', { exact: true }).waitFor();
  }],
  ['06-goalsheet.png', async (page) => {
    await page.getByText('GoalSheet', { exact: true }).click();
    await page.getByText('Smart GoalSheet', { exact: true }).waitFor();
  }],
  ['07-roleplay.png', async (page) => {
    await page.getByText('Roleplay Live', { exact: true }).click();
    await page.getByText('Speaking Now', { exact: true }).waitFor();
  }],
  ['08-resources.png', async (page) => {
    await page.getByText('Resources', { exact: true }).click();
    await page.getByText('Approved training, scripts, checklists and sensitive-access content.', { exact: true }).waitFor();
  }]
];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true
});

try {
  const page = await browser.newPage({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  for (const [fileName, prepare] of shots) {
    await prepare(page);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      document.querySelectorAll('[style*="overflow"]').forEach((node) => {
        if (node instanceof HTMLElement) node.scrollTop = 0;
      });
    });
    await page.screenshot({ path: `${outputDir}/${fileName}`, fullPage: true });
    console.log(`captured ${fileName}`);
  }
} finally {
  await browser.close();
}
