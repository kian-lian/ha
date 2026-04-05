import { Command, InvalidOptionArgumentError } from "commander"
import { logger } from "../utils/logger.js"
import { templates } from "../templates/index.js"
import { createProject } from "../utils/create-project.js"
import {
  isPackageManager,
  PACKAGE_MANAGERS,
  type PackageManager,
} from "../utils/package-manager.js"

interface CreateCommandDeps {
  createProject?: typeof createProject
  exit?: (code: number) => never | void
  logger?: Pick<typeof logger, "error" | "log" | "success">
}

function parsePackageManager(value: string): PackageManager {
  if (!isPackageManager(value)) {
    throw new InvalidOptionArgumentError(
      `包管理器必须是 ${PACKAGE_MANAGERS.join("、")} 之一`,
    )
  }

  return value
}

function formatRunScriptCommand(
  packageManager: PackageManager,
  scriptName: string,
) {
  if (packageManager === "npm") {
    return `npm run ${scriptName}`
  }

  return `${packageManager} ${scriptName}`
}

export function createCreateCommand(deps: CreateCommandDeps = {}) {
  const createProjectImpl = deps.createProject ?? createProject
  const commandLogger = deps.logger ?? logger
  const exit = deps.exit ?? ((code: number) => process.exit(code))

  return new Command("create")
    .description("Create a new project from template")
    .argument("[project-name]", "Project name")
    .option(
      "-t, --template <template>",
      `Template name (${Object.keys(templates).join(", ")})`,
    )
    .option(
      "-p, --package-manager <package-manager>",
      `Package manager (${PACKAGE_MANAGERS.join(", ")})`,
      parsePackageManager,
    )
    .option("-y, --yes", "Skip prompts and use defaults", false)
    .action(async (
      argName?: string,
      opts?: {
        packageManager?: PackageManager
        template?: string
        yes?: boolean
      },
    ) => {
      try {
        const result = await createProjectImpl({
          cwd: process.cwd(),
          name: argName,
          packageManager: opts?.packageManager,
          template: opts?.template,
          yes: opts?.yes,
        })

        commandLogger.success("项目创建成功!")
        commandLogger.log()
        commandLogger.log(`  cd ${result.projectName}`)
        if (!result.dependenciesInstalled) {
          commandLogger.log(`  ${result.packageManager} install`)
        }
        commandLogger.log(`  ${formatRunScriptCommand(result.packageManager, "dev")}`)
        commandLogger.log()
      } catch (error) {
        commandLogger.error(error instanceof Error ? error.message : "创建失败")
        if (!(error instanceof Error)) {
          console.error(error)
        }
        exit(1)
      }
    })
}

export const createCommand = createCreateCommand()
