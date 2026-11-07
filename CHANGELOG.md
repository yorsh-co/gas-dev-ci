# Changelog

---

## [Unreleased]

### Added

- `test:coverage` script with enforced coverage floors.
- Contract test against the bundled clasp CLI.
- Package surface test.
- ADR 0007 documenting the semver-covered public API and the fold path into gas-dev-config 3.0.
- ADR 0008 security model.
- ADR 0009 documenting the moving major tag.

### Changed

- Callers move to `@v1` (reusable workflow) and `#semver:^1.0.0` (dependency).
- README documents upgrading from 0.2.
- `deploy()` and the CLI `main()` context no longer take `home`.
- The reusable workflow passes the `check` and `build` inputs through env vars instead of interpolating them into `run:`.
- `writeOutput` rejects line breaks in step output names and values.

### Removed

- **Breaking:** the `deploy` export from the package entry; use the `gas-dev-ci deploy` command.

### Fixed

- Redeploy uses clasp's canonical `create-deployment` command instead of the `deploy` alias (ADR 0006).
- clasp's child environment no longer receives `CLASPRC_JSON` or any `clasp_config_*` override, matched case-insensitively.
- Credentials are written to a private temporary file passed with `-A` and removed after the run (also on failure); `~/.clasprc.json` is no longer written or overwritten.
- Under GitHub Actions the credentials file is created in `RUNNER_TEMP`, so the runner removes it even when the step is cancelled.

---

## [0.2.0] - 2026-11-07

### Added

- `gas-dev-ci setup` command: the first-time setup wizard folded in from gas-dev-deploy 0.1.0, with bundled clasp, the `gasDevCi` config key in `package.json` and custom steps.
- `DeployError` and type declarations export, and a package `exports` map.
- ADRs 0004-0006 documenting the setup fold.

### Changed

- **Breaking:** rename `CiError` to `DeployError`.
- The clasp wrapper uses the canonical clasp command names.
- `prompts` is now a runtime dependency.
- README documents the setup wizard and migration from gas-dev-deploy.
- Callers move to `@v0.2` (reusable workflow) and `#semver:^0.2.0` (dependency).

### Removed

- **Breaking:** the `CiError` export; use `DeployError` instead.

---

## [0.1.1] - 2026-11-07

### Added

- Step-by-step setup guide in the README.

### Changed

- Fold the "Creating `CLASPRC_JSON`" section into Setup step 8.

### Fixed

- Override `gaxios` to `^7.3.1` per gas-dev-config ADR 0005, removing the vulnerable `rimraf` 5 / `glob` 10 chain.

---

## [0.1.0] - 2026-11-06

### Added

- `gas-dev-ci deploy` CLI: push via clasp, redeploy of a configured web-app deployment, `url` output and job summary.
- Pre-push OAuth scope check against the deployed version.
- Secret masking and redaction of clasp output; credentials written with mode 0600.
- Reusable `gas-deploy.yml` workflow.
- README and ADRs 0001–0003.

---
