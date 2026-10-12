const formatDate = (value) => {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString();
};

export default function ReportsPageLayout({ report, columns, rows, startDate, endDate, generatedAt, isLoading, error }) {
  return (
    <article id="report-print-document" className="report-template" aria-label={`${report.title} printable report`}>
      <div className="report-template__header">
        <div>
          <p className="report-template__eyebrow">Cadenza Music Center</p>
          <h2 className="report-template__title">Cadenza Reports</h2>
        </div>
        <div className="report-template__mark">C</div>
      </div>
      <section className="report-template__details">
        <div><span>Type of report</span><strong>{report.title}</strong></div>
        <div><span>Date range</span><strong>{formatDate(startDate)} to {formatDate(endDate)}</strong></div>
      </section>
      <div className="report-template__body">
        {isLoading ? (
          <p className="report-template__message">Loading report data...</p>
        ) : error ? (
          <p className="report-template__message report-template__message--error">{error}</p>
        ) : (
          <table className="report-template__table">
            <thead>
              <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length > 0 ? rows.map((row, rowIndex) => (
                <tr key={`${report.id}-${rowIndex}`}>
                  {columns.map((_, columnIndex) => (
                    <td key={`${report.id}-${rowIndex}-${columnIndex}`}>{row[columnIndex] ?? "-"}</td>
                  ))}
                </tr>
              )) : (
                <tr><td colSpan={columns.length}>No records found for this date range.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <footer className="report-template__footer">
        <span>Cadenza Music Center</span><span>Date generated/requested: {generatedAt}</span>
      </footer>
      <style>{`.report-template{display:flex;min-height:620px;flex-direction:column;gap:24px;border:1px solid #d1d5db;border-radius:12px;background:#fff;padding:32px;color:#111827}.report-template__header{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #111827;padding-bottom:20px}.report-template__eyebrow{margin:0 0 4px;color:#6b7280;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}.report-template__title{margin:0;font-size:28px;line-height:1.2;font-weight:700}.report-template__mark{display:grid;height:36px;width:36px;place-items:center;border:2px solid #111827;border-radius:50%;font-weight:700}.report-template__details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;border-bottom:1px solid #d1d5db;padding-bottom:20px}.report-template__details div{display:grid;gap:5px}.report-template__details span{color:#6b7280;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.report-template__details strong{font-size:14px}.report-template__body{flex:1}.report-template__table{width:100%;border-collapse:collapse;font-size:13px}.report-template__table th{background:#f3f4f6;font-weight:700;text-align:left}.report-template__table th,.report-template__table td{border:1px solid #d1d5db;padding:11px 12px;vertical-align:top}.report-template__message{margin:0;color:#6b7280;font-size:13px}.report-template__message--error{color:#b91c1c}.report-template__footer{display:flex;justify-content:space-between;border-top:1px solid #d1d5db;padding-top:14px;color:#6b7280;font-size:11px}@media print{@page{size:A4 portrait;margin:14mm}html,body,#root{background:#fff!important}.reports-ui,[data-slot="sidebar"],header{display:none!important}.report-template{display:flex!important;visibility:visible!important;width:100%!important;min-height:260mm;border:0!important;border-radius:0!important;padding:0!important;background:#fff!important;color:#111827!important}.report-template__table{display:table!important;visibility:visible!important;width:100%!important}.report-template__table th,.report-template__table td{color:#111827!important}.report-template__footer{margin-top:auto}}`}</style>
      <style>{`@media print { .report-template__header { display: flex !important; visibility: visible !important; } }`}</style>
      <style>{`@media print {
        @page { size: A4 portrait; margin: 14mm; }
        html, body, #root { width: auto; min-width: 0; margin: 0; padding: 0; background: #fff !important; }
        body * { visibility: hidden !important; }
        #report-print-document, #report-print-document * { visibility: visible !important; }
        #report-print-document { position: absolute; top: 0; left: 0; width: 100%; min-height: 260mm; margin: 0; border: 0; border-radius: 0; padding: 0; background: #fff; color: #111827; }
        #report-print-document .report-template__table { display: table !important; width: 100%; }
        #report-print-document .report-template__footer { margin-top: auto; }
      }`}</style>
    </article>
  );
}
