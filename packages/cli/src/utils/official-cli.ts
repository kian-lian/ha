import { spawn } from "node:child_process"
import type { PackageManager } from "./package-manager.js"
import { logger } from "./logger.js"

const NPX_COMMAND = process.platform === "win32" ? "npx.cmd" : "npx"
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
}

export type CommandRunner = (
  command: string,
  args: string[],
  options?: {
    cwd?: string
  },
) => Promise<void>

export function buildCreateNextAppArgs(options: CreateNextAppOptions): string[] {
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
    return ["install", "--ignore-workspace"]
  }

  return ["install"]
}

export async function delegateToNextCli(
  options: CreateNextAppOptions,
  commandRunner: CommandRunner = runCommand,
) {
  logger.info("正在委托 Next.js 官方 CLI 创建项目...")
  await commandRunner(NPX_COMMAND, buildCreateNextAppArgs(options))
  logger.info("正在安装项目依赖...")
  await commandRunner(
    PACKAGE_MANAGER_COMMANDS[options.packageManager],
    buildInstallArgs(options.packageManager),
    { cwd: options.targetDir },
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
