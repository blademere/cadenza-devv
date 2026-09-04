import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const PRISMA_DIR = path.resolve(SCRIPT_DIR, '../prisma')
const SCALAR_TYPES = new Set(['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes'])

function modelDelegateName(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1)
}

async function listPrismaFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await listPrismaFiles(fullPath))
    else if (entry.isFile() && entry.name.endsWith('.prisma')) files.push(fullPath)
  }
  return files
}

function stripComments(source) {
  return source
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

function parseArrayAttribute(line, attribute) {
  const match = line.match(new RegExp(`@${attribute}\\s*\\(\\s*\\[([^\\]]+)\\]`))
  if (!match) return []
  return [...match[1].matchAll(/\b[A-Za-z_]\w*\b/g)].map((matchItem) => matchItem[0])
}

function parseField(line, modelNames, enumNames) {
  const match = line.trim().match(/^(\w+)\s+([A-Za-z_]\w*(?:\[\])?\??)(.*)$/)
  if (!match) return null

  const [, name, typeToken, attributes] = match
  const isList = typeToken.endsWith('[]')
  const isOptional = typeToken.endsWith('?')
  const baseType = typeToken.replace(/[\[\]\?]/g, '')
  const isRelation = modelNames.has(baseType)
  const isEnum = enumNames.has(baseType)
  const hasDefault = /@default\s*\(/.test(attributes)
  const isUpdatedAt = /@updatedAt\b/.test(attributes)
  const isId = /@id\b/.test(attributes)
  const isUnique = /@unique\b/.test(attributes)
  const relationFromFields = parseArrayAttribute(attributes, 'relation').length
    ? parseArrayAttribute(attributes, 'relation')
    : []

  let fromFields = []
  let toFields = []
  const relationMatch = attributes.match(/@relation\s*\((.*)\)/)
  if (relationMatch) {
    fromFields = parseNamedArray(relationMatch[1], 'fields')
    toFields = parseNamedArray(relationMatch[1], 'references')
  }

  return {
    name,
    type: baseType,
    isList,
    isOptional,
    isRequired: !isOptional && !isList,
    isRelation,
    isEnum,
    hasDefault,
    isUpdatedAt,
    isId,
    isUnique,
    relationFromFields: fromFields,
    relationToFields: toFields,
  }
}

function parseNamedArray(text, name) {
  const match = text.match(new RegExp(`${name}\\s*:\\s*\\[([^\\]]+)\\]`))
  if (!match) return []
  return [...match[1].matchAll(/\b[A-Za-z_]\w*\b/g)].map((item) => item[0])
}

function parseSchema(source) {
  const clean = stripComments(source)
  const enumNames = new Set([...clean.matchAll(/\benum\s+(\w+)\s*\{/g)].map((match) => match[1]))
  const rawModels = []
  for (const match of clean.matchAll(/\bmodel\s+(\w+)\s*\{([\s\S]*?)\}/g)) {
    rawModels.push({ name: match[1], body: match[2] })
  }

  const modelNames = new Set(rawModels.map((model) => model.name))
  const enumValues = new Map()
  for (const match of clean.matchAll(/\benum\s+(\w+)\s*\{([\s\S]*?)\}/g)) {
    const values = match[2]
      .split('\n')
      .map((line) => line.trim().match(/^([A-Za-z_]\w*)/))
      .filter(Boolean)
      .map((matchItem) => matchItem[1])
    enumValues.set(match[1], values)
  }

  const models = rawModels.map(({ name, body }) => {
    const fields = []
    const uniqueConstraints = []
    for (const line of body.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const uniqueMatch = trimmed.match(/^@@unique\s*\(\s*\[([^\]]+)\]/)
      if (uniqueMatch) uniqueConstraints.push(parseIdentifierList(uniqueMatch[1]))
      const idMatch = trimmed.match(/^@@id\s*\(\s*\[([^\]]+)\]/)
      if (idMatch) uniqueConstraints.push(parseIdentifierList(idMatch[1]))
      const field = parseField(trimmed, modelNames, enumNames)
      if (field) fields.push(field)
    }
    return { name, fields, uniqueConstraints }
  })

  return { models, modelNames, enumNames, enumValues }
}

function parseIdentifierList(text) {
  return [...text.matchAll(/\b[A-Za-z_]\w*\b/g)].map((match) => match[0])
}

async function loadSchemaMetadata() {
  const files = await listPrismaFiles(PRISMA_DIR)
  const source = (await Promise.all(files.map((file) => fs.readFile(file, 'utf8')))).join('\n')
  return parseSchema(source)
}

function getUniqueSelector(model) {
  const idField = model.fields.find((field) => field.isId)
  if (idField) return [idField.name]
  const uniqueField = model.fields.find((field) => field.isUnique)
  if (uniqueField) return [uniqueField.name]
  return model.uniqueConstraints[0] || []
}

function scalarValue(field, modelName, counter, unique = false) {
  const seed = `seed-${modelName.toLowerCase()}-${counter}`
  switch (field.type) {
    case 'String':
      return unique ? seed : `${modelName} development record`
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

function enumValue(metadata, field) {
  return metadata.enumValues.get(field.type)?.[0]
}

async function ensureModel(prisma, metadata, modelName, state, depth = 0) {
  if (depth > metadata.models.length + 5) throw new Error(`Seed dependency depth exceeded while creating ${modelName}`)
  if (state.records.has(modelName)) return state.records.get(modelName)

  const model = metadata.models.find((item) => item.name === modelName)
  const delegate = prisma[modelDelegateName(modelName)]
  if (!delegate || !model) throw new Error(`Prisma model '${modelName}' is not available to the seed client`)

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
    const relationScalarFields = new Set(model.fields.flatMap((field) => field.relationFromFields))

    for (const field of model.fields) {
      if (field.isRelation || field.isList) continue
      if (!field.isRequired || field.hasDefault || field.isUpdatedAt) continue
      if (relationScalarFields.has(field.name)) continue

      let value
      if (field.isEnum) value = enumValue(metadata, field)
      else if (SCALAR_TYPES.has(field.type)) value = scalarValue(field, modelName, counter, field.isUnique || field.isId)
      if (value !== undefined) data[field.name] = value
    }

    for (const field of model.fields) {
      if (!field.isRelation || field.isList || !field.isRequired) continue

      const related = await ensureModel(prisma, metadata, field.type, state, depth + 1)
      if (field.relationFromFields.length) {
        if (field.relationFromFields.length !== field.relationToFields.length) {
          throw new Error(`Relation metadata mismatch for ${modelName}.${field.name}`)
        }
        for (let index = 0; index < field.relationFromFields.length; index += 1) {
          const fromField = field.relationFromFields[index]
          const toField = field.relationToFields[index]
          if (related[toField] === undefined) {
            throw new Error(`Related field ${field.type}.${toField} is unavailable for ${modelName}.${fromField}`)
          }
          data[fromField] = related[toField]
        }
      } else {
        const relatedModel = metadata.models.find((item) => item.name === field.type)
        const selector = getUniqueSelector(relatedModel)
        if (!selector.length || selector.some((name) => related[name] === undefined)) {
          throw new Error(`No usable unique selector available for required relation ${modelName}.${field.name}`)
        }
        data[field.name] = { connect: Object.fromEntries(selector.map((name) => [name, related[name]])) }
      }
    }

    const record = await delegate.create({ data })
    state.records.set(modelName, record)
    return record
  } finally {
    state.inProgress.delete(modelName)
  }
}

async function seedModelCoverage(prisma) {
  const metadata = await loadSchemaMetadata()
  const state = { records: new Map(), inProgress: new Set(), counter: 1 }
  const failures = []

  for (const model of metadata.models) {
    try {
      await ensureModel(prisma, metadata, model.name, state)
    } catch (error) {
      failures.push(`${model.name}: ${error.message}`)
    }
  }

  const emptyModels = []
  for (const model of metadata.models) {
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

  console.log(`Seed model coverage verified: ${metadata.models.length} Prisma models contain data.`)
}

export { seedModelCoverage }
