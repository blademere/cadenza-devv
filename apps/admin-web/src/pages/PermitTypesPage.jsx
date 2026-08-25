import { useEffect, useState } from 'react'
import { apiClient } from '../services/api/client'
import { Card } from '../../components/ui/card'
import { Heading } from '../../components/ui/heading'
import { Text } from '../../components/ui/text'
import { VStack } from '../../components/ui/vstack'
import { Badge, BadgeText } from '../../components/ui/badge'

export default function PermitTypesPage() {
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)
  useEffect(() => { apiClient.get('/obo/permit-types').then((response) => setItems(response?.data ?? response ?? [])).catch((nextError) => setError(nextError.message)) }, [])
  return <VStack space="lg" className="mx-auto w-full max-w-7xl"><VStack space="xs"><Text size="sm" className="text-muted-foreground">Plan Permit configuration</Text><Heading size="xl">Permit Types</Heading><Text className="text-muted-foreground">Available permit application types exposed by the server.</Text></VStack>{error && <Card variant="outline" className="p-5"><Text className="text-error-700">{error}</Text></Card>}<Card variant="outline" className="p-5"><VStack space="sm">{items.length ? items.map((item) => <VStack key={item.id ?? item.key} className="border-b border-outline-100 pb-3 last:border-b-0" space="xs"><Badge variant="outline" className="self-start"><BadgeText>{item.key ?? item.code ?? 'Permit type'}</BadgeText></Badge><Heading size="md">{item.name}</Heading>{item.description && <Text size="sm" className="text-muted-foreground">{item.description}</Text>}</VStack>) : <Text className="text-muted-foreground">No permit types returned.</Text>}</VStack></Card></VStack>
}
