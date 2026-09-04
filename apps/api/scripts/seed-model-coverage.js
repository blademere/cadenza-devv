import { Prisma } from '@prisma/client'

/**
 * Development-only fallback seeder.
 *
 * The canonical seed creates meaningful domain fixtures. This pass guarantees
 * that every Prisma model has at least one row when the model can be created
 * from its schema metadata. Existing records are reused so the pass is
 * idempotent and does not manufacture duplicate fixture data.
 */
function modelDelegateName(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1)
}

function getModelMeta(modelName) {
  return Prisma.dmmf.datamodel.models.find((model) => model.name === modelName)
}

function isRequired(field) {
  // Prisma runtime DMMF versions may omit isRequired for required fields.
  return field.isRequired !== false
}

function hasDefault(field) {
  return field.hasDefaultValue === true
}

function getUniqueField(model) {
  return model.fields.find((field) => field.isId || field.isUnique)
}

function scalarValue(field, modelName, counter) {
  const seed = `seed-${modelName.toLowerCase()}-${counter}`
  switch (field.type) {
    case 'String':
      return field.isUnique || field.isId ? seed : `${modelName} development record`
    case 'Int':
      return counter
    case 'BigInt':
      return BigInt(counter)
    case 'Float':
    case 'Decimal':
      return counter
    case 'Boolean':
      return true
    case 'DateTime':
      return new Date()
    case 'Json':
      return { seeded: true, source: 'development' }
    case 'Bytes':
      return Buffer.from(seed)
    default:
      return undefined
  }
}

function enumValue(field) {
  const enumType = Prisma.dmmf.datamodel.enums.find((item) => item.name === field.type)
  return enumType?.values?.[0]?.name
}

async function ensureModel(prisma, modelName, state, depth = 0) {
  if (depth > 25) throw new Error(`Seed dependency depth exceeded while creating ${modelName}`)
  if (state.records.has(modelName)) return state.records.get(modelName)

  const delegate = prisma[modelDelegateName(modelName)]
  const model = getModelMeta(modelName)
  if (!delegate || !model) {
    throw new Error(`Prisma model '${modelName}' is not available to the seed client`)
  }

  const existing = await delegate.findFirst()
  if (existing) {
    state.records.set(modelName, existing)
    return existing
  }

  if (state.inProgress.has(modelName)) {
    throw new Error(`Circular required seed dependency detected: ${[...state.inProgress, modelName].join(' -> ')}`)
  }
  state.inProgress.add(modelName)

  try {
    const data = {}
    const counter = state.counter++

    // Foreign-key scalar fields are populated from their relation metadata
    // below. Do not generate placeholder values for them.
    const relationScalarFields = new Set(
      model.fields
        .filter((field) => field.kind === 'object' && field.relationFromFields?.length)
        .flatMap((field) => field.relationFromFields),
    )

    for (const field of model.fields) {
      if (field.kind === 'object') continue
      if (!isRequired(field) || hasDefault(field) || field.isUpdatedAt) continue
      if (relationScalarFields.has(field.name)) continue

      const value = field.kind === 'enum'
        ? enumValue(field)
        : scalarValue(field, modelName, counter)

      if (value !== undefined) data[field.name] = value
    }

    for (const field of model.fields) {
      if (field.kind !== 'object' || !isRequired(field)) continue

      const relatedModel = field.type
      const related = await ensureModel(prisma, relatedModel, state, depth + 1)

      if (field.relationFromFields?.length) {
        const relationToFields = field.relationToFields || []
        if (relationToFields.length !== field.relationFromFields.length) {
          throw new Error(`Relation metadata mismatch for ${modelName}.${field.name}`)
        }

        for (let index = 0; index < field.relationFromFields.length; index += 1) {
          const fromField = field.relationFromFields[index]
          const toField = relationToFields[index]
          if (related[toField] === undefined) {
            throw new Error(`Related field ${relatedModel}.${toField} is unavailable for ${modelName}.${fromField}`)
          }
          data[fromField] = related[toField]
        }
        continue
      }

      // Some required relations expose no FK scalar in the current model's
      // DMMF. These require a nested connect using a single unique selector.
      const relatedMeta = getModelMeta(relatedModel)
      const uniqueField = relatedMeta && getUniqueField(relatedMeta)
      if (!uniqueField || related[uniqueField.name] === undefined) {
        throw new Error(`No single unique field available for required relation ${modelName}.${field.name}`)
      }
      data[field.name] = { connect: { [uniqueField.name]: related[uniqueField.name] } }
    }

    const record = await delegate.create({ data })
    state.records.set(modelName, record)
    return record
  } finally {
    state.inProgress.delete(modelName)
  }
}

async function seedModelCoverage(prisma) {
  const state = { records: new Map(), inProgress: new Set(), counter: 1 }
  const models = Prisma.dmmf.datamodel.models
  const failures = []

  for (const model of models) {
    try {
      await ensureModel(prisma, model.name, state)
    } catch (error) {
      failures.push(`${model.name}: ${error.message}`)
    }
  }

  const emptyModels = []
  for (const model of models) {
    const delegate = prisma[modelDelegateName(model.name)]
    if (!delegate) {
      emptyModels.push(`${model.name}: delegate unavailable`)
      continue
    }
    if ((await delegate.count()) === 0) emptyModels.push(model.name)
  }

  if (failures.length || emptyModels.length) {
    const details = [...failures, ...emptyModels.map((name) => `empty: ${name}`)]
    throw new Error(`Prisma seed coverage incomplete:\n- ${details.join('\n- ')}`)
  }

  console.log(`Seed model coverage verified: ${models.length} Prisma models contain data.`)
}

export { seedModelCoverage }
