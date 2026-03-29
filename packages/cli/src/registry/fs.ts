import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REGISTRY_ROOT = path.resolve(__dirname, "../../registry")

export function resolveRegistryRoot() {
  return REGISTRY_ROOT
}

export function resolveRegistrySourcePath(source: string) {
  return path.resolve(REGISTRY_ROOT, source)
}

export function readRegistrySourceFile(source: string) {
  const filePath = resolveRegistrySourcePath(source)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Registry 源文件不存在: ${source}`)
  }

  return fs.readFileSync(filePath, "utf-8")
}
