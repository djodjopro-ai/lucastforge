import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL = process.argv[2] || 'http://localhost:3000';
const widths = [375, 768, 1280, 1920];

async function screenshot() {
  const browser = await puppeteer.launch({ headless: true });

  for (const width of widths) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for fonts + GSAP
    await new Promise(r => setTimeout(r, 2000));

    // Scroll incrementally for GSAP ScrollTrigger
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const step = 300;
    for (let y = 0; y < scrollHeight; y += step) {
      await page.evaluate(scrollY => window.scrollTo(0, scrollY), y);
      await new Promise(r => setTimeout(r, 16));
    }

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 500));

    const filePath = path.join(__dirname, 'temporary screenshots', `screenshot-${width}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Saved: ${filePath}`);
    await page.close();
  }

  await browser.close();
  console.log('Done!');
}

screenshot().catch(console.error);
