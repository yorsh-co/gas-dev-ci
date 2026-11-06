// @ts-check
import { closeSync, fchmodSync, openSync, writeSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Writes the clasp credentials to `<home>/.clasprc.json`, readable only by the owner.
 *
 * @param {string} home
 * @param {Record<string, unknown>} clasprc
 */
export function writeCredentials(home, clasprc) {
  const path = join(home, '.clasprc.json');
  const fd = openSync(path, 'w', 0o600);
  try {
    fchmodSync(fd, 0o600);
    writeSync(fd, JSON.stringify(clasprc));
  } finally {
    closeSync(fd);
  }
}
