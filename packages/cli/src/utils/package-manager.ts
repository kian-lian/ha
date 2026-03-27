export type PackageManager = "pnpm" | "npm" | "yarn" | "bun"

const PACKAGE_MANAGERS: PackageManager[] = ["pnpm", "npm", "yarn", "bun"]

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
