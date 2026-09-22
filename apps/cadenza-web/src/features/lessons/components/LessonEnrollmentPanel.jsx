import { Button, Card, Divider, Group, Select, Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'

export default function LessonEnrollmentPanel({ lessonPackages = [], onContinue }) {
  const [packageId, setPackageId] = useState(null)
  const selected = lessonPackages.find((pkg) => pkg.id === packageId)

  return (
    <Card withBorder>
      <Stack gap="md">
        <div>
          <Title order={4}>Enroll student</Title>
          <Text size="sm" c="dimmed">Select a lesson package. Enrollment creates a full-payment obligation.</Text>
        </div>
        <Select
          label="Lesson package"
          placeholder="Choose a package"
          value={packageId}
          onChange={setPackageId}
          data={lessonPackages.map((pkg) => ({ value: pkg.id, label: pkg.name }))}
        />
        {selected && (
          <>
            <Divider />
            <Group justify="space-between">
              <Text>{selected.numberOfSessions} sessions</Text>
              <Text fw={700}>₱{Number(selected.price).toLocaleString()}</Text>
            </Group>
            <Button fullWidth onClick={() => onContinue?.(selected)}>Continue to enrollment</Button>
          </>
        )}
      </Stack>
    </Card>
  )
}
