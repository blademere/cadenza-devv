import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

export default function HomePage() {
  return <main className="grid min-h-screen place-items-center bg-muted/30 p-6">
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-3xl">Cadenza</CardTitle>
        <CardDescription>Music lessons, instrument rentals, and band-room rentals.</CardDescription>
      </CardHeader>
      <CardContent><Button asChild><Link to="/login">Sign in</Link></Button></CardContent>
    </Card>
  </main>
}
