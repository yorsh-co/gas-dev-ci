// @ts-check
import { CiError } from './errors.js';

/**
 * @typedef {object} Inputs
 * @property {Record<string, unknown>} clasprc Parsed `CLASPRC_JSON` credentials.
 * @property {string} scriptId
 * @property {string | undefined} [deploymentId] Set when a web-app deployment is redeployed.
 * @property {string | undefined} [sha] Redeploy description (`GITHUB_SHA`).
 * @property {boolean} githubActions
 * @property {string | undefined} [outputPath] `GITHUB_OUTPUT` file.
 * @property {string | undefined} [summaryPath] `GITHUB_STEP_SUMMARY` file.
 */

/**
 * @param {string | undefined} value
 * @returns {string | undefined}
 */
function nonEmpty(value) {
  return value === undefined || value === '' ? undefined : value;
}

/**
 * Reads and validates the deploy inputs from the environment. Error messages
 * name the variable but never include its value.
 *
 * @param {NodeJS.ProcessEnv} env
 * @returns {Inputs}
 * @throws {CiError} If a required variable is missing or invalid.
 */
export function readInputs(env) {
  const raw = nonEmpty(env.CLASPRC_JSON);
  if (raw === undefined) {
    throw new CiError(
      'CLASPRC_JSON is not set. Add it as a secret of the deployment environment.',
    );
  }
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CiError('CLASPRC_JSON is not valid JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new CiError('CLASPRC_JSON must contain a JSON object.');
  }
  const scriptId = nonEmpty(env.GAS_SCRIPT_ID);
  if (scriptId === undefined) {
    throw new CiError(
      'GAS_SCRIPT_ID is not set. Add it as a variable of the deployment environment.',
    );
  }
  return {
    clasprc: /** @type {Record<string, unknown>} */ (parsed),
    scriptId,
    deploymentId: nonEmpty(env.GAS_DEPLOYMENT_ID),
    sha: nonEmpty(env.GITHUB_SHA),
    githubActions: env.GITHUB_ACTIONS === 'true',
    outputPath: nonEmpty(env.GITHUB_OUTPUT),
    summaryPath: nonEmpty(env.GITHUB_STEP_SUMMARY),
  };
}
