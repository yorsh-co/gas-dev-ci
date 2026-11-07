# 7. Public API for 1.0 and the path to gas-dev-config

- Status: Accepted
- Date: 2026-11-07

## Context

gas-dev-ci is approaching 1.0. Consumers pin the reusable workflow and the CLI by tag and semver range, so they need to know what a minor or patch release will never break. Separately, gas-dev-ci, gas-dev-release and gas-dev-bundle share users with gas-dev-config, and the tools have already drifted: gas-test runs clasp from `PATH` while gas-dev-ci runs the bundled one through `resolveClaspBin`.

## Decision

### Semver-covered surface

Changes to the following are breaking and require a major release:

- The `setup` and `deploy` commands, their flags and exit codes (0 success, 1 failure, 2 invalid usage, 130 cancelled prompt).
- The environment variables `CLASPRC_JSON`, `GAS_SCRIPT_ID` and `GAS_DEPLOYMENT_ID`.
- The reusable workflow's path, inputs, secret and `url` output.
- The `gasDevCi` key in `package.json` (`title`, `steps`).
- The `DeployError` export with its declarations in `types.d.ts`, and the `./package.json` export.

Not covered: clasp's output and the internal modules under `src/`.

### Fold into gas-dev-config 3.0

After 1.0, fold gas-dev-ci, gas-dev-release and gas-dev-bundle into gas-dev-config 3.0. The tools share users, and running clasp two ways (`PATH` versus `resolveClaspBin`) is drift that a single package removes. `@google/clasp` becomes an optional peer dependency, so libraries never install `googleapis` (209 MB). The fold is planned and run from the gas-dev-config repository.

## Alternatives considered

- Fold now: rejected. It would mix a stability commitment with a restructure, and force the install weight of clasp on every consumer before the optional peer is in place.

## Consequences

- Consumers can rely on the listed surface across 1.x.
- The fold must keep the covered surface working, or ship it as a major release with a migration section.
- Until the fold, the two clasp invocation styles remain.
