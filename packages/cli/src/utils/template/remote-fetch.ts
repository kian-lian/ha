import { execFile } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import ora from "ora"
import {
    classifyDownloadError,
    replaceTemplateVars,
    validateTemplate,
    walkDir,
} from "../template-fs.js"
import type {
    CloneTemplateFromGit,
    DownloadTemplate,
    FetchTemplateOptions,
    FetchTemplateResult,
    ResolvedRemoteTemplateSource,
} from "./types.js"

interface RemoteTemplateFetchDeps {
    downloadTemplate: DownloadTemplate
    cloneTemplateFromGit: CloneTemplateFromGit
}

export async function fetchRemoteTemplate(
    source: ResolvedRemoteTemplateSource,
    targetDir: string,
    options: FetchTemplateOptions,
    deps: RemoteTemplateFetchDeps,
): Promise<FetchTemplateResult> {
    const spinner = ora("正在下载模板...").start()

    try {
        await downloadRemoteTemplate(source, targetDir, deps, spinner)
        spinner.succeed(source.type === "git" ? "模板拉取完成" : "模板下载完成")
    } catch (error: unknown) {
        spinner.fail(source.type === "git" ? "模板拉取失败" : "模板下载失败")
        throw classifyRemoteTemplateError(source, error)
    }

    finalizeFetchedTemplate(targetDir, options)
    return { dependenciesInstalled: false }
}

async function downloadRemoteTemplate(
    source: ResolvedRemoteTemplateSource,
    targetDir: string,
    deps: RemoteTemplateFetchDeps,
    spinner: ReturnType<typeof ora>,
): Promise<void> {
    if (source.type === "giget") {
        await deps.downloadTemplate(source.repo, {
            dir: targetDir,
            force: false,
        })
        return
    }

    spinner.text = "正在通过 git clone 拉取模板..."
    await deps.cloneTemplateFromGit(source.repo, targetDir, source.ref)
}

export async function cloneTemplateFromGit(
    repo: string,
    targetDir: string,
    ref?: string,
): Promise<void> {
    const args = ["clone", "--depth", "1"]

    if (ref) {
        args.push("--branch", ref, "--single-branch")
    }

    args.push(repo, targetDir)

    await new Promise<void>((resolve, reject) => {
        execFile("git", args, (error, stdout, stderr) => {
            if (error) {
                const gitError = attachGitCommandOutput(error, stdout, stderr)
                reject(gitError)
                return
            }

            resolve()
        })
    })

    fs.rmSync(path.join(targetDir, ".git"), { recursive: true, force: true })
}

function classifyRemoteTemplateError(
    source: ResolvedRemoteTemplateSource,
    error: unknown,
): Error {
    if (source.type === "git") {
        return classifyGitCloneError(error, source.repo)
    }

    return classifyDownloadError(error, source.repo)
}

function finalizeFetchedTemplate(
    targetDir: string,
    options: FetchTemplateOptions,
) {
    validateTemplate(targetDir)
    walkDir(targetDir, (filePath) => replaceTemplateVars(filePath, options))
}

function attachGitCommandOutput(error: Error, stdout: string, stderr: string) {
    return Object.assign(error, { stdout, stderr })
}

function classifyGitCloneError(error: unknown, repo: string): Error {
    if (!(error instanceof Error)) {
        return new Error(String(error))
    }

    const stderr = getGitCommandStderr(error)
    const message = stderr || error.message

    if (/repository .* not found/i.test(message) || /not found/i.test(message)) {
        return new Error(`模板仓库不存在: ${repo}`)
    }

    if (/could not resolve host/i.test(message) || /connection timed out/i.test(message)) {
        return new Error("网络连接失败，请检查网络或使用本地模板")
    }

    return new Error(`git clone 失败: ${message}`)
}

function getGitCommandStderr(error: Error): string {
    if (!("stderr" in error) || typeof error.stderr !== "string") {
        return ""
    }

    return error.stderr.trim()
}