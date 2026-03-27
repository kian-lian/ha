import assert from "node:assert/strict"
import test from "node:test"
import { fetchTemplate } from "./template.js"

test("fetchTemplate delegates next-cli sources to the official Next.js CLI", async () => {
  const calls: unknown[] = []

  const result = await fetchTemplate(
    "next-cli:create-next-app@16.2.1",
    "/tmp/acme-web",
    {
      projectName: "acme-web",
      packageManager: "pnpm",
    },
    {
      delegateToNextCli: async (options) => {
        calls.push(options)
      },
    },
  )

  assert.deepEqual(calls, [
    {
      packageManager: "pnpm",
      packageSpec: "create-next-app@16.2.1",
      targetDir: "/tmp/acme-web",
    },
  ])
  assert.equal(result.dependenciesInstalled, true)
})
