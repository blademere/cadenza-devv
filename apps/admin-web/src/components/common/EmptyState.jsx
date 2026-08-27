import { Box, Stack, Typography } from '@mui/material'

export default function EmptyState({ title = 'Nothing here yet', description, action }) {
  return <Box sx={{ py: 7, textAlign: 'center' }}><Stack spacing={1} alignItems="center"><Typography variant="h6">{title}</Typography>{description && <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>{description}</Typography>}{action && <Box sx={{ pt: 1 }}>{action}</Box>}</Stack></Box>
}
