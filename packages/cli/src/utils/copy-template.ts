import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const SKIP_DIRS = new Set(["node_modules", ".next", ".git"])

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface CopyOptions {
  projectName: string
}

export async function copyTemplate(
  templateName: string,
  targetDir: string,
  options: CopyOptions,
) {
  const templateDir = path.resolve(__dirname, "../../templates", templateName)

  if (!fs.existsSync(templateDir)) {
    throw new Error(`模板 "${templateName}" 不存在`)
  }

  fs.mkdirSync(targetDir, { recursive: true })
  copyDir(templateDir, targetDir, options)
}

function copyDir(src: string, dest: string, options: CopyOptions) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue // 跳过该文件
      fs.mkdirSync(destPath, { recursive: true })
      copyDir(srcPath, destPath, options)
    } else {
      let content = fs.readFileSync(srcPath, "utf-8")
      content = content.replaceAll("{{projectName}}", options.projectName)
      fs.writeFileSync(destPath, content)
    }
  }
}
