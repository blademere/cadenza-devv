import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const PRISMA_DIR = path.resolve(SCRIPT_DIR, '../prisma')
const SCALAR_TYPES = new Set(['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes'])

const modelDelegateName = (modelName) => modelName.charAt(0).toLowerCase() + modelName.slice(1)

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
  return source.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

function parseIdentifierList(text) {
  return [...text.matchAll(/\b[A-Za-z_]\w*\b/g)].map((match) => match[0])
}

function parseNamedArray(text, name) {
  const match = text.match(new RegExp(`${name}\\s*:\\s*\\[([^\\]]+)\\]`))
  return match ? parseIdentifierList(match[1]) : []
}

function parseField(line, modelNames, enumNames) {
  const match = line.trim().match(/^(\w+)\s+([A-Za-z_]\w*(?:\[\])?\??)(.*)$/)
  if (!match) return null
  const [, name, typeToken, attributes] = match
  const isList = typeToken.endsWith('[]')
  const isOptional = typeToken.endsWith('?')
  const type = typeToken.replace(/[\[\]\?]/g, '')
  const relationMatch = attributes.match(/@relation\s*\((.*)\)/)
  const relationFromFields = relationMatch ? parseNamedArray(relationMatch[1], 'fields') : []
  const relationToFields = relationMatch ? parseNamedArray(relationMatch[1], 'references') : []
  return {
    name,
    type,
    isList,
    isOptional,
    isRequired: !isOptional && !isList,
    isRelation: modelNames.has(type),
    isEnum: enumNames.has(type),
    hasDefault: /@default\s*\(/.test(attributes),
    isUpdatedAt: /@updatedAt\b/.test(attributes),
    isId: /@id\b/.test(attributes),
    isUnique: /@unique\b/.test(attributes),
    relationFromFields,
    relationToFields,
  }
}

function parseSchema(source) {
  const clean = stripComments(source)
  const enumNames = new Set([...clean.matchAll(/\benum\s+(\w+)\s*\{/g)].map((match) => match[1]))
  const enumValues = new Map()
  for (const match of clean.matchAll(/\benum\s+(\w+)\s*\{([\s\S]*?)\}/g)) {
    enumValues.set(match[1], match[2].split('\n').map((line) => line.trim().match(/^([A-Za-z_]\w*)/)).filter(Boolean).map((matchItem) => matchItem[1]))
  }
  const rawModels = [...clean.matchAll(/\bmodel\s+(\w+)\s*\{([\s\S]*?)\}/g)].map((match) => ({ name: match[1], body: match[2] }))
  const modelNames = new Set(rawModels.map((model) => model.name))
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
  return { models, enumValues }
}

async function loadSchemaMetadata() {
  const files = await listPrismaFiles(PRISMA_DIR)
  if (!files.length) throw new Error(`No Prisma schema files found under ${PRISMA_DIR}`)
  const source = (await Promise.all(files.map((file) => fs.readFile(file, 'utf8')))).join('\n')
  return parseSchema(source)
}

function scalarValue(field, modelName, counter) {
  const seed = `seed-${modelName.toLowerCase()}-${counter}`
  switch (field.type) {
    case 'String': return field.isUnique || field.isId ? seed : `${modelName} development record`
    case 'Int': return counter
    case 'BigInt': return BigInt(counter)
    case 'Float':
    case 'Decimal': return counter
    case 'Boolean': return true
    case 'DateTime': return new Date('2026-01-01T00:00:00.000Z')
    case 'Json': return { seeded: true, source: 'development' }
    case 'Bytes': return Buffer.from(seed)
    default: return undefined
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
  if (!model || !delegate) throw new Error(`Prisma model '${modelName}' is not available to the seed client`)

  const existing = await delegate.findFirst()
  if (existing) {
    state.records.set(modelName, existing)
    return existing
  }
  if (state.inProgress.has(modelName)) throw new Error(`Circular required scalar dependency detected: ${[...state.inProgress, modelName].join(' -> ')}`)
  state.inProgress.add(modelName)

  try {
    const data = {}
    const counter = state.counter++
    const relationScalarFields = new Set(model.fields.flatMap((field) => field.relationFromFields))

    for (const field of model.fields) {
      if (field.isRelation || field.isList || !field.isRequired || field.hasDefault || field.isUpdatedAt) continue
      if (relationScalarFields.has(field.name)) continue
      const value = field.isEnum ? enumValue(metadata, field) : scalarValue(field, modelName, counter)
      if (value !== undefined) data[field.name] = value
    }

    // A relation field with no `fields: [...]` does not own the foreign key.
    // It is satisfied by creating the related record from the owning side.
    for (const field of model.fields) {
      if (!field.isRelation || field.isList || !field.isRequired || !field.relationFromFields.length) continue
      if (field.relationFromFields.length !== field.relationToFields.length) throw new Error(`Relation metadata mismatch for ${modelName}.${field.name}`)
      const related = await ensureModel(prisma, metadata, field.type, state, depth + 1)
      for (let index = 0; index < field.relationFromFields.length; index += 1) {
        const fromField = field.relationFromFields[index]
        const toField = field.relationToFields[index]
        if (related[toField] === undefined) throw new Error(`Related field ${field.type}.${toField} is unavailable for ${modelName}.${fromField}`)
        data[fromField] = related[toField]
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
