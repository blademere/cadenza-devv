import { Box, Stack, Typography } from '@mui/material'

export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <Box component="header" sx={{ mb: 1 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }} justifyContent="space-between">
        <Box minWidth={0}>
          {eyebrow && (
            <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>
              {eyebrow}
            </Typography>
          )}
          <Typography variant="h4" sx={{ mt: eyebrow ? 0.25 : 0 }}>
            {title}
          </Typography>
          {description && (
            <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 780, lineHeight: 1.65 }}>
              {description}
            </Typography>
          )}
        </Box>
        {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
      </Stack>
    </Box>
  )
}
