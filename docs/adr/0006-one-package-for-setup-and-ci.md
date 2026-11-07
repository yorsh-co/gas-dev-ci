# 6. One package for setup and CI

- Status: Accepted
- Date: 2026-11-07

## Context

gas-dev-deploy (the setup wizard) and gas-dev-ci (CI deployment) were separate packages with the same users: only web-app projects use either, and the first consumer installs both.

- Their docs and design are coupled: gas-dev-ci's setup step called gas-dev-deploy, and ADR 0003 cited gas-dev-deploy's ADR 0001. A change to one meant a change to the other.
- Code was duplicated and had already drifted: two clasp wrappers (the bundled `@google/clasp` here, `clasp` on `PATH` there, `list-deployments` vs the `deployments` alias), two `.clasp.example.json` readers and two identical error classes.
- Because the wizard spawned clasp from `PATH`, Windows was unsupported, and the clasp versions used for setup and CI could differ.
- The cost of folding is small: CI also installs `prompts`, which is small and has no dependencies, and setup installs clasp, which it already needed. It is a breaking change for the single consumer, which is cheap while both packages are 0.x.

## Decision

Fold the wizard into gas-dev-ci as `gas-dev-ci setup`, beside `gas-dev-ci deploy`.

- gas-dev-ci is kept as the repository and package name. The reusable workflow path is unchanged; callers move from `@v0.1` to `@v0.2` with the 0.2.0 release.
- The wizard runs the bundled `@google/clasp` through `resolveClaspBin()` (`process.execPath` plus the bin, no `PATH` lookup and no shell), so setup and CI use the same clasp version. The "clasp on `PATH`" requirement is gone.
- The canonical clasp command names are used: `list-deployments [scriptId]`, `create-script`, `show-authorized-user` and `open-script`.
- One error type, `DeployError`, replaces `CiError`, with `CancelledError` and `isDeployError` (matches by name). `DeployError` is the public API that custom steps throw, so it keeps its name.
- The clasp wrapper strips `clasp_config_auth` and `clasp_config_project` for both commands, so the wizard's `login` and `whoAmI` always use `~/.clasprc.json`, as CI does.
- `redact` in `createClasp` is optional (identity by default); only `deploy` passes one.
- The `package.json` key `gasDevDeploy` becomes `gasDevCi` (same keys: `title`, `steps`; unknown keys are still rejected), following the convention of naming the key after the package.
- The wizard lives under `src/setup/` so it does not collide with `src/deploy.js` and `src/cli.js`; the clasp wrapper and errors are shared at `src/`.
- `gas-dev-ci` exports `DeployError` with types from `types.d.ts`; `./package.json` is exported too.
- gas-dev-deploy's ADRs 0001 and 0002 are ported as ADRs 0004 and 0005.

## Consequences

- A project needs one dev dependency for its whole Apps Script deployment lifecycle.
- Breaking change for gas-dev-deploy users: swap the dependency, change the `deploy:setup` script, rename the `gasDevDeploy` key to `gasDevCi` and import `DeployError` from `gas-dev-ci`. The README has a migration section.
- CI installs `prompts` as a runtime dependency.
- gas-dev-deploy is deprecated and will be archived.
