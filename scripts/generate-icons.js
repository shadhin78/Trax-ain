/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// ── UNIQUE GEOMETRIC X LOGO SVG ──
// Minimal, futuristic, precision-engineered geometric X constructed from
// interlocking angular aerospace facets with quantum indigo/violet and emerald depth.
const createSvg = ({ isAppIcon = false, isMaskable = false } = {}) => {
  const size = 512;
  const padding = isMaskable ? 80 : isAppIcon ? 40 : 24;
  const scale = (size - padding * 2) / 464;
  const translate = padding;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient for App Icons -->
    <radialGradient id="bgGlow" cx="50%" cy="45%" r="75%">
      <stop offset="0%" stop-color="#161B28" />
      <stop offset="55%" stop-color="#0E121B" />
      <stop offset="100%" stop-color="#07090E" />
    </radialGradient>

    <!-- Linear Blade Gradients -->
    <!-- Primary Sweeping Blade (Top-Left to Bottom-Right) -->
    <linearGradient id="bladeMain" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818CF8" />
      <stop offset="35%" stop-color="#6366F1" />
      <stop offset="70%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#4338CA" />
    </linearGradient>

    <!-- Facet Highlight on Primary Blade -->
    <linearGradient id="bladeFacet" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C7D2FE" />
      <stop offset="40%" stop-color="#A5B4FC" />
      <stop offset="100%" stop-color="#6366F1" />
    </linearGradient>

    <!-- Intersecting Wing Blade (Top-Right to Center-Left) -->
    <linearGradient id="wingTR" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#A5B4FC" />
      <stop offset="50%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#3730A3" />
    </linearGradient>

    <!-- Intersecting Wing Blade (Bottom-Left to Center-Right) -->
    <linearGradient id="wingBL" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6366F1" />
      <stop offset="50%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#1E1B4B" />
    </linearGradient>

    <!-- Core Nexus Glow Filter -->
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <!-- Core Focal Light -->
    <linearGradient id="coreEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>
  </defs>

  ${
    isAppIcon || isMaskable
      ? `
  <!-- App Icon Background Slab -->
  <rect width="512" height="512" rx="${isMaskable ? '0' : '112'}" fill="url(#bgGlow)" />
  <rect width="510" height="510" x="1" y="1" rx="${isMaskable ? '0' : '111'}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2" />
  <!-- Atmospheric Core Radiance -->
  <circle cx="256" cy="256" r="140" fill="#6366F1" opacity="0.12" filter="url(#neonGlow)" />
  `
      : ''
  }

  <!-- Geometric X Core Vectors (Scaled & Centered) -->
  <g transform="translate(${translate}, ${translate}) scale(${scale})">
    <!-- LAYER 1: Ambient Shadow Blade Underpass -->
    <path 
      d="M 120 400 L 176 432 L 256 296 L 216 272 Z"
      fill="#1E1B4B"
      opacity="0.6"
    />

    <!-- LAYER 2: INTERSECTING WING BLADE - Top-Right Wing -->
    <!-- Sharp aerodynamic chevron wing slicing into the center nexus with a 12px dimensional separation gap -->
    <path
      d="M 336 48 L 416 48 L 276 228 L 228 200 Z"
      fill="url(#wingTR)"
    />
    <!-- Specular Top Chamfer Edge -->
    <path
      d="M 336 48 L 416 48 L 388 76 L 316 76 Z"
      fill="#E0E7FF"
      opacity="0.45"
    />

    <!-- LAYER 3: INTERSECTING WING BLADE - Bottom-Left Wing -->
    <path
      d="M 96 464 L 176 464 L 236 292 L 188 264 Z"
      fill="url(#wingBL)"
    />
    <!-- Specular Bottom Chamfer Edge -->
    <path
      d="M 96 464 L 176 464 L 148 436 L 76 436 Z"
      fill="#818CF8"
      opacity="0.3"
    />

    <!-- LAYER 4: PRIMARY OVERPASS CONTINUOUS DIAGONAL BEAM (Top-Left to Bottom-Right) -->
    <!-- Main faceted fuselage beam flying across the full diagonal -->
    <path
      d="M 96 48 L 192 48 L 416 464 L 320 464 Z"
      fill="url(#bladeMain)"
    />

    <!-- Faceted Reflected Specular Spine on Primary Beam -->
    <path
      d="M 144 48 L 192 48 L 368 464 L 320 464 Z"
      fill="url(#bladeFacet)"
      opacity="0.5"
    />

    <!-- Sharp Razor Leading Edge Highlight Line -->
    <path
      d="M 96 48 L 112 56 L 336 464 L 320 464 Z"
      fill="#FFFFFF"
      opacity="0.35"
    />

    <!-- Precision Central Aperture Diamond / Geometric Interlock Notch -->
    <!-- Creates the optical illusion of interlocking spatial layers -->
    <polygon
      points="256,220 288,256 256,292 224,256"
      fill="#0B0D13"
      opacity="0.95"
    />
    <polygon
      points="256,220 288,256 256,292 224,256"
      fill="none"
      stroke="#6366F1"
      stroke-width="3"
      opacity="0.8"
    />

    <!-- Glowing Core Pulse Micro-Gem (Emerald Signature Node) -->
    <polygon
      points="256,236 272,256 256,276 240,256"
      fill="url(#coreEmerald)"
    />
    <circle cx="256" cy="256" r="3" fill="#FFFFFF" />
  </g>
</svg>`;
};

async function generateAll() {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Transparent Vector Favicon
  const transparentSvg = createSvg({ isAppIcon: false, isMaskable: false });
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), transparentSvg);
  console.log('✓ Generated public/favicon.svg');

  // 2. App Icon Vector
  const appIconSvg = createSvg({ isAppIcon: true, isMaskable: false });
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), appIconSvg);
  console.log('✓ Generated public/icon.svg');

  // 3. Maskable Vector
  const maskableSvg = createSvg({ isAppIcon: true, isMaskable: true });
  fs.writeFileSync(path.join(publicDir, 'icon-maskable.svg'), maskableSvg);
  console.log('✓ Generated public/icon-maskable.svg');

  // 4. Generate PNGs using Sharp
  const sizes = [
    { name: 'favicon-16x16.png', size: 16, svg: transparentSvg },
    { name: 'favicon-32x32.png', size: 32, svg: transparentSvg },
    { name: 'favicon-48x48.png', size: 48, svg: transparentSvg },
    { name: 'apple-touch-icon.png', size: 180, svg: appIconSvg },
    { name: 'icon-192.png', size: 192, svg: appIconSvg },
    { name: 'icon-512.png', size: 512, svg: appIconSvg },
    { name: 'icon-maskable-512.png', size: 512, svg: maskableSvg },
  ];

  for (const item of sizes) {
    const outPath = path.join(publicDir, item.name);
    await sharp(Buffer.from(item.svg))
      .resize(item.size, item.size)
      .png()
      .toFile(outPath);
    console.log(`✓ Generated public/${item.name} (${item.size}x${item.size})`);
  }

  // Generate favicon.ico from 32x32 PNG
  const icoPath = path.join(publicDir, 'favicon.ico');
  await sharp(Buffer.from(transparentSvg))
    .resize(32, 32)
    .png()
    .toFile(icoPath);
  console.log('✓ Generated public/favicon.ico');

  console.log('All icons generated successfully!');
}

generateAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
