#!/usr/bin/env node
/**
 * Regenerate favicon assets from public/email-logo.png (flame icon crop).
 * Run: node scripts/generate-favicons.mjs
 *
 * Favicon canvases keep standard pixel sizes (16/32/48/180/192/512).
 * DISPLAY_SCALE enlarges the logo artwork within each canvas by exactly 30%.
 * Does not rewrite public/logo.png (site/OG branding asset).
 */
import sharp from "sharp";
import { writeFileSync } from "fs";
import { join } from "path";

const src = "public/email-logo.png";
const outDir = "public";
/** Exact +30% rendered logo size inside each favicon canvas. */
const DISPLAY_SCALE = 1.3;
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

const icon = await sharp(src)
  .extract({ left: 56, top: 24, width: 400, height: 340 })
  .png();

/**
 * Scale a size×size PNG by exactly DISPLAY_SCALE (1.3) using a 10×
 * intermediate so 1.3 maps to integer pixels (size*13 / size*10).
 */
async function scalePngExactly(buf, size, scale = DISPLAY_SCALE) {
  if (scale === 1) return buf;
  if (scale !== 1.3) {
    throw new Error(`Unsupported favicon display scale: ${scale} (expected 1.3)`);
  }
  const hi = size * 10;
  const scaledHi = size * 13;
  const inset = (scaledHi - hi) / 2;
  const enlarged = await sharp(buf)
    .resize(scaledHi, scaledHi, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  const cropped = await sharp(enlarged)
    .extract({ left: inset, top: inset, width: hi, height: hi })
    .png()
    .toBuffer();
  return sharp(cropped)
    .resize(size, size, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
}

async function renderFaviconPng(size) {
  const base = await icon
    .clone()
    .resize(size, size, { fit: "contain", background: transparent })
    .png()
    .toBuffer();
  return scalePngExactly(base, size);
}

const faviconSizes = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "favicon-48x48.png", size: 48 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
];

const buffers = {};
for (const { name, size } of faviconSizes) {
  const buf = await renderFaviconPng(size);
  writeFileSync(join(outDir, name), buf);
  buffers[size] = buf;
  console.log("wrote", name, `(logo ×${DISPLAY_SCALE})`);
}

function buildIco(images) {
  const count = images.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const parts = [];
  const dirEntries = Buffer.alloc(count * 16);
  for (let i = 0; i < count; i++) {
    const { buf, size } = images[i];
    const entryOffset = i * 16;
    dirEntries[entryOffset] = size === 256 ? 0 : size;
    dirEntries[entryOffset + 1] = size === 256 ? 0 : size;
    dirEntries.writeUInt16LE(32, entryOffset + 6);
    dirEntries.writeUInt32LE(buf.length, entryOffset + 8);
    dirEntries.writeUInt32LE(offset, entryOffset + 12);
    parts.push(buf);
    offset += buf.length;
  }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  return Buffer.concat([header, dirEntries, ...parts]);
}

writeFileSync(
  join(outDir, "favicon.ico"),
  buildIco([
    { buf: buffers[16], size: 16 },
    { buf: buffers[32], size: 32 },
    { buf: buffers[48], size: 48 },
  ]),
);
console.log("wrote favicon.ico");
