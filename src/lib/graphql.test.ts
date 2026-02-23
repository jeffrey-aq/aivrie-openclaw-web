import { describe, it, expect } from "vitest"
import { extractNodes } from "./graphql"

describe("extractNodes", () => {
  it("returns empty array for empty edges", () => {
    expect(extractNodes({ edges: [] })).toEqual([])
  })

  it("extracts a single node", () => {
    const result = extractNodes({
      edges: [{ node: { id: "1", name: "Test" } }],
    })
    expect(result).toEqual([{ id: "1", name: "Test" }])
  })

  it("extracts multiple nodes", () => {
    const result = extractNodes({
      edges: [
        { node: { id: "1" } },
        { node: { id: "2" } },
        { node: { id: "3" } },
      ],
    })
    expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }])
  })
})
