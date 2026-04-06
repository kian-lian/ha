import type { CreateNextAppOptions } from "../official-cli.js"
import type { PackageManager } from "../package-manager.js"
import type { CopyOptions } from "../template-fs.js"

export interface FetchTemplateOptions extends CopyOptions {
    packageManager?: PackageManager
    yes?: boolean
}

export interface FetchTemplateResult {
    dependenciesInstalled: boolean
}

export type DownloadTemplate = (
    repo: string,
    options: { dir: string; force: boolean },
) => Promise<void>

export type CloneTemplateFromGit = (
    repo: string,
    targetDir: string,
    ref?: string,
) => Promise<void>

export interface FetchTemplateDeps {
    delegateToNextCli?: (options: CreateNextAppOptions) => Promise<void>
    downloadTemplate?: DownloadTemplate
    cloneTemplateFromGit?: CloneTemplateFromGit
}

export type ResolvedFetchTemplateDeps = Required<FetchTemplateDeps>

export interface ResolvedLocalTemplateSource {
    type: "local"
    templateName: string
}

export interface ResolvedNextCliTemplateSource {
    type: "next-cli"
    packageSpec: string
}

export interface ParsedGitRemoteSource {
    normalizedRepo: string
    ref?: string
}

export interface ResolvedGigetRemoteSource {
    type: "giget"
    repo: string
}

export interface ResolvedGitRemoteSource {
    type: "git"
    repo: string
    ref?: string
}

export type ResolvedRemoteTemplateSource =
    | ResolvedGigetRemoteSource
    | ResolvedGitRemoteSource

export type ResolvedTemplateSource =
    | ResolvedLocalTemplateSource
    | ResolvedNextCliTemplateSource
    | ResolvedRemoteTemplateSource