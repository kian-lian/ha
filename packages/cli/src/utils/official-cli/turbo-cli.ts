import type {
  CommandInvocation,
  CommandRunner,
  CreateTurboAppOptions,
} from "./types.js"
import { runCommand } from "./command-runner.js"
import { scaffoldWithOfficialCli } from "./scaffold-workflow.js"

const NPX_COMMAND = process.platform === "win32" ? "npx.cmd" : "npx"
const PNPM_COMMAND = process.platform === "win32" ? "pnpm.cmd" : "pnpm"
const YARN_COMMAND = process.platform === "win32" ? "yarn.cmd" : "yarn"
const BUNX_COMMAND = process.platform === "win32" ? "bunx.cmd" : "bunx"

export function buildCreateTurboArgs(options: CreateTurboAppOptions): string[] {
  return [
    "create-turbo@latest",
    options.targetDir,
    "--skip-install",
    "--package-manager",
    options.packageManager,
  ]
}

export async function delegateToTurboCli(
  options: CreateTurboAppOptions,
  commandRunner: CommandRunner = runCommand,
) {
  await scaffoldWithOfficialCli(
    createTurboCliInvocation(options),
    options.targetDir,
    options.packageManager,
    commandRunner,
  )
}

function createTurboCliInvocation(
  options: CreateTurboAppOptions,
): CommandInvocation {
  const args = buildCreateTurboArgs(options)

  switch (options.packageManager) {
    case "npm":
      return {
        command: NPX_COMMAND,
        args,
      }
    case "pnpm":
      return {
        command: PNPM_COMMAND,
        args: ["dlx", ...args],
      }
    case "yarn":
      return {
        command: YARN_COMMAND,
        args: ["dlx", ...args],
      }
    case "bun":
      return {
        command: BUNX_COMMAND,
        args,
      }
  }
}
