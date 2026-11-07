// @ts-check
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const REQUIRED_FILES = [
  'bin/gas-dev-ci.js',
  'src/index.js',
  'types.d.ts',
  'README.md',
  'LICENSE.md',
  'package.json',
];

describe('package surface', () => {
  it('exports exactly the documented public API', async () => {
    const entry = await import('gas-dev-ci');
    expect(Object.keys(entry).sort()).toEqual(['DeployError']);
  });

  it('resolves package.json', () => {
    const require = createRequire(import.meta.url);
    expect(require('gas-dev-ci/package.json').name).toBe('gas-dev-ci');
  });

  it('packs the required files and nothing from test, docs or .github', () => {
    const out = execFileSync('npm', ['pack', '--dry-run', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const paths = JSON.parse(out)[0].files.map(
      (/** @type {{ path: string }} */ f) => f.path,
    );
    for (const file of REQUIRED_FILES) expect(paths).toContain(file);
    for (const p of paths) expect(p).not.toMatch(/^(test|docs|\.github)\//);
  });
});
