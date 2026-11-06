// @ts-check
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createClasp, resolveClaspBin } from '../src/clasp.js';
import { CiError } from '../src/errors.js';
import { fakeClaspBin, readCalls } from './helpers/fake-clasp.js';

const SECRET = 'super-secret-token';
const redact = (/** @type {string} */ text) => text.replaceAll(SECRET, '***');

describe('createClasp', () => {
  /** @type {string} */
  let dir;
  /** @type {string} */
  let logPath;
  /** @type {Record<string, string>} */
  let extraEnv;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'clasp-test-'));
    logPath = join(dir, 'calls.log');
    extraEnv = {};
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const make = () =>
    createClasp({
      cwd: dir,
      env: { ...process.env, FAKE_CLASP_LOG: logPath, ...extraEnv },
      redact,
      bin: fakeClaspBin,
    });

  it('pushes with --force in the working directory', () => {
    make().push();
    const [call] = readCalls(logPath);
    expect(call?.args).toEqual(['push', '--force']);
    expect(call?.cwd).toBe(dir);
  });

  it('does not pass clasp config overrides from the environment', () => {
    extraEnv.clasp_config_auth = '/elsewhere/auth';
    extraEnv.clasp_config_project = '/elsewhere/project';
    make().push();
    expect(readCalls(logPath)[0]?.claspEnv).toEqual({});
  });

  it('lists deployments', () => {
    extraEnv.FAKE_CLASP_DEPLOYMENTS = JSON.stringify([
      { deploymentId: 'd1', versionNumber: 3 },
    ]);
    expect(make().listDeployments()).toEqual([
      { deploymentId: 'd1', versionNumber: 3 },
    ]);
    expect(readCalls(logPath)[0]?.args).toEqual(['--json', 'list-deployments']);
  });

  it('rejects a deployments result that is not an array', () => {
    extraEnv.FAKE_CLASP_DEPLOYMENTS = '{}';
    expect(() => make().listDeployments()).toThrow(/unexpected result/);
  });

  it('rejects invalid JSON without leaking secrets', () => {
    extraEnv.FAKE_CLASP_DEPLOYMENTS = `not json ${SECRET}`;
    let error;
    try {
      make().listDeployments();
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(CiError);
    expect(String(/** @type {Error} */ (error).message)).toMatch(
      /invalid JSON/,
    );
    expect(String(/** @type {Error} */ (error).message)).not.toContain(SECRET);
  });

  it('creates a version and returns its number', () => {
    expect(make().createVersion('abc123')).toBe(7);
    expect(readCalls(logPath)[0]?.args).toEqual([
      '--json',
      'create-version',
      'abc123',
    ]);
  });

  it.each(['{"versionNumber":0}', '{"versionNumber":"7"}', '{}'])(
    'rejects an invalid version result %s',
    (output) => {
      extraEnv.FAKE_CLASP_VERSION_OUTPUT = output;
      expect(() => make().createVersion('x')).toThrow(/valid version number/);
    },
  );

  it('updates a deployment', () => {
    make().updateDeployment('dep-1', 7, 'abc123');
    expect(readCalls(logPath)[0]?.args).toEqual([
      '--json',
      'deploy',
      '-i',
      'dep-1',
      '-V',
      '7',
      '-d',
      'abc123',
    ]);
  });

  it('rejects a deployment result with a different ID', () => {
    extraEnv.FAKE_CLASP_DEPLOY_OUTPUT = '{"deploymentId":"other"}';
    expect(() => make().updateDeployment('dep-1', 7, 'x')).toThrow(
      /different deployment/,
    );
  });

  it('reads a version manifest through a temp project and removes it', () => {
    extraEnv.FAKE_CLASP_MANIFEST = JSON.stringify({ oauthScopes: ['a'] });
    expect(make().readVersionManifest('script-1', 4)).toEqual({
      oauthScopes: ['a'],
    });
    const [call] = readCalls(logPath);
    expect(call?.args).toEqual([
      '-P',
      call?.projectDir,
      'pull',
      '--versionNumber',
      '4',
    ]);
    expect(JSON.parse(call?.files['.clasp.json'] ?? '')).toEqual({
      scriptId: 'script-1',
      rootDir: '.',
    });
    expect(existsSync(/** @type {string} */ (call?.projectDir))).toBe(false);
    expect(call?.projectDir).not.toBe(dir);
    expect(
      call?.projectDir?.startsWith(join(tmpdir(), 'gas-dev-ci-pull-')),
    ).toBe(true);
  });

  it('removes the temp dir when pull fails', () => {
    extraEnv.FAKE_CLASP_FAIL = 'pull';
    expect(() => make().readVersionManifest('script-1', 4)).toThrow(
      /clasp pull failed/,
    );
    const [call] = readCalls(logPath);
    expect(existsSync(/** @type {string} */ (call?.projectDir))).toBe(false);
  });

  it('includes redacted output on failure', () => {
    extraEnv.FAKE_CLASP_FAIL = 'push';
    extraEnv.FAKE_CLASP_ECHO = SECRET;
    let error;
    try {
      make().push();
    } catch (e) {
      error = e;
    }
    const message = String(/** @type {Error} */ (error).message);
    expect(message).toContain('clasp push failed (exit 1)');
    expect(message).toContain('push exploded ***');
    expect(message).not.toContain(SECRET);
  });

  it('rejects a pull that writes no manifest and removes the temp dir', () => {
    extraEnv.FAKE_CLASP_NO_MANIFEST = '1';
    expect(() => make().readVersionManifest('script-1', 4)).toThrow(CiError);
    expect(() => make().readVersionManifest('script-1', 4)).toThrow(
      /no readable appsscript\.json/,
    );
    const [call] = readCalls(logPath);
    expect(existsSync(/** @type {string} */ (call?.projectDir))).toBe(false);
  });

  it.each(['not json', 'null', '[]', '3'])(
    'rejects an invalid manifest %s',
    (manifest) => {
      extraEnv.FAKE_CLASP_MANIFEST = manifest;
      expect(() => make().readVersionManifest('script-1', 4)).toThrow(
        /no readable appsscript\.json/,
      );
      const [call] = readCalls(logPath);
      expect(existsSync(/** @type {string} */ (call?.projectDir))).toBe(false);
    },
  );

  it('redacts output echoed in an unexpected result', () => {
    extraEnv.FAKE_CLASP_DEPLOYMENTS = `"${SECRET}"`;
    let error;
    try {
      make().listDeployments();
    } catch (e) {
      error = e;
    }
    const message = String(/** @type {Error} */ (error).message);
    expect(error).toBeInstanceOf(CiError);
    expect(message).toMatch(/unexpected result/);
    expect(message).not.toContain(SECRET);
  });

  it.each(['create-version', 'deploy'])('redacts a failing %s', (command) => {
    extraEnv.FAKE_CLASP_FAIL = command;
    extraEnv.FAKE_CLASP_ECHO = SECRET;
    const clasp = make();
    let error;
    try {
      if (command === 'deploy') clasp.updateDeployment('d', 1, 'x');
      else clasp.createVersion('x');
    } catch (e) {
      error = e;
    }
    const message = String(/** @type {Error} */ (error).message);
    expect(error).toBeInstanceOf(CiError);
    expect(message).toContain(`clasp ${command} failed (exit 1)`);
    expect(message).not.toContain(SECRET);
  });

  it('reports the signal when clasp is killed', () => {
    extraEnv.FAKE_CLASP_KILL = 'push';
    expect(() => make().push()).toThrow(/clasp push failed \(exit SIGTERM\)/);
  });

  it('reports a spawn failure', () => {
    const clasp = createClasp({
      cwd: join(dir, 'missing'),
      env: process.env,
      redact,
      bin: fakeClaspBin,
    });
    expect(() => clasp.push()).toThrow(/clasp push failed to start/);
  });
});

describe('resolveClaspBin', () => {
  it('returns the installed clasp entry script', () => {
    const bin = resolveClaspBin();
    expect(existsSync(bin)).toBe(true);
    expect(bin.endsWith(join('build', 'src', 'index.js'))).toBe(true);
  });
});
