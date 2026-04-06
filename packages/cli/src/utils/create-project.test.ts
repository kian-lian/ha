import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import prompts from "prompts"
import { createProject } from "./create-project.js"
import { createTemplate } from "../templates/create-template.js"

test("createProject uses explicit template and project name without prompts", async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-create-project-"))
  const calls: Array<{
    cwd: string
    yes?: boolean
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
        yes: true,
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
    yes?: boolean
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
          yes: options.yes,
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
        yes: true,
        projectName: "next-app",
        projectPath: path.resolve(tmpRoot, "next-app"),
      },
    ])
  } finally {
    fs.rmSync(tmpRoot, { force: true, recursive: true })
  }
})

test("createProject uses the selected template default project name in interactive mode", async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-create-project-"))

  const registry = {
    next: createTemplate({
      name: "next",
      title: "Next",
      description: "Next template",
      defaultProjectName: "next-app",
      repo: "local:next",
      scaffold: async (options) => ({ dependenciesInstalled: true }),
    }),
    vite: createTemplate({
      name: "vite",
      title: "Vite",
      description: "Vite template",
      defaultProjectName: "vite-app",
      repo: "local:vite",
      scaffold: async (options) => ({ dependenciesInstalled: true }),
    }),
  }

  const prompt = Object.assign(
    async (questions: Parameters<typeof prompts>[0]) => {
      assert.ok(!Array.isArray(questions))

      if (questions.name === "template") {
        return { template: "vite" }
      }

      return { projectName: questions.initial }
    },
    prompts,
  ) as typeof prompts

  try {
    const result = await createProject(
      {
        cwd: tmpRoot,
        packageManager: "pnpm",
      },
      {
        prompt,
        templateRegistry: registry,
      },
    )

    assert.equal(result.template, "vite")
    assert.equal(result.projectName, "vite-app")
    assert.equal(result.projectPath, path.resolve(tmpRoot, "vite-app"))
  } finally {
    fs.rmSync(tmpRoot, { force: true, recursive: true })
  }
})

test("createProject supports selecting the monorepo template in interactive mode", async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-create-project-"))
  const calls: Array<{
    cwd: string
    packageManager: string
    projectName: string
    projectPath: string
    yes?: boolean
  }> = []

  const registry = {
    next: createTemplate({
      name: "next",
      title: "Next",
      description: "Next template",
      defaultProjectName: "next-app",
      repo: "local:next",
      scaffold: async () => ({ dependenciesInstalled: true }),
    }),
    monorepo: createTemplate({
      name: "monorepo",
      title: "Monorepo",
      description: "Turborepo starter",
      defaultProjectName: "my-turborepo",
      scaffold: async (options) => {
        calls.push(options)
        return { dependenciesInstalled: true }
      },
    }),
  }

  const prompt = Object.assign(
    async (questions: Parameters<typeof prompts>[0]) => {
      assert.ok(!Array.isArray(questions))

      if (questions.name === "template") {
        return { template: "monorepo" }
      }

      return { projectName: questions.initial }
    },
    prompts,
  ) as typeof prompts

  try {
    const result = await createProject(
      {
        cwd: tmpRoot,
        packageManager: "pnpm",
      },
      {
        prompt,
        templateRegistry: registry,
      },
    )

    assert.equal(result.template, "monorepo")
    assert.equal(result.projectName, "my-turborepo")
    assert.deepEqual(calls, [
      {
        cwd: tmpRoot,
        packageManager: "pnpm",
        projectName: "my-turborepo",
        projectPath: path.resolve(tmpRoot, "my-turborepo"),
        yes: undefined,
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

test("createProject surfaces prompt cancellation as a dedicated error", async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-create-project-"))

  const registry = {
    next: createTemplate({
      name: "next",
      title: "Next",
      description: "Next template",
      defaultProjectName: "next-app",
      repo: "local:next",
      scaffold: async () => ({ dependenciesInstalled: true }),
    }),
  }

  const prompt = Object.assign(
    async (...args: Parameters<typeof prompts>) => {
      const [, options] = args
      return options?.onCancel?.({} as never, {} as never) as never
    },
    prompts,
  ) as typeof prompts

  try {
    await assert.rejects(
      () =>
        createProject(
          {
            cwd: tmpRoot,
          },
          {
            prompt,
            templateRegistry: registry,
          },
        ),
      /已取消创建项目/,
    )
  } finally {
    fs.rmSync(tmpRoot, { force: true, recursive: true })
  }
})
