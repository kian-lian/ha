import assert from "node:assert/strict"
import test from "node:test"
import {
  buildCreateNextAppArgs,
  buildInstallArgs,
  delegateToNextCli,
} from "./official-cli.js"

test("buildCreateNextAppArgs builds a non-interactive create-next-app command", () => {
  const args = buildCreateNextAppArgs({
    packageManager: "pnpm",
    packageSpec: "create-next-app@16.2.1",
    targetDir: "/tmp/acme-web",
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

test("buildInstallArgs isolates pnpm installs from the parent workspace", () => {
  assert.deepEqual(buildInstallArgs("pnpm"), ["install", "--ignore-workspace"])
  assert.deepEqual(buildInstallArgs("npm"), ["install"])
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
