import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

interface RegistryIndexItem {
  name: string
  type: "registry:hook"
  title: string
  description?: string
}

interface RegistryItemFile {
  path: string
  content: string
  type: "registry:hook"
  target?: string
}

interface RegistryItemManifest extends RegistryIndexItem {
  files: RegistryItemFile[]
  dependencies: string[]
  devDependencies: string[]
  registryDependencies: string[]
}

interface RegistryCatalogItem extends RegistryIndexItem {
  files: Array<{
    source: string
    target?: string
  }>
  dependencies?: string[]
  devDependencies?: string[]
  registryDependencies?: string[]
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REGISTRY_ROOT = path.resolve(__dirname, "../../../packages/cli/registry")

const registryCatalog: RegistryCatalogItem[] = [
  {
    name: "use-toggle",
    type: "registry:hook",
    title: "use-toggle",
    description: "管理布尔值切换的基础 hook",
    files: [
      {
        source: "hooks/use-toggle.ts",
      },
    ],
  },
  {
    name: "use-mounted",
    type: "registry:hook",
    title: "use-mounted",
    description: "判断组件是否已经挂载完成",
    files: [
      {
        source: "hooks/use-mounted.ts",
      },
    ],
  },
  {
    name: "use-callback-ref",
    type: "registry:hook",
    title: "use-callback-ref",
    description: "让 callback 引用保持稳定的辅助 hook",
    files: [
      {
        source: "hooks/use-callback-ref.ts",
      },
    ],
  },
  {
    name: "use-controllable-state",
    type: "registry:hook",
    title: "use-controllable-state",
    description: "兼容受控 / 非受控场景的状态管理 hook",
    files: [
      {
        source: "hooks/use-controllable-state.ts",
      },
    ],
    registryDependencies: ["use-callback-ref"],
  },
]

export function getRegistryIndex(): RegistryIndexItem[] {
  return registryCatalog.map((item) => ({
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
  }))
}

export function getRegistryItem(name: string): RegistryItemManifest | null {
  const item = registryCatalog.find((entry) => entry.name === name)

  if (!item) {
    return null
  }

  return {
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    files: item.files.map((file) => ({
      path: toRegistryPath(file.source),
      content: readRegistrySource(file.source),
      type: item.type,
      target: file.target,
    })),
    dependencies: item.dependencies ?? [],
    devDependencies: item.devDependencies ?? [],
    registryDependencies: item.registryDependencies ?? [],
  }
}

export function resolveRegistryFileRequest(file: string) {
  if (!file.endsWith(".json")) {
    return null
  }

  const name = file.slice(0, -".json".length)

  if (!name) {
    return null
  }

  if (name === "registry") {
    return {
      kind: "index" as const,
    }
  }

  return {
    kind: "item" as const,
    name,
  }
}

function readRegistrySource(relativePath: string) {
  const absolutePath = path.resolve(REGISTRY_ROOT, relativePath)

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Registry 源文件不存在: ${relativePath}`)
  }

  return fs.readFileSync(absolutePath, "utf-8")
}

function toRegistryPath(relativePath: string) {
  return `registry/${relativePath.replaceAll("\\", "/")}`
}
