import { Command } from "commander"
import path from "node:path"
import prompts from "prompts"
import {
    createDefaultLoomConfig,
    hasLoomConfig,
    isReactTypeScriptProject,
    resolveLoomConfigPath,
    writeLoomConfig,
} from "../config/index.js"
import type { LoomConfig } from "../config/schema.js"
import { logger } from "../utils/logger.js"

export interface InitProjectOptions {
    cwd: string
    yes?: boolean
    hooksAlias?: string
    hooksDir?: string
}

interface InitProjectDeps {
    prompt?: typeof prompts
}

export async function initProject(
    options: InitProjectOptions,
    deps: InitProjectDeps = {},
): Promise<{
    config: LoomConfig
    configPath: string
}> {
    const projectCwd = path.resolve(options.cwd)

    if (!isReactTypeScriptProject(projectCwd)) {
        throw new Error("loom-cli init 目前只支持 React + TypeScript 项目")
    }

    if (hasLoomConfig(projectCwd)) {
        throw new Error("当前目录已存在 loom.json")
    }

    const prompt = deps.prompt ?? prompts
    const defaults = createDefaultLoomConfig(projectCwd)

    let hooksDir = options.hooksDir ?? defaults.paths.hooks
    let hooksAlias = options.hooksAlias ?? defaults.aliases.hooks

    if (!options.yes) {
        const answers = await prompt([
            {
                type: options.hooksDir ? null : "text",
                name: "hooksDir",
                message: "Hooks 目录",
                initial: hooksDir,
                validate: (value: string) =>
                    value.trim().length > 0 || "Hooks 目录不能为空",
            },
            {
                type: options.hooksAlias !== undefined ? null : "text",
                name: "hooksAlias",
                message: "Hooks 别名（可留空）",
                initial: hooksAlias ?? "",
            },
        ])

        hooksDir = answers.hooksDir ?? hooksDir
        hooksAlias = normalizeOptionalString(answers.hooksAlias) ?? hooksAlias
    }

    const config = {
        paths: {
            hooks: hooksDir,
        },
        aliases: hooksAlias
            ? {
                hooks: hooksAlias,
            }
            : {},
        registries: {
            default: defaults.registries.default,
            items: defaults.registries.items,
        },
    } satisfies LoomConfig

    writeLoomConfig(projectCwd, config)

    return {
        config,
        configPath: resolveLoomConfigPath(projectCwd),
    }
}

function normalizeOptionalString(value: unknown) {
    if (typeof value !== "string") {
        return undefined
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
}

export const initCommand = new Command("init")
    .description("Initialize loom.json for a React + TypeScript project")
    .option("--cwd <path>", "Project root", ".")
    .option("--hooks-dir <path>", "Hooks directory")
    .option("--hooks-alias <alias>", "Hooks alias")
    .option("-y, --yes", "Skip prompts and use defaults", false)
    .action(
        async (opts?: {
            cwd?: string
            yes?: boolean
            hooksAlias?: string
            hooksDir?: string
        }) => {
            try {
                const result = await initProject({
                    cwd: opts?.cwd ?? process.cwd(),
                    yes: opts?.yes,
                    hooksAlias: opts?.hooksAlias,
                    hooksDir: opts?.hooksDir,
                })

                logger.success("loom.json 初始化成功!")
                logger.log()
                logger.log(`  ${result.configPath}`)
                logger.log()
            } catch (error) {
                logger.error(error instanceof Error ? error.message : "初始化失败")
                if (!(error instanceof Error)) {
                    console.error(error)
                }
                process.exit(1)
            }
        },
    )
