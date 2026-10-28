import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, QrCode } from 'lucide-react';

import { getPaymentAccountQr, getPaymentAccounts } from '@/services/paymentAccountsService';

export default function PaymentAccountInstructions({ selectedAccountId = '' } = {}) {
  const [accounts, setAccounts] = useState([]);
  const [qrUrls, setQrUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedAccountId, setCopiedAccountId] = useState(null);
  const [qrErrors, setQrErrors] = useState({});

  useEffect(() => {
    let active = true;
    const objectUrls = [];

    const load = async () => {
      try {
        const paymentAccounts = await getPaymentAccounts();
        if (!active) return;
        const visibleAccounts = selectedAccountId
          ? paymentAccounts.filter((account) => String(account.id) === String(selectedAccountId))
          : paymentAccounts;
        setAccounts(visibleAccounts);
        // Request each QR directly, even when the API's availability metadata is stale.
        // The image endpoint is authoritative; a missing file returns a helpful error.
        const results = await Promise.all(paymentAccounts.map(async (account) => {
          try {
            const response = await getPaymentAccountQr(account.id);
            const blob = await response.blob();
            if (!blob.type.startsWith('image/') || blob.size === 0) throw new Error('Invalid QR image');
            const url = URL.createObjectURL(blob);
            objectUrls.push(url);
            return { id: account.id, url };
          } catch (requestError) {
            return { id: account.id, error: requestError?.message || 'QR image could not be loaded.' };
          }
        }));
        if (active) {
          setQrUrls(Object.fromEntries(results.filter((result) => result.url).map(({ id, url }) => [id, url])));
          setQrErrors(Object.fromEntries(results.filter((result) => result.error).map(({ id, error }) => [id, error])));
        }
      } catch (requestError) {
        if (active) setError(requestError?.message || 'Unable to load payment accounts.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedAccountId]);

  const copyAccountNumber = async (account) => {
    try {
      await navigator.clipboard.writeText(account.accountNumber);
      setCopiedAccountId(account.id);
      window.setTimeout(() => setCopiedAccountId(null), 1800);
    } catch {
      setError('Unable to copy the account number.');
    }
  };

  return (
    <div className="mt-6 w-full rounded-xl border bg-muted/20 p-5 text-left">
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Send payment to</h2>
      </div>
      {loading && <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading payment accounts...</div>}
      {!loading && error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {!loading && !error && accounts.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No active payment account is available yet.</p>}
      <div className="mt-4 grid gap-4">
        {accounts.map((account) => (
          <div key={account.id} className="w-full rounded-lg border bg-background p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bank name</p>
                <p className="mt-1 text-lg font-semibold">{account.bankName || 'Bank account'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Account number</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="min-w-0 break-all text-lg font-semibold">{account.accountNumber}</p>
                  <button type="button" onClick={() => copyAccountNumber(account)} className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted" aria-label={`Copy ${account.bankName} account number`}>
                    {copiedAccountId === account.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedAccountId === account.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-5 border-t pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">QR payment code</p>
              <div className="mt-3 flex min-h-72 w-full items-center justify-center overflow-hidden rounded-lg bg-white p-3 sm:min-h-96 sm:p-5">
                {qrUrls[account.id] ? <img src={qrUrls[account.id]} alt={`${account.bankName} payment QR`} className="h-auto max-h-[32rem] w-full rounded-md object-contain" /> : <div className="flex min-h-72 w-full flex-col items-center justify-center gap-2 rounded-md bg-muted p-4 text-center text-xs text-muted-foreground sm:min-h-96"><p className="font-semibold">QR unavailable</p><p>{qrErrors[account.id] || "Unable to retrieve this QR image. Ask an administrator to verify persistent QR storage and replace the missing QR image."}</p><p>You can still view and copy the account number above.</p></div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
