import { downloadTemplate as gigetDownload } from "giget"
import ora from "ora"
import {
  classifyDownloadError,
  copyTemplate,
  replaceTemplateVars,
  validateTemplate,
  walkDir,
} from "./template-fs.js"
import type { CopyOptions } from "./template-fs.js"

export type { CopyOptions }

/**
 * 获取模板并复制到目标目录
 * 支持两种模板来源：
 * 1. 本地模板：repo 以 "local:" 开头，从 templates 目录复制
 * 2. 远程模板：从 GitHub 等远程仓库下载
 *
 * @param repo 模板来源，格式：
 *   - 本地：`local:template-name`
 *   - GitHub：`user/repo` 或 `github:user/repo`
 *   - GitLab：`gitlab:user/repo`
 * @param targetDir 目标目录路径
 * @param options 复制选项，包含项目名称等变量
 */
export async function fetchTemplate(
  repo: string,
  targetDir: string,
  options: CopyOptions,
) {
  // 处理本地模板
  if (repo.startsWith("local:")) {
    const templateName = repo.slice("local:".length)
    return copyTemplate(templateName, targetDir, options)
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
}
