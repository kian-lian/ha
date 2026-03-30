import type { ResolvedRegistryItemManifest } from "../registry/schema.js"
import type { PackageManager } from "../utils/package-manager.js"
import {
  installPackages,
  type CommandRunner,
} from "../utils/official-cli.js"

export interface InstallRegistryItemDependenciesOptions {
  cwd: string
  items: ResolvedRegistryItemManifest[]
  packageManager: PackageManager
}

interface InstallRegistryItemDependenciesDeps {
  installPackages?: (
    targetDir: string,
    packageManager: PackageManager,
    packages: string[],
    options?: {
      dev?: boolean
    },
    commandRunner?: CommandRunner,
  ) => Promise<void>
}

export async function installRegistryItemDependencies(
  options: InstallRegistryItemDependenciesOptions,
  deps: InstallRegistryItemDependenciesDeps = {},
) {
  const installPackagesFn = deps.installPackages ?? installPackages
  const dependencies = collectUniquePackages(options.items, "dependencies")
  const devDependencies = collectUniquePackages(options.items, "devDependencies")
    .filter((packageName) => !dependencies.includes(packageName))

  if (dependencies.length > 0) {
    await installPackagesFn(
      options.cwd,
      options.packageManager,
      dependencies,
      { dev: false },
    )
  }

  if (devDependencies.length > 0) {
    await installPackagesFn(
      options.cwd,
      options.packageManager,
      devDependencies,
      { dev: true },
    )
  }
}

function collectUniquePackages(
  items: ResolvedRegistryItemManifest[],
  field: "dependencies" | "devDependencies",
) {
  const packageNames = new Set<string>()

  for (const item of items) {
    for (const packageName of item[field]) {
      packageNames.add(packageName)
    }
  }

  return [...packageNames]
}
