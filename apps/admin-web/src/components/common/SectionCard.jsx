import { Card } from '@mantine/core'

export default function SectionCard({ children, sx, ...props }) { return <Card {...props} radius="md" p={{ base: 'md', md: 'lg' }}>{children}</Card> }
