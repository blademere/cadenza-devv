import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { authService } from '@/services/auth/authService';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!token) return setError('This reset link is invalid or expired.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await authService.resetPassword({ token, newPassword: password });
      setMessage('Password reset successfully. You can now sign in.');
      setPassword('');
      setConfirm('');
    } catch (requestError) {
      setError(requestError?.message || 'Unable to reset your password.');
    } finally {
      setLoading(false);
    }
  };

  return <Card className="mx-auto w-full max-w-md"><CardHeader><CardTitle>Set a new password</CardTitle></CardHeader><CardContent>
    <form className="space-y-4" onSubmit={submit}>
      <Input type="password" autoComplete="new-password" placeholder="New password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
      <Input type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required minLength={8} />
      {message && <p role="status" className="text-sm text-green-700">{message}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" type="submit" disabled={loading || !token}>{loading ? 'Saving...' : 'Reset password'}</Button>
      <Link className="block text-center text-sm underline" to="/staff">Back to staff login</Link>
    </form>
  </CardContent></Card>;
}
