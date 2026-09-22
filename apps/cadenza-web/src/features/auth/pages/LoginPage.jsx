import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Separator } from '../../../components/ui/separator'

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => { e.preventDefault(); if (busy || isLoading) return; setError(''); setBusy(true); try { await login({ email: email.trim().toLowerCase(), password }); window.location.assign('/app/dashboard') } catch (x) { setError(x.message || 'Unable to sign in.') } finally { setBusy(false) } }
  return <div className="grid min-h-screen place-items-center bg-background p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Welcome to Cadenza</CardTitle><CardDescription>Sign in to your Cadenza workspace.</CardDescription></CardHeader><CardContent className="space-y-6"><Separator />{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}<form onSubmit={submit} className="grid gap-4"><div className="grid gap-2"><Label htmlFor="email">Email address</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} required /></div><div className="grid gap-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.currentTarget.value)} required /></div><Button type="submit" disabled={busy || isLoading}>{busy ? 'Signing in…' : 'Sign in'}</Button></form></CardContent><CardFooter><Button asChild variant="ghost" className="w-full"><Link to="/">Back to home</Link></Button></CardFooter></Card></div>
}
