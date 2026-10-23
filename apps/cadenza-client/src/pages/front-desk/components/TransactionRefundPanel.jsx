import { useEffect, useState } from 'react';
import { getTransactionRefundQuote, recordTransactionRefund } from '@/services/front-desk/transactionRefundService';

const money = (value) => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TransactionRefundPanel({ type, transactionId, onRefundRecorded }) {
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState('GCASH');
  const [reference, setReference] = useState('');
  const [confirmedReceived, setConfirmedReceived] = useState(false);
  const [confirmedReturned, setConfirmedReturned] = useState(false);

  useEffect(() => {
    let active = true;
    setQuote(null);
    setLoading(true);
    setError('');
    getTransactionRefundQuote(type, transactionId)
      .then((data) => { if (active) setQuote(data); })
      .catch((err) => { if (active) setError(err?.response?.data?.message || err?.message || 'Unable to load refundable balance.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type, transactionId]);

  const hasUnverified = Number(quote?.unverifiedSubmittedAmount || 0) > 0;
  const canRefund = Number(quote?.refundableAmount || 0) > 0 && !quote?.refund;

  const record = async () => {
    if (!canRefund || saving || !confirmedReturned || (hasUnverified && !confirmedReceived) || reference.trim().length < 3) return;
    setSaving(true);
    setError('');
    try {
      await recordTransactionRefund(type, transactionId, {
        method, reference: reference.trim(), confirmedReceived, confirmedReturned,
      });
      const updated = await getTransactionRefundQuote(type, transactionId);
      setQuote(updated);
      setReference('');
      setConfirmedReceived(false);
      setConfirmedReturned(false);
      onRefundRecorded?.(updated);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to record refund.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Refund accounting</h3>
      {loading ? <p className="text-sm text-muted-foreground">Checking payment records...</p> : quote && (
        <>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Recorded paid</p><p className="font-medium">{money(quote.paidAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Submitted (unverified)</p><p className="font-medium">{money(quote.unverifiedSubmittedAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Refundable amount</p><p className="font-semibold">{money(quote.refundableAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Already refunded</p><p className="font-medium">{money(quote.refundedAmount)}</p></div>
          </div>
          {quote.refund ? (
            <p className="text-sm">Refund recorded — reference: <span className="font-medium">{quote.refund.reference}</span></p>
          ) : canRefund ? (
            <div className="space-y-3 border-t pt-3">
              <p className="text-xs text-muted-foreground">Return the money using your GCash, bank, or cash process first. This form only records a completed external refund.</p>
              <label className="block text-sm font-medium">Refund method
                <select value={method} onChange={(event) => setMethod(event.target.value)} disabled={saving} className="mt-1 w-full rounded-md border bg-background p-2">
                  <option value="GCASH">GCash</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CASH">Cash</option>
                </select>
              </label>
              <label className="block text-sm font-medium">Refund receipt / transfer reference
                <input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={100} disabled={saving} className="mt-1 w-full rounded-md border bg-background p-2" placeholder="Enter refund reference" />
              </label>
              {hasUnverified && <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={confirmedReceived} onChange={(event) => setConfirmedReceived(event.target.checked)} disabled={saving} />
                I verified the original submitted payment was received. A submitted reference alone is not proof.
              </label>}
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={confirmedReturned} onChange={(event) => setConfirmedReturned(event.target.checked)} disabled={saving} />
                I confirm the refundable amount has already been returned to the client.
              </label>
              <button type="button" onClick={record} disabled={saving || !confirmedReturned || (hasUnverified && !confirmedReceived) || reference.trim().length < 3}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {saving ? 'Recording...' : `Record refund · ${money(quote.refundableAmount)}`}
              </button>
            </div>
          ) : <p className="text-sm text-muted-foreground">No recorded or submitted amount is eligible for a refund.</p>}
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
