/**
 * Generate PNG icons from SVG for Chrome extension
 * Requires: pnpm add -D sharp
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svgPath = resolve(__dirname, '../plugin/assets/icons.svg');
const outputDir = resolve(__dirname, '../plugin/assets');

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const sizes = [16, 48, 128];

async function generateIcons() {
  try {
    const svgBuffer = readFileSync(svgPath);
    
    for (const size of sizes) {
      const outputPath = resolve(outputDir, `icon-${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated icon-${size}.png`);
    }
    
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error.message);
    console.error('\nNote: This script requires "sharp" package.');
    console.error('Install it with: pnpm add -D sharp');
    process.exit(1);
  }
}

generateIcons();

