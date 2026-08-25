import { useEffect, useState } from 'react'
import { apiClient } from '../services/api/client'
import { Card } from '../../components/ui/card'
import { Heading } from '../../components/ui/heading'
import { Text } from '../../components/ui/text'
import { VStack } from '../../components/ui/vstack'
import { HStack } from '../../components/ui/hstack'
import { Badge, BadgeText } from '../../components/ui/badge'

export default function ProfessionalsPage() {
  const [verified, setVerified] = useState([])
  const [error, setError] = useState(null)
  useEffect(() => { apiClient.get('/obo/professionals/verified').then((response) => setVerified(response?.data ?? response ?? [])).catch((nextError) => setError(nextError.message)) }, [])
  return <VStack space="lg" className="mx-auto w-full max-w-7xl"><VStack space="xs"><Text size="sm" className="text-muted-foreground">Professional registry</Text><Heading size="xl">Professionals</Heading><Text className="text-muted-foreground">Verified professionals available for association with permit applications.</Text></VStack>{error && <Card variant="outline" className="p-5"><Text className="text-error-700">{error}</Text></Card>}<Card variant="outline" className="overflow-hidden p-0">{verified.length ? verified.map((professional) => <HStack key={professional.id} className="items-center justify-between gap-4 border-b border-outline-100 p-5 last:border-b-0"><VStack space="none"><Text size="sm" bold>{professional.name ?? professional.user?.name ?? 'Professional'}</Text><Text size="2xs" className="text-muted-foreground">{professional.registrationNumber ?? professional.prcId ?? 'Registration unavailable'}</Text></VStack><Badge action="success" variant="outline"><BadgeText>Verified</BadgeText></Badge></HStack>) : <Text className="p-5 text-muted-foreground">No verified professionals returned.</Text>}</Card></VStack>
}
