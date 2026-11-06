// @ts-check
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeCredentials } from '../src/credentials.js';

/** @type {string} */
let home;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'gas-dev-ci-home-'));
});
afterEach(() => rmSync(home, { recursive: true, force: true }));

const mode = (/** @type {string} */ path) => statSync(path).mode & 0o777;

describe('writeCredentials', () => {
  it('writes the JSON with mode 0600', () => {
    writeCredentials(home, { token: 'value' });
    const path = join(home, '.clasprc.json');
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ token: 'value' });
    expect(mode(path)).toBe(0o600);
  });

  it('tightens a pre-existing 0644 file', () => {
    const path = join(home, '.clasprc.json');
    writeFileSync(path, '{}');
    chmodSync(path, 0o644);
    writeCredentials(home, { token: 'value' });
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ token: 'value' });
    expect(mode(path)).toBe(0o600);
  });
});
