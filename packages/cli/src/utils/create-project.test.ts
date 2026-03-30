import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { createProject } from "./create-project.js"
import { createTemplate } from "../templates/create-template.js"

test("createProject uses explicit template and project name without prompts", async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-create-project-"))
  const calls: Array<{
    cwd: string
    packageManager: string
    projectName: string
    projectPath: string
  }> = []

  const registry = {
    stub: createTemplate({
      name: "stub",
      title: "Stub",
      description: "Stub template",
      defaultProjectName: "stub-app",
      repo: "local:stub",
      scaffold: async (options) => {
        calls.push(options)
        return { dependenciesInstalled: false }
      },
    }),
  }

  try {
    const result = await createProject(
      {
        cwd: tmpRoot,
        name: "acme-web",
        packageManager: "npm",
        template: "stub",
        yes: true,
      },
      { templateRegistry: registry },
    )

    assert.equal(result.projectName, "acme-web")
    assert.equal(result.template, "stub")
    assert.equal(result.packageManager, "npm")
    assert.equal(result.projectPath, path.resolve(tmpRoot, "acme-web"))
    assert.deepEqual(calls, [
      {
        cwd: tmpRoot,
        packageManager: "npm",
        projectName: "acme-web",
        projectPath: path.resolve(tmpRoot, "acme-web"),
      },
    ])
  } finally {
    fs.rmSync(tmpRoot, { force: true, recursive: true })
  }
})

test("createProject uses default template defaults in yes mode", async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-create-project-"))
  const calls: Array<{
    projectName: string
    projectPath: string
  }> = []

  const registry = {
    next: createTemplate({
      name: "next",
      title: "Next",
      description: "Next template",
      defaultProjectName: "next-app",
      repo: "local:next",
      scaffold: async (options) => {
        calls.push({
          projectName: options.projectName,
          projectPath: options.projectPath,
        })
        return { dependenciesInstalled: true }
      },
    }),
  }

  try {
    const result = await createProject(
      {
        cwd: tmpRoot,
        packageManager: "pnpm",
        yes: true,
      },
      { templateRegistry: registry },
    )

    assert.equal(result.projectName, "next-app")
    assert.equal(result.template, "next")
    assert.equal(result.dependenciesInstalled, true)
    assert.deepEqual(calls, [
      {
        projectName: "next-app",
        projectPath: path.resolve(tmpRoot, "next-app"),
      },
    ])
  } finally {
    fs.rmSync(tmpRoot, { force: true, recursive: true })
  }
})

test("createProject rejects unknown templates", async () => {
  await assert.rejects(
    () =>
      createProject({
        cwd: "/tmp",
        name: "acme-web",
        template: "missing",
        yes: true,
      }),
    /未知模板: missing/,
  )
})

test("createProject writes loom.json for scaffolded React TypeScript projects", async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-create-project-"))
  const projectPath = path.join(tmpRoot, "acme-web")

  const registry = {
    next: createTemplate({
      name: "next",
      title: "Next",
      description: "Next template",
      defaultProjectName: "next-app",
      repo: "local:next",
      scaffold: async (options) => {
        fs.mkdirSync(options.projectPath, { recursive: true })
        fs.writeFileSync(
          path.join(options.projectPath, "package.json"),
          JSON.stringify(
            {
              name: options.projectName,
              private: true,
              dependencies: {
                react: "^19.0.0",
                "react-dom": "^19.0.0",
              },
            },
            null,
            2,
          ),
        )
        fs.writeFileSync(
          path.join(options.projectPath, "tsconfig.json"),
          JSON.stringify(
            {
              compilerOptions: {
                paths: {
                  "@/*": ["./*"],
                },
              },
            },
            null,
            2,
          ),
        )

        return { dependenciesInstalled: true }
      },
    }),
  }

  try {
    const result = await createProject(
      {
        cwd: tmpRoot,
        name: "acme-web",
        packageManager: "pnpm",
        yes: true,
      },
      { templateRegistry: registry },
    )

    assert.equal(result.projectPath, projectPath)

    const loomConfig = JSON.parse(
      fs.readFileSync(path.join(projectPath, "loom.json"), "utf-8"),
    )

    assert.deepEqual(loomConfig, {
      paths: {
        hooks: "hooks",
      },
      aliases: {
        hooks: "@/hooks",
      },
      registries: {
        default: "@loom",
        items: {
          "@loom": "http://localhost:3001/r/{name}.json",
        },
      },
    })
  } finally {
    fs.rmSync(tmpRoot, { force: true, recursive: true })
  }
})
