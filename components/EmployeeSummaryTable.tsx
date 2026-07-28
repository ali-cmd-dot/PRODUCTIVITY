'use client';

import type { EmployeeSummaryRow } from '@/lib/types';

interface Props {
  data: EmployeeSummaryRow[];
}

export default function EmployeeSummaryTable({ data }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Employee Productivity — Monthly Summary</h3>
      </div>
      <p className="card-desc">Har employee ka poore mahine ka total — clients aur footage requests dono.</p>
      <div className="table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th className="sticky-col">Employee</th>
              <th>Total Clients</th>
              <th>Completed</th>
              <th>Pending</th>
              <th>Completion %</th>
              <th>Days Present</th>
              <th>Avg Clients/Day</th>
              <th>Note</th>
              <th>Total Video Requests</th>
              <th>Resolved</th>
              <th>Pending Resolution</th>
              <th>Avg Resolution (hrs)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.employee}>
                <td className="sticky-col">{r.employee}</td>
                <td className="num">{r.totalClients}</td>
                <td className="num">{r.totalCompleted}</td>
                <td className="num">{r.totalPending}</td>
                <td className="num">{r.completionPct}%</td>
                <td className="num">{r.daysPresent}</td>
                <td className="num">{r.avgClientsPerDay}</td>
                <td className={r.note ? 'note-cell' : ''}>{r.note}</td>
                <td className="num">{r.totalRequests}</td>
                <td className="num">{r.resolvedCount}</td>
                <td className="num">{r.pendingCount}</td>
                <td className="num">{r.avgResolutionHrs ?? '—'}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>
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
