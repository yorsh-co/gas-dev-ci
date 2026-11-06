#!/usr/bin/env node
// @ts-check
import { homedir } from 'node:os';
import { main } from '../src/cli.js';

process.exitCode = await main(process.argv.slice(2), {
  stdout: process.stdout,
  stderr: process.stderr,
  env: process.env,
  cwd: process.cwd(),
  home: homedir(),
});
