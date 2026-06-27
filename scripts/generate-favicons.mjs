#!/usr/bin/env node
/**
 * Regenerate favicon assets from public/email-logo.png (flame icon crop).
 * Run: node scripts/generate-favicons.mjs
 */
import sharp from "sharp";
import { writeFileSync } from "fs";
import { join } from "path";

const src = "public/email-logo.png";
const outDir = "public";

const icon = await sharp(src)
  .extract({ left: 56, top: 24, width: 400, height: 340 })
  .png();

const sizes = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "favicon-48x48.png", size: 48 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
  { name: "logo.png", size: 512 },
];

for (const { name, size } of sizes) {
  await icon
    .clone()
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(outDir, name));
  console.log("wrote", name);
}

const png16 = await icon.clone().resize(16, 16).png().toBuffer();
const png32 = await icon.clone().resize(32, 32).png().toBuffer();
const png48 = await icon.clone().resize(48, 48).png().toBuffer();

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
    { buf: png16, size: 16 },
    { buf: png32, size: 32 },
    { buf: png48, size: 48 },
  ]),
);
console.log("wrote favicon.ico");
