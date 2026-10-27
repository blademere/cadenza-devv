import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/Input';
import { authService } from '@/services/auth/authService';

export default function EmailOtpPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const email = state?.email || '';
  const purpose = state?.purpose === 'signup' ? 'signup' : 'login';
  const audience = state?.audience || 'client';
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email) {
      navigate(purpose === 'signup' ? '/signup' : '/login', { replace: true });
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const result = await authService.verifyOtp({ email, otp, purpose });
      const isAllowed = audience === 'client'
        ? result.account?.type === 'CLIENT'
        : result.account?.type === 'STAFF' && (audience === 'staff' ? ['ADMIN', 'FRONT_DESK'].includes(result.account.staffType) : audience === 'admin' ? result.account.staffType === 'ADMIN' : result.account.staffType === 'FRONT_DESK');
      if (!isAllowed) {
        await authService.logout();
        throw new Error('This account is not an administrator or Front Desk account.');
      }
      const destination = result.account?.type === 'CLIENT'
        ? '/client'
        : result.account?.staffType === 'FRONT_DESK'
          ? '/front-desk'
          : '/admin';

      // Verification stores the session outside AuthContext. Reload so the
      // provider hydrates the new user and account before the protected route.
      window.location.replace(destination);
    } catch (requestError) {
      setError(requestError?.message || 'The verification code is invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  }

  return <div className="flex flex-col gap-6">
    <Card className="overflow-hidden p-0"><CardContent className="p-5 sm:p-6 md:p-8">
      <form onSubmit={handleSubmit}><FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center"><h1 className="text-2xl font-bold">Enter your code</h1><p className="text-balance text-muted-foreground">We sent a one-time code to <strong>{email || 'your email'}</strong>.</p></div>
        <Field><FieldLabel htmlFor="email-otp">Verification code</FieldLabel><Input id="email-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} required /></Field>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Verifying...' : 'Verify and continue'}</Button>
      <FieldDescription className="text-center"><button type="button" className="underline" onClick={() => navigate(purpose === 'signup' ? '/signup' : audience === 'staff' ? '/staff/login' : '/login')}>Use a different email</button></FieldDescription>
      </FieldGroup></form>
    </CardContent></Card>
  </div>;
}
