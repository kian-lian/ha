import { downloadTemplate as gigetDownload } from "giget"
import ora from "ora"
import { delegateToNextCli } from "./official-cli.js"
import type { CreateNextAppOptions } from "./official-cli.js"
import type { PackageManager } from "./package-manager.js"
import {
  classifyDownloadError,
  copyTemplate,
  replaceTemplateVars,
  validateTemplate,
  walkDir,
} from "./template-fs.js"
import type { CopyOptions } from "./template-fs.js"

export type { CopyOptions }

const NEXT_CLI_PREFIX = "next-cli:"

export interface FetchTemplateOptions extends CopyOptions {
  packageManager?: PackageManager
}

export interface FetchTemplateResult {
  dependenciesInstalled: boolean
}

interface FetchTemplateDeps {
  delegateToNextCli?: (options: CreateNextAppOptions) => Promise<void>
}

/**
 * 获取模板并复制到目标目录
 * 支持三种模板来源：
 * 1. 本地模板：repo 以 "local:" 开头，从 templates 目录复制
 * 2. 官方 CLI：repo 以 "next-cli:" 开头，委托 create-next-app
 * 3. 远程模板：从 GitHub 等远程仓库下载
 *
 * @param repo 模板来源，格式：
 *   - 本地：`local:template-name`
 *   - 官方 CLI：`next-cli:create-next-app@16.2.1`
 *   - GitHub：`user/repo` 或 `github:user/repo`
 *   - GitLab：`gitlab:user/repo`
 * @param targetDir 目标目录路径
 * @param options 复制选项，包含项目名称等变量
 */
export async function fetchTemplate(
  repo: string,
  targetDir: string,
  options: FetchTemplateOptions,
  deps: FetchTemplateDeps = {},
): Promise<FetchTemplateResult> {
  // 处理本地模板
  if (repo.startsWith("local:")) {
    const templateName = repo.slice("local:".length)
    copyTemplate(templateName, targetDir, options)
    return { dependenciesInstalled: false }
  }

  if (repo.startsWith(NEXT_CLI_PREFIX)) {
    const packageSpec = repo.slice(NEXT_CLI_PREFIX.length) || "create-next-app@latest"
    await (deps.delegateToNextCli ?? delegateToNextCli)({
      packageManager: options.packageManager ?? "pnpm",
      packageSpec,
      targetDir,
    })
    return { dependenciesInstalled: true }
  }

  // 下载远程模板
  const spinner = ora("正在下载模板...").start()
  try {
    await gigetDownload(repo, { dir: targetDir, force: false })
    spinner.succeed("模板下载完成")
  } catch (error: unknown) {
    spinner.fail("模板下载失败")
    throw classifyDownloadError(error, repo)
  }

  // 验证模板并替换变量
  validateTemplate(targetDir)
  walkDir(targetDir, (filePath: string) => replaceTemplateVars(filePath, options))
  return { dependenciesInstalled: false }
}
