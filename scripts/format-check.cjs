const { execFileSync } = require("node:child_process")
const { existsSync } = require("node:fs")

let diffRange

try {
  if (process.env.GITHUB_BASE_REF) {
    execFileSync("git", ["fetch", "origin", process.env.GITHUB_BASE_REF, "--depth=1"], {
      stdio: "inherit",
    })
    diffRange = `origin/${process.env.GITHUB_BASE_REF}...HEAD`
  } else if (process.env.GITHUB_EVENT_BEFORE && process.env.GITHUB_EVENT_BEFORE !== "0000000000000000000000000000000000000000") {
    diffRange = `${process.env.GITHUB_EVENT_BEFORE}...HEAD`
  } else {
    diffRange = "HEAD^...HEAD"
  }
} catch (error) {
  console.error("Unable to prepare the git diff range:", error.message)
  process.exit(1)
}

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
