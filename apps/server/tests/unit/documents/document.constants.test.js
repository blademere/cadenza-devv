import { describe, expect, it } from "vitest"
import {
  DOCUMENT_MODULE,
  DOCUMENT_ACTIONS,
  DEFAULT_MAX_FILE_SIZE_BYTES,
} from "../../../src/features/documents/document.constants.js"

describe("document constants", () => {
  it("defines the reusable documents permission surface", () => {
    expect(DOCUMENT_MODULE).toBe("documents")
    expect(DOCUMENT_ACTIONS).toEqual({
      READ: "read",
      UPLOAD: "upload",
      DELETE: "delete",
    })
  })

  it("uses a conservative default upload limit", () => {
    expect(DEFAULT_MAX_FILE_SIZE_BYTES).toBe(25 * 1024 * 1024)
  })
})
