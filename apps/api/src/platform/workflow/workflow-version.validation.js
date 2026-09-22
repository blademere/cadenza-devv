import { BadRequestError, ConflictError } from '../../common/errors/appError.js'

const validateDefinition = ({ steps = [], transitions = [] }) => {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new BadRequestError('A workflow version requires at least one step.')
  }
  if (!Array.isArray(transitions)) {
    throw new BadRequestError('Workflow transitions must be an array.')
  }
  if (steps.filter((step) => step.isInitial).length !== 1) {
    throw new BadRequestError('A workflow version must have exactly one initial step.')
  }
  if (steps.filter((step) => step.isFinal).length === 0) {
    throw new BadRequestError('A workflow version requires at least one final step.')
  }

  const keys = new Set(steps.map((step) => step.key))
  if (keys.size !== steps.length || steps.some((step) => !step.key || !step.name)) {
    throw new BadRequestError('Workflow steps require unique keys and names.')
  }

  const transitionKeys = new Set()
  const adjacency = new Map(steps.map((step) => [step.key, []]))
  const outgoing = new Map(steps.map((step) => [step.key, 0]))

  for (const transition of transitions) {
    if (!transition.key || !transition.name) {
      throw new BadRequestError('Workflow transitions require keys and names.')
    }
    if (transitionKeys.has(transition.key)) {
      throw new ConflictError(`Duplicate workflow transition key: ${transition.key}.`)
    }
    transitionKeys.add(transition.key)
    if (!keys.has(transition.fromStepKey) || !keys.has(transition.toStepKey)) {
      throw new BadRequestError(`Transition ${transition.key} references an unknown step.`)
    }

    const from = steps.find((step) => step.key === transition.fromStepKey)
    if (from.isFinal) {
      throw new BadRequestError(`Final workflow step '${from.key}' cannot have outgoing transitions.`)
    }
    outgoing.set(from.key, outgoing.get(from.key) + 1)
    adjacency.get(from.key).push(transition.toStepKey)
  }

  for (const step of steps) {
    if (!step.isFinal && outgoing.get(step.key) === 0) {
      throw new BadRequestError(
        `Non-final workflow step '${step.key}' must have at least one outgoing transition.`
      )
    }
  }

  const initial = steps.find((step) => step.isInitial).key
  const reachable = new Set([initial])
  const queue = [initial]
  while (queue.length) {
    const current = queue.shift()
    for (const next of adjacency.get(current)) {
      if (!reachable.has(next)) {
        reachable.add(next)
        queue.push(next)
      }
    }
  }

  const unreachable = steps.find((step) => !reachable.has(step.key))
  if (unreachable) {
    throw new BadRequestError(
      `Workflow step '${unreachable.key}' is unreachable from the initial step.`
    )
  }

  const canReachFinal = new Set(
    steps.filter((step) => step.isFinal).map((step) => step.key)
  )
  let changed = true
  while (changed) {
    changed = false
    for (const step of steps) {
      if (
        !canReachFinal.has(step.key) &&
        adjacency.get(step.key).some((target) => canReachFinal.has(target))
      ) {
        canReachFinal.add(step.key)
        changed = true
      }
    }
  }

  const deadEnd = steps.find((step) => !canReachFinal.has(step.key))
  if (deadEnd) {
    throw new BadRequestError(`Workflow step '${deadEnd.key}' cannot reach a final step.`)
  }
}

export { validateDefinition }
