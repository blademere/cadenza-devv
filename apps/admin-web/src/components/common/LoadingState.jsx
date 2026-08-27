import { CircularProgress, Stack, Typography } from '@mui/material'

export default function LoadingState({ label = 'Loading…' }) {
  return <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ py: 8 }}><CircularProgress size={28} /><Typography color="text.secondary">{label}</Typography></Stack>
}
