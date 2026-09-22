import {Card,Stack,Text} from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
export default function PaymentsPage(){return <Stack className="cadenza-page"><PageHeader eyebrow="Finance" title="Payments" description="Track deposits, partial payments, and fully settled payments across Cadenza workflows."/><Card className="cadenza-panel" withBorder><Text fw={600}>Payment workspace</Text><Text size="sm" c="dimmed" mt="xs">The shared payments capability handles payment mechanics; Cadenza decides when payment is required.</Text></Card></Stack>}
