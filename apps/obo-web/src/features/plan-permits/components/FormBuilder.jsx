import { useMemo } from 'react'
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core'

export const FIELD_TYPES = [
  ['text', 'Text'],
  ['textarea', 'Textarea'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['number', 'Number'],
  ['integer', 'Integer'],
  ['boolean', 'Boolean'],
  ['select', 'Select'],
  ['multiselect', 'Multi-select'],
  ['date', 'Date'],
  ['datetime', 'Date & time'],
]

const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100)
const clone = (value) => JSON.parse(JSON.stringify(value))

export const createField = (index = 0) => ({
  key: `field-${index + 1}`,
  label: `Field ${index + 1}`,
  description: null,
  type: 'text',
  sortOrder: index,
  required: false,
  defaultValue: undefined,
  validation: undefined,
  visibility: undefined,
  config: undefined,
  sectionKey: null,
  options: [],
})

export const createSection = (index = 0) => ({
  key: `section-${index + 1}`,
  title: `Section ${index + 1}`,
  description: null,
  sortOrder: index,
})

export const normalizeDefinition = (form) => ({
  sections: (form?.sections ?? []).map((section, index) => ({ ...section, sortOrder: index })),
  fields: (form?.fields ?? []).map((field, index) => ({
    ...field,
    sortOrder: index,
    sectionKey: field.sectionKey ?? form?.sections?.find((section) => section.id === field.sectionId)?.key ?? null,
    options: field.options ?? [],
  })),
})

function FieldEditor({ field, sections, onChange, onRemove, onMoveUp, onMoveDown }) {
  const update = (patch) => onChange({ ...field, ...patch })
  const needsOptions = field.type === 'select' || field.type === 'multiselect'
  const options = field.options ?? []

  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Group gap="xs">
              <Text fw={700}>{field.label || 'Untitled field'}</Text>
              <Badge variant="light">{field.type}</Badge>
              {field.required ? <Badge color="red" variant="light">required</Badge> : null}
            </Group>
            <Text size="xs" c="dimmed">{field.key}</Text>
          </Box>
          <Group gap={4}>
            <ActionIcon variant="subtle" onClick={onMoveUp} aria-label="Move field up">↑</ActionIcon>
            <ActionIcon variant="subtle" onClick={onMoveDown} aria-label="Move field down">↓</ActionIcon>
            <ActionIcon color="red" variant="subtle" onClick={onRemove} aria-label="Remove field">×</ActionIcon>
          </Group>
        </Group>

        <TextInput label="Key" value={field.key} onChange={(event) => update({ key: slugify(event.currentTarget.value) })} />
        <TextInput label="Label" value={field.label} onChange={(event) => update({ label: event.currentTarget.value })} />
        <Textarea label="Description" value={field.description ?? ''} onChange={(event) => update({ description: event.currentTarget.value || null })} autosize minRows={2} />
        <Select label="Type" data={FIELD_TYPES.map(([value, label]) => ({ value, label }))} value={field.type} onChange={(value) => update({ type: value, options: ['select', 'multiselect'].includes(value) ? options : [] })} allowDeselect={false} />
        <Select label="Section" data={sections.map((section) => ({ value: section.key, label: section.title }))} value={field.sectionKey} onChange={(value) => update({ sectionKey: value })} clearable />
        <Checkbox label="Required" checked={Boolean(field.required)} onChange={(event) => update({ required: event.currentTarget.checked })} />

        {needsOptions ? (
          <Stack gap="xs">
            <Group justify="space-between"><Text fw={600} size="sm">Options</Text><Button size="xs" variant="light" onClick={() => update({ options: [...options, { value: `option-${options.length + 1}`, label: `Option ${options.length + 1}`, sortOrder: options.length }] })}>Add option</Button></Group>
            {options.map((option, index) => (
              <Group key={`${option.value}-${index}`} align="flex-end">
                <TextInput flex={1} label={index === 0 ? 'Value' : undefined} value={String(option.value ?? '')} onChange={(event) => update({ options: options.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.currentTarget.value } : item) })} />
                <TextInput flex={1} label={index === 0 ? 'Label' : undefined} value={option.label ?? ''} onChange={(event) => update({ options: options.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.currentTarget.value } : item) })} />
                <ActionIcon color="red" variant="subtle" onClick={() => update({ options: options.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, sortOrder: itemIndex })) })} aria-label="Remove option">×</ActionIcon>
              </Group>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Card>
  )
}

