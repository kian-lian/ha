import type {
    ParsedGitRemoteSource,
    ResolvedRemoteTemplateSource,
} from "./types.js"

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

export function resolveRemoteTemplateSource(repo: string): ResolvedRemoteTemplateSource {
    const parsedRepo = parseGitRemoteSource(repo)

    if (parsedRepo) {
        const normalizedGigetRepo = normalizeKnownGitProviderSource(parsedRepo.normalizedRepo)

        if (normalizedGigetRepo) {
            return {
                type: "giget",
                repo: appendTemplateSourceRef(normalizedGigetRepo, parsedRepo.ref),
            }
        }

        if (isDirectGigetSource(parsedRepo.normalizedRepo)) {
            return {
                type: "giget",
                repo: appendTemplateSourceRef(parsedRepo.normalizedRepo, parsedRepo.ref),
            }
        }

        if (isGitCloneSource(parsedRepo.normalizedRepo)) {
            return {
                type: "git",
                repo: parsedRepo.normalizedRepo,
                ...(parsedRepo.ref ? { ref: parsedRepo.ref } : {}),
            }
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