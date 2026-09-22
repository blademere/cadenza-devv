import {Stack,Text} from '@mantine/core'
import PageHeader from '../../../components/common/PageHeader'
export default function ProfilePage(){return <Stack className="cadenza-page"><PageHeader eyebrow="Account" title="Profile" description="Manage your shared account profile and personal information."/><Text c="dimmed">Profile management uses the shared users capability and Cadenza application context.</Text></Stack>}
