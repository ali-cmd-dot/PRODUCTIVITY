'use client';

import type { MatrixRow, DateEntry } from '@/lib/types';

interface Props {
  data: MatrixRow[];
  dates: DateEntry[];
}

function CellContent({
  cell,
}: {
  cell: { total: number; completed: number; pending: number; completionPct: number; footageRaised: number } | null;
}) {
  if (!cell) return <span className="cell-empty">—</span>;
  return (
    <div className="matrix-cell">
      <div>Total: {cell.total}</div>
      <div>Completed: {cell.completed}</div>
      <div>Pending: {cell.pending}</div>
      <div>Completion: {cell.completionPct}%</div>
      <div>Footage: {cell.footageRaised}</div>
    </div>
  );
}

export default function MatrixTable({ data, dates }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Employee Productivity Matrix — Day by Day</h3>
      </div>
      <p className="card-desc">
        Har employee x har date ka poora breakdown ek grid me. Kam completion% wali cells red-highlighted hain.
      </p>
      <div className="table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th className="sticky-col">Employee</th>
              {dates.map((d) => (
                <th key={d.key}>{d.key}</th>
              ))}
              <th>Month Total</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.employee}>
                <td className="sticky-col">{row.employee}</td>
                {dates.map((d) => {
                  const cell = row.cells[d.key];
                  return (
                    <td key={d.key} className={cell?.isLow ? 'low-cell' : ''}>
                      <CellContent cell={cell} />
                    </td>
                  );
                })}
                <td className={row.monthTotal.isLow ? 'low-cell' : ''}>
                  <CellContent cell={row.monthTotal} />
                </td>
                <td className={row.note ? 'note-cell' : ''}>{row.note}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={dates.length + 3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>
                  Is month ke liye koi data nahi mila.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
