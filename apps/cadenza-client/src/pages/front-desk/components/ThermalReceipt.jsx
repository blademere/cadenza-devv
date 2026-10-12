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

export default function ThermalReceipt({ transaction, paidAmount, remainingAmount }) {
  if (!transaction) return null;
  const lastPayment = transaction.payments.at(-1);

  return (
    <article id="thermal-receipt" className="thermal-receipt" aria-label="Payment receipt">
      <header className="thermal-receipt__header">
        <h2>CADENZA MUSIC CENTER</h2>
        <p>OFFICIAL PAYMENT RECEIPT</p>
      </header>
      <div className="thermal-receipt__rule" />
      <section className="thermal-receipt__meta">
        <div><span>Receipt for</span><strong>{transaction.person}</strong><small>{transaction.email}</small></div>
        <div className="thermal-receipt__meta-right"><span>Receipt no.</span><strong>{lastPayment?.reference || transaction.id}</strong><small>{formatReceiptDate(lastPayment?.processedAt)}</small></div>
      </section>
      <section className="thermal-receipt__details">
        <div><span>Service</span><strong>{transaction.type}</strong></div>
        <div><span>Description</span><strong>{transaction.details}</strong></div>
      </section>
      <div className="thermal-receipt__rule" />
      <section className="thermal-receipt__payments">
        <div className="thermal-receipt__payment-row thermal-receipt__payment-heading"><span>PAYMENT DETAILS</span><span>AMOUNT</span></div>
        {transaction.payments.map((payment) => (
          <div className="thermal-receipt__payment-row" key={payment.id}>
            <div><strong>{payment.method}</strong><small>{payment.reference}</small></div>
            <strong>{formatReceiptCurrency(payment.amount)}</strong>
          </div>
        ))}
      </section>
      <div className="thermal-receipt__rule" />
      <section className="thermal-receipt__totals">
        <div><span>Total amount</span><strong>{formatReceiptCurrency(transaction.totalAmount)}</strong></div>
        <div><span>Total paid</span><strong>{formatReceiptCurrency(paidAmount(transaction))}</strong></div>
        <div className="thermal-receipt__balance"><span>Balance due</span><strong>{formatReceiptCurrency(remainingAmount(transaction))}</strong></div>
      </section>
      <footer className="thermal-receipt__footer">
        <strong>{transaction.status}</strong>
        <p>Thank you for choosing Cadenza Music Center.</p>
        <small>Cashier copy · Keep this receipt for your records.</small>
      </footer>
    </article>
  );
}
