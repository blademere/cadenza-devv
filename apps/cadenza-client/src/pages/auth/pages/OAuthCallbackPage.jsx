import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '@/services/auth/authService';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const startedRef = useRef(false);
  const [message, setMessage] = useState('Signing you in with Google…');

  useEffect(() => {
    if (startedRef.current) return undefined;
    startedRef.current = true;

    const completeLogin = async () => {
      if (searchParams.get('error') || !await authService.refresh()) {
        setMessage('Google sign-in was not completed. Please try again.');
        return;
      }
      try {
        const account = (await authService.me())?.data?.account;
        if (!account) throw new Error('Missing account.');
        if (account.type !== 'CLIENT') {
          await authService.logout();
          setMessage('Invalid credentials.');
          return;
        }
        const destination = account.type === 'STAFF'
          ? (account.staffType === 'FRONT_DESK' ? '/front-desk' : '/admin')
          : '/client';

        // The callback establishes the token outside AuthContext's state. A
        // full reload lets AuthContext read the new token and hydrate user and
        // account before the protected route evaluates authentication.
        window.location.replace(destination);
      } catch {
        setMessage('Your Google account is not available in Cadenza. Please try again.');
      }
    };
    completeLogin();
    return undefined;
  }, [searchParams]);

  return <div className="flex min-h-screen items-center justify-center p-6 text-muted-foreground">{message}</div>;
}
