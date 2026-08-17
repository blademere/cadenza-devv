import { describe, expect, it } from "vitest"

const { assertWorkflowDefinition } = require("../../src/platform/workflow/workflow.service")

const validSteps = [
  { key: "START", name: "Start", isInitial: true, isFinal: false },
  { key: "REVIEW", name: "Review", isInitial: false, isFinal: false },
  { key: "DONE", name: "Done", isInitial: false, isFinal: true },
]

const validTransitions = [
  { key: "TO_REVIEW", name: "To review", fromStepKey: "START", toStepKey: "REVIEW", permissionKey: "application.review" },
  { key: "APPROVE", name: "Approve", fromStepKey: "REVIEW", toStepKey: "DONE", permissionKey: "application.approve" },
]

describe("workflow definition hardening", () => {
  it("accepts a reachable workflow with one initial and a final state", () => {
    expect(() => assertWorkflowDefinition({ steps: validSteps, transitions: validTransitions })).not.toThrow()
  })

  it("requires at least one final step", () => {
    const steps = validSteps.map((step) => ({ ...step, isFinal: false }))
    expect(() => assertWorkflowDefinition({ steps, transitions: validTransitions })).toThrow()
  })

  it("rejects duplicate transition keys", () => {
    expect(() => assertWorkflowDefinition({
      steps: validSteps,
      transitions: [...validTransitions, { ...validTransitions[1], key: "TO_REVIEW", name: "Duplicate" }],
    })).toThrow()
  })

  it("rejects transitions leaving a final step", () => {
    expect(() => assertWorkflowDefinition({
      steps: validSteps,
      transitions: [...validTransitions, { key: "LEAVE_DONE", name: "Leave done", fromStepKey: "DONE", toStepKey: "REVIEW" }],
    })).toThrow()
  })

  it("rejects non-final dead-end steps", () => {
    const steps = [...validSteps, { key: "DEAD_END", name: "Dead end", isInitial: false, isFinal: false }]
    expect(() => assertWorkflowDefinition({ steps, transitions: validTransitions })).toThrow()
  })

  it("rejects unreachable steps", () => {
    const steps = [...validSteps, { key: "ORPHAN", name: "Orphan", isInitial: false, isFinal: true }]
    expect(() => assertWorkflowDefinition({ steps, transitions: validTransitions })).toThrow()
  })

  it("rejects malformed transition permissions", () => {
    const transitions = validTransitions.map((transition) => ({ ...transition }))
    transitions[0].permissionKey = "application"
    expect(() => assertWorkflowDefinition({ steps: validSteps, transitions })).toThrow()
  })
})
