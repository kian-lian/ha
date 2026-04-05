import { logger } from "../logger.js"
import type { PackageManager } from "../package-manager.js"
import {
  buildAddDependencyArgs,
  buildInstallArgs,
  getPackageManagerExecutable,
} from "./package-manager-strategies.js"
import { runCommand, runInvocation } from "./command-runner.js"
import type { CommandInvocation, CommandRunner } from "./types.js"

export async function installProjectDependencies(
  targetDir: string,
  packageManager: PackageManager,
  commandRunner: CommandRunner = runCommand,
) {
  logger.info("Installing project dependencies...")
  await runInvocation(
    createInstallInvocation(targetDir, packageManager),
    commandRunner,
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
    options?.dev
      ? "Installing development dependencies..."
      : "Installing runtime dependencies...",
  )

  await runInvocation(
    createAddPackagesInvocation(targetDir, packageManager, packages, options),
    commandRunner,
  )
}

function createInstallInvocation(
  targetDir: string,
  packageManager: PackageManager,
): CommandInvocation {
  return {
    command: getPackageManagerExecutable(packageManager),
    args: buildInstallArgs(packageManager),
    options: { cwd: targetDir },
  }
}

function createAddPackagesInvocation(
  targetDir: string,
  packageManager: PackageManager,
  packages: string[],
  options?: {
    dev?: boolean
  },
): CommandInvocation {
  return {
    command: getPackageManagerExecutable(packageManager),
    args: buildAddDependencyArgs(packageManager, packages, options),
    options: { cwd: targetDir },
  }
}

