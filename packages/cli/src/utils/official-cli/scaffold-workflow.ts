import type { PackageManager } from "../package-manager.js"
import { installProjectDependencies } from "./dependency-installer.js"
import { runInvocation } from "./command-runner.js"
import type { CommandInvocation, CommandRunner } from "./types.js"

export async function scaffoldWithOfficialCli(
  scaffoldInvocation: CommandInvocation,
  targetDir: string,
  packageManager: PackageManager,
  commandRunner: CommandRunner,
) {
  await runInvocation(scaffoldInvocation, commandRunner)
  await installProjectDependencies(targetDir, packageManager, commandRunner)
}

