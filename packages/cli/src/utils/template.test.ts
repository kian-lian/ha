import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  fetchTemplate,
  normalizeRemoteTemplateSource,
  parseGitRemoteSource,
} from "./template.js"

test("fetchTemplate delegates next-cli sources to the official Next.js CLI", async () => {
  const calls: unknown[] = []

  const result = await fetchTemplate(
    "next-cli:create-next-app@16.2.1",
    "/tmp/acme-web",
    {
      projectName: "acme-web",
      packageManager: "pnpm",
    },
    {
      delegateToNextCli: async (options) => {
        calls.push(options)
      },
    },
  )

  assert.deepEqual(calls, [
    {
      packageManager: "pnpm",
      packageSpec: "create-next-app@16.2.1",
      targetDir: "/tmp/acme-web",
    },
  ])
  assert.equal(result.dependenciesInstalled, true)
})

test("normalizeRemoteTemplateSource converts GitHub HTTPS URLs to giget format", () => {
  assert.equal(
    normalizeRemoteTemplateSource("https://github.com/kian-lian/ha.git"),
    "github:kian-lian/ha",
  )
})

test("normalizeRemoteTemplateSource converts GitHub SCP-style SSH URLs to giget format", () => {
  assert.equal(
    normalizeRemoteTemplateSource("git@github.com:kian-lian/ha.git"),
    "github:kian-lian/ha",
  )
})

test("normalizeRemoteTemplateSource converts GitHub SSH URLs to giget format", () => {
  assert.equal(
    normalizeRemoteTemplateSource("ssh://git@github.com/kian-lian/ha.git"),
    "github:kian-lian/ha",
  )
})

test("parseGitRemoteSource extracts repo and ref from git remotes", () => {
  assert.deepEqual(parseGitRemoteSource("git@github.com:kian-lian/ha.git#dev"), {
    normalizedRepo: "git@github.com:kian-lian/ha.git",
    ref: "dev",
  })
})

test("fetchTemplate uses normalized giget source for supported git remotes", async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-fetch-template-"))
  const targetDir = path.join(tmpRoot, "ha")
  const downloadCalls: unknown[] = []

  try {
    const result = await fetchTemplate(
      "git@github.com:kian-lian/ha.git#main",
      targetDir,
      { projectName: "ha" },
      {
        downloadTemplate: async (repo, options) => {
          downloadCalls.push({ repo, options })
          fs.mkdirSync(targetDir, { recursive: true })
          fs.writeFileSync(path.join(targetDir, "package.json"), '{"name":"{{projectName}}"}')
        },
      },
    )

    assert.equal(result.dependenciesInstalled, false)
    assert.deepEqual(downloadCalls, [
      {
        repo: "github:kian-lian/ha#main",
        options: {
          dir: targetDir,
          force: false,
        },
      },
    ])
    assert.match(fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"), /"ha"/)
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }
})

test("fetchTemplate falls back to git clone for unsupported git remotes", async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "loom-fetch-template-"))
  const targetDir = path.join(tmpRoot, "template")
  const downloadCalls: unknown[] = []
  const cloneCalls: unknown[] = []

  try {
    const result = await fetchTemplate(
      "git@example.com:team/custom-template.git#release",
      targetDir,
      { projectName: "custom-template" },
      {
        downloadTemplate: async (repo) => {
          downloadCalls.push(repo)
        },
        cloneTemplateFromGit: async (repo, cloneDir, ref) => {
          cloneCalls.push({ repo, cloneDir, ref })
          fs.mkdirSync(cloneDir, { recursive: true })
          fs.writeFileSync(
            path.join(cloneDir, "package.json"),
            '{"name":"{{projectName}}"}',
          )
        },
      },
    )

    assert.equal(result.dependenciesInstalled, false)
    assert.deepEqual(downloadCalls, [])
    assert.deepEqual(cloneCalls, [
      {
        repo: "git@example.com:team/custom-template.git",
        cloneDir: targetDir,
        ref: "release",
      },
    ])
    assert.match(
      fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"),
      /"custom-template"/,
    )
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }
})
