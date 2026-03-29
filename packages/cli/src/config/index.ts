import fs from "node:fs"
import path from "node:path"
import {
  DEFAULT_REGISTRY_NAMESPACE,
  DEFAULT_REGISTRY_TEMPLATE,
  loomConfigSchema,
  type LoomConfig,
} from "./schema.js"

const LOOM_CONFIG_FILE = "loom.json"
const TSCONFIG_CANDIDATES = ["tsconfig.json", "tsconfig.app.json", "jsconfig.json"]

interface PackageJsonLike {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

interface TsConfigLike {
  compilerOptions?: {
    paths?: Record<string, string[]>
  }
}

export function resolveLoomConfigPath(cwd: string) {
  return path.resolve(cwd, LOOM_CONFIG_FILE)
}

export function hasLoomConfig(cwd: string) {
  return fs.existsSync(resolveLoomConfigPath(cwd))
}

export function loadLoomConfig(cwd: string): LoomConfig {
  const configPath = resolveLoomConfigPath(cwd)

  if (!fs.existsSync(configPath)) {
    throw new Error("未找到 loom.json，请先运行 loom-cli init")
  }

  const raw = readJsonFile(configPath)
  return loomConfigSchema.parse(raw)
}

export function writeLoomConfig(cwd: string, config: LoomConfig) {
  const configPath = resolveLoomConfigPath(cwd)
  const normalized = loomConfigSchema.parse(config)

  fs.writeFileSync(configPath, `${JSON.stringify(normalized, null, 2)}\n`)
}

export function isReactTypeScriptProject(cwd: string) {
  const packageJsonPath = path.resolve(cwd, "package.json")
  if (!fs.existsSync(packageJsonPath)) {
    return false
  }

  const packageJson = readJsonFile<PackageJsonLike>(packageJsonPath)
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
  }

  const hasReact = Boolean(deps.react)
  const hasTypeScriptConfig = findTsConfigPaths(cwd).length > 0

  return hasReact && hasTypeScriptConfig
}

export function createDefaultLoomConfig(cwd: string): LoomConfig {
  const hooksPath = detectHooksPath(cwd)
  const hooksAlias = detectHooksAlias(cwd)

  return loomConfigSchema.parse({
    paths: {
      hooks: hooksPath,
    },
    aliases: hooksAlias
      ? {
          hooks: hooksAlias,
        }
      : {},
    registries: {
      default: DEFAULT_REGISTRY_NAMESPACE,
      items: {
        [DEFAULT_REGISTRY_NAMESPACE]: DEFAULT_REGISTRY_TEMPLATE,
      },
    },
  })
}

export function detectHooksPath(cwd: string) {
  const srcDir = path.resolve(cwd, "src")
  return fs.existsSync(srcDir) ? "src/hooks" : "hooks"
}

export function detectHooksAlias(cwd: string) {
  for (const tsconfigPath of findTsConfigPaths(cwd)) {
    const tsconfig = readJsonFile<TsConfigLike>(tsconfigPath)
    const paths = tsconfig.compilerOptions?.paths

    if (!paths) {
      continue
    }

    for (const [alias, targets] of Object.entries(paths)) {
      if (!alias.endsWith("/*")) {
        continue
      }

      const aliasBase = alias.slice(0, -2)
      const hasRootAliasTarget = targets.some((target) => {
        const normalized = target.replaceAll("\\", "/")
        return (
          normalized === "./*" ||
          normalized === "*" ||
          normalized === "./src/*" ||
          normalized === "src/*"
        )
      })

      if (hasRootAliasTarget) {
        return `${aliasBase}/hooks`
      }
    }
  }

  return undefined
}

export function getDefaultRegistryNamespace(config: LoomConfig) {
  return config.registries.default
}

export function getRegistryTemplate(config: LoomConfig, namespace: string) {
  const template = config.registries.items[namespace]

  if (!template) {
    throw new Error(`未找到 registry namespace: ${namespace}`)
  }

  return template
}

function findTsConfigPaths(cwd: string) {
  return TSCONFIG_CANDIDATES.map((name) => path.resolve(cwd, name)).filter(
    (filePath) => fs.existsSync(filePath),
  )
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T
}
