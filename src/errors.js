// @ts-check

/** An expected deployment failure; the CLI prints its message without a stack trace. */
export class CiError extends Error {
  /** @param {string} message @param {ErrorOptions} [options] */
  constructor(message, options) {
    super(message, options);
    this.name = 'CiError';
  }
}
