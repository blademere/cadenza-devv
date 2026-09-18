import { useMemo, useState } from 'react'
import { Alert, Badge, Box, Group, MultiSelect, Select, Stack, Text, TextInput } from '@mantine/core'

const unwrap = (value) => value?.data ?? value
const asArray = (value) => {
  const unwrapped = unwrap(value)
  return Array.isArray(unwrapped) ? unwrapped : unwrapped?.items ?? []
}

const professionalName = (professional) => {
  const person = professional?.person ?? professional
  return [person?.firstName, person?.middleName, person?.lastName, person?.suffix].filter(Boolean).join(' ') || professional?.name || 'Professional'
}

const searchableText = (professional) => [
  professionalName(professional),
  professional?.registrationNumber,
  professional?.prcId,
  professional?.ptrNumber,
  professional?.professionalRole,
].filter(Boolean).join(' ').toLowerCase()

const roleLabel = (role) => String(role || '').replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())

export default function ProfessionalReferenceField({ field, value, error, professionals = [], onChange }) {
  const [search, setSearch] = useState('')
  const config = field?.config ?? {}
  const requiredRole = config.professionalRole
  const multiple = Boolean(config.multiple)
  const filteredProfessionals = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return asArray(professionals)
      .filter((professional) => professional?.status === 'VERIFIED')
      .filter((professional) => !requiredRole || professional?.professionalRole === requiredRole)
      .filter((professional) => !normalizedSearch || searchableText(professional).includes(normalizedSearch))
  }, [professionals, requiredRole, search])

  const options = filteredProfessionals.map((professional) => ({
    value: String(professional.id),
    label: professionalName(professional),
  }))

  const selectedIds = multiple
    ? (Array.isArray(value) ? value : value == null || value === '' ? [] : [value]).map(String)
    : value == null || value === '' ? null : String(value)

  const handleChange = (nextValue) => {
    onChange(multiple ? nextValue : nextValue || null)
  }

  const description = [
    requiredRole ? `Required role: ${roleLabel(requiredRole)}` : 'Select a verified professional.',
    multiple ? 'Multiple professionals may be selected.' : 'Select one professional.',
  ].join(' ')

  return <Stack gap="xs">
    <Group justify="space-between" align="flex-end" gap="sm">
      <TextInput
        label={`${field?.label ?? field?.name ?? field?.key ?? 'Professional'} search`}
        placeholder={`Search verified ${roleLabel(requiredRole || 'professional').toLowerCase()}...`}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        description={description}
      />
      {requiredRole && <Badge variant="light">{roleLabel(requiredRole)}</Badge>}
    </Group>
    {multiple
      ? <MultiSelect
          aria-label={field?.label ?? 'Professional'}
          data={options}
          value={selectedIds}
          onChange={handleChange}
          searchable={false}
          clearable={!field?.required}
          required={Boolean(field?.required)}
          error={error}
          placeholder="Select verified professionals"
          nothingFoundMessage="No matching verified professionals"
        />
      : <Select
          aria-label={field?.label ?? 'Professional'}
          data={options}
          value={selectedIds}
          onChange={handleChange}
          searchable={false}
          clearable={!field?.required}
          required={Boolean(field?.required)}
          error={error}
          placeholder="Select a verified professional"
          nothingFoundMessage="No matching verified professionals"
        />}
    {filteredProfessionals.length > 0 && <Box>
      <Text size="xs" c="dimmed" mb={4}>Available professionals</Text>
      <Stack gap={4}>
        {filteredProfessionals.slice(0, 5).map((professional) => <Text key={professional.id} size="sm">
          {professionalName(professional)} · {professional.registrationNumber ?? professional.prcId ?? 'No registration'}
        </Text>)}
      </Stack>
    </Box>}
    {!professionals.length && <Alert color="gray">No verified professionals are currently available for this field.</Alert>}
  </Stack>
}
