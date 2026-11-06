// @ts-check
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { CiError } from './errors.js';

/**
 * Resolves the entry script of the installed `@google/clasp`. Its `exports` map does not expose
 * `package.json`, so the package root is found by walking up from the resolved entry point.
 *
 * @returns {string}
 */
export function resolveClaspBin() {
  try {
    const require = createRequire(import.meta.url);
    let dir = dirname(require.resolve('@google/clasp'));
    for (;;) {
      const pkgPath = join(dir, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        if (pkg.name === '@google/clasp') {
          const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.clasp;
          if (typeof bin !== 'string') break;
          return join(dir, bin);
        }
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // Falls through to the error below.
  }
  throw new CiError(
    'Could not resolve the @google/clasp bin; is it installed?',
  );
}

/**
 * @typedef {object} Clasp
 * @property {() => void} push
 * @property {() => { deploymentId: string, versionNumber?: number, description?: string }[]} listDeployments
 * @property {(description: string) => number} createVersion
 * @property {(id: string, version: number, description: string) => void} updateDeployment
 * @property {(scriptId: string, version: number) => any} readVersionManifest
 */

/**
 * Creates a wrapper around the clasp CLI. clasp runs through the current Node binary, without a
 * shell or PATH lookup; its output is redacted before it reaches any error message.
 *
 * @param {object} options
 * @param {string} options.cwd
 * @param {NodeJS.ProcessEnv} options.env
 * @param {(text: string) => string} options.redact
 * @param {string} [options.bin] clasp entry script; defaults to the installed `@google/clasp`.
 * @returns {Clasp}
 */
export function createClasp({ cwd, env, redact, bin }) {
  const claspBin = bin ?? resolveClaspBin();
  // clasp reads these from the environment and they could redirect it to other credentials or project.
  const claspEnv = { ...env };
  delete claspEnv.clasp_config_auth;
  delete claspEnv.clasp_config_project;

  /**
   * @param {string[]} args
   * @param {{ cwd?: string }} [options]
   * @returns {string}
   */
  function run(args, options = {}) {
    const rest = args[0] === '-P' ? args.slice(2) : args;
    const name = rest.find((arg) => !arg.startsWith('-')) ?? rest[0];
    const result = spawnSync(process.execPath, [claspBin, ...args], {
      cwd: options.cwd ?? cwd,
      env: claspEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (result.error) {
      throw new CiError(
        `clasp ${name} failed to start: ${redact(result.error.message)}`,
      );
    }
    if (result.status !== 0) {
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
      throw new CiError(
        `clasp ${name} failed (exit ${result.status ?? result.signal}):\n${redact(output)}`,
      );
    }
    return result.stdout ?? '';
  }

  /**
   * Runs a `--json` command and checks the shape of its result.
   *
   * @param {string[]} args
   * @param {'object' | 'array'} [shape]
   * @returns {any}
   */
  function runJson(args, shape = 'object') {
    const stdout = run(['--json', ...args]);
    let data;
    try {
      data = JSON.parse(stdout);
    } catch {
      throw new CiError(
        `clasp ${args[0]} returned invalid JSON:\n${redact(stdout.trim())}`,
      );
    }
    const valid =
      shape === 'array'
        ? Array.isArray(data)
        : typeof data === 'object' && data !== null && !Array.isArray(data);
    if (!valid) {
      throw new CiError(
        `clasp ${args[0]} returned an unexpected result:\n${redact(stdout.trim())}`,
      );
    }
    return data;
  }

  return {
    push() {
      run(['push', '--force']);
    },
    listDeployments() {
      return runJson(['list-deployments'], 'array');
    },
    createVersion(description) {
      const data = runJson(['create-version', description]);
      if (!Number.isInteger(data.versionNumber) || data.versionNumber < 1) {
        throw new CiError(
          'clasp create-version did not return a valid version number.',
        );
      }
      return data.versionNumber;
    },
    updateDeployment(id, version, description) {
      const data = runJson([
        'deploy',
        '-i',
        id,
        '-V',
        String(version),
        '-d',
        description,
      ]);
      if (data.deploymentId !== id) {
        throw new CiError(
          'clasp deploy returned a different deployment than requested.',
        );
      }
    },
    readVersionManifest(scriptId, version) {
      const dir = mkdtempSync(join(tmpdir(), 'gas-dev-ci-pull-'));
      try {
        writeFileSync(
          join(dir, '.clasp.json'),
          JSON.stringify({ scriptId, rootDir: '.' }),
        );
        run(['-P', dir, 'pull', '--versionNumber', String(version)]);
        const path = join(dir, 'appsscript.json');
        try {
          const manifest = JSON.parse(readFileSync(path, 'utf8'));
          if (
            typeof manifest !== 'object' ||
            manifest === null ||
            Array.isArray(manifest)
          ) {
            throw new Error('not an object');
          }
          return manifest;
        } catch {
          throw new CiError(
            `Version ${version} of the script has no readable appsscript.json.`,
          );
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  };
}
