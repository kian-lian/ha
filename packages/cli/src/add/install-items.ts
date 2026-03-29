import fs from "node:fs"
import path from "node:path"
import type { LoomConfig } from "../config/schema.js"
import type { ResolvedRegistryItemManifest } from "../registry/schema.js"

const REGISTRY_IMPORT_PATTERN = /#loom-registry\/hooks\/([a-z0-9-]+)/g

export interface InstallRegistryItemsOptions {
  cwd: string
  config: LoomConfig
  items: ResolvedRegistryItemManifest[]
  overwrite?: boolean
}

export interface InstallRegistryItemsResult {
  items: ResolvedRegistryItemManifest[]
  files: string[]
}

interface PlannedFile {
  itemName: string
  content: string
  targetPath: string
}

export function installRegistryItems(
  options: InstallRegistryItemsOptions,
): InstallRegistryItemsResult {
  const hooksDir = path.resolve(options.cwd, options.config.paths.hooks)
  fs.mkdirSync(hooksDir, { recursive: true })

  const plannedFiles = planFiles(options.items, hooksDir, options.cwd)

  for (const file of plannedFiles) {
    if (fs.existsSync(file.targetPath) && !options.overwrite) {
      throw new Error(
        `目标文件已存在: ${path.relative(
          options.cwd,
          file.targetPath,
        )}。如需覆盖请使用 --overwrite`,
      )
    }
  }

  const itemTargetMap = new Map(
    plannedFiles.map((file) => [file.itemName, file.targetPath]),
  )

  for (const file of plannedFiles) {
    const rewrittenSource = rewriteRegistryImports(
      file.content,
      file.targetPath,
      itemTargetMap,
    )

    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true })
    fs.writeFileSync(file.targetPath, rewrittenSource)
  }

  return {
    items: options.items,
    files: plannedFiles.map((file) => file.targetPath),
  }
}

function planFiles(
  items: ResolvedRegistryItemManifest[],
  hooksDir: string,
  cwd: string,
): PlannedFile[] {
  const plannedFiles: PlannedFile[] = []

  for (const item of items) {
    for (const file of item.files) {
      // 如果 manifest 没显式给 target，就默认落成远程 path 的 basename。
      const targetName = file.target ?? path.basename(file.path)
      const targetPath = path.resolve(hooksDir, targetName)

      const duplicatedFile = plannedFiles.find(
        (plannedFile) => plannedFile.targetPath === targetPath,
      )

      if (duplicatedFile) {
        throw new Error(
          `多个 hooks 试图写入同一个文件: ${path.relative(cwd, targetPath)}`,
        )
      }

      plannedFiles.push({
        itemName: item.name,
        content: file.content,
        targetPath,
      })
    }
  }

  return plannedFiles
}

function rewriteRegistryImports(
  source: string,
  currentTargetPath: string,
  itemTargetMap: Map<string, string>,
) {
  return source.replace(
    REGISTRY_IMPORT_PATTERN,
    (_match, dependencyName: string) => {
      const dependencyTargetPath = itemTargetMap.get(dependencyName)

      if (!dependencyTargetPath) {
        throw new Error(`缺少 registry 依赖文件: ${dependencyName}`)
      }

      return toRelativeImportPath(currentTargetPath, dependencyTargetPath)
    },
  )
}

function toRelativeImportPath(fromPath: string, toPath: string) {
  const relativePath = path.relative(path.dirname(fromPath), toPath)
  const withoutExtension = relativePath.replace(/\.[^.]+$/, "")
  const normalized = withoutExtension.replaceAll("\\", "/")

  return normalized.startsWith(".") ? normalized : `./${normalized}`
}
