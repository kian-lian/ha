import { execFile } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
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
const GIGET_SOURCE_PREFIX_RE =
  /^(github|gh|gitlab|gl|bitbucket|bb|sourcehut|srht|http|https):/i
const URL_SOURCE_RE = /^(https?|ssh|git):\/\//i
const SCP_LIKE_GIT_REMOTE_RE = /^(?:[^@/\s]+@)?[^:/\s]+:.+$/
const ARCHIVE_PATH_RE = /\.(?:zip|tar\.gz|tgz)$/i
const KNOWN_GIT_HOST_PROVIDERS = new Map<string, string>([
  ["github.com", "github"],
  ["www.github.com", "github"],
  ["gitlab.com", "gitlab"],
  ["www.gitlab.com", "gitlab"],
  ["bitbucket.org", "bitbucket"],
  ["www.bitbucket.org", "bitbucket"],
  ["git.sr.ht", "sourcehut"],
])

export interface FetchTemplateOptions extends CopyOptions {
  packageManager?: PackageManager
  yes?: boolean
}

export interface FetchTemplateResult {
  dependenciesInstalled: boolean
}

interface FetchTemplateDeps {
  delegateToNextCli?: (options: CreateNextAppOptions) => Promise<void>
  downloadTemplate?: (
    repo: string,
    options: { dir: string; force: boolean },
  ) => Promise<void>
  cloneTemplateFromGit?: (repo: string, targetDir: string, ref?: string) => Promise<void>
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
      ...(options.yes !== undefined ? { yes: options.yes } : {}),
    })
    return { dependenciesInstalled: true }
  }

  // 下载远程模板
  const spinner = ora("正在下载模板...").start()
  const remoteSource = resolveRemoteTemplateSource(repo)

  try {
    if (remoteSource.type === "giget") {
      await (deps.downloadTemplate ?? gigetDownload)(remoteSource.repo, {
        dir: targetDir,
        force: false,
      })
      spinner.succeed("模板下载完成")
    } else {
      spinner.text = "正在通过 git clone 拉取模板..."
      await (deps.cloneTemplateFromGit ?? cloneTemplateFromGit)(
        remoteSource.repo,
        targetDir,
        remoteSource.ref,
      )
      spinner.succeed("模板拉取完成")
    }
  } catch (error: unknown) {
    spinner.fail(remoteSource.type === "git" ? "模板拉取失败" : "模板下载失败")
    if (remoteSource.type === "git") {
      throw classifyGitCloneError(error, remoteSource.repo)
    }
    throw classifyDownloadError(error, remoteSource.repo)
  }

  // 验证模板并替换变量
  validateTemplate(targetDir)
  walkDir(targetDir, (filePath: string) => replaceTemplateVars(filePath, options))
  return { dependenciesInstalled: false }
}

interface ParsedGitRemoteSource {
  normalizedRepo: string
  ref?: string
}

interface ResolvedGigetRemoteSource {
  type: "giget"
  repo: string
}

interface ResolvedGitRemoteSource {
  type: "git"
  repo: string
  ref?: string
}

type ResolvedRemoteTemplateSource = ResolvedGigetRemoteSource | ResolvedGitRemoteSource

export function parseGitRemoteSource(repo: string): ParsedGitRemoteSource | undefined {
  const trimmedRepo = repo.trim()

  if (!trimmedRepo) {
    return undefined
  }

  const [rawRepo, ...refParts] = trimmedRepo.split("#")
  const normalizedRepo = rawRepo?.trim().replace(/\/+$/, "")
  const ref = refParts.join("#").trim() || undefined

  if (!normalizedRepo) {
    return undefined
  }

  return {
    normalizedRepo,
    ...(ref ? { ref } : {}),
  }
}

export function normalizeRemoteTemplateSource(repo: string): string | undefined {
  const parsedRepo = parseGitRemoteSource(repo)

  if (!parsedRepo) {
    return undefined
  }

  const normalizedRepo = normalizeKnownGitProviderSource(parsedRepo.normalizedRepo)

  if (!normalizedRepo) {
    return undefined
  }

  return appendTemplateSourceRef(normalizedRepo, parsedRepo.ref)
}

function resolveRemoteTemplateSource(repo: string): ResolvedRemoteTemplateSource {
  const parsedRepo = parseGitRemoteSource(repo)
  const normalizedRepo = normalizeRemoteTemplateSource(repo)

  if (normalizedRepo) {
    return {
      type: "giget",
      repo: normalizedRepo,
    }
  }

  if (parsedRepo && isDirectGigetSource(parsedRepo.normalizedRepo)) {
    return {
      type: "giget",
      repo: appendTemplateSourceRef(parsedRepo.normalizedRepo, parsedRepo.ref),
    }
  }

  if (parsedRepo && isGitCloneSource(parsedRepo.normalizedRepo)) {
    return {
      type: "git",
      repo: parsedRepo.normalizedRepo,
      ...(parsedRepo.ref ? { ref: parsedRepo.ref } : {}),
    }
  }

  return {
    type: "giget",
    repo: repo.trim(),
  }
}

