import assert from "node:assert/strict"
import test from "node:test"
import { logger } from "./logger.js"
import {
  buildAddDependencyArgs,
  buildCreateNextAppArgs,
  buildCreateViteCommand,
  buildInstallArgs,
  type CommandRunner,
  delegateToNextCli,
  delegateToViteCli,
  installPackages,
} from "./official-cli.js"

test("buildCreateNextAppArgs builds a non-interactive create-next-app command in yes mode", () => {
  const args = buildCreateNextAppArgs({
    packageManager: "pnpm",
    packageSpec: "create-next-app@16.2.1",
    targetDir: "/tmp/acme-web",
    yes: true,
  })

  assert.deepEqual(args, [
    "create-next-app@16.2.1",
    "/tmp/acme-web",
    "--typescript",
    "--eslint",
    "--tailwind",
    "--app",
    "--no-src-dir",
    "--no-import-alias",
    "--use-pnpm",
    "--turbopack",
    "--skip-install",
    "--yes",
  ])
})

test("buildCreateNextAppArgs preserves official create-next-app prompts by default", () => {
  const args = buildCreateNextAppArgs({
    packageManager: "pnpm",
    packageSpec: "create-next-app@16.2.1",
    targetDir: "/tmp/acme-web",
    yes: false,
  })

  assert.deepEqual(args, [
    "create-next-app@16.2.1",
    "/tmp/acme-web",
    "--use-pnpm",
    "--skip-install",
  ])
})

test("buildCreateViteCommand preserves official create-vite prompts by default", () => {
  const invocation = buildCreateViteCommand({
    packageManager: "pnpm",
    targetDir: "/tmp/acme-web",
    yes: false,
  })

  assert.deepEqual(invocation, {
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    args: ["create", "vite", "/tmp/acme-web"],
  })
})

test("buildCreateViteCommand builds a non-interactive react-ts scaffold in yes mode", () => {
  const invocation = buildCreateViteCommand({
    packageManager: "npm",
    targetDir: "/tmp/acme-web",
    yes: true,
  })

  assert.deepEqual(invocation, {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: [
      "create",
      "vite@latest",
      "/tmp/acme-web",
      "--",
      "--template",
      "react-ts",
      "--no-interactive",
    ],
  })
})

test("buildInstallArgs isolates pnpm installs from the parent workspace", () => {
  assert.deepEqual(buildInstallArgs("pnpm"), ["install", "--ignore-workspace"])
  assert.deepEqual(buildInstallArgs("npm"), ["install"])
})

test("buildAddDependencyArgs builds package-manager specific add commands", () => {
  assert.deepEqual(buildAddDependencyArgs("pnpm", ["react-use"]), [
    "add",
    "react-use",
  ])
  assert.deepEqual(
    buildAddDependencyArgs("npm", ["@types/react"], { dev: true }),
    ["install", "--save-dev", "@types/react"],
  )
  assert.deepEqual(
    buildAddDependencyArgs("yarn", ["clsx", "tailwind-merge"]),
    ["add", "clsx", "tailwind-merge"],
  )
})

test("installPackages skips empty package lists", async () => {
  const calls: unknown[] = []

  await installPackages(
    "/tmp/acme-web",
    "pnpm",
    [],
    undefined,
    async (...args: Parameters<CommandRunner>) => {
      calls.push(args)
    },
  )

  assert.deepEqual(calls, [])
})

test("installPackages installs dependencies in the target dir", async () => {
  const calls: Array<{
    command: string
    args: string[]
    options?: {
      cwd?: string
    }
  }> = []

  await installPackages(
    "/tmp/acme-web",
    "pnpm",
    ["react-use", "zustand"],
    { dev: false },
    async (
      command: string,
      args: string[],
      options?: {
        cwd?: string
      },
    ) => {
      calls.push({ command, args, options })
    },
  )

  assert.deepEqual(calls, [
    {
      command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
      args: ["add", "react-use", "zustand"],
      options: { cwd: "/tmp/acme-web" },
    },
  ])
})

test("delegateToNextCli scaffolds first and then installs dependencies in the target dir", async () => {
  const calls: Array<{
    command: string
    args: string[]
    options?: {
      cwd?: string
    }
  }> = []

  await delegateToNextCli(
    {
      packageManager: "pnpm",
      packageSpec: "create-next-app@16.2.1",
      targetDir: "/tmp/acme-web",
      yes: true,
    },
    async (command, args, options) => {
      calls.push({ command, args, options })
    },
  )

  assert.equal(calls.length, 2)
  assert.deepEqual(calls[0], {
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    args: [
      "create-next-app@16.2.1",
      "/tmp/acme-web",
      "--typescript",
      "--eslint",
      "--tailwind",
      "--app",
      "--no-src-dir",
      "--no-import-alias",
      "--use-pnpm",
      "--turbopack",
      "--skip-install",
      "--yes",
    ],
    options: undefined,
  })
  assert.deepEqual(calls[1], {
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    args: ["install", "--ignore-workspace"],
    options: { cwd: "/tmp/acme-web" },
  })
})

test("delegateToViteCli scaffolds first and then installs dependencies in the target dir", async () => {
  const calls: Array<{
    command: string
    args: string[]
    options?: {
      cwd?: string
    }
  }> = []

  await delegateToViteCli(
    {
      packageManager: "pnpm",
      targetDir: "/tmp/acme-web",
      yes: true,
    },
    async (
      command: string,
      args: string[],
      options?: {
        cwd?: string
      },
    ) => {
      calls.push({ command, args, options })
    },
  )

  assert.equal(calls.length, 2)
  assert.deepEqual(calls[0], {
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    args: [
      "create",
      "vite",
      "/tmp/acme-web",
      "--template",
      "react-ts",
      "--no-interactive",
    ],
    options: undefined,
  })
  assert.deepEqual(calls[1], {
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    args: ["install", "--ignore-workspace"],
    options: { cwd: "/tmp/acme-web" },
  })
})

test("delegateToNextCli does not print the delegation banner", async () => {
  const infoMessages: string[] = []
  const originalInfo = logger.info

  logger.info = (...args: unknown[]) => {
    infoMessages.push(args.join(" "))
  }

  try {
    await delegateToNextCli(
      {
        packageManager: "pnpm",
        packageSpec: "create-next-app@16.2.1",
        targetDir: "/tmp/acme-web",
        yes: false,
      },
      async () => {},
    )
  } finally {
    logger.info = originalInfo
  }

  assert.equal(
    infoMessages.includes("Delegating project creation to the Next.js CLI..."),
    false,
  )
})
