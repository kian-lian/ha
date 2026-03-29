import assert from "node:assert/strict"
import test from "node:test"
import prompts from "prompts"
import type { LoomConfig } from "../../config/schema.js"
import type { ResolvedRegistryItemManifest } from "../../registry/schema.js"
import { addItems } from "../add-items.js"

const mockConfig: LoomConfig = {
  paths: {
    hooks: "src/hooks",
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
}

const remoteItems: Record<string, ResolvedRegistryItemManifest> = {
  "use-toggle": createRegistryItem("use-toggle"),
  "use-mounted": createRegistryItem("use-mounted"),
  "use-callback-ref": createRegistryItem("use-callback-ref"),
  "use-controllable-state": createRegistryItem("use-controllable-state", {
    registryDependencies: ["use-callback-ref"],
    content:
      'import { useCallbackRef } from "#loom-registry/hooks/use-callback-ref"\n',
  }),
}

test("addItems resolves explicit hook names from the remote registry", async () => {
  const result = await addItems(
    {
      cwd: "/tmp/demo-app",
      items: ["use-toggle", "use-mounted"],
      yes: true,
    },
    {
      loadConfig: () => mockConfig,
      fetchRegistryItem: async (name: string) => getRemoteItem(name),
      fetchRegistryIndex: async () => [],
    },
  )

  assert.equal(result.config.paths.hooks, "src/hooks")
  assert.deepEqual(
    result.items.map((item) => item.name),
    ["use-toggle", "use-mounted"],
  )
})

test("addItems recursively expands remote registry dependencies", async () => {
  const result = await addItems(
    {
      cwd: "/tmp/demo-app",
      items: ["use-controllable-state"],
      yes: true,
    },
    {
      loadConfig: () => mockConfig,
      fetchRegistryItem: async (name: string) => getRemoteItem(name),
      fetchRegistryIndex: async () => [],
    },
  )

  assert.deepEqual(
    result.items.map((item) => item.name),
    ["use-callback-ref", "use-controllable-state"],
  )
})

test("addItems rejects unknown hook names", async () => {
  await assert.rejects(
    () =>
      addItems(
        {
          cwd: "/tmp/demo-app",
          items: ["use-missing"],
          yes: true,
        },
        {
          loadConfig: () => mockConfig,
          fetchRegistryItem: async (name) => {
            throw new Error(`远程 registry 中不存在该 hook: ${name}`)
          },
          fetchRegistryIndex: async () => [],
        },
      ),
    /远程 registry 中不存在该 hook: use-missing/,
  )
})

test("addItems prompts for hook selection from the remote registry index", async () => {
  const prompt = (async () => ({
    items: ["use-toggle"],
  })) as unknown as typeof prompts

  const result = await addItems(
    {
      cwd: "/tmp/demo-app",
      items: [],
    },
    {
      prompt,
      loadConfig: () => mockConfig,
      fetchRegistryIndex: async () => [
        {
          name: "use-toggle",
          type: "registry:hook",
          title: "use-toggle",
          description: "toggle",
        },
      ],
      fetchRegistryItem: async (name: string) => getRemoteItem(name),
    },
  )

  assert.deepEqual(
    result.items.map((item) => item.name),
    ["use-toggle"],
  )
})

function createRegistryItem(
  name: string,
  options: {
    content?: string
    registryDependencies?: string[]
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
        content:
          options.content ??
          `export function ${toIdentifier(name)}() { return "${name}" }\n`,
        type: "registry:hook",
      },
    ],
    dependencies: [],
    devDependencies: [],
    registryDependencies: options.registryDependencies ?? [],
    registrySource: {
      input: name,
      namespace: "@loom",
      url: `http://localhost:3001/r/${name}.json`,
    },
  }
}

function getRemoteItem(name: string) {
  const normalizedName = name.startsWith("@")
    ? name.slice(name.indexOf("/") + 1)
    : name
  const item = remoteItems[normalizedName]

  if (!item) {
    throw new Error(`远程 registry 中不存在该 hook: ${name}`)
  }

  return item
}

function toIdentifier(name: string) {
  return name.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase())
}
