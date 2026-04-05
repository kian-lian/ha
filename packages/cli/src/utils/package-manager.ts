import fs from "node:fs"
import path from "node:path"

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun"

export const PACKAGE_MANAGERS: readonly PackageManager[] = [
  "pnpm",
  "npm",
  "yarn",
  "bun",
]
const LOCK_FILE_CANDIDATES: Record<PackageManager, string[]> = {
  pnpm: ["pnpm-lock.yaml"],
  npm: ["package-lock.json"],
  yarn: ["yarn.lock"],
  bun: ["bun.lock", "bun.lockb"],
}

export function isPackageManager(value: string): value is PackageManager {
  return PACKAGE_MANAGERS.includes(value as PackageManager)
}

export function detectPackageManager(
  userAgent = process.env.npm_config_user_agent,
): PackageManager {
  if (userAgent) {
    for (const packageManager of PACKAGE_MANAGERS) {
      if (userAgent.startsWith(`${packageManager}/`)) {
        return packageManager
      }
    }
  }

  return "pnpm"
}

export function detectPackageManagerForProject(
  cwd: string,
  userAgent = process.env.npm_config_user_agent,
): PackageManager {
  for (const packageManager of PACKAGE_MANAGERS) {
    const lockFiles = LOCK_FILE_CANDIDATES[packageManager]
    const hasLockFile = lockFiles.some((lockFile) =>
      fs.existsSync(path.resolve(cwd, lockFile)),
    )

    if (hasLockFile) {
      return packageManager
    }
  }

  return detectPackageManager(userAgent)
}
