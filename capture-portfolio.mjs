import puppeteer from 'puppeteer';
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'images', 'portfolio');
fs.mkdirSync(outDir, { recursive: true });

// Projects to screenshot -- each needs its own local server
const projects = [
  { name: 'bright-smile-good', dir: '/Users/apple/Desktop/WEBOVI/BrightSmileDental', file: 'index.html' },
  { name: 'bright-smile-bad', dir: '/Users/apple/Desktop/WEBOVI/BrightSmileDental', file: 'index-bad.html' },
  { name: 'ember-roasters-good', dir: '/Users/apple/Desktop/WEBOVI/EmberRoasters', file: 'index.html' },
  { name: 'ember-roasters-bad', dir: '/Users/apple/Desktop/WEBOVI/EmberRoasters', file: 'index-bad.html' },
  { name: 'hargrove-good', dir: '/Users/apple/Desktop/HargroveAssociates', file: 'index.html' },
  { name: 'hargrove-bad', dir: '/Users/apple/Desktop/HargroveAssociates', file: 'index-bad.html' },
  { name: 'grifa-hero', dir: '/Users/apple/Desktop/WEBOVI/GrifaWEB', file: 'index.html' },
  { name: 'sapunija-hero', dir: '/Users/apple/Desktop/WEBOVI/WEBTEST1', file: 'index.html' },
];

async function captureHero(browser, projectDir, htmlFile, outputName) {
  const filePath = `file://${path.join(projectDir, htmlFile)}`;
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });

  try {
    await page.goto(filePath, { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (e) {
    // Some pages may timeout on networkidle0 with file://, try domcontentloaded
    console.log(`  Retrying ${outputName} with domcontentloaded...`);
    await page.goto(filePath, { waitUntil: 'domcontentloaded', timeout: 15000 });
  }

  // Wait for fonts and animations
  await new Promise(r => setTimeout(r, 3000));

  // Viewport-only screenshot (hero crop)
  const rawPath = path.join(outDir, `${outputName}-raw.png`);
  await page.screenshot({ path: rawPath, fullPage: false });
  console.log(`  Captured: ${outputName}`);

  // Process with sharp: 1200px wide WebP
  await sharp(rawPath)
    .resize(1200, null, { withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(path.join(outDir, `${outputName}.webp`));

  // 600px thumbnail
  await sharp(rawPath)
    .resize(600, null, { withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(outDir, `${outputName}-thumb.webp`));

  // Clean up raw
  fs.unlinkSync(rawPath);

  await page.close();
}

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });

  for (const proj of projects) {
    console.log(`Capturing ${proj.name}...`);
    await captureHero(browser, proj.dir, proj.file, proj.name);
  }

  await browser.close();

  // List results
  const files = fs.readdirSync(outDir).filter(f => f.endsWith('.webp'));
  console.log(`\nDone! ${files.length} images in ${outDir}:`);
  for (const f of files) {
    const stat = fs.statSync(path.join(outDir, f));
    console.log(`  ${f} (${Math.round(stat.size / 1024)}KB)`);
  }
}

main().catch(console.error);
