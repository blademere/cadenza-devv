const { execFileSync } = require("node:child_process")
const { existsSync } = require("node:fs")

const diffRange = process.env.GITHUB_BASE_REF
  ? `origin/${process.env.GITHUB_BASE_REF}...HEAD`
  : `${process.env.GITHUB_EVENT_BEFORE || "HEAD^"}...HEAD`

let files
try {
  files = execFileSync(
    "git",
    ["diff", "--name-only", "--diff-filter=ACMR", diffRange],
    { encoding: "utf8" },
  )
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter((file) => file && existsSync(file))
} catch (error) {
  console.error(`Unable to determine changed files for ${diffRange}:`, error.message)
  process.exit(1)
}

if (files.length === 0) {
  console.log("No changed files to format-check.")
  process.exit(0)
}

execFileSync("npx", ["prettier", "--check", ...files], {
  stdio: "inherit",
})
