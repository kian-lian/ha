import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { NEXT_CLI_PACKAGE_SPEC, scaffoldNextApp } from "./next.js"

test("scaffoldNextApp delegates to create-next-app and overlays Loom agent files", async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-next-template-"))
  const projectPath = path.join(tmpRoot, "acme-web")
  const calls: Array<{
    options: {
      packageManager?: string
      projectName: string
      yes?: boolean
    }
    repo: string
    targetDir: string
  }> = []

  try {
    const result = await scaffoldNextApp(
      {
        cwd: tmpRoot,
        packageManager: "pnpm",
        projectName: "acme-web",
        projectPath,
        yes: false,
      },
      {
        fetchTemplate: async (repo, targetDir, options) => {
          calls.push({ options, repo, targetDir })
          fs.mkdirSync(targetDir, { recursive: true })
          fs.writeFileSync(path.join(targetDir, "README.md"), "# official\n")
          fs.writeFileSync(
            path.join(targetDir, "package.json"),
            JSON.stringify({ name: options.projectName }, null, 2),
          )
          return { dependenciesInstalled: true }
        },
      },
    )

    assert.deepEqual(calls, [
      {
        options: {
          packageManager: "pnpm",
          projectName: "acme-web",
          yes: false,
        },
        repo: `next-cli:${NEXT_CLI_PACKAGE_SPEC}`,
        targetDir: projectPath,
      },
    ])
    assert.equal(result.dependenciesInstalled, true)
    assert.match(
      fs.readFileSync(path.join(projectPath, "AGENTS.md"), "utf-8"),
      /This is NOT the Next\.js you know/,
    )
    assert.equal(
      fs.readFileSync(path.join(projectPath, "CLAUDE.md"), "utf-8").trim(),
      "@AGENTS.md",
    )
    assert.equal(fs.readFileSync(path.join(projectPath, "README.md"), "utf-8"), "# official\n")
  } finally {
    fs.rmSync(tmpRoot, { force: true, recursive: true })
  }
})
