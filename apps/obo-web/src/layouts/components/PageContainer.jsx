import { Container } from '@mantine/core'

export default function PageContainer({ children }) {
  return (
    <Container
      fluid
      size="xl"
      px={{ base: 'md', sm: 'lg', lg: 'xl' }}
      py={{ base: 'lg', md: 'xl' }}
    >
      {children}
    </Container>
  )
}
