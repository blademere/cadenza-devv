import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { FieldDescription, FieldGroup, FieldSeparator } from '@/components/ui/field';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/Input';
import { getGoogleOAuthUrl } from '@/services/auth/authService';
import { authService } from '@/services/auth/authService';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

export function SignupForm({ className, ...props }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsRead, setTermsRead] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!termsAccepted) {
      setError('Please read and accept the Terms & Conditions before continuing.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await authService.requestOtp({ email, purpose: 'signup' });
      navigate('/signup/verify', { state: { email, purpose: 'signup' } });
    } catch (requestError) {
      setError(requestError?.message || 'Unable to send the verification code.');
    } finally {
      setIsLoading(false);
    }
  }

  return <div className={cn('flex flex-col gap-6', className)} {...props}>
    <Card className="mx-auto min-w-0 border-0 bg-white/90 p-0 shadow-xl backdrop-blur" style={{ width: '560px', maxWidth: 'calc(100vw - 2rem)' }}><CardContent className="p-5 sm:p-7">
      <form className="w-full" onSubmit={handleSubmit}><FieldGroup>
        <div className="mx-auto grid size-10 place-items-center rounded-full bg-blue-100 text-blue-700"><UserRound className="size-5" /></div>
        <div className="flex flex-col items-center gap-2 text-center"><h1 className="text-xl font-bold sm:text-2xl">Create your account</h1><p className="text-sm text-balance text-muted-foreground">Enter your email and we’ll send you a one-time verification code.</p></div>
        <Field><FieldLabel htmlFor="signup-email">Email</FieldLabel><Input id="signup-email" type="email" autoComplete="email" placeholder="m@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <input type="checkbox" checked={termsAccepted} onChange={(event) => { if (event.target.checked) setTermsOpen(true); else setTermsAccepted(false); }} className="mt-0.5 accent-blue-700" />
          <span>I agree to the <button type="button" className="font-medium text-blue-700 underline" onClick={() => setTermsOpen(true)}>Terms & Conditions</button>.</span>
        </label>
        <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Terms & Conditions</DialogTitle><DialogDescription>Read the complete terms before agreeing.</DialogDescription></DialogHeader>
            <div className="h-72 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600" onScroll={(event) => { const element = event.currentTarget; if (element.scrollTop + element.clientHeight >= element.scrollHeight - 4) setTermsRead(true); }}>
              <div className="space-y-4"><p>By creating a Cadenza account, you agree to provide accurate information and keep your account secure.</p><p>Cadenza may provide lesson enrollments, room bookings, instrument rentals, schedules, notifications, and payment records. Requests depend on availability, approval, operating hours, and applicable service rules.</p><p>You are responsible for attending scheduled lessons, following booking rules, returning rented instruments, and paying remaining balances or additional charges.</p><p>Cancellations and refunds are handled according to the applicable Cadenza service policy. Cadenza may restrict access for misuse, security concerns, inaccurate payment information, or violations of these terms.</p><p>Cadenza may send account, enrollment, booking, rental, schedule, and payment notifications through the portal, email, or mobile application.</p></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setTermsOpen(false)}>Cancel</Button><Button type="button" disabled={!termsRead} onClick={() => { setTermsAccepted(true); setTermsOpen(false); }}>I Agree</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={isLoading || !termsAccepted}>{isLoading ? 'Sending code...' : 'Agree and continue'}</Button>
        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">Or continue with</FieldSeparator>
        <Button type="button" disabled={!termsAccepted} onClick={() => { window.location.href = getGoogleOAuthUrl(); }}><GoogleIcon />Continue with Google</Button>
        <FieldDescription className="text-center">Already have an account? <button type="button" className="underline" onClick={() => navigate('/login')}>Sign in</button></FieldDescription>
      </FieldGroup></form>
    </CardContent></Card>
  </div>;
}

function GoogleIcon() { return <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="currentColor" /></svg>; }
