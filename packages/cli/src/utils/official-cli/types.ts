import type { PackageManager } from "../package-manager.js"

export interface CreateNextAppOptions {
  packageManager: PackageManager
  packageSpec: string
  targetDir: string
  yes?: boolean
}

export interface CreateViteAppOptions {
  packageManager: PackageManager
  targetDir: string
  yes?: boolean
}

export interface CreateTurboAppOptions {
  packageManager: PackageManager
  targetDir: string
  yes?: boolean
}

export type CommandRunner = (
  command: string,
  args: string[],
  options?: {
    cwd?: string
  },
) => Promise<void>

export interface CommandInvocation {
  command: string
  args: string[]
  options?: {
    cwd?: string
  }
}
