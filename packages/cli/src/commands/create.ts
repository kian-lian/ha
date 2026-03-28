import { Command } from "commander"
import { logger } from "../utils/logger.js"
import { templates } from "../templates/index.js"
import { createProject } from "../utils/create-project.js"

export const createCommand = new Command("create")
  .description("Create a new project from template")
  .argument("[project-name]", "Project name")
  .option(
    "-t, --template <template>",
    `Template name (${Object.keys(templates).join(", ")})`,
  )
  .option("-y, --yes", "Skip prompts and use defaults", false)
  .action(async (argName?: string, opts?: { template?: string; yes?: boolean }) => {

    try {
      const result = await createProject({
        cwd: process.cwd(),
        name: argName,
        template: opts?.template,
        yes: opts?.yes,
      })

      logger.success("项目创建成功!")
      logger.log()
      logger.log(`  cd ${result.projectName}`)
      if (!result.dependenciesInstalled) {
        logger.log(`  ${result.packageManager} install`)
      }
      logger.log(`  ${result.packageManager} dev`)
      logger.log()
    } catch (error) {
      logger.error(error instanceof Error ? error.message : "创建失败")
      if (!(error instanceof Error)) {
        console.error(error)
      }
      process.exit(1)
    }
  })
