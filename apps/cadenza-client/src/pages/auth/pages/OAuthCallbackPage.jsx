import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '@/services/auth/authService';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Signing you in with Google…');

  useEffect(() => {
    let active = true;
    const completeLogin = async () => {
      if (searchParams.get('error') || !await authService.refresh()) {
        setMessage('Google sign-in was not completed. Please try again.');
        return;
      }
      try {
        const account = (await authService.me())?.data?.account;
        if (!active || !account) throw new Error('Missing account.');
        navigate(account.type === 'STAFF' ? (account.staffType === 'FRONT_DESK' ? '/front-desk' : '/admin') : '/client', { replace: true });
      } catch {
        setMessage('Your Google account is not available in Cadenza. Please try again.');
      }
    };
    completeLogin();
    return () => { active = false; };
  }, [navigate, searchParams]);

  return <div className="flex min-h-screen items-center justify-center p-6 text-muted-foreground">{message}</div>;
}
