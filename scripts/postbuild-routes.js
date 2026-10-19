/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
  console.error('dist directory does not exist!');
  process.exit(1);
}

const indexPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html does not exist!');
  process.exit(1);
}

const indexContent = fs.readFileSync(indexPath, 'utf-8');

const routes = [
  'analytics',
  'focus',
  'daily-actions',
  'monthly-target-setup',
  'daily-schedule',
  'subjects',
  'pace-management',
  'master-config',
  'outcome',
  'exam-routine',
  'account',
  'login',
];

for (const route of routes) {
  const routeDir = path.join(distDir, route);
  if (!fs.existsSync(routeDir)) {
    fs.mkdirSync(routeDir, { recursive: true });
  }
  fs.writeFileSync(path.join(routeDir, 'index.html'), indexContent);
}

// Dedicated static redirect for /dashboard/ if directly requested from disk
const dashboardDir = path.join(distDir, 'dashboard');
if (!fs.existsSync(dashboardDir)) {
  fs.mkdirSync(dashboardDir, { recursive: true });
}
const dashboardRedirectHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=/" />
    <link rel="canonical" href="/" />
    <title>Redirecting to Dashboard...</title>
  </head>
  <body>
    <script>window.location.replace('/');</script>
  </body>
</html>`;
fs.writeFileSync(path.join(dashboardDir, 'index.html'), dashboardRedirectHtml);

console.log('Successfully generated static route entry points in dist/');
