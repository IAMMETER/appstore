import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

const MAX_SIZE = 1024 * 1024; // 1MB
const ALLOWED_EXT = ["png", "jpg", "jpeg"];

const ROOT = process.cwd();

async function main() {
  const manifestFiles = await fg(["apps/*/manifest.json"]);
  let hasError = false;

  for (const manifestPath of manifestFiles) {
    const full = path.join(ROOT, manifestPath);
    const manifest = JSON.parse(fs.readFileSync(full, "utf8"));

    if (manifest.runtime !== "static") continue;

    const appDir = path.dirname(full);

    const screenshots = fs.readdirSync(appDir).filter(f =>
      /^screenshot\.(png|jpg|jpeg)$/i.test(f)
    );

    // Optional screenshot
    if (screenshots.length === 0) {
      console.log(`ℹ️  ${manifest.id}: No screenshot (optional)`);
      continue;
    }

    if (screenshots.length > 1) {
      console.error(`❌ ${manifest.id}: Multiple screenshot files found`);
      hasError = true;
      continue;
    }

    const screenshotFile = screenshots[0];
    const screenshotPath = path.join(appDir, screenshotFile);

    const ext = screenshotFile.split(".").pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      console.error(`❌ ${manifest.id}: Invalid screenshot format`);
      hasError = true;
      continue;
    }

    const stat = fs.statSync(screenshotPath);

    if (stat.size > MAX_SIZE) {
      console.error(`❌ ${manifest.id}: Screenshot exceeds 1MB`);
      hasError = true;
      continue;
    }

    console.log(`✅ ${manifest.id}: Screenshot validated`);
  }

  if (hasError) {
    console.error("\nScreenshot validation failed.");
    process.exit(1);
  }

  console.log("\nScreenshot validation completed successfully.");
}

main();