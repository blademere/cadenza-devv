import {Link} from 'react-router-dom'
import {Button,Stack,Text,Title} from '@mantine/core'
export default function HomePage(){return <Stack align="center" justify="center" mih="80vh"><Title>Cadenza</Title><Text c="dimmed">Music lessons, instrument rentals, and band-room rentals.</Text><Button component={Link} to="/login">Sign in</Button></Stack>}
