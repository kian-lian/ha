import type { CreateNextAppOptions, CommandInvocation, CommandRunner } from "./types.js"
import { runCommand } from "./command-runner.js"
import { scaffoldWithOfficialCli } from "./scaffold-workflow.js"

const NPX_COMMAND = process.platform === "win32" ? "npx.cmd" : "npx"

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

export async function delegateToNextCli(
  options: CreateNextAppOptions,
  commandRunner: CommandRunner = runCommand,
) {
  await scaffoldWithOfficialCli(
    createNextCliInvocation(options),
    options.targetDir,
    options.packageManager,
    commandRunner,
  )
}

function createNextCliInvocation(
  options: CreateNextAppOptions,
): CommandInvocation {
  return {
    command: NPX_COMMAND,
    args: buildCreateNextAppArgs(options),
  }
}

