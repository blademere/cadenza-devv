import { Box, Stack, Typography } from '@mui/material'

export default function PageHeader({ eyebrow, title, description, actions }) {
  return <Box component="header" sx={{ mb: 1 }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}><Box minWidth={0}>{eyebrow && <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700, letterSpacing: '.09em' }}>{eyebrow}</Typography>}<Typography variant="h4" sx={{ mt: eyebrow ? .2 : 0 }}>{title}</Typography>{description && <Typography color="text.secondary" sx={{ mt: .6, maxWidth: 760 }}>{description}</Typography>}</Box>{actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}</Stack></Box>
}
