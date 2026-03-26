根据文章内容，shadcn CLI 使用了以下 Node.js 工具包：

| 包名                | 用途                                                          |
| ------------------- | ------------------------------------------------------------- |
| **commander**       | 注册 CLI 命令、解析参数、执行操作                             |
| **prompts**         | CLI 交互式问答（如 init 时的配置选择）                        |
| **zod**             | 数据 schema 定义与验证（校验命令行参数、注册组件 schema 等）  |
| **cosmiconfig**     | 查找和读取 json/yml 等配置文件（如 `components.json`）        |
| **tsconfig-paths**  | 解析 `tsconfig.json` 中 `paths` 别名为绝对路径                |
| **chalk**           | 终端彩色输出                                                  |
| **ora**             | 终端 loading 动画（如 `Installing dependencies...`）          |
| **execa**           | 执行子进程命令（如调用 npm/pnpm install）                     |
| **@antfu/ni**       | 自动检测项目使用的包管理器（npm/pnpm/yarn/bun）               |
| **ts-morph**        | TypeScript AST 解析与代码转换（替换 import 路径、CSS 变量等） |
| **diff**            | 对比本地与远端组件代码差异（`diff` 命令）                     |
| **node-fetch**      | 从远端 registry 拉取组件 JSON 和源码                          |
| **tsx**             | 直接执行 TypeScript 文件（构建 registry 脚本）                |
| **lodash.template** | 模板字符串替换（生成 `tailwind.config` 内容）                 |
| **rimraf**          | 删除文件（构建 registry 时清理旧文件）                        |

其中对我们当前 `@repo/cli` 最实用的几个是：**commander**（比内置 `parseArgs` 功能更强）、**prompts**（交互式问答）、**zod**（参数校验）、**chalk** + **ora**（终端体验）。