export default function FormBuilder({ definition, onChange }) {
  const sections = definition.sections ?? []
  const fields = definition.fields ?? []
  const unsectioned = useMemo(() => fields.filter((field) => !field.sectionKey), [fields])

  const setSections = (next) => onChange({ ...definition, sections: next.map((section, index) => ({ ...section, sortOrder: index })) })
  const setFields = (next) => onChange({ ...definition, fields: next.map((field, index) => ({ ...field, sortOrder: index })) })

  const addSection = () => setSections([...sections, createSection(sections.length)])
  const addField = (sectionKey = null) => setFields([...fields, { ...createField(fields.length), sectionKey }])
  const updateField = (index, value) => setFields(fields.map((field, fieldIndex) => fieldIndex === index ? value : field))
  const removeField = (index) => setFields(fields.filter((_, fieldIndex) => fieldIndex !== index))
  const moveField = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= fields.length) return
    const next = clone(fields)
    ;[next[index], next[target]] = [next[target], next[index]]
    setFields(next)
  }
  const removeSection = (sectionKey) => {
    setSections(sections.filter((section) => section.key !== sectionKey))
    setFields(fields.map((field) => field.sectionKey === sectionKey ? { ...field, sectionKey: null } : field))
  }

  return (
    <Stack gap="md">
      {sections.map((section) => (
        <Card key={section.key} withBorder padding="lg">
          <Stack>
            <Group justify="space-between" align="flex-start">
              <Box flex={1}>
                <TextInput label="Section title" value={section.title} onChange={(event) => setSections(sections.map((item) => item.key === section.key ? { ...item, title: event.currentTarget.value } : item))} />
                <TextInput mt="xs" label="Section key" value={section.key} onChange={(event) => {
                  const nextKey = slugify(event.currentTarget.value)
                  setSections(sections.map((item) => item.key === section.key ? { ...item, key: nextKey } : item))
                  setFields(fields.map((field) => field.sectionKey === section.key ? { ...field, sectionKey: nextKey } : field))
                }} />
              </Box>
              <ActionIcon color="red" variant="subtle" onClick={() => removeSection(section.key)} aria-label="Remove section">×</ActionIcon>
            </Group>
            <Textarea label="Section description" value={section.description ?? ''} onChange={(event) => setSections(sections.map((item) => item.key === section.key ? { ...item, description: event.currentTarget.value || null } : item))} autosize minRows={2} />
            {fields.map((field, index) => field.sectionKey === section.key ? (
              <FieldEditor key={`${field.key}-${index}`} field={field} sections={sections} onChange={(value) => updateField(index, value)} onRemove={() => removeField(index)} onMoveUp={() => moveField(index, -1)} onMoveDown={() => moveField(index, 1)} />
            ) : null)}
            <Button variant="light" onClick={() => addField(section.key)}>+ Add Field</Button>
          </Stack>
        </Card>
      ))}

      {unsectioned.length ? (
        <Card withBorder padding="lg">
          <Stack>
            <Text fw={700}>Fields</Text>
            {fields.map((field, index) => !field.sectionKey ? (
              <FieldEditor key={`${field.key}-${index}`} field={field} sections={sections} onChange={(value) => updateField(index, value)} onRemove={() => removeField(index)} onMoveUp={() => moveField(index, -1)} onMoveDown={() => moveField(index, 1)} />
            ) : null)}
            <Button variant="light" onClick={() => addField()}>+ Add Field</Button>
          </Stack>
        </Card>
      ) : null}

      <Divider />
      <Button variant="default" onClick={addSection}>+ Add Section</Button>
    </Stack>
  )
}
