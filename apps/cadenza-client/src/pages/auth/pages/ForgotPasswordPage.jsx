import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { authService } from '@/services/auth/authService';

export default function ForgotPasswordPage() {
  const location = useLocation();
  const loginPath = location.pathname.startsWith('/staff/') ? '/staff/login' : '/login';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.requestPasswordReset(email);
      setMessage('Password reset instructions have been sent to your email.');
    } catch (requestError) {
      setError(requestError?.message || 'Unable to request a password reset.');
    } finally {
      setLoading(false);
    }
  };

  return <Card className="mx-auto w-full max-w-md"><CardHeader><CardTitle>Forgot password?</CardTitle></CardHeader><CardContent>
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm text-muted-foreground">Enter your account email and we will send a secure reset link.</p>
      <Input type="email" autoComplete="email" placeholder="staff@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
      {message && <p role="status" className="text-sm text-green-700">{message}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</Button>
      <Link className="block text-center text-sm underline" to={loginPath}>Back to login</Link>
    </form>
  </CardContent></Card>;
}
