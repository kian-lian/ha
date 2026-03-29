import assert from "node:assert/strict"
import test from "node:test"
import type { LoomConfig } from "../../config/schema.js"
import {
  fetchRegistryIndex,
  fetchRegistryItem,
  resolveRegistryRequest,
} from "../client.js"

const mockConfig: LoomConfig = {
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
      "@acme": "https://acme.test/r/{name}.json",
    },
  },
}

test("resolveRegistryRequest uses the default namespace for bare names", () => {
  const result = resolveRegistryRequest("use-toggle", mockConfig)

  assert.deepEqual(result, {
    input: "use-toggle",
    name: "use-toggle",
    namespace: "@loom",
    url: "http://localhost:3001/r/use-toggle.json",
  })
})

test("fetchRegistryItem resolves an explicit namespace and parses the response", async () => {
  const requestedUrls: string[] = []

  const item = await fetchRegistryItem("@acme/use-toggle", mockConfig, {
    fetch: async (input: string | URL | Request) => {
      requestedUrls.push(String(input))
      return new Response(
        JSON.stringify({
          name: "use-toggle",
          type: "registry:hook",
          title: "use-toggle",
          files: [
            {
              path: "registry/hooks/use-toggle.ts",
              content: "export function useToggle() {}\n",
              type: "registry:hook",
            },
          ],
          dependencies: [],
          devDependencies: [],
          registryDependencies: [],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      )
    },
  })

  assert.deepEqual(requestedUrls, ["https://acme.test/r/use-toggle.json"])
  assert.equal(item.registrySource.namespace, "@acme")
  assert.equal(item.registrySource.url, "https://acme.test/r/use-toggle.json")
})

test("fetchRegistryIndex loads registry.json from the namespace template", async () => {
  const requestedUrls: string[] = []

  const index = await fetchRegistryIndex(mockConfig, "@loom", {
    fetch: async (input: string | URL | Request) => {
      requestedUrls.push(String(input))
      return new Response(
        JSON.stringify({
          items: [
            {
              name: "use-toggle",
              type: "registry:hook",
              title: "use-toggle",
              description: "toggle",
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      )
    },
  })

  assert.deepEqual(requestedUrls, ["http://localhost:3001/r/registry.json"])
  assert.deepEqual(index, [
    {
      name: "use-toggle",
      type: "registry:hook",
      title: "use-toggle",
      description: "toggle",
    },
  ])
})
