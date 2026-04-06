import assert from "node:assert/strict"
import test from "node:test"
import type { CreateTurboAppOptions } from "../utils/official-cli.js"
import { scaffoldMonorepoApp } from "./monorepo.js"

test("scaffoldMonorepoApp delegates to the official Turborepo CLI", async () => {
  const calls: Array<{
    packageManager: string
    targetDir: string
    yes?: boolean
  }> = []

  const result = await scaffoldMonorepoApp(
    {
      cwd: "/tmp",
      packageManager: "pnpm",
      projectName: "acme-repo",
      projectPath: "/tmp/acme-repo",
      yes: true,
    },
    {
      delegateToTurboCli: async (options: CreateTurboAppOptions) => {
        calls.push(options)
      },
    },
  )

  assert.deepEqual(calls, [
    {
      packageManager: "pnpm",
      targetDir: "/tmp/acme-repo",
      yes: true,
    },
  ])
  assert.deepEqual(result, { dependenciesInstalled: true })
})
