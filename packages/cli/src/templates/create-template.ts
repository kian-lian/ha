import fs from "node:fs"
import type { PackageManager } from "../utils/package-manager.js"
import { installProjectDependencies } from "../utils/official-cli.js"
import { fetchTemplate, type FetchTemplateResult } from "../utils/template.js"
import { copyTemplate } from "../utils/template-fs.js"

export interface TemplateScaffoldOptions {
  cwd: string
  packageManager: PackageManager
  projectName: string
  projectPath: string
}

export interface TemplateDefinition {
  name: string
  title: string
  description: string
  defaultProjectName: string
  repo?: string
  templateDir?: string
  scaffold: (options: TemplateScaffoldOptions) => Promise<FetchTemplateResult>
}

interface TemplateConfig
  extends Omit<TemplateDefinition, "scaffold"> {
  scaffold?: TemplateDefinition["scaffold"]
}

export function createTemplate(config: TemplateConfig): TemplateDefinition {
  return {
    ...config,
    // 模板没有自定义 scaffold 时，按 repo/templateDir 自动推导默认实现。
    scaffold: config.scaffold ?? defaultScaffold(config),
  }
}

function defaultScaffold(
  config: Pick<TemplateDefinition, "repo" | "templateDir">,
): TemplateDefinition["scaffold"] {
  if (config.templateDir) {
    return async ({ projectName, projectPath, packageManager }) => {
      // vendored 模板走“复制本地模板 -> 清理模板残留 -> 安装依赖”这一套。
      copyTemplate(config.templateDir!, projectPath, { projectName })
      prepareVendoredTemplateProject(projectPath, packageManager)
      await installProjectDependencies(projectPath, packageManager)
      return { dependenciesInstalled: true }
    }
  }

  if (config.repo) {
    // 远程模板和官方 CLI 代理都复用 fetchTemplate 的分发逻辑。
    return async ({ projectName, projectPath, packageManager }) =>
      fetchTemplate(config.repo!, projectPath, { projectName, packageManager })
  }

  throw new Error("Template must define either repo or templateDir")
}

const LOCK_FILES: Partial<Record<PackageManager, string>> = {
  pnpm: "pnpm-lock.yaml",
  npm: "package-lock.json",
  yarn: "yarn.lock",
  bun: "bun.lock",
}

export function prepareVendoredTemplateProject(
  projectPath: string,
  packageManager: PackageManager,
) {
  // 单应用模板不应该携带仓库自身的 workspace 元数据。
  removeIfExists(`${projectPath}/pnpm-workspace.yaml`)

  for (const [manager, lockFile] of Object.entries(LOCK_FILES)) {
    if (!lockFile || manager === packageManager) {
      continue
    }

    // 只保留当前包管理器对应的 lockfile，避免生成项目后出现错误提示。
    removeIfExists(`${projectPath}/${lockFile}`)
  }
}

function removeIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return
  }

  fs.rmSync(filePath, { force: true })
}
