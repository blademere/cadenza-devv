import {Card,Stack,Text} from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
export default function ResourcesPage(){return <Stack className="cadenza-page"><PageHeader eyebrow="Operations" title="Resources" description="Manage instruments, band rooms, and other resources used by Cadenza workflows."/><Card className="cadenza-panel" withBorder><Text fw={600}>Resource catalog</Text><Text size="sm" c="dimmed" mt="xs">This is the Cadenza application consumer of the reusable resources capability.</Text></Card></Stack>}
