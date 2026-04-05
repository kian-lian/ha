import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { BINARY_EXTS } from "../constants/binary-exts.js"
import { HTTP_STATUS, NETWORK_ERROR_CODE } from "../constants/error-codes.js"
import { SKIP_DIRS } from "../constants/skip-dirs.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 复制选项 */
export interface CopyOptions {
  /** 项目名称，用于替换模板中的占位符 */
  projectName: string
}

/**
 * 从本地 templates 目录复制模板到目标目录
 * @param templateName 模板名称（templates 目录下的子目录名）
 * @param targetDir 目标目录路径
 * @param options 复制选项，包含项目名称等变量
 */
export function copyTemplate(
  templateName: string,
  targetDir: string,
  options: CopyOptions,
) {
  const templateDir = resolveTemplateDir(templateName)

  if (!fs.existsSync(templateDir)) {
    throw new Error(`模板 "${templateName}" 不存在`)
  }

  fs.mkdirSync(targetDir, { recursive: true })
  copyDir(templateDir, targetDir, options)
}

export function copyTemplateFiles(
  templateName: string,
  targetDir: string,
  fileNames: string[],
  options: CopyOptions,
) {
  const templateDir = resolveTemplateDir(templateName)

  if (!fs.existsSync(templateDir)) {
    throw new Error(`模板 "${templateName}" 不存在`)
  }

  fs.mkdirSync(targetDir, { recursive: true })

  for (const fileName of fileNames) {
    const srcPath = path.join(templateDir, fileName)
    const destPath = path.join(targetDir, fileName)

    if (!fs.existsSync(srcPath)) {
      throw new Error(`模板文件 "${templateName}/${fileName}" 不存在`)
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    copyFile(srcPath, destPath, options)
  }
}

/**
 * 验证模板目录是否有效（必须包含 package.json）
 * @param dir 模板目录路径
 */
export function validateTemplate(dir: string) {
  const pkgPath = path.join(dir, "package.json")
  if (!fs.existsSync(pkgPath)) {
    throw new Error("模板无效：缺少 package.json 文件")
  }
}

/**
 * 递归遍历目录中的所有文件，跳过指定目录和二进制文件
 * @param dir 要遍历的目录
 * @param visitor 访问每个文件的回调函数
 */
export function walkDir(dir: string, visitor: (filePath: string) => void) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // 跳过 node_modules、.git 等目录
      if (SKIP_DIRS.has(entry.name)) continue
      walkDir(fullPath, visitor)
    } else if (!BINARY_EXTS.has(path.extname(entry.name).toLowerCase())) {
      // 只处理非二进制文件
      visitor(fullPath)
    }
  }
}

/**
 * 替换文件中的模板变量（如 {{projectName}}）
 * @param filePath 文件路径
 * @param options 包含替换变量的选项
 */
export function replaceTemplateVars(filePath: string, options: CopyOptions) {
  const content = fs.readFileSync(filePath, "utf-8")
  const replaced = content.replaceAll("{{projectName}}", options.projectName)
  if (replaced !== content) {
    fs.writeFileSync(filePath, replaced)
  }
}

/**
 * 将下载错误分类并转换为友好的错误消息
 * @param error 原始错误对象
 * @param repo 仓库名称
 * @returns 分类后的错误对象
 */
export function classifyDownloadError(error: unknown, repo: string): Error {
  if (!(error instanceof Error)) return new Error(String(error))

  const msg = error.message
  const statusCode = (error as { statusCode?: number }).statusCode
  const code = (error as { code?: string }).code

  // 404 错误：仓库不存在
  if (statusCode === HTTP_STATUS.NOT_FOUND || msg.includes("404")) {
    return new Error(`模板仓库不存在: ${repo}`)
  }
  // 403 错误：API 限流
  if (statusCode === HTTP_STATUS.FORBIDDEN || msg.includes("403")) {
    return new Error("GitHub API 限流，请稍后重试或设置 GITHUB_TOKEN 环境变量")
  }
  // 网络错误
  if (
    code === NETWORK_ERROR_CODE.NOT_FOUND ||
    code === NETWORK_ERROR_CODE.TIMEOUT ||
    msg.includes(NETWORK_ERROR_CODE.NOT_FOUND) ||
    msg.includes(NETWORK_ERROR_CODE.TIMEOUT)
  ) {
    return new Error("网络连接失败，请检查网络或使用本地模板")
  }
  return error
}

/**
 * 递归复制目录，处理模板变量替换
 * @param src 源目录
 * @param dest 目标目录
 * @param options 复制选项
 */
function copyDir(src: string, dest: string, options: CopyOptions) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      // 跳过不需要复制的目录
      if (SKIP_DIRS.has(entry.name)) continue
      fs.mkdirSync(destPath, { recursive: true })
      copyDir(srcPath, destPath, options)
    } else {
      copyFile(srcPath, destPath, options)
    }
  }
}

function copyFile(srcPath: string, destPath: string, options: CopyOptions) {
  if (BINARY_EXTS.has(path.extname(srcPath).toLowerCase())) {
    fs.copyFileSync(srcPath, destPath)
    return
  }

  const content = fs
    .readFileSync(srcPath, "utf-8")
    .replaceAll("{{projectName}}", options.projectName)
  fs.writeFileSync(destPath, content)
}

function resolveTemplateDir(templateName: string) {
  return path.resolve(__dirname, "../../templates", templateName)
}
