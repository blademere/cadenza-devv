import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { FieldDescription, FieldGroup, FieldSeparator } from '@/components/ui/field';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/Input';
import { getGoogleOAuthUrl } from '@/services/auth/authService';
import { AuthContext } from '@/core/auth/AuthContext';
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function SignupForm({ className, ...props }) {
  const navigate = useNavigate();
  const { register, isLoading } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await register({ email, password });
      navigate('/login', { state: { message: 'Account created. Please log in.' } });
    } catch (requestError) {
      setError(requestError?.message || 'Unable to create your account.');
    }
  }

  return <div className={cn('flex flex-col gap-6', className)} {...props}>
    <Card className="overflow-hidden p-0"><CardContent className="grid p-0 md:grid-cols-2">
      <form className="p-5 sm:p-6 md:p-8" onSubmit={handleSubmit}><FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center"><h1 className="text-xl font-bold sm:text-2xl">Create your account</h1><p className="text-sm text-balance text-muted-foreground">Sign up securely with your Google account. New accounts are created as clients.</p></div>
        <Field><FieldLabel htmlFor="signup-email">Email</FieldLabel><Input id="signup-email" type="email" placeholder="m@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
        <Field className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="signup-password">Password</FieldLabel><Input id="signup-password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></Field><Field><FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel><Input id="confirm-password" type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></Field></Field>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Creating account...' : 'Create Account'}</Button>
        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">Continue with</FieldSeparator>
        <Button type="button" onClick={() => { window.location.href = getGoogleOAuthUrl(); }}><GoogleIcon />Sign up with Google</Button>
        <FieldDescription className="text-center">Already have an account? <a href="/login">Sign in</a></FieldDescription>
      </FieldGroup></form><div className="relative hidden bg-muted md:block" />
    </CardContent></Card>
    <FieldDescription className="px-6 text-center">By continuing, you agree to our <a href="#">Terms of Service</a>.</FieldDescription>
  </div>;
}

function GoogleIcon() { return <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="currentColor" /></svg>; }
