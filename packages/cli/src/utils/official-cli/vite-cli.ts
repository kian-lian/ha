import { getPackageManagerExecutable } from "./package-manager-strategies.js"
import { runCommand } from "./command-runner.js"
import { scaffoldWithOfficialCli } from "./scaffold-workflow.js"
import type { CreateViteAppOptions, CommandInvocation, CommandRunner } from "./types.js"

export function buildCreateViteCommand(options: CreateViteAppOptions): {
  args: string[]
  command: string
} {
  const command = getPackageManagerExecutable(options.packageManager)

  if (options.packageManager === "npm") {
    const args = ["create", "vite@latest", options.targetDir]

    if (!options.yes) {
      return { args, command }
    }

    return {
      args: [...args, "--", "--template", "react-ts", "--no-interactive"],
      command,
    }
  }

  const args = ["create", "vite", options.targetDir]

  if (!options.yes) {
    return { args, command }
  }

  return {
    args: [...args, "--template", "react-ts", "--no-interactive"],
    command,
  }
}

export async function delegateToViteCli(
  options: CreateViteAppOptions,
  commandRunner: CommandRunner = runCommand,
) {
  await scaffoldWithOfficialCli(
    createViteCliInvocation(options),
    options.targetDir,
    options.packageManager,
    commandRunner,
  )
}

function createViteCliInvocation(
  options: CreateViteAppOptions,
): CommandInvocation {
  return buildCreateViteCommand(options)
}

