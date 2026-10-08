#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PACKAGE_PATHS = [
  path.join(ROOT_DIR, 'package.json'),
  path.join(ROOT_DIR, 'packages/core/package.json'),
  path.join(ROOT_DIR, 'apps/web/package.json'),
  path.join(ROOT_DIR, 'apps/vscode/package.json'),
];

function bumpSemver(current, type) {
  const parts = current.split('.').map(n => parseInt(n, 10));
  let [major = 0, minor = 0, patch = 0] = parts;

  switch (type.toLowerCase()) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
    default:
      patch += 1;
      break;
  }

  return `${major}.${minor}.${patch}`;
}

function updatePackageJson(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return;
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  content.version = newVersion;
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
}

function updatePackageLock(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return;
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  content.version = newVersion;
  if (content.packages && content.packages['']) {
    content.packages[''].version = newVersion;
  }
  if (content.packages && content.packages['packages/core']) {
    content.packages['packages/core'].version = newVersion;
  }
  if (content.packages && content.packages['apps/web']) {
    content.packages['apps/web'].version = newVersion;
  }
  if (content.packages && content.packages['apps/vscode']) {
    content.packages['apps/vscode'].version = newVersion;
  }
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
}

function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const filteredArgs = args.filter(a => a !== '--dry-run');
  const arg = filteredArgs[0] || 'patch';

  const rootPkgPath = path.join(ROOT_DIR, 'package.json');
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  const currentVersion = rootPkg.version || '0.1.0';

  let newVersion;
  if (/^\d+\.\d+\.\d+/.test(arg)) {
    newVersion = arg.replace(/^v/, '');
  } else {
    newVersion = bumpSemver(currentVersion, arg);
  }

  console.log(`Bumping version from ${currentVersion} to ${newVersion}...`);

  if (isDryRun) {
    console.log(`[DRY-RUN] Target version: ${newVersion}`);
    return newVersion;
  }

  for (const pkgPath of PACKAGE_PATHS) {
    updatePackageJson(pkgPath, newVersion);
    console.log(`Updated ${path.relative(ROOT_DIR, pkgPath)} to ${newVersion}`);
  }

  const lockPath = path.join(ROOT_DIR, 'package-lock.json');
  updatePackageLock(lockPath, newVersion);
  console.log(`Updated package-lock.json to ${newVersion}`);

  // Write to GitHub Actions GITHUB_ENV if in CI
  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, `NEW_VERSION=${newVersion}\n`, 'utf8');
    console.log(`Set GITHUB_ENV NEW_VERSION=${newVersion}`);
  }

  return newVersion;
}

main();
