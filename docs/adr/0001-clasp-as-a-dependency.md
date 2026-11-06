# 1. clasp as a dependency

- Status: Accepted
- Date: 2026-11-06

## Context

The CLI has to push an Apps Script project and redeploy a web app from CI. The Apps Script API could be called directly, or clasp could be used.

## Decision

`@google/clasp` `^3.4.1` is a runtime dependency, and the CLI runs it instead of calling the Apps Script API.

- Reuse: clasp already implements `rootDir`, `filePushOrder`, `.claspignore`, file types and both credential formats, so none of that is re-implemented.
- Resolution: the CLI resolves clasp with `createRequire(import.meta.url).resolve('@google/clasp')`, walks up to its `package.json` and reads `bin.clasp` (its `exports` does not expose `package.json`). It runs `spawn(process.execPath, [bin, ...args])`: no `npx`, no `PATH` lookup, no shell.
- Machine-readable output: the CLI only parses `--json` output (`create-version`, `create-deployment`, `list-deployments`) and uses `pull --versionNumber` to read the manifest of one version. These shapes were verified against clasp 3.4.1.

## Consequences

- The clasp version is pinned by the lockfile of the caller, not by whatever is installed on the runner.
- A change in clasp's JSON shapes can break the CLI; the unit tests cover them with a fake clasp.
- The install is larger than a bare API client would be.
