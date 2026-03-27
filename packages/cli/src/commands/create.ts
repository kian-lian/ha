import { Command } from "commander"
import fs from "fs"
import path from "path"
import prompts from "prompts"
import { fetchTemplate } from "../utils/template.js"
import { logger } from "../utils/logger.js"
import { detectPackageManager } from "../utils/package-manager.js"
import { validateProjectName } from "../utils/validate.js"

const TEMPLATES = [
  {
    title: "Next.js App",
    description: "Next.js 应用（委托官方 create-next-app）",
    repo: "next-cli:create-next-app@16.2.1",
  },
  {
    title: "Vite React",
    description: "Vite + React + TypeScript（来自官方）",
    repo: "github:vitejs/vite/packages/create-vite/template-react-ts#main",
  },
]

// prompts `select` expects choices with `title`, `description`, and `value`
const TEMPLATE_CHOICES = TEMPLATES.map((t) => ({
  title: t.title,
  description: t.description,
  value: t,
}))

export const createCommand = new Command("create")
  .description("Create a new project from template")
  .argument("[project-name]", "Project name")
  .action(async (argName?: string) => {
    let projectName = argName
    if (!projectName) {
      const res = await prompts({
        type: "text",
        name: "projectName",
        message: "项目名称:",
        validate: (v) => validateProjectName(v),
      })

      projectName = res.projectName
      if (!projectName) process.exit(0)
    } else {
      const valid = validateProjectName(projectName)

      if (valid !== true) {
        logger.error(valid)
        process.exit(1)
      }
    }

    const { selected } = await prompts({
      type: "select",
      name: "selected",
      message: "选择模板",
      choices: TEMPLATE_CHOICES,
    })

    if (!selected) process.exit(0)

    const targetDir = path.resolve(process.cwd(), projectName)

    if (fs.existsSync(targetDir)) {
      logger.error(`目录 ${projectName} 已存在`)
      process.exit(1)
    }

    try {
      const packageManager = detectPackageManager()
      const result = await fetchTemplate(selected.repo, targetDir, {
        projectName,
        packageManager,
      })
      logger.success("项目创建成功!")
      logger.log()
      logger.log(`  cd ${projectName}`)
      if (!result.dependenciesInstalled) {
        logger.log(`  ${packageManager} install`)
      }
      logger.log(`  ${packageManager} dev`)
      logger.log()
    } catch (err) {
      logger.error("创建失败")
      console.error(err)
      process.exit(1)
    }
  })
