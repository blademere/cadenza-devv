import { Button, Card, Divider, Group, Select, Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'

export default function LessonEnrollmentPanel({ lessonPackages = [] }) {
  const [packageId, setPackageId] = useState(null)
  const selected = lessonPackages.find(p => p.id === packageId)
  return <Card withBorder>
    <Stack gap="md">
      <div><Title order={4}>Enroll student</Title><Text size="sm" c="dimmed">Select a lesson package and prepare the enrollment for full payment.</Text></div>
      <Select label="Lesson package" placeholder="Choose a package" value={packageId} onChange={setPackageId}
        data={lessonPackages.map(p => ({ value: p.id, label: p.name }))} />
      {selected && <><Divider /><Group justify="space-between"><Text>{selected.sessions} sessions</Text><Text fw={700}>{selected.price}</Text></Group><Button fullWidth>Continue to payment</Button></>}
    </Stack>
  </Card>
}
