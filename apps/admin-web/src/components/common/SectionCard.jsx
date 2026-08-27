import { Card, CardContent } from '@mui/material'

export default function SectionCard({ children, sx, ...props }) {
  return <Card {...props} sx={{ borderRadius: 2, ...sx }}><CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>{children}</CardContent></Card>
}
