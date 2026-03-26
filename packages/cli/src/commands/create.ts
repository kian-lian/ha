import { Command } from "commander"
import fs from "fs"
import ora from "ora"
import path from "path"
import prompts from "prompts"
import { copyTemplate } from "../utils/copy-template.js"
import { highlighter } from "../utils/highlighter.js"
import { logger } from "../utils/logger.js"
import { validateProjectName } from "../utils/validate.js"

const TEMPLATES = [
  { title: "Next.js App", value: "next-app", description: "Next.js 应用" },
  { title: "React Library", value: "react-lib", description: "React 组件库" },
  { title: "Node Service", value: "node-service", description: "Node.js 服务" },
]

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
      if (!projectName) process.exit(0) // 用户取消
    } else {
      const valid = validateProjectName(projectName)

      if (valid !== true) {
        logger.error(valid)
      }
    }

    const { template } = await prompts({
      type: "select",
      name: "template",
      message: "选择模板",
      choices: TEMPLATES,
    })

    if (!template) process.exit(0)

    const targetDir = path.resolve(process.cwd(), projectName)

    if (fs.existsSync(targetDir)) {
      logger.error(`目录 ${projectName} 已存在`)
      process.exit(1)
    }

    const spinner = ora("正在创建项目...").start()
    try {
      await copyTemplate(template, targetDir, { projectName })
      spinner.succeed(highlighter.success("项目创建成功!"))
    } catch (err) {
      spinner.fail(highlighter.error("创建失败"))
      console.error(err)
      process.exit(1)
    }

    // 5. 完成提示
    logger.log()
    logger.log(`  cd ${projectName}`)
    logger.log(`  pnpm install`)
    logger.log(`  pnpm dev`)
    logger.log()
  })
