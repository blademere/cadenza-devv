import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { FieldDescription, FieldGroup } from '@/components/ui/field';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/Input';
import { useNavigate } from 'react-router-dom';
import { authService, getGoogleOAuthUrl } from '@/services/auth/authService';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function LoginForm({ className, audience = 'client', ...props }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authService.requestOtp({ email, password, purpose: 'login' });
      navigate('/signup/verify', {
        state: { email, purpose: 'login', audience },
      });
    } catch (requestError) {
      setError(requestError?.message || 'Unable to log in.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-5 sm:p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">
                  {audience === 'staff'
                    ? 'Login'
                    : audience === 'front-desk'
                      ? 'Front Desk Login'
                      : audience === 'admin'
                        ? 'Admin Login'
                        : 'Welcome back'}
                </h1>
                <p className="text-balance text-muted-foreground">
                  Enter your email and password to receive a one-time login
                  code.
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="login-email">Email</FieldLabel>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="login-password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </Field>

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}

              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>

              {audience === 'client' ? (
                <Button
                  type="button"
                  onClick={() => {
                    window.location.href = getGoogleOAuthUrl();
                  }}
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
              ) : null}

              {audience === 'client' ? (
                <FieldDescription className="flex flex-col items-center gap-2 text-center">
                  <button
                    type="button"
                    className="underline"
                    onClick={() => navigate('/forgot-password')}
                  >
                    Forgot your password?
                  </button>
                  <span>
                    New to Cadenza?{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => navigate('/signup')}
                    >
                      Sign up
                    </button>
                  </span>
                </FieldDescription>
              ) : (
                <FieldDescription className="flex justify-center text-center">
                  <button
                    type="button"
                    className="underline"
                    onClick={() => navigate('/staff/forgot-password')}
                  >
                    Forgot your password?
                  </button>
                </FieldDescription>
              )}
            </FieldGroup>
          </form>

          <div className="relative hidden bg-muted md:block" />
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center">
        By continuing, you agree to our <a href="#">Terms of Service</a>.
      </FieldDescription>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
        fill="currentColor"
      />
    </svg>
  );
}