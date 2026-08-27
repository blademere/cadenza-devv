import { Box, Typography } from '@mui/material'

export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <Box component="header">
      {eyebrow && <Typography variant="body2" color="text.secondary">{eyebrow}</Typography>}
      <Box display="flex" flexWrap="wrap" gap={2} alignItems="flex-start" justifyContent="space-between">
        <Box minWidth={0}>
          <Typography variant="h3" sx={{ mt: eyebrow ? 0.5 : 0, mb: description ? 1 : 0 }}>{title}</Typography>
          {description && <Typography color="text.secondary" sx={{ maxWidth: 760 }}>{description}</Typography>}
        </Box>
        {actions && <Box>{actions}</Box>}
      </Box>
    </Box>
  )
}
