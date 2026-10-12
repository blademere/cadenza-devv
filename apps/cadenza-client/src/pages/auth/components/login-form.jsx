import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { FieldDescription, FieldGroup, FieldSeparator } from '@/components/ui/field';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/Input';
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGoogleOAuthUrl } from '@/services/auth/authService';
import { AuthContext } from '@/core/auth/AuthContext';

export function LoginForm({ className, ...props }) {
  const navigate = useNavigate();
  const { login, isLoading } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const result = await login({ email, password });
    navigate(result.account?.type === 'CLIENT' ? '/client' : result.account?.staffType === 'FRONT_DESK' ? '/front-desk' : '/admin');
  }

  return <div className={cn('flex flex-col gap-6', className)} {...props}>
    <Card className="overflow-hidden p-0"><CardContent className="grid p-0 md:grid-cols-2">
      <form className="p-5 sm:p-6 md:p-8" onSubmit={handleSubmit}><FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center"><h1 className="text-2xl font-bold">Welcome back</h1><p className="text-balance text-muted-foreground">Continue to your Cadenza account with Google.</p></div>
        <Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" type="email" placeholder="m@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
        <Field><FieldLabel htmlFor="password">Password</FieldLabel><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></Field>
        <Button type="submit" disabled={isLoading}>Login</Button>
        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">Continue with</FieldSeparator>
        <Button type="button" onClick={() => { window.location.href = getGoogleOAuthUrl(); }}><GoogleIcon />Continue with Google</Button>
        <FieldDescription className="text-center">New to Cadenza? <button type="button" className="underline" onClick={() => navigate('/signup')}>Sign up</button></FieldDescription>
      </FieldGroup></form><div className="relative hidden bg-muted md:block" />
    </CardContent></Card>
    <FieldDescription className="px-6 text-center">By continuing, you agree to our <a href="#">Terms of Service</a>.</FieldDescription>
  </div>;
}

function GoogleIcon() { return <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="currentColor" /></svg>; }
