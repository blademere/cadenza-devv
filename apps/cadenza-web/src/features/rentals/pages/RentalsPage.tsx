import {Card,Stack,Text} from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
export default function RentalsPage(){return <Stack className="cadenza-page"><PageHeader eyebrow="Rentals" title="Rentals" description="Schedule instrument and band-room rentals, collect deposits, and settle remaining balances."/><Card className="cadenza-panel" withBorder><Text fw={600}>Rental workspace</Text><Text size="sm" c="dimmed" mt="xs">Cadenza owns rental policy and workflows; the shared resources, scheduling, and payment mechanisms are consumed here.</Text></Card></Stack>}
