'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ReportResponse } from '@/lib/types';
import ClientCompletionTrendChart from '@/components/ClientCompletionTrendChart';
import FootageRequestTrendChart from '@/components/FootageRequestTrendChart';
import DailyVolumeChart from '@/components/DailyVolumeChart';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function DashboardPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/report?month=${month}&year=${year}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load report');
      setReport(json);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const overallCompletion = report && report.employeeTrend.length > 0
    ? (() => {
        let done = 0, total = 0;
        report.employeeTrend.forEach((p) =>
          Object.values(p.employees).forEach((e) => {
            done += e.completed;
            total += e.total;
          })
        );
        return total > 0 ? Math.round((done / total) * 1000) / 10 : 0;
      })()
    : 0;

  const totalFootageRequests = report
    ? report.dailyVolume.reduce((sum, d) => sum + d.totalRequests, 0)
    : 0;

  return (
    <div className="page">
      <div className="header">
        <div>
          <h1>Employee Productivity Dashboard</h1>
          <p className="subtitle">
            {report ? `Generated ${new Date(report.generatedAt).toLocaleString('en-IN')}` : 'Cautio — fleet ops'}
          </p>
        </div>
        <div className="controls">
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))}>
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button className="refresh-btn" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="state-msg error">{error}</div>}

      {!error && loading && !report && <div className="state-msg">Loading report…</div>}

      {report && (
        <>
          <div className="stat-strip">
            <div className="stat-pill">
              <div className="stat-label">Employees</div>
              <div className="stat-value">{report.employees.length}</div>
            </div>
            <div className="stat-pill">
              <div className="stat-label">Days covered</div>
              <div className="stat-value">{report.employeeTrend.length}</div>
            </div>
            <div className="stat-pill">
              <div className="stat-label">Overall completion</div>
              <div className="stat-value">{overallCompletion}%</div>
            </div>
            <div className="stat-pill">
              <div className="stat-label">Footage requests</div>
              <div className="stat-value">{totalFootageRequests}</div>
            </div>
          </div>

          <ClientCompletionTrendChart data={report.employeeTrend} employees={report.employees} />
          <FootageRequestTrendChart data={report.footageTrend} employees={report.employees} />
          <DailyVolumeChart data={report.dailyVolume} />
        </>
      )}
    </div>
  );
}
