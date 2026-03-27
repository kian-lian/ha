# CLI 远程模板拉取方案

## 背景

当前 `@loom/cli` 的 `create` 命令从本地 `templates/` 目录复制文件创建项目。随着模板种类增多，本地维护所有模板存在以下问题：

- CLI 包体积随模板数量线性增长
- 模板更新需要发新版 CLI
- 无法复用官方框架提供的高质量示例模板

需要支持从远程 Git 仓库拉取模板，同时保留本地模板能力。
®
## 方案选型

| 方案 | 库 | 代表项目 | 优缺点 |
|------|-----|---------|--------|
| A | `giget` | Nuxt CLI, unbuild | 轻量、支持 GitHub/GitLab/Bitbucket、可指定子目录和分支、自带缓存 |
| B | `degit` / `tiged` | Svelte | 经典方案，但 degit 已停更，tiged 是社区 fork |
| C | 手动下载 tarball | create-vite | 无额外依赖，但需要自己处理解压、子目录提取、错误重试 |

**推荐方案 A — `giget`**：unjs 生态维护活跃，API 简洁，内置缓存（`~/.giget/`），支持离线回退。

## 模板配置设计

采用混合模式：每个模板独立配置来源，支持远程仓库和本地目录两种来源。

```ts
interface TemplateConfig {
  title: string           // 显示名称
  value: string           // 模板标识
  description: string     // 描述
  repo: string            // 来源，格式见下方
}
```

`repo` 字段格式：

- **远程仓库**：`github:owner/repo/subdir#ref`（giget 标准格式）
- **本地目录**：`local:模板目录名`（保持向后兼容）

示例：

```ts
const TEMPLATES: TemplateConfig[] = [
  {
    title: "Next.js App",
    value: "next-app",
    description: "Next.js 应用（来自官方示例）",
    repo: "github:vercel/next.js/examples/hello-world#canary",
  },
  {
    title: "Vite React",
    value: "vite-react",
    description: "Vite + React + TypeScript",
    repo: "github:vitejs/vite/packages/create-vite/template-react-ts#main",
  },
  {
    title: "Custom Template",
    value: "custom",
    description: "团队自定义模板",
    repo: "github:your-org/loom-templates/custom#main",
  },
  {
    title: "Next.js App (本地)",
    value: "next-app-local",
    description: "本地 Next.js 模板",
    repo: "local:next-app",
  },
]
```

## 需要修改的文件

### 1. `packages/cli/package.json`

新增依赖：

```diff
  "dependencies": {
+   "giget": "^2.0.0",
    "chalk": "^5.6.2",
    ...
  }
```

### 2. `packages/cli/src/utils/copy-template.ts`

新增远程下载函数，保留原有本地复制逻辑：

```ts
import { downloadTemplate as gigetDownload } from "giget"
import ora from "ora"

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  ".turbo",
  ".cache",
])

// 统一入口：根据 repo 前缀决定走本地还是远程
export async function fetchTemplate(
  repo: string,
  targetDir: string,
  options: CopyOptions,
) {
  if (repo.startsWith("local:")) {
    const templateName = repo.slice("local:".length)
    return copyTemplate(templateName, targetDir, options)
  }

  // 远程下载
  const spinner = ora("正在下载模板...").start()
  try {
    await gigetDownload(repo, { dir: targetDir, force: false })
    spinner.succeed("模板下载完成")
  } catch (error: any) {
    spinner.fail("模板下载失败")

    // 错误处理
    if (error.statusCode === 404) {
      throw new Error(`模板仓库不存在: ${repo}`)
    }
    if (error.statusCode === 403) {
      throw new Error(`GitHub API 限流，请稍后重试或设置 GITHUB_TOKEN 环境变量`)
    }
    if (error.code === "ENOTFOUND" || error.code === "ETIMEDOUT") {
      throw new Error(`网络连接失败，请检查网络或使用本地模板`)
    }
    throw error
  }

  // 验证模板
  await validateTemplate(targetDir)

  // 下载完成后做变量替换
  replaceInDir(targetDir, options)
}

// 验证模板结构
async function validateTemplate(dir: string) {
  const pkgPath = path.join(dir, "package.json")
  if (!fs.existsSync(pkgPath)) {
    throw new Error("模板无效：缺少 package.json 文件")
  }
}

// 递归替换目录内文件中的模板变量
function replaceInDir(dir: string, options: CopyOptions) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      replaceInDir(fullPath, options)
    } else {
      const content = fs.readFileSync(fullPath, "utf-8")
      const replaced = content.replaceAll("{{projectName}}", options.projectName)
      if (replaced !== content) {
        fs.writeFileSync(fullPath, replaced)
      }
    }
  }
}
```

### 3. `packages/cli/src/commands/create.ts`

修改模板配置和调用逻辑：

```ts
const TEMPLATES: TemplateConfig[] = [
  {
    title: "Next.js App",
    value: "next-app",
    description: "Next.js 应用（本地模板）",
    repo: "local:next-app",
  },
  {
    title: "Vite React",
    value: "vite-react",
    description: "Vite + React + TypeScript（来自官方）",
    repo: "github:vitejs/vite/packages/create-vite/template-react-ts#main",
  },
]

// 调用改为
await fetchTemplate(selected.repo, targetDir, { projectName })
```

错误处理已在 `fetchTemplate()` 中统一处理，包括：
- 404 错误：模板仓库不存在
- 403 错误：GitHub API 限流
- 网络错误：连接失败或超时

## 不做的事

- **不加模板缓存逻辑**：giget 自带缓存在 `~/.giget/`
- **不加外部配置文件**：模板列表直接写在代码中，后续按需扩展为 JSON 配置
- **不删除本地 templates 目录**：通过 `local:` 前缀向后兼容
- **不加 GitHub Token 配置**：giget 默认走 tarball 下载，不需要认证（公开仓库）

## 实现要点总结

### 核心改动
1. **新增依赖**：`giget ^2.0.0`
2. **统一入口**：`fetchTemplate()` 根据 `local:` 前缀分发本地/远程逻辑
3. **错误处理**：404/403/网络错误的友好提示
4. **模板验证**：检查 `package.json` 是否存在
5. **进度反馈**：使用 `ora` spinner 显示下载状态

### 关键常量
```ts
const SKIP_DIRS = new Set([
  "node_modules", ".next", ".git",
  "dist", "build", ".turbo", ".cache"
])
```

## 后续可扩展

- 支持 `--template` 参数直接指定 giget 格式的远程地址
- 支持从 `~/.loom/templates.json` 读取自定义模板列表
- 支持 `GITHUB_TOKEN` 环境变量以访问私有仓库
- 扩展变量替换（`{{author}}`、`{{description}}` 等）
- 支持模板 postinstall 钩子（如自动 `pnpm install`）

## 验证步骤

```bash
# 1. 安装依赖
cd packages/cli && pnpm install

# 2. 构建
pnpm build

# 3. 测试远程模板
node dist/index.js create test-remote
# 选择 Next.js App → 应从 GitHub 下载

# 4. 测试本地模板
node dist/index.js create test-local
# 选择本地模板 → 应从 templates/ 复制

# 5. 验证目标目录内容正确
ls test-remote/
ls test-local/

# 6. 清理
rm -rf test-remote test-local
```
