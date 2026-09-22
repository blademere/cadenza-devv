import {Card,Stack,Text} from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
export default function LessonsPage(){return <Stack className="cadenza-page"><PageHeader eyebrow="Music" title="Music Lessons" description="Lesson packages, enrollments, sessions, attendance, instructors, and rescheduling."/><Card className="cadenza-panel" withBorder><Text fw={600}>Lesson workspace</Text><Text size="sm" c="dimmed" mt="xs">Cadenza owns lesson workflows while shared scheduling, people, resources, and payments remain reusable capabilities.</Text></Card></Stack>}
