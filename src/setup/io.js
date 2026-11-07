// @ts-check
import { styleText } from 'node:util';
import prompts from 'prompts';
import { CancelledError } from '../errors.js';

/**
 * @typedef {object} Log
 * @property {(message: string) => void} info
 * @property {(message: string) => void} success
 * @property {(message: string) => void} warn
 * @property {(message: string) => void} error
 * @property {(message: string) => void} raw Unstyled line on stdout.
 * @property {(title: string) => void} section
 */

/**
 * @typedef {object} Io
 * @property {Log} log
 * @property {(questions: prompts.PromptObject | prompts.PromptObject[]) => Promise<prompts.Answers<string>>} prompt
 */

/**
 * Creates the console helpers used by the wizard.
 *
 * @param {object} [streams]
 * @param {NodeJS.WriteStream} [streams.stdout]
 * @param {NodeJS.WriteStream} [streams.stderr]
 * @returns {Io}
 */
export function createIo({
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  /**
   * @param {NodeJS.WriteStream} stream
   * @param {Parameters<typeof styleText>[0]} format
   * @param {string} prefix
   * @returns {(message: string) => void}
   */
  const line = (stream, format, prefix) => (message) => {
    stream.write(`${styleText(format, `${prefix}${message}`, { stream })}\n`);
  };

  return {
    log: {
      info: line(stdout, 'cyan', ''),
      success: line(stdout, 'green', '✓ '),
      warn: line(stderr, 'yellow', 'Warning: '),
      error: line(stderr, 'red', '✖ '),
      raw: (message) => {
        stdout.write(`${message}\n`);
      },
      section: (title) => {
        stdout.write(`\n${styleText('bold', title, { stream: stdout })}\n`);
      },
    },
    prompt: (questions) =>
      prompts(questions, {
        onCancel: () => {
          throw new CancelledError();
        },
      }),
  };
}
