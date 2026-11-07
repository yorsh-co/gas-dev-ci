# 9. Moving major tag

- Status: Accepted
- Date: 2026-11-07

## Context

Before 1.0, callers pinned the moving minor tag (`@v0.2`) because minors could break. From 1.0, minor releases are non-breaking (ADR 0007), so callers no longer need to opt in to each minor.

## Decision

Each release is tagged `vX.Y.Z` and the moving major tag `vX` is advanced to it. Callers pin the workflow with `@vX` and the CLI with `#semver:^X.0.0`. The pre-1.0 `v0.N` tags stay as published.

## Alternatives considered

- Moving a minor tag (`v1.N`): forces every caller to bump the reference on each minor release, for no compatibility benefit.

## Consequences

- Callers receive every non-breaking 1.x release without editing their workflow.
- Creating `v1` for 1.0.0 is allowed, but moving it on each later 1.x release needs the gas-dev-config `tags` ruleset disabled temporarily, because it has no bypass actor.
