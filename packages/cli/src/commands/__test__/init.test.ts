import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { initProject } from "../init.js"

test("initProject writes loom.json with detected defaults", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-init-"))

    try {
        fs.mkdirSync(path.join(tmpRoot, "src"), { recursive: true })

        fs.writeFileSync(
            path.join(tmpRoot, "package.json"),
            JSON.stringify(
                {
                    name: "demo-app",
                    private: true,
                    dependencies: {
                        react: "^19.0.0",
                        "react-dom": "^19.0.0",
                    },
                    devDependencies: {
                        typescript: "^5.0.0",
                    },
                },
                null,
                2,
            ),
        )

        fs.writeFileSync(
            path.join(tmpRoot, "tsconfig.json"),
            JSON.stringify(
                {
                    compilerOptions: {
                        paths: {
                            "@/*": ["./*"],
                        },
                    },
                },
                null,
                2,
            ),
        )

        const result = await initProject({
            cwd: tmpRoot,
            yes: true,
        })

        assert.equal(result.config.paths.hooks, "src/hooks")
        assert.equal(result.config.aliases.hooks, "@/hooks")
        assert.equal(result.config.registries.default, "@loom")
        assert.equal(
            result.config.registries.items["@loom"],
            "http://localhost:3001/r/{name}.json",
        )

        const saved = JSON.parse(
            fs.readFileSync(path.join(tmpRoot, "loom.json"), "utf-8"),
        )

        assert.deepEqual(saved, {
            paths: {
                hooks: "src/hooks",
            },
            aliases: {
                hooks: "@/hooks",
            },
            registries: {
                default: "@loom",
                items: {
                    "@loom": "http://localhost:3001/r/{name}.json",
                },
            },
        })
    } finally {
        fs.rmSync(tmpRoot, { force: true, recursive: true })
    }
})

test("initProject rejects non React + TypeScript projects", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-init-"))

    try {
        fs.writeFileSync(
            path.join(tmpRoot, "package.json"),
            JSON.stringify(
                {
                    name: "not-react",
                    private: true,
                },
                null,
                2,
            ),
        )

        await assert.rejects(
            () =>
                initProject({
                    cwd: tmpRoot,
                    yes: true,
                }),
            /只支持 React \+ TypeScript 项目/,
        )
    } finally {
        fs.rmSync(tmpRoot, { force: true, recursive: true })
    }
})
