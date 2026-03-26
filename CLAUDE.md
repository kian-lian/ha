# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Build all packages/apps
pnpm build

# Dev all apps (web on :3000, docs on :3001)
pnpm dev

# Dev a single app
pnpm dev --filter=web
pnpm dev --filter=docs

# Lint all
pnpm lint

# Type check all
pnpm check-types

# Format code
pnpm format

# Build/lint/check a single package
pnpm build --filter=@mono/cli
pnpm lint --filter=@mono/ui
pnpm check-types --filter=web
```

## Architecture

Turborepo + pnpm monorepo. Workspace packages live in `apps/*` and `packages/*`.

### Apps (Next.js 16, React 19, ESM)
- **`apps/web`** — Main web app (port 3000)
- **`apps/docs`** — Docs app (port 3001)

Both apps use `@mono/ui` for shared components and `@mono/eslint-config` + `@mono/typescript-config` for tooling.

### Packages
- **`@mono/ui`** — Source-reference React component library (no build step). Exports via `"./*": "./src/*.tsx"` — consumers import as `@mono/ui/button`.
- **`@mono/cli`** — CLI tool (`mono-cli`), built with commander + prompts + zod. Has a `create` command that scaffolds projects from `templates/` directory. Build with `tsc` to `dist/`.
- **`@mono/eslint-config`** — Shared ESLint flat configs. Exports `./base`, `./next-js`, `./react-internal`.
- **`@mono/typescript-config`** — Shared tsconfig files (no build, just JSON exports).

### Key Patterns
- **Source-reference for `@mono/ui`**: No build step — apps import `.tsx` source directly. Changes are reflected immediately in dev.
- **Prettier**: Semi-colons disabled (`"semi": false`).
- **Package naming**: Workspace packages use `@mono/` scope.
- **Turbo task graph**: `build` and `lint` respect `dependsOn: ["^build"]` / `["^lint"]` for correct ordering. `dev` is persistent and uncached.