function normalizeKnownGitProviderSource(repo: string): string | undefined {
  return normalizeUrlGitSource(repo) ?? normalizeScpLikeGitSource(repo)
}

function normalizeUrlGitSource(repo: string): string | undefined {
  if (!URL_SOURCE_RE.test(repo)) {
    return undefined
  }

  let url: URL

  try {
    url = new URL(repo)
  } catch {
    return undefined
  }

  const provider = KNOWN_GIT_HOST_PROVIDERS.get(url.hostname.toLowerCase())
  const normalizedPath = normalizeGitProviderPath(url.pathname)

  if (!provider || !normalizedPath) {
    return undefined
  }

  return `${provider}:${normalizedPath}`
}

function normalizeScpLikeGitSource(repo: string): string | undefined {
  if (repo.includes("://") || !SCP_LIKE_GIT_REMOTE_RE.test(repo)) {
    return undefined
  }

  const match = /^(?:[^@/\s]+@)?([^:/\s]+):(.+)$/.exec(repo)
  const host = match?.[1]?.toLowerCase()
  const provider = host ? KNOWN_GIT_HOST_PROVIDERS.get(host) : undefined
  const normalizedPath = normalizeGitProviderPath(match?.[2] ?? "")

  if (!provider || !normalizedPath) {
    return undefined
  }

  return `${provider}:${normalizedPath}`
}

function normalizeGitProviderPath(repoPath: string): string | undefined {
  const normalizedPath = repoPath.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\.git$/, "")
  return normalizedPath || undefined
}

function isDirectGigetSource(repo: string): boolean {
  if (repo.startsWith("http://") || repo.startsWith("https://")) {
    return !isGitCloneSource(repo)
  }

  if (GIGET_SOURCE_PREFIX_RE.test(repo)) {
    return true
  }

  return isGigetShorthandSource(repo)
}

function isGigetShorthandSource(repo: string): boolean {
  if (!repo || repo.startsWith(".") || repo.startsWith("/") || repo.includes(" ")) {
    return false
  }

  if (repo.includes("://") || repo.includes("@") || repo.includes(":")) {
    return false
  }

  return repo.split("/").filter(Boolean).length >= 2
}

function isGitCloneSource(repo: string): boolean {
  if (repo.startsWith("ssh://") || repo.startsWith("git://")) {
    return true
  }

  if (!repo.includes("://") && SCP_LIKE_GIT_REMOTE_RE.test(repo) && !GIGET_SOURCE_PREFIX_RE.test(repo)) {
    return true
  }

  if (!repo.startsWith("http://") && !repo.startsWith("https://")) {
    return false
  }

  let url: URL

  try {
    url = new URL(repo)
  } catch {
    return false
  }

  if (ARCHIVE_PATH_RE.test(url.pathname)) {
    return false
  }

  const segments = url.pathname.split("/").filter(Boolean)

  if (KNOWN_GIT_HOST_PROVIDERS.has(url.hostname.toLowerCase())) {
    return segments.length >= 2
  }

  if (url.pathname.endsWith(".git")) {
    return true
  }

  return segments.length >= 2
}

function appendTemplateSourceRef(repo: string, ref?: string): string {
  return ref ? `${repo}#${ref}` : repo
}

async function cloneTemplateFromGit(repo: string, targetDir: string, ref?: string): Promise<void> {
  const args = ["clone", "--depth", "1"]

  if (ref) {
    args.push("--branch", ref, "--single-branch")
  }

  args.push(repo, targetDir)

  await new Promise<void>((resolve, reject) => {
    execFile("git", args, (error, stdout, stderr) => {
      if (error) {
        const gitError = error as Error & { stdout?: string; stderr?: string }
        gitError.stdout = stdout
        gitError.stderr = stderr
        reject(gitError)
        return
      }

      resolve()
    })
  })

  fs.rmSync(path.join(targetDir, ".git"), { recursive: true, force: true })
}

function classifyGitCloneError(error: unknown, repo: string): Error {
  if (!(error instanceof Error)) {
    return new Error(String(error))
  }

  const stderr = String((error as { stderr?: string }).stderr ?? "").trim()
  const message = stderr || error.message

  if (/repository .* not found/i.test(message) || /not found/i.test(message)) {
    return new Error(`模板仓库不存在: ${repo}`)
  }

  if (/could not resolve host/i.test(message) || /connection timed out/i.test(message)) {
    return new Error("网络连接失败，请检查网络或使用本地模板")
  }

  return new Error(`git clone 失败: ${message}`)
}
