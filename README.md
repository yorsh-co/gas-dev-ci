# gas-dev-ci

## Setup and CI deployment for Google Apps Script projects: a guided `gas-dev-ci setup` wizard, a reusable GitHub Actions workflow and a `gas-dev-ci deploy` CLI that push with clasp and redeploy web apps.

> [!CAUTION]
> Deprecated: folded into [gasdev](https://github.com/yorsh-co/gasdev) as `gasdev setup`, `gasdev deploy` and the reusable `gas-deploy` workflow. See [Migrating to 3.0](https://github.com/yorsh-co/gasdev#migrating-to-30). This repository is archived.

> [!NOTE]
> `gas-dev-ci` is development tooling. It is installed as a dev dependency and is never pushed to Apps Script.

> [!TIP]
> One of the gas-dev-\* tools. See [how they fit together](https://github.com/yorsh-co/gas-dev-config#gas-dev-tools) in gas-dev-config's README.

> **Disclaimer:**
> This project and [Yorsh](https://github.com/yorsh-co) are independent and are not affiliated with, endorsed by, or associated with Google LLC.

### Features

- One dependency for the whole lifecycle: `gas-dev-ci setup` for the guided first-time setup and web app deployment, `gas-dev-ci deploy` for CI
- Both commands run the same bundled [clasp](https://github.com/google/clasp), so no global clasp is needed and versions never differ between setup and CI
- One reusable workflow for any gas-\* project: check, build, push and, for web apps, redeploy
- Pushes with [clasp](https://github.com/google/clasp), so `rootDir`, `filePushOrder` and `.claspignore` behave as locally
- Fails before pushing when the OAuth scopes changed, so HEAD never gets scopes the owner has not consented to
- Only `CLASPRC_JSON` is a secret, and it is exposed to the deploy step alone; secret values are masked in the logs
- One deployment at a time per environment, with a 15-minute job timeout

## Requirements

- Node.js `^22.13.0`, `^24.0.0` or `>=26.0.0`
- A project with `npm run check` and `npm run build` scripts (or custom commands, see [Workflow inputs](#workflow-inputs-and-outputs)) and a built `<rootDir>/appsscript.json`
- A GitHub environment per target, with the secret and variables below
- The Apps Script API enabled at https://script.google.com/home/usersettings

## Install

Add the CLI as a dev dependency. The workflow runs it with `npx --no-install`, so a missing dependency fails instead of fetching an unrelated package:

```sh
npm install -D github:yorsh-co/gas-dev-ci#semver:^1.0.0
```

Add a script to `package.json` for the setup wizard:

```json
{
  "scripts": {
    "deploy:setup": "gas-dev-ci setup"
  }
}
```

The workflow is referenced by the moving major tag (`@v1`), and the CLI by a semver range (`#semver:^1.0.0`). Both resolve to the latest 1.x release, but they are fetched separately: the workflow definition by GitHub when the job starts, the CLI by `npm ci` from your lockfile.

## Setup

Steps 1-4 are done once per repository, steps 5-8 once per environment (`dev`, `live`), and steps 9-10 once.

#### 1. Enable the Apps Script API

Enable the [Apps Script API](https://script.google.com/home/usersettings) for the Google account that owns the scripts, ideally a dedicated account.

#### 2. Install the CLI

See [Install](#install).

#### 3. Commit `.clasp.example.json`

Commit `.clasp.example.json` at the project root. It is the base of `.clasp.json`, without `scriptId`. The optional `rootDir` (relative, no `..`) is where the build writes `appsscript.json`:

```json
{ "rootDir": "dist" }
```

Add `.clasp.json` to `.gitignore`: the CLI overwrites it from the template plus `GAS_SCRIPT_ID`.

#### 4. Provide `check` and `build`

Define `npm run check` and `npm run build` scripts, or override them with the [workflow inputs](#workflow-inputs-and-outputs). The build must produce `<rootDir>/appsscript.json`. Web apps declare `oauthScopes` explicitly; see [Scope changes](#scope-changes).

#### 5. Create the Apps Script project and web app deployment

For web apps, run `npm run deploy:setup` (the [setup wizard](#setup-wizard) of this package) and read `GAS_SCRIPT_ID` and `GAS_DEPLOYMENT_ID` from `.env`. Manually: copy the Script ID from Project Settings, then Deploy > New deployment > Web app, and copy the deployment ID (versioned, not HEAD). CI never creates the first deployment, because it requires an interactive consent prompt; this applies to both `npm run deploy:setup` and the editor path. `deploy:setup` writes the IDs to `.env` and has no per-environment option, so record them before running it again for the next environment.

Libraries and bound scripts need only the script ID; see [Project types](#project-types). Use a separate script per environment.

#### 6. Create the GitHub environment restricted to its branch

Example for `dev` and `develop`; repeat for `live` and `main`. The deployment branch policy releases `CLASPRC_JSON` only to runs on that branch:

```sh
gh api -X PUT repos/{owner}/{repo}/environments/dev \
  -F 'deployment_branch_policy[protected_branches]=false' \
  -F 'deployment_branch_policy[custom_branch_policies]=true'
gh api -X POST repos/{owner}/{repo}/environments/dev/deployment-branch-policies \
  -f name=develop
```

Alternatively, in the UI: Settings > Environments > New environment > Deployment branches and tags > Selected branches.

#### 7. Set the variables

```sh
gh variable set GAS_SCRIPT_ID --env dev --body <script-id>
gh variable set GAS_DEPLOYMENT_ID --env dev --body <deployment-id>
```

`GAS_DEPLOYMENT_ID` is for web apps only. These are variables, not secrets; see [Environments](#environments).

#### 8. Store `CLASPRC_JSON`

Run `npx clasp login` (or `npm run deploy:setup`, which logs in) on a trusted machine, ideally with a dedicated Google account that owns the scripts. Then store the credentials in the environment; repeat for `live`:

```sh
gh secret set CLASPRC_JSON --env dev < ~/.clasprc.json
```

See [Token expiry, revocation and rotation](#token-expiry-revocation-and-rotation).

#### 9. Add the caller workflow

Add the workflow from [Usage](#usage) at `.github/workflows/deploy.yml`.

#### 10. Verify the first run

Push to `develop`, then merge to `main` and confirm the `live` run. The job summary and the `url` output show the web app URL; a push-only project shows no URL. On a scope-change failure, follow [Scope changes](#scope-changes). On `invalid_grant`, follow [token rotation](#token-expiry-revocation-and-rotation).

## Setup wizard

Run it from the project root:

```sh
npm run deploy:setup
```

The wizard runs these steps in order:

1. **Authentication:** continue as the logged-in clasp user, or log in with another account.
2. **Apps Script project:** reuse the project in `.clasp.json`, or create a new one.
3. **Configuration:** write `.clasp.json` and the manifest, asking for the time zone.
4. **Push:** `clasp push --force`.
5. **Deployment:** open the script editor, wait while you deploy the web app, then read the deployment and confirm its URL.
6. **Summary:** script ID, web app URL, deployment ID and version.

Exit codes: `0` success, `1` failed deployment, `2` invalid usage, `130` cancelled.

### Configuration

Two templates are required at the project root:

- `.clasp.example.json`: the base of `.clasp.json`. Its optional `rootDir` (default `.`) is where the manifest is written.
- `appsscript.example.json`: the base of the manifest.

Options live in `package.json` under `gasDevCi`:

| Key     | Type   | Default                 | Description                        |
| ------- | ------ | ----------------------- | ---------------------------------- |
| `title` | string | `package.json` `"name"` | Title of a new Apps Script project |
| `steps` | string | none                    | Module with project-defined steps  |

Unknown keys are rejected.

### Custom steps

Set `gasDevCi.steps` to a project-relative path to an ES module (`.js` or `.mjs`, no `..` segments). Its default export is an array of steps, run in order after the deployment and before the summary:

```json
{ "gasDevCi": { "steps": "scripts/deploy-steps.js" } }
```

The module is loaded before login, so a broken module fails before anything touches Apps Script. Each step is `{ title, run(ctx) }`, where `title` is a non-empty string and `run` is a function that may be async. Throw `DeployError` (exported by `gas-dev-ci`) to fail cleanly; any other error is reported as `Step "<title>" failed: <message>`. An error thrown from a prompt question's `validate`, `format` or `onSubmit` callback is reported by `prompts` as a cancel (`Cancelled.`, exit 130), so validate inputs in `run` when the message matters.

`ctx` has:

| Property             | Description                                                                        |
| -------------------- | ---------------------------------------------------------------------------------- |
| `cwd`                | Project root                                                                       |
| `pkg`                | Parsed `package.json`                                                              |
| `deployment`         | `{ scriptId, webappUrl, deploymentId, version }`                                   |
| `env.read()`         | Parsed `.env`, empty when the file does not exist                                  |
| `env.update(values)` | Sets keys in `.env` in place, keeping comments; values must not contain newlines   |
| `prompt(questions)`  | [`prompts`](https://github.com/terkelg/prompts) questions; resolves to the answers |
| `log`                | `info`, `success`, `warn`, `error`, `raw` and `section`                            |
| `openScript()`       | Opens the script in the Apps Script editor                                         |

Types ship with the package. Steps run with your user privileges, so only point `steps` at code you trust. See [ADR 0005](docs/adr/0005-project-defined-steps.md).

#### Example: Calendly OAuth credentials

A step that asks for a Calendly OAuth client ID and secret, stores them in `.env`, prints the Script Property to save and opens the editor:

```js
// scripts/deploy-steps.js
import { DeployError } from 'gas-dev-ci';

/** @type {import('gas-dev-ci').DeployStep[]} */
export default [
  {
    title: 'Calendly OAuth setup',
    async run(ctx) {
      const stored = ctx.env.read();
      let clientId = stored.CALENDLY_CLIENT_ID;
      let clientSecret = stored.CALENDLY_CLIENT_SECRET;

      let provide = true;
      if (clientId && clientSecret) {
        ctx.log.warn('Existing Calendly OAuth credentials detected');
        ({ provide } = await ctx.prompt({
          type: 'confirm',
          name: 'provide',
          message: 'Provide new credentials?',
          initial: true,
        }));
      }

      if (provide) {
        ({ clientId, clientSecret } = await ctx.prompt([
          { type: 'text', name: 'clientId', message: 'OAuth Client ID' },
          {
            type: 'password',
            name: 'clientSecret',
            message: 'OAuth Client Secret',
          },
        ]));
        if (!clientId || !clientSecret) {
          throw new DeployError('Client ID and secret are required');
        }
        ctx.env.update({
          CALENDLY_CLIENT_ID: clientId,
          CALENDLY_CLIENT_SECRET: clientSecret,
        });
      }

      const credentials = {
        clientId,
        clientSecret,
        redirectUri: ctx.deployment.webappUrl,
      };
      ctx.log.info('Save this JSON as a Script Property:');
      ctx.log.raw(JSON.stringify(credentials, null, 2));

      ctx.openScript();
      await ctx.prompt({
        type: 'text',
        name: 'done',
        message: 'After saving the Script Property, press ENTER to continue',
      });
    },
  },
];
```

### Files written

- `.clasp.json`: the template plus `scriptId`. It is always regenerated, never merged with an older file.
- `<rootDir>/appsscript.json`: the existing manifest, then the template, with the chosen `timeZone`. The default time zone is the template's, then the existing manifest's, then the system's, then `Etc/UTC`.
- `.env`: updated in place with the variables below, and created with mode `0600`.

### Environment variables

| Variable            | Value                                          |
| ------------------- | ---------------------------------------------- |
| `GAS_SCRIPT_ID`     | Apps Script project ID                         |
| `GAS_WEBAPP_URL`    | `https://script.google.com/macros/s/<id>/exec` |
| `GAS_DEPLOYMENT_ID` | Deployment ID of the web app                   |
| `GAS_VERSION`       | Deployed version number                        |

### Why deployment is manual

Deploying from the Apps Script editor triggers the OAuth consent prompt for the manifest's scopes without a Google Cloud OAuth client, which `clasp deploy` followed by `clasp run` would need. See [ADR 0004](docs/adr/0004-manual-web-app-deployment.md).

### Migrating from gas-dev-deploy

gas-dev-deploy is deprecated and folded into this package.

1. Run `npm uninstall gas-dev-deploy`, then `npm install -D github:yorsh-co/gas-dev-ci#semver:^1.0.0`.
2. Change the script to `"deploy:setup": "gas-dev-ci setup"`.
3. Rename the `gasDevDeploy` key in `package.json` to `gasDevCi` (same contents).
4. In custom steps, import `DeployError` from `gas-dev-ci` instead of `gas-dev-deploy`.
5. Change `@v0.1` to `@v1` in the caller workflow.

The wizard now runs the bundled clasp, so a global clasp is no longer needed.

## Usage

```yaml
on:
  push:
    branches: [develop, main]
jobs:
  deploy:
    uses: yorsh-co/gas-dev-ci/.github/workflows/gas-deploy.yml@v1
    with:
      environment: ${{ github.ref_name == 'main' && 'live' || 'dev' }}
    secrets: inherit
```

`develop` deploys to the `dev` environment and `main` to `live`. `secrets: inherit` is enough: the secret is resolved from the environment the job runs in.

### Environments

| Environment | Branch    | Secret         | Variables                            |
| ----------- | --------- | -------------- | ------------------------------------ |
| `dev`       | `develop` | `CLASPRC_JSON` | `GAS_SCRIPT_ID`, `GAS_DEPLOYMENT_ID` |
| `live`      | `main`    | `CLASPRC_JSON` | `GAS_SCRIPT_ID`, `GAS_DEPLOYMENT_ID` |

The IDs are variables, not secrets, on purpose: GitHub drops job outputs that contain a secret value, and the web app URL contains the deployment ID. They identify the project but grant no access. Both may contain only letters, digits, `_` and `-`.

### Project types

| Project               | `GAS_DEPLOYMENT_ID` | Result                                   |
| --------------------- | ------------------- | ---------------------------------------- |
| Web app               | set                 | Scope check, push, new version, redeploy |
| Library, bound script | not set             | Push only                                |

`GAS_DEPLOYMENT_ID` must be a versioned web app deployment, not the HEAD deployment.

### Workflow inputs and outputs

| Input          | Default         | Description                                      |
| -------------- | --------------- | ------------------------------------------------ |
| `environment`  | required        | GitHub environment with the secret and variables |
| `node-version` | `22`            | Node.js version                                  |
| `check`        | `npm run check` | Lint, type check and tests                       |
| `build`        | `npm run build` | Builds the project into its `rootDir`            |

| Output | Description                                                         |
| ------ | ------------------------------------------------------------------- |
| `url`  | Web app URL of the redeployed version; empty for a push-only deploy |

The `check` and `build` steps run project code and never see `CLASPRC_JSON`.

## Token expiry, revocation and rotation

A refresh token stops working when the user revokes access, after 6 months without use, on some password changes, and when the per-client token limit evicts old tokens. The symptom is `clasp push` failing with `invalid_grant`.

To rotate: run `npx clasp login`, update the secret in every environment, then revoke the old grant in the Google Account's security settings.

## Scope changes

If the OAuth scopes in the built `appsscript.json` differ from those of the deployed version, the workflow fails before pushing and lists the added and removed scopes. To fix it:

1. Build locally and run `clasp push`.
2. In the Apps Script editor, go to Deploy > Manage deployments, edit the web app deployment, choose New version and authorize.
3. Re-run the workflow.

The check compares only the explicit `oauthScopes` in `appsscript.json`. A project that relies on automatic scope detection (no `oauthScopes` key) always passes the check, so web-app projects should declare `oauthScopes` explicitly.

## Versioning

gas-dev-ci follows semver. The covered surface (commands, environment variables, workflow inputs and outputs, the `gasDevCi` key and the `DeployError` export) and the planned fold into gas-dev-config 3.0 are recorded in [ADR 0007](docs/adr/0007-public-api-and-fold-path.md).

Releases are tagged `vX.Y.Z` and the moving major tag `vX` is advanced to the latest one; see [ADR 0009](docs/adr/0009-moving-major-tag.md).

### Upgrading from 0.2

1. Change `@v0.2` to `@v1` in the caller workflow.
2. Run `npm install -D github:yorsh-co/gas-dev-ci#semver:^1.0.0`.
3. The `deploy` export is removed; run `gas-dev-ci deploy` instead.

## CLI reference

```sh
gas-dev-ci setup
gas-dev-ci deploy
```

`setup` takes no arguments; see [Setup wizard](#setup-wizard). The rest of this section covers `deploy`.

| Variable              | Required             | Description                                                                                                                        |
| --------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `CLASPRC_JSON`        | yes                  | Contents of `~/.clasprc.json`. Written to a private temporary file (mode 600), removed afterwards (in `RUNNER_TEMP` under Actions) |
| `GAS_SCRIPT_ID`       | yes                  | Script ID, written to `.clasp.json` (overwritten if present)                                                                       |
| `GAS_DEPLOYMENT_ID`   | no                   | Web app deployment to redeploy                                                                                                     |
| `GITHUB_SHA`          | with a deployment ID | Description of the new version and deployment                                                                                      |
| `GITHUB_OUTPUT`       | no                   | File that receives the `url` output                                                                                                |
| `GITHUB_STEP_SUMMARY` | no                   | File that receives the job summary                                                                                                 |

`.clasp.json` is rendered from `.clasp.example.json` plus the script ID (`rootDir` must be absent or a relative path without `..`). Under `GITHUB_ACTIONS=true` every string of `CLASPRC_JSON` with 8 or more characters is masked in the logs.

| Exit code | Meaning                                                                       |
| --------- | ----------------------------------------------------------------------------- |
| 0         | Deployed, or help or version printed                                          |
| 1         | Deployment failed: invalid inputs, scope change, missing build or clasp error |
| 2         | Invalid usage                                                                 |
