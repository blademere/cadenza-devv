const formatDate = (value) => {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString();
};

export default function ReportsPageLayout({ report, columns, rows, startDate, endDate, generatedAt, isLoading, error }) {
  const reportRows = Array.isArray(rows) ? rows : [];
  const summaryIndexMap = {
    'enrollment-summary': [0, 1, 2, 3],
    'rental-monitoring': [0, 1, 2, 3, 4],
    'cancellation-summary': [0, 1, 2],
    'studio-bookings': [0, 1, 2, 3, reportRows.length - 1],
    'instrument-usage': [0, 1, 2, reportRows.length - 1],
    'lesson-progress': [0, 1, 2, 3],
  };
  const summaryIndexes = summaryIndexMap[report.id] || [];
  const isSummaryRow = (row, index) =>
    row.some((cell) => String(cell).toUpperCase() === 'SUMMARY') || summaryIndexes.includes(index);
  const detailRows = reportRows.filter((row, index) => !isSummaryRow(row, index));
  const summaryRows = reportRows.filter((row, index) => isSummaryRow(row, index));
  const summaryItems = report.id === 'billing-payments'
    ? [
      { label: 'Total billed', value: summaryRows[0]?.[1] || '-' },
      { label: 'Payments received', value: summaryRows[0]?.[2] || '-' },
      { label: 'Outstanding balance', value: summaryRows[0]?.[3] || '-' },
      { label: 'Pending payments', value: summaryRows[3]?.[5] || '0' },
    ]
    : summaryRows.map((row) => ({
      label: row[0] || 'Summary',
      value: report.id === 'revenue-sales'
        ? row[2] || '-'
        : row.find((cell, index) => index > 0 && String(cell).toUpperCase() !== 'SUMMARY' && cell !== '') || '-',
    }));

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
          <>
          {summaryRows.length > 0 && (
            <section className="report-template__summary" aria-label="Report summary">
              <h3>Summary</h3>
              <div className="report-template__summary-grid">
                {summaryItems.map(({ label, value }, itemIndex) => (
                  <div key={`${report.id}-summary-${itemIndex}`}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}
          <h3 className="report-template__details-title">Detailed Records</h3>
          <table className="report-template__table">
            <thead>
              <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {detailRows.length > 0 ? detailRows.map((row, rowIndex) => (
                <tr key={`${report.id}-${rowIndex}`}>
                  {columns.map((_, columnIndex) => (
                    <td key={`${report.id}-${rowIndex}-${columnIndex}`}>
                      {row[columnIndex] === '' || row[columnIndex] == null ? '—' : row[columnIndex]}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr><td colSpan={columns.length}>No records found for this date range.</td></tr>
              )}
            </tbody>
          </table>
          </>
        )}
      </div>
      <footer className="report-template__footer">
        <span>Cadenza Music Center</span><span>Date generated/requested: {generatedAt}</span>
      </footer>
      <style>{`.report-template{display:flex;min-height:620px;flex-direction:column;gap:24px;border:1px solid #d1d5db;border-radius:12px;background:#fff;padding:32px;color:#111827}.report-template__header{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #111827;padding-bottom:20px}.report-template__eyebrow{margin:0 0 4px;color:#6b7280;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}.report-template__title{margin:0;font-size:28px;line-height:1.2;font-weight:700}.report-template__mark{display:grid;height:36px;width:36px;place-items:center;border:2px solid #111827;border-radius:50%;font-weight:700}.report-template__details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;border-bottom:1px solid #d1d5db;padding-bottom:20px}.report-template__details div{display:grid;gap:5px}.report-template__details span{color:#6b7280;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.report-template__details strong{font-size:14px}.report-template__body{flex:1}.report-template__table{width:100%;border-collapse:collapse;font-size:13px}.report-template__table th{background:#f3f4f6;font-weight:700;text-align:left}.report-template__table th,.report-template__table td{border:1px solid #d1d5db;padding:11px 12px;vertical-align:top}.report-template__message{margin:0;color:#6b7280;font-size:13px}.report-template__message--error{color:#b91c1c}.report-template__footer{display:flex;justify-content:space-between;border-top:1px solid #d1d5db;padding-top:14px;color:#6b7280;font-size:11px}@media print{@page{size:A4 portrait;margin:14mm}html,body,#root{background:#fff!important}.reports-ui,[data-slot="sidebar"],header{display:none!important}.report-template{display:flex!important;visibility:visible!important;width:100%!important;min-height:260mm;border:0!important;border-radius:0!important;padding:0!important;background:#fff!important;color:#111827!important}.report-template__table{display:table!important;visibility:visible!important;width:100%!important}.report-template__table th,.report-template__table td{color:#111827!important}.report-template__footer{margin-top:auto}}`}</style>
      <style>{`.report-template__summary{margin-top:18px;border:1px solid #d1d5db;border-radius:8px;background:#f9fafb;padding:16px}.report-template__summary h3{margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:.08em}.report-template__summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px 20px}.report-template__summary-grid div{display:flex;justify-content:flex-start;gap:12px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}.report-template__summary-grid span{color:#6b7280}.report-template__summary-grid strong{text-align:left}`}</style>
      <style>{`@media print { .report-template__header { display: flex !important; visibility: visible !important; } }`}</style>
      <style>{`.report-template{gap:16px;padding:20px}.report-template__header{padding-bottom:12px}.report-template__title{font-size:22px}.report-template__mark{height:30px;width:30px;font-size:13px}.report-template__details{gap:16px;padding-bottom:12px}.report-template__details strong{font-size:13px}.report-template__body{font-size:12px}.report-template__summary{margin-top:12px;padding:12px}.report-template__summary h3{margin-bottom:8px;font-size:12px}.report-template__summary-grid{grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px 14px;font-size:11px}.report-template__table{font-size:11px}.report-template__table th,.report-template__table td{padding:7px 8px}.report-template__details-title{margin:0;font-size:14px}.report-template__footer{padding-top:10px;font-size:10px}`}</style>
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
