'use client';

import type { FootageReportRow } from '@/lib/types';

interface Props {
  data: FootageReportRow[];
}

export default function FootageReportTable({ data }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Footage Requests — Daily Turnaround</h3>
      </div>
      <p className="card-desc">Har din ka total footage-request volume, completion %, aur average turnaround time.</p>
      <div className="table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Total Requests</th>
              <th>Completed</th>
              <th>Pending</th>
              <th>Completion %</th>
              <th>Avg Completion Time</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className={r.isTotalRow ? 'total-row' : ''}>
                <td>{r.dateLabel}</td>
                <td className="num">{r.totalRequests}</td>
                <td className="num">{r.completed}</td>
                <td className="num">{r.pending}</td>
                <td className="num">{r.completionPct}%</td>
                <td>{r.avgCompletionTimeLabel}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>
                  Is month ke liye koi footage request nahi mili.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
