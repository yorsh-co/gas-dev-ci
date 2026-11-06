#!/usr/bin/env node
// @ts-check
// Stand-in for the clasp entry script. Logs every call to $FAKE_CLASP_LOG; env vars pick the outcome:
// FAKE_CLASP_DEPLOYMENTS (JSON), FAKE_CLASP_VERSION_OUTPUT (raw stdout of create-version),
// FAKE_CLASP_DEPLOY_OUTPUT (raw stdout of deploy), FAKE_CLASP_MANIFEST (JSON written by pull),
// FAKE_CLASP_KILL (command that kills itself with SIGTERM), FAKE_CLASP_NO_MANIFEST (pull writes nothing),
// FAKE_CLASP_FAIL (command name that exits 1), FAKE_CLASP_ECHO (text printed on failure).
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(import.meta.url);

/** The path to pass as `bin`. */
export const fakeClaspBin = SCRIPT;

/**
 * Reads the calls logged by the fake.
 *
 * @param {string} logPath
 * @returns {{ args: string[], cwd: string, projectDir?: string, files: Record<string, string>, claspEnv: Record<string, string | undefined> }[]}
 */
export function readCalls(logPath) {
  try {
    return readFileSync(logPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

/** Handles one invocation. */
function main() {
  const args = process.argv.slice(2);
  const env = process.env;
  const projectIndex = args.indexOf('-P');
  const projectDir = projectIndex === -1 ? undefined : args[projectIndex + 1];
  /** @type {Record<string, string>} */
  const files = {};
  if (projectDir) {
    files['.clasp.json'] = readFileSync(
      join(projectDir, '.clasp.json'),
      'utf8',
    );
  }
  appendFileSync(
    /** @type {string} */ (env.FAKE_CLASP_LOG),
    `${JSON.stringify({
      args,
      cwd: process.cwd(),
      projectDir,
      files,
      claspEnv: {
        clasp_config_auth: env.clasp_config_auth,
        clasp_config_project: env.clasp_config_project,
      },
    })}\n`,
  );
  const command =
    args.filter(
      (arg) => arg !== '--json' && arg !== '-P' && arg !== projectDir,
    )[0] ?? '';

  if (env.FAKE_CLASP_FAIL === command) {
    process.stderr.write(`${command} exploded ${env.FAKE_CLASP_ECHO ?? ''}\n`);
    process.exit(1);
  }
  if (env.FAKE_CLASP_KILL === command) {
    process.kill(process.pid, 'SIGTERM');
  }
  const json = (/** @type {unknown} */ value) =>
    process.stdout.write(`${JSON.stringify(value)}\n`);

  if (command === 'list-deployments') {
    process.stdout.write(`${env.FAKE_CLASP_DEPLOYMENTS ?? '[]'}\n`);
  } else if (command === 'create-version') {
    process.stdout.write(
      `${env.FAKE_CLASP_VERSION_OUTPUT ?? JSON.stringify({ versionNumber: 7 })}\n`,
    );
  } else if (command === 'deploy') {
    const id = args[args.indexOf('-i') + 1];
    process.stdout.write(
      `${env.FAKE_CLASP_DEPLOY_OUTPUT ?? JSON.stringify({ deploymentId: id, versionNumber: 7 })}\n`,
    );
  } else if (command === 'pull' && projectDir) {
    if (!env.FAKE_CLASP_NO_MANIFEST) {
      writeFileSync(
        join(projectDir, 'appsscript.json'),
        env.FAKE_CLASP_MANIFEST ?? JSON.stringify({ oauthScopes: [] }),
      );
    }
    process.stdout.write('pull ok\n');
  } else if (command === 'push') {
    process.stdout.write('push ok\n');
  } else {
    json({ unexpected: args });
    process.exit(1);
  }
}

if (basename(process.argv[1] ?? '') === basename(SCRIPT)) {
  main();
}
