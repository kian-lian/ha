import assert from "node:assert/strict"
import test from "node:test"
import { createCreateCommand } from "../create.js"

test("create command forwards the explicit package manager and prints npm run dev", async () => {
  const calls: unknown[] = []
  const output: string[] = []

  const command = createCreateCommand({
    createProject: async (options) => {
      calls.push(options)
      return {
        dependenciesInstalled: true,
        packageManager: "npm",
        projectName: "acme-web",
        projectPath: "/tmp/acme-web",
        template: "next",
      }
    },
    logger: {
      success(...args: unknown[]) {
        output.push(args.join(" "))
      },
      log(...args: unknown[]) {
        output.push(args.join(" "))
      },
      error(...args: unknown[]) {
        output.push(args.join(" "))
      },
    },
  })

  await command.parseAsync(
    ["acme-web", "--template", "next", "--yes", "--package-manager", "npm"],
    { from: "user" },
  )

  assert.deepEqual(calls, [
    {
      cwd: process.cwd(),
      name: "acme-web",
      packageManager: "npm",
      template: "next",
      yes: true,
    },
  ])
  assert.equal(output.includes("  npm run dev"), true)
  assert.equal(output.includes("  npm dev"), false)
})
