import { spawn } from "node:child_process"
import type { PackageManager } from "./package-manager.js"
import { logger } from "./logger.js"

const NPX_COMMAND = process.platform === "win32" ? "npx.cmd" : "npx"
// 不同包管理器在不同平台下的可执行文件名不一致，这里统一做一层映射。
const PACKAGE_MANAGER_COMMANDS: Record<PackageManager, string> = {
  pnpm: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  npm: process.platform === "win32" ? "npm.cmd" : "npm",
  yarn: process.platform === "win32" ? "yarn.cmd" : "yarn",
  bun: "bun",
}

export interface CreateNextAppOptions {
  packageManager: PackageManager
  packageSpec: string
  targetDir: string
  yes?: boolean
}

export type CommandRunner = (
  command: string,
  args: string[],
  options?: {
    cwd?: string
  },
) => Promise<void>

export function buildCreateNextAppArgs(options: CreateNextAppOptions): string[] {
  if (!options.yes) {
    return [
      options.packageSpec,
      options.targetDir,
      `--use-${options.packageManager}`,
      "--skip-install",
    ]
  }

  return [
    options.packageSpec,
    options.targetDir,
    "--typescript",
    "--eslint",
    "--tailwind",
    "--app",
    "--no-src-dir",
    "--no-import-alias",
    `--use-${options.packageManager}`,
    "--turbopack",
    "--skip-install",
    "--yes",
  ]
}

export function buildInstallArgs(packageManager: PackageManager): string[] {
  if (packageManager === "pnpm") {
    // CLI 运行在 monorepo 根目录时，避免新项目被父级 workspace 误吸纳。
    return ["install", "--ignore-workspace"]
  }

  return ["install"]
}

export function buildAddDependencyArgs(
  packageManager: PackageManager,
  packages: string[],
  options?: {
    dev?: boolean
  },
): string[] {
  const devFlag = options?.dev

  if (packageManager === "npm") {
    return devFlag
      ? ["install", "--save-dev", ...packages]
      : ["install", ...packages]
  }

  if (packageManager === "yarn" || packageManager === "bun") {
    return devFlag ? ["add", "--dev", ...packages] : ["add", ...packages]
  }

  return devFlag ? ["add", "--save-dev", ...packages] : ["add", ...packages]
}

export async function installProjectDependencies(
  targetDir: string,
  packageManager: PackageManager,
  commandRunner: CommandRunner = runCommand,
) {
  logger.info("正在安装项目依赖...")
  await commandRunner(
    PACKAGE_MANAGER_COMMANDS[packageManager],
    buildInstallArgs(packageManager),
    { cwd: targetDir },
  )
}

export async function installPackages(
  targetDir: string,
  packageManager: PackageManager,
  packages: string[],
  options?: {
    dev?: boolean
  },
  commandRunner: CommandRunner = runCommand,
) {
  if (packages.length === 0) {
    return
  }

  logger.info(
    options?.dev ? "正在安装开发依赖..." : "正在安装项目运行依赖...",
  )

  await commandRunner(
    PACKAGE_MANAGER_COMMANDS[packageManager],
    buildAddDependencyArgs(packageManager, packages, options),
    { cwd: targetDir },
  )
}

export async function delegateToNextCli(
  options: CreateNextAppOptions,
  commandRunner: CommandRunner = runCommand,
) {
  await commandRunner(NPX_COMMAND, buildCreateNextAppArgs(options))
  await installProjectDependencies(
    options.targetDir,
    options.packageManager,
    commandRunner,
  )
}

async function runCommand(
  command: string,
  args: string[],
  options?: {
    cwd?: string
  },
) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      // 直接复用当前终端输出，方便用户看到脚手架和安装过程。
      stdio: "inherit",
    })

    child.once("error", reject)
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      if (signal) {
        reject(new Error(`命令被信号终止: ${signal}`))
        return
      }

      reject(new Error(`命令执行失败: ${command} ${args.join(" ")}`))
    })
  })
}
