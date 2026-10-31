import './thermal-receipt.css';

const formatReceiptCurrency = (amount) =>
  `₱${Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatReceiptDate = (value) =>
  new Date(value || Date.now()).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export default function ThermalReceipt({
  transaction,
  paidAmount,
  remainingAmount,
  receiptNumber,
}) {
  if (!transaction) return null;
  const lastPayment = transaction.payments.at(-1);
  const currentPayments = Array.isArray(transaction.payments)
    ? transaction.payments
    : [];
  const receiptDate = lastPayment?.processedAt || transaction.createdAt;
  const isCashPayment = (payment) =>
    String(payment.method || '').toUpperCase() === 'CASH';

  return (
    <article id="thermal-receipt" className="thermal-receipt" aria-label="Payment receipt">
      <header className="thermal-receipt__header">
        <h2>CADENZA MUSIC CENTER</h2>
        <p>OFFICIAL PAYMENT RECEIPT</p>
      </header>
      <div className="thermal-receipt__rule" />
      <section className="thermal-receipt__meta">
        <div><span>Receipt for</span><strong>{transaction.person?.toUpperCase()}</strong></div>
        <div className="thermal-receipt__meta-right"><span>Receipt no.</span><strong>{receiptNumber || transaction.id}</strong><small>{formatReceiptDate(receiptDate)}</small></div>
      </section>
      <section className="thermal-receipt__details">
        <div><span>Service</span><strong>{transaction.type?.toUpperCase()}</strong></div>
        <div><span>Description</span><strong>{transaction.details}</strong></div>
      </section>
      <div className="thermal-receipt__rule" />
      <section className="thermal-receipt__payments">
        <div className="thermal-receipt__payment-row thermal-receipt__payment-heading"><span>PAYMENT DETAILS</span><span>AMOUNT</span></div>
        {currentPayments.map((payment) => (
          <div className="thermal-receipt__payment-row" key={payment.id}>
            <div>
              <strong>
                {isCashPayment(payment)
                  ? 'Cash'
                  : String(payment.method || '').replace(/_/g, ' ')}
              </strong>
              {!isCashPayment(payment) && payment.reference && (
                <small>Ref no. {payment.reference}</small>
              )}
              <small>
                {formatReceiptDate(payment.processedAt || receiptDate)}
              </small>
            </div>
            <strong>{formatReceiptCurrency(payment.amount)}</strong>
          </div>
        ))}
      </section>
      <div className="thermal-receipt__rule" />
      <section className="thermal-receipt__totals">
        <div><span>Total amount</span><strong>{formatReceiptCurrency(transaction.totalAmount)}</strong></div>
        <div><span>Total paid</span><strong>{formatReceiptCurrency(paidAmount(transaction))}</strong></div>
        {Number(lastPayment?.changeAmount || 0) > 0 && (
          <div><span>Change</span><strong>{formatReceiptCurrency(lastPayment.changeAmount)}</strong></div>
        )}
        <div className="thermal-receipt__balance"><span>Balance due</span><strong>{formatReceiptCurrency(remainingAmount(transaction))}</strong></div>
      </section>
      <footer className="thermal-receipt__footer">
        <strong>{transaction.status}</strong>
        <p>Thank you for choosing Cadenza Music Center.</p>
      </footer>
    </article>
  );
}
