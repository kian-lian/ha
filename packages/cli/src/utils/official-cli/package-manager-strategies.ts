import type { PackageManager } from "../package-manager.js"

interface PackageManagerCommandStrategy {
  executable: string
  buildAddDependencyArgs(
    packages: string[],
    options?: {
      dev?: boolean
    },
  ): string[]
  buildInstallArgs(): string[]
}

const PACKAGE_MANAGER_EXECUTABLES: Record<PackageManager, string> = {
  pnpm: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  npm: process.platform === "win32" ? "npm.cmd" : "npm",
  yarn: process.platform === "win32" ? "yarn.cmd" : "yarn",
  bun: "bun",
}

const PACKAGE_MANAGER_STRATEGIES: Record<
  PackageManager,
  PackageManagerCommandStrategy
> = {
  pnpm: {
    executable: PACKAGE_MANAGER_EXECUTABLES.pnpm,
    buildAddDependencyArgs(packages, options) {
      return options?.dev
        ? ["add", "--save-dev", ...packages]
        : ["add", ...packages]
    },
    buildInstallArgs() {
      return ["install", "--ignore-workspace"]
    },
  },
  npm: {
    executable: PACKAGE_MANAGER_EXECUTABLES.npm,
    buildAddDependencyArgs(packages, options) {
      return options?.dev
        ? ["install", "--save-dev", ...packages]
        : ["install", ...packages]
    },
    buildInstallArgs() {
      return ["install"]
    },
  },
  yarn: {
    executable: PACKAGE_MANAGER_EXECUTABLES.yarn,
    buildAddDependencyArgs(packages, options) {
      return options?.dev
        ? ["add", "--dev", ...packages]
        : ["add", ...packages]
    },
    buildInstallArgs() {
      return ["install"]
    },
  },
  bun: {
    executable: PACKAGE_MANAGER_EXECUTABLES.bun,
    buildAddDependencyArgs(packages, options) {
      return options?.dev
        ? ["add", "--dev", ...packages]
        : ["add", ...packages]
    },
    buildInstallArgs() {
      return ["install"]
    },
  },
}

function getPackageManagerStrategy(
  packageManager: PackageManager,
): PackageManagerCommandStrategy {
  return PACKAGE_MANAGER_STRATEGIES[packageManager]
}

export function getPackageManagerExecutable(
  packageManager: PackageManager,
): string {
  return getPackageManagerStrategy(packageManager).executable
}

export function buildInstallArgs(packageManager: PackageManager): string[] {
  return getPackageManagerStrategy(packageManager).buildInstallArgs()
}

export function buildAddDependencyArgs(
  packageManager: PackageManager,
  packages: string[],
  options?: {
    dev?: boolean
  },
): string[] {
  return getPackageManagerStrategy(packageManager).buildAddDependencyArgs(
    packages,
    options,
  )
}

