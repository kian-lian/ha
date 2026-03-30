import { Command } from "commander"
import { addItems } from "../add/add-items.js"
import { installRegistryItemDependencies } from "../add/install-dependencies.js"
import { installRegistryItems } from "../add/install-items.js"
import { logger } from "../utils/logger.js"
import { detectPackageManagerForProject } from "../utils/package-manager.js"

export const addCommand = new Command("add")
  .description("Add hooks from the Loom registry")
  .argument("[items...]", "Hook names from registry")
  .option("--cwd <path>", "Project root", ".")
  .option("--overwrite", "Overwrite existing files", false)
  .option("-y, --yes", "Skip prompts and use defaults", false)
  .action(
    async (
      itemNames: string[] = [],
      opts?: {
        cwd?: string
        overwrite?: boolean
        yes?: boolean
      },
    ) => {
      try {
        const cwd = opts?.cwd ?? process.cwd()

        const parsed = await addItems({
          cwd,
          items: itemNames,
          yes: opts?.yes,
        })

        const installed = installRegistryItems({
          cwd,
          config: parsed.config,
          items: parsed.items,
          overwrite: opts?.overwrite,
        })
        const packageManager = detectPackageManagerForProject(cwd)

        await installRegistryItemDependencies({
          cwd,
          items: parsed.items,
          packageManager,
        })

        logger.success("hooks 添加成功!")
        logger.log()
        logger.log(`  目标目录: ${parsed.config.paths.hooks}`)

        if (parsed.config.aliases.hooks) {
          logger.log(`  Hook 别名: ${parsed.config.aliases.hooks}`)
        }

        logger.log("  已安装项:")
        for (const item of installed.items) {
          logger.log(`    - ${item.name}`)
        }

        logger.log("  已写入文件:")
        for (const filePath of installed.files) {
          logger.log(`    - ${filePath}`)
        }

        logger.log(`  包管理器: ${packageManager}`)

        logger.log()
      } catch (error) {
        logger.error(error instanceof Error ? error.message : "添加失败")
        if (!(error instanceof Error)) {
          console.error(error)
        }
        process.exit(1)
      }
    },
  )
