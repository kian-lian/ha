import assert from "node:assert/strict"
import test from "node:test"
import type { ResolvedRegistryItemManifest } from "../../registry/schema.js"
import type { PackageManager } from "../../utils/package-manager.js"
import { installRegistryItemDependencies } from "../install-dependencies.js"

test("installRegistryItemDependencies dedupes and separates deps by type", async () => {
  const calls: Array<{
    packageManager: PackageManager
    packages: string[]
    options?: {
      dev?: boolean
    }
    targetDir: string
  }> = []

  await installRegistryItemDependencies(
    {
      cwd: "/tmp/demo-app",
      items: [
        createRegistryItem("use-toggle", {
          dependencies: ["react-use", "zustand"],
          devDependencies: ["@types/react"],
        }),
        createRegistryItem("use-mounted", {
          dependencies: ["zustand"],
          devDependencies: ["@types/react", "@types/node"],
        }),
      ],
      packageManager: "pnpm",
    },
    {
      installPackages: async (
        targetDir: string,
        packageManager: PackageManager,
        packages: string[],
        options?: {
          dev?: boolean
        },
      ) => {
        calls.push({
          targetDir,
          packageManager,
          packages,
          options,
        })
      },
    },
  )

  assert.deepEqual(calls, [
    {
      targetDir: "/tmp/demo-app",
      packageManager: "pnpm",
      packages: ["react-use", "zustand"],
      options: { dev: false },
    },
    {
      targetDir: "/tmp/demo-app",
      packageManager: "pnpm",
      packages: ["@types/react", "@types/node"],
      options: { dev: true },
    },
  ])
})

test("installRegistryItemDependencies skips installation when no deps are declared", async () => {
  const calls: unknown[] = []

  await installRegistryItemDependencies(
    {
      cwd: "/tmp/demo-app",
      items: [createRegistryItem("use-toggle")],
      packageManager: "pnpm",
    },
    {
      installPackages: async (
        ...args: [
          string,
          PackageManager,
          string[],
          {
            dev?: boolean
          }?,
        ]
      ) => {
        calls.push(args)
      },
    },
  )

  assert.deepEqual(calls, [])
})

function createRegistryItem(
  name: string,
  options: {
    dependencies?: string[]
    devDependencies?: string[]
  } = {},
): ResolvedRegistryItemManifest {
  return {
    name,
    type: "registry:hook",
    title: name,
    description: name,
    files: [
      {
        path: `registry/hooks/${name}.ts`,
        content: `export function ${name.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase())}() {}\n`,
        type: "registry:hook",
      },
    ],
    dependencies: options.dependencies ?? [],
    devDependencies: options.devDependencies ?? [],
    registryDependencies: [],
    registrySource: {
      input: name,
      namespace: "@loom",
      url: `http://localhost:3001/r/${name}.json`,
    },
  }
}
