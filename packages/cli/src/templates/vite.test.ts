import assert from "node:assert/strict"
import test from "node:test"
import type { CreateViteAppOptions } from "../utils/official-cli.js"
import { scaffoldViteApp } from "./vite.js"

test("scaffoldViteApp delegates to the official Vite CLI", async () => {
  const calls: Array<{
    packageManager: string
    targetDir: string
    yes?: boolean
  }> = []

  const result = await scaffoldViteApp(
    {
      cwd: "/tmp",
      packageManager: "pnpm",
      projectName: "acme-web",
      projectPath: "/tmp/acme-web",
      yes: false,
    },
    {
      delegateToViteCli: async (options: CreateViteAppOptions) => {
        calls.push(options)
        return
      },
    },
  )

  assert.deepEqual(calls, [
    {
      packageManager: "pnpm",
      targetDir: "/tmp/acme-web",
      yes: false,
    },
  ])
  assert.deepEqual(result, { dependenciesInstalled: true })
})
