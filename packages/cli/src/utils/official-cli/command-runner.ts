import { spawn } from "node:child_process"
import type { CommandInvocation, CommandRunner } from "./types.js"

export async function runInvocation(
  invocation: CommandInvocation,
  commandRunner: CommandRunner,
) {
  await commandRunner(invocation.command, invocation.args, invocation.options)
}

export async function runCommand(
  command: string,
  args: string[],
  options?: {
    cwd?: string
  },
) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      // Reuse the current terminal streams so users can follow scaffold output.
      stdio: "inherit",
    })

    child.once("error", reject)
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      if (signal) {
        reject(new Error(`Command terminated by signal: ${signal}`))
        return
      }

      reject(new Error(`Command failed: ${command} ${args.join(" ")}`))
    })
  })
}

