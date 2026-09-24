import { Box, Group, Text, Title } from '@mantine/core'

export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="obo-page-header">
      <Box style={{ minWidth: 0 }}>
        {eyebrow && <Text className="obo-eyebrow">{eyebrow}</Text>}
        <Title className="obo-page-title" order={1} mt={eyebrow ? 4 : 0}>{title}</Title>
        {description && <Text className="obo-page-subtitle" mt={6} maw={760}>{description}</Text>}
      </Box>
      {actions && <Group gap="sm" wrap="wrap">{actions}</Group>}
    </header>
  )
}
