import { Box, CircularProgress, Stack, Typography } from '@mui/material'

export default function LoadingState({ label = 'Loading…' }) { return <Box sx={{ py: 7, display: 'grid', placeItems: 'center' }}><Stack alignItems="center" spacing={1.5}><CircularProgress size={26} /><Typography variant="body2" color="text.secondary">{label}</Typography></Stack></Box> }
