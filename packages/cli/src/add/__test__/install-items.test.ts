import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import type { LoomConfig } from "../../config/schema.js"
import type { ResolvedRegistryItemManifest } from "../../registry/schema.js"
import { installRegistryItems } from "../install-items.js"

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

test("installRegistryItems writes files from remote manifest content", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-install-hooks-"))

  try {
    const result = installRegistryItems({
      cwd: tmpRoot,
      config: mockConfig,
      items: [
        createRegistryItem("use-callback-ref", {
          content: "export function useCallbackRef() {}\n",
        }),
        createRegistryItem("use-controllable-state", {
          content:
            'import { useCallbackRef } from "#loom-registry/hooks/use-callback-ref"\n',
        }),
      ],
    })

    assert.deepEqual(
      result.items.map((item) => item.name),
      ["use-callback-ref", "use-controllable-state"],
    )

    const callbackRefPath = path.join(
      tmpRoot,
      "src",
      "hooks",
      "use-callback-ref.ts",
    )
    const controllableStatePath = path.join(
      tmpRoot,
      "src",
      "hooks",
      "use-controllable-state.ts",
    )

    assert.equal(fs.existsSync(callbackRefPath), true)
    assert.equal(fs.existsSync(controllableStatePath), true)

    const controllableStateSource = fs.readFileSync(
      controllableStatePath,
      "utf-8",
    )

    assert.match(controllableStateSource, /from "\.\/use-callback-ref"/)
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }
})

test("installRegistryItems rejects overwriting existing files by default", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-install-hooks-"))

  try {
    const hooksDir = path.join(tmpRoot, "src", "hooks")
    fs.mkdirSync(hooksDir, { recursive: true })
    fs.writeFileSync(path.join(hooksDir, "use-toggle.ts"), "// existing")

    assert.throws(
      () =>
        installRegistryItems({
          cwd: tmpRoot,
          config: mockConfig,
          items: [createRegistryItem("use-toggle")],
        }),
      /目标文件已存在/,
    )
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }
})

function createRegistryItem(
  name: string,
  options: {
    content?: string
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
    registryDependencies: [],
    registrySource: {
      input: name,
      namespace: "@loom",
      url: `http://localhost:3001/r/${name}.json`,
    },
  }
}

function toIdentifier(name: string) {
  return name.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase())
}
