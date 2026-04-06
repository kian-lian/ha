# Monorepo Template Design

## Summary

Add a new top-level `monorepo` template to `@loom/cli create` so users can scaffold a Turborepo project through the official `create-turbo` CLI. The new template should sit alongside the existing `next` and `vite` templates, reuse the current official-CLI delegation pattern, and keep the current default template behavior unchanged.

## Goals

- Add `monorepo` as a first-class template option in `loom-cli create`
- Delegate scaffolding to the official `create-turbo` CLI
- Preserve Loom's current package-manager handling and dependency installation flow
- Keep the current `next` default template for `--yes` mode and existing users
- Minimize framework-specific logic inside Loom by treating Turborepo as another official CLI integration

## Non-Goals

- Supporting `create-turbo` examples or advanced variants
- Introducing nested template categories or a template-variant system
- Overlaying Loom-specific files into generated monorepos
- Changing the current default template from `next` to `monorepo`
- Refactoring the existing template architecture beyond what is needed for this integration

## User Experience

### Interactive mode

When the user runs `loom-cli create` without `--template`, the template selector will show:

- `Next.js App`
- `Vite`
- `Monorepo`

If the user selects `Monorepo`, Loom will ask for the project name using the new template's default name, then delegate to the official `create-turbo` scaffold flow.

### Non-interactive mode

Users can run:

```bash
loom-cli create acme-repo --template monorepo --package-manager pnpm --yes
```

This should scaffold the default official Turborepo starter without extra prompts.

### Dependency installation

Loom should keep the same lifecycle used by its other official CLI integrations:

1. Run the framework's official scaffold command with `--skip-install`
2. Install dependencies itself in the generated target directory

This keeps installation behavior consistent across templates and preserves Loom's package-manager selection flow.

## Design

### Template registration

Add a new template definition:

- `name`: `monorepo`
- `title`: `Monorepo`
- `description`: `Turborepo starter`
- `defaultProjectName`: `my-turborepo`

Register it in `packages/cli/src/templates/index.ts` alongside `next` and `vite`.

No changes are required to the current top-level `createProject()` flow because it already supports additional flat template entries.

### Template implementation

Create a new template module at `packages/cli/src/templates/monorepo.ts`.

Its scaffold function will:

- accept the existing `TemplateScaffoldOptions`
- call a new `delegateToTurboCli()` helper
- forward `packageManager`, `projectPath`, and `yes`
- return `{ dependenciesInstalled: true }`

This mirrors the current Vite template structure and keeps template files thin.

### Official CLI integration

Add a new official CLI adapter for Turborepo under `packages/cli/src/utils/official-cli/`.

It should expose:

- `buildCreateTurboArgs(options)`
- `delegateToTurboCli(options, commandRunner?)`

The new helper should use the same shared `scaffoldWithOfficialCli()` path used by the other official CLI integrations.

### Command construction

The official scaffold command should delegate to `create-turbo@latest`.

Expected behavior by mode:

- Interactive mode: preserve official CLI prompts as much as possible
- `--yes` mode: pass enough explicit inputs for the current official CLI to create the default starter without Loom adding more prompts

The command should always include:

- the target directory
- the selected package manager
- `--skip-install`

For package-manager execution, follow the official Turborepo launch style for the selected package manager:

- `npm`: `npx create-turbo@latest`
- `pnpm`: `pnpm dlx create-turbo@latest`
- `yarn`: `yarn dlx create-turbo@latest`
- `bun`: `bunx create-turbo@latest`

The adapter should also pass Turborepo's `-m/--package-manager` option so the generated workspace uses the same package manager selected in Loom.

### File overlay policy

Do not overlay Loom-specific files such as `AGENTS.md` or `CLAUDE.md` into generated monorepo projects.

Reasoning:

- the user explicitly requested official scaffolding delegation
- the smallest change is the lowest-risk option
- adding Loom-specific overlays would create an extra policy decision that is outside this request

### Default behavior preservation

Do not change:

- `DEFAULT_TEMPLATE`
- current `next` and `vite` behavior
- template selection structure

This feature is additive only.

## Error Handling

The new Turborepo path should rely on the same command-runner error surface as the existing official CLI integrations.

Expected failure modes:

- official CLI command exits non-zero
- dependency installation fails after scaffold
- invalid template name is passed from the command line

No Turborepo-specific error translation is required in this change. Existing command execution errors are sufficient.

## Testing

Add or update tests for the following:

### Official CLI adapter tests

- `buildCreateTurboArgs()` returns the expected command arguments in interactive mode
- `buildCreateTurboArgs()` returns the expected command arguments in `--yes` mode
- package-manager selection is forwarded correctly

### Template tests

- `scaffoldMonorepoApp()` delegates to the official Turborepo CLI helper with the expected options

### Create flow tests

- `createProject()` supports selecting the `monorepo` template in interactive mode
- `create` command forwards `--template monorepo`

### Regression coverage

- existing `next` default-template behavior remains unchanged
- existing `next` and `vite` tests continue to pass

## Implementation Notes

- Reuse the existing `CreateViteAppOptions` pattern by introducing a dedicated `CreateTurboAppOptions` type in the official CLI type definitions if needed
- Export the new helper from `packages/cli/src/utils/official-cli/index.ts`
- Keep the implementation narrow; this is not the right time to generalize official CLI integrations into a larger abstraction unless the Turborepo path forces a missing primitive

## Risks

### Upstream CLI argument drift

`create-turbo` may evolve its arguments over time. Tests should assert the current contract Loom relies on so future updates fail loudly.

### Package-manager compatibility differences

Turborepo's official scaffolder may not mirror `create-vite` exactly in how it expects package-manager invocation. This is acceptable as long as the adapter is explicit and covered by tests.

### Workspace install behavior

Skipping install during scaffold and performing install in the target directory is intentional. This avoids accidental workspace-root installs when Loom is run inside an existing monorepo.

## Rollout

This can ship as a single additive change:

1. Add the official Turborepo CLI adapter
2. Add the `monorepo` template
3. Add tests for adapter, template, and create flow
4. Verify `@loom/cli` build and test pass
