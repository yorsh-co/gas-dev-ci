// @ts-check
import { describe, expect, it, vi } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import { CiError } from '../src/errors.js';

vi.mock('../src/deploy.js', () => ({ deploy: vi.fn() }));

const { main } = await import('../src/cli.js');
const { deploy } = await import('../src/deploy.js');

function setup() {
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  const err = [];
  const context = {
    stdout: { write: (/** @type {string} */ text) => out.push(text) },
    stderr: { write: (/** @type {string} */ text) => err.push(text) },
    env: {},
    cwd: '/tmp/project',
    home: '/tmp/home',
  };
  return { context, out, err };
}

describe('main', () => {
  it.each(['--help', '-h'])('prints usage for %s', async (flag) => {
    const { context, out } = setup();
    expect(await main([flag], context)).toBe(0);
    expect(out.join('')).toContain('Usage: gas-dev-ci');
  });

  it('prints the version', async () => {
    const { context, out } = setup();
    expect(await main(['--version'], context)).toBe(0);
    expect(out.join('')).toBe(`${pkg.version}\n`);
  });

  it.each([[[]], [['bogus']], [['deploy', 'extra']]])(
    'returns 2 for invalid usage %j',
    async (argv) => {
      const { context, err } = setup();
      expect(await main(argv, context)).toBe(2);
      expect(err.join('')).toContain('Usage: gas-dev-ci');
    },
  );

  it('returns 0 when deploy succeeds', async () => {
    const { context } = setup();
    vi.mocked(deploy).mockResolvedValueOnce();
    expect(await main(['deploy'], context)).toBe(0);
    expect(deploy).toHaveBeenCalledWith(context);
  });

  it('returns 1 and prints the message for a CiError', async () => {
    const { context, err } = setup();
    vi.mocked(deploy).mockRejectedValueOnce(new CiError('boom'));
    expect(await main(['deploy'], context)).toBe(1);
    expect(err.join('')).toBe('boom\n');
  });
});
