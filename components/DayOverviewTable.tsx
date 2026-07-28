'use client';

import { useMemo, useState } from 'react';
import type { DayOverviewRow } from '@/lib/types';

interface Props {
  data: DayOverviewRow[];
  employees: string[];
}

export default function DayOverviewTable({ data, employees }: Props) {
  const [empFilter, setEmpFilter] = useState('__all__');

  const rows = useMemo(
    () => (empFilter === '__all__' ? data : data.filter((r) => r.employee === empFilter)),
    [data, empFilter]
  );

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Day-Wise Productivity Overview</h3>
      </div>
      <p className="card-desc">Har din har employee ka client completion breakdown, sabse kam wale din highlight ke saath.</p>
      <div className="filter-row">
        <label style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Employee:</label>
        <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}>
          <option value="__all__">All employees</option>
          {employees.map((emp) => (
            <option key={emp} value={emp}>
              {emp}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rows.length} rows</span>
      </div>
      <div className="table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Total Clients</th>
              <th>Completed</th>
              <th>Pending</th>
              <th>Completion %</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.dateKey}-${r.employee}-${i}`}>
                <td>{r.dateLabel}</td>
                <td>{r.employee}</td>
                <td className="num">{r.total}</td>
                <td className="num">{r.completed}</td>
                <td className="num">{r.pending}</td>
                <td className="num">{r.completionPct}%</td>
                <td className={r.note ? 'note-cell' : ''}>{r.note}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>
                  Is month/employee ke liye koi data nahi mila.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
