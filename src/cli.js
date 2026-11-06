// @ts-check
import pkg from '../package.json' with { type: 'json' };
import { deploy } from './deploy.js';
import { CiError } from './errors.js';

const USAGE = `Usage: gas-dev-ci <command>

Commands:
  deploy      Push the project with clasp and redeploy the web app, if configured

Options:
  -h, --help  Show this help
  --version   Show the version
`;

/**
 * @typedef {object} CliContext
 * @property {{ write(text: string): unknown }} stdout
 * @property {{ write(text: string): unknown }} stderr
 * @property {NodeJS.ProcessEnv} env
 * @property {string} cwd Project root.
 * @property {string} home Home directory, where clasp credentials are written.
 */

/**
 * Runs the CLI.
 *
 * @param {string[]} argv Command-line arguments, without the node and script paths.
 * @param {CliContext} context
 * @returns {Promise<number>} The exit code: 0 on success, 1 on a failed deployment, 2 on invalid usage.
 */
export async function main(argv, context) {
  const { stdout, stderr } = context;
  const [command, ...rest] = argv;

  if (command === '--help' || command === '-h') {
    stdout.write(USAGE);
    return 0;
  }
  if (command === '--version') {
    stdout.write(`${pkg.version}\n`);
    return 0;
  }
  if (command !== 'deploy' || rest.length > 0) {
    stderr.write(USAGE);
    return 2;
  }

  try {
    await deploy(context);
    return 0;
  } catch (error) {
    if (error instanceof CiError) {
      stderr.write(`${error.message}\n`);
      return 1;
    }
    throw error;
  }
}
