import { downloadTemplate as gigetDownload } from "giget"
import { delegateToNextCli } from "../official-cli.js"
import { copyTemplate } from "../template-fs.js"
import { cloneTemplateFromGit, fetchRemoteTemplate } from "./remote-fetch.js"
import {
    normalizeRemoteTemplateSource,
    parseGitRemoteSource,
    resolveRemoteTemplateSource,
} from "./remote-source.js"
import type {
    FetchTemplateDeps,
    FetchTemplateOptions,
    FetchTemplateResult,
    ResolvedFetchTemplateDeps,
    ResolvedTemplateSource,
} from "./types.js"

export type { CopyOptions } from "../template-fs.js"
export type { FetchTemplateOptions, FetchTemplateResult } from "./types.js"
export { normalizeRemoteTemplateSource, parseGitRemoteSource }

const LOCAL_TEMPLATE_PREFIX = "local:"
const NEXT_CLI_PREFIX = "next-cli:"

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
    return executeTemplateSource(
        resolveTemplateSource(repo),
        targetDir,
        options,
        resolveFetchTemplateDeps(deps),
    )
}

function resolveFetchTemplateDeps(deps: FetchTemplateDeps): ResolvedFetchTemplateDeps {
    return {
        delegateToNextCli: deps.delegateToNextCli ?? delegateToNextCli,
        downloadTemplate:
            deps.downloadTemplate ??
            (async (repo, options) => {
                await gigetDownload(repo, options)
            }),
        cloneTemplateFromGit: deps.cloneTemplateFromGit ?? cloneTemplateFromGit,
    }
}

function resolveTemplateSource(repo: string): ResolvedTemplateSource {
    if (repo.startsWith(LOCAL_TEMPLATE_PREFIX)) {
        return {
            type: "local",
            templateName: repo.slice(LOCAL_TEMPLATE_PREFIX.length),
        }
    }

    if (repo.startsWith(NEXT_CLI_PREFIX)) {
        return {
            type: "next-cli",
            packageSpec: repo.slice(NEXT_CLI_PREFIX.length) || "create-next-app@latest",
        }
    }

    return resolveRemoteTemplateSource(repo)
}

async function executeTemplateSource(
    source: ResolvedTemplateSource,
    targetDir: string,
    options: FetchTemplateOptions,
    deps: ResolvedFetchTemplateDeps,
): Promise<FetchTemplateResult> {
    switch (source.type) {
        case "local":
            copyTemplate(source.templateName, targetDir, options)
            return { dependenciesInstalled: false }
        case "next-cli":
            await deps.delegateToNextCli({
                packageManager: options.packageManager ?? "pnpm",
                packageSpec: source.packageSpec,
                targetDir,
                ...(options.yes !== undefined ? { yes: options.yes } : {}),
            })
            return { dependenciesInstalled: true }
        case "giget":
        case "git":
            return fetchRemoteTemplate(source, targetDir, options, {
                downloadTemplate: deps.downloadTemplate,
                cloneTemplateFromGit: deps.cloneTemplateFromGit,
            })
    }
}