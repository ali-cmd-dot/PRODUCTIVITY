import { NextRequest, NextResponse } from 'next/server';
import { readScheduleData, readIssuesData } from '@/lib/sheets';
import { CONFIG } from '@/lib/config';
import type {
  ReportResponse,
  EmployeeTrendPoint,
  FootageTrendPoint,
  DailyVolumePoint,
  DayOverviewRow,
  EmployeeSummaryRow,
  MatrixRow,
  MatrixCell,
  FootageReportRow,
} from '@/lib/types';

export const dynamic = 'force-dynamic'; // always hit the Sheets API fresh
export const revalidate = 0;

function dateKeyToLabel(dateKey: string): string {
  return dateKey; // already DD-MM-YYYY
}

/** Ported from formatHoursMinutes_ in the Apps Script. */
function formatHoursMinutes(decimalHours: number | null): string {
  if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) return '';
  const totalMinutes = Math.round(decimalHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`);
  if (m > 0 || h === 0) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
  return parts.join(' ');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);

    const [scheduleData, issuesData] = await Promise.all([
      readScheduleData(month, year),
      readIssuesData(month, year),
    ]);

    // Union of every dateKey seen in either source, sorted chronologically.
    const dateKeySet = new Set<string>();
    scheduleData.dates.forEach((d) => dateKeySet.add(d.key));
    Object.values(issuesData.byDate); // (byDate keys added below)
    for (const dateKey in issuesData.byDate) dateKeySet.add(dateKey);

    const sortableDates = Array.from(dateKeySet).map((key) => {
      const [dd, mm, yyyy] = key.split('-').map((n) => parseInt(n, 10));
      return { key, date: new Date(yyyy, mm - 1, dd) };
    });
    sortableDates.sort((a, b) => a.date.getTime() - b.date.getTime());

    // ---------- Chart 1 data: per-employee completion % trend ----------
    const employeeTrend: EmployeeTrendPoint[] = sortableDates.map(({ key: dateKey }) => {
      const point: EmployeeTrendPoint = { dateKey, dateLabel: dateKeyToLabel(dateKey), employees: {} };
      for (const emp of scheduleData.employees) {
        const cell = scheduleData.matrix[emp]?.[dateKey];
        if (!cell) continue;
        const footageCell = issuesData.footage[emp]?.[dateKey];
        point.employees[emp] = {
          total: cell.total,
          completed: cell.completed,
          pending: cell.pending,
          completionPct: cell.total > 0 ? Math.round((cell.completed / cell.total) * 1000) / 10 : 0,
          footageRaised: footageCell?.raised ?? 0,
          footageCompleted: footageCell?.resolved ?? 0,
          footagePending: footageCell?.pending ?? 0,
        };
      }
      return point;
    });

    // ---------- Chart 2 data: per-employee footage-request trend ----------
    const footageTrend: FootageTrendPoint[] = sortableDates.map(({ key: dateKey }) => {
      const point: FootageTrendPoint = { dateKey, dateLabel: dateKeyToLabel(dateKey), employees: {} };
      for (const emp in issuesData.footage) {
        const cell = issuesData.footage[emp][dateKey];
        if (!cell) continue;
        point.employees[emp] = {
          raised: cell.raised,
          completed: cell.resolved,
          pending: cell.pending,
        };
      }
      return point;
    });

    // ---------- Chart 3 data: daily request volume + completion, with per-employee breakdown ----------
    const dailyVolume: DailyVolumePoint[] = sortableDates.map(({ key: dateKey }) => {
      const day = issuesData.byDate[dateKey];
      const breakdown: DailyVolumePoint['employeeBreakdown'] = [];
      for (const emp in issuesData.footage) {
        const cell = issuesData.footage[emp][dateKey];
        if (!cell) continue;
        breakdown.push({ employee: emp, raised: cell.raised, completed: cell.resolved, pending: cell.pending });
      }
      breakdown.sort((a, b) => b.raised - a.raised);

      return {
        dateKey,
        dateLabel: dateKeyToLabel(dateKey),
        totalRequests: day?.total ?? 0,
        completed: day?.resolved ?? 0,
        pending: day?.pending ?? 0,
        completionPct: day && day.total > 0 ? Math.round((day.resolved / day.total) * 1000) / 10 : 0,
        avgResolutionHours: day?.resolutionHoursAvg ?? null,
        employeeBreakdown: breakdown,
      };
    });

    // Only include employees that appear in either the schedule or footage data.
    const allEmployees = Array.from(
      new Set([...scheduleData.employees, ...Object.keys(issuesData.footage)])
    ).sort((a, b) => a.localeCompare(b));

    // ---------- Table 1: Day-Wise Productivity Overview ----------
    // First pass: lowest completion% per date (only across employees with total > 0).
    const minPctByDate: Record<string, number> = {};
    scheduleData.dates.forEach(({ key: dateKey }) => {
      let min: number | null = null;
      scheduleData.employees.forEach((emp) => {
        const cell = scheduleData.matrix[emp]?.[dateKey];
        if (!cell || cell.total === 0) return;
        const pct = cell.completed / cell.total;
        if (min === null || pct < min) min = pct;
      });
      if (min !== null) minPctByDate[dateKey] = min;
    });

    const dayOverview: DayOverviewRow[] = [];
    scheduleData.dates.forEach(({ key: dateKey }) => {
      scheduleData.employees.forEach((emp) => {
        const cell = scheduleData.matrix[emp]?.[dateKey];
        if (!cell) return;
        const pct = cell.total > 0 ? cell.completed / cell.total : 0;
        const isLowest = cell.total > 0 && minPctByDate[dateKey] !== undefined && pct === minPctByDate[dateKey];
        dayOverview.push({
          dateKey,
          dateLabel: dateKeyToLabel(dateKey),
          employee: emp,
          total: cell.total,
          completed: cell.completed,
          pending: cell.pending,
          completionPct: Math.round(pct * 1000) / 10,
          note: isLowest ? 'Lowest Productivity' : '',
        });
      });
    });

    // ---------- Table 2: Employee Monthly Summary ----------
    const summaries = scheduleData.employees.map((emp) => {
      const empDates = scheduleData.matrix[emp] || {};
      let totalClients = 0,
        totalCompleted = 0,
        totalPending = 0,
        daysPresent = 0;
      for (const dateKey in empDates) {
        const d = empDates[dateKey];
        totalClients += d.total;
        totalCompleted += d.completed;
        totalPending += d.pending;
        if (d.total > 0) daysPresent++;
      }
      const completionPct = totalClients > 0 ? Math.round((totalCompleted / totalClients) * 1000) / 10 : 0;
      const avgClientsPerDay = daysPresent > 0 ? Math.round((totalClients / daysPresent) * 10) / 10 : 0;
      const issueStats = issuesData.employeeAgg[emp] || {
        totalRequests: 0,
        resolvedCount: 0,
        pendingCount: 0,
        resolutionHoursAvg: null,
      };
      return {
        employee: emp,
        totalClients,
        totalCompleted,
        totalPending,
        completionPct,
        daysPresent,
        avgClientsPerDay,
        totalRequests: issueStats.totalRequests,
        resolvedCount: issueStats.resolvedCount,
        pendingCount: issueStats.pendingCount,
        avgResolutionHrs:
          issueStats.resolutionHoursAvg === null ? null : Math.round(issueStats.resolutionHoursAvg * 10) / 10,
      };
    });

    const eligible = summaries.filter((s) => s.daysPresent > 0);
    const minAvg = eligible.length > 0 ? Math.min(...eligible.map((s) => s.avgClientsPerDay)) : null;

    const employeeSummary: EmployeeSummaryRow[] = summaries.map((s) => ({
      ...s,
      note: s.daysPresent > 0 && s.avgClientsPerDay === minAvg ? 'Lowest Productive Employee' : '',
    }));

    // ---------- Table 3: Day-by-Day Matrix ----------
    const monthPctByEmployee: Record<string, { pct: number; hasData: boolean }> = {};
    const matrixRowsRaw = scheduleData.employees.map((emp) => {
      const cells: Record<string, MatrixCell | null> = {};
      let monthTotal = 0,
        monthCompleted = 0,
        monthPending = 0,
        monthFootage = 0;

      scheduleData.dates.forEach(({ key: dateKey }) => {
        const cellData = scheduleData.matrix[emp]?.[dateKey];
        const footage = issuesData.footage[emp]?.[dateKey]?.raised ?? 0;
        monthFootage += footage;

        if (!cellData) {
          cells[dateKey] = null;
          return;
        }
        monthTotal += cellData.total;
        monthCompleted += cellData.completed;
        monthPending += cellData.pending;
        const pct = cellData.total > 0 ? Math.round((cellData.completed / cellData.total) * 1000) / 10 : 0;
        cells[dateKey] = {
          total: cellData.total,
          completed: cellData.completed,
          pending: cellData.pending,
          completionPct: pct,
          footageRaised: footage,
          isLow: cellData.total > 0 && pct < CONFIG.LOW_COMPLETION_THRESHOLD,
        };
      });

      const monthPct = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 1000) / 10 : 0;
      monthPctByEmployee[emp] = { pct: monthPct, hasData: monthTotal > 0 };

      const monthTotalCell: MatrixCell = {
        total: monthTotal,
        completed: monthCompleted,
        pending: monthPending,
        completionPct: monthPct,
        footageRaised: monthFootage,
        isLow: monthTotal > 0 && monthPct < CONFIG.LOW_COMPLETION_THRESHOLD,
      };

      return { employee: emp, cells, monthTotal: monthTotalCell };
    });

    const eligibleKeys = scheduleData.employees.filter((k) => monthPctByEmployee[k]?.hasData);
    let lowestKey: string | null = null;
    if (eligibleKeys.length > 0) {
      lowestKey = eligibleKeys.reduce((worst, k) =>
        monthPctByEmployee[k].pct < monthPctByEmployee[worst].pct ? k : worst
      , eligibleKeys[0]);
    }

    const matrix: MatrixRow[] = matrixRowsRaw.map((row) => ({
      ...row,
      note: row.employee === lowestKey ? 'Underperforming — needs replacement or close monitoring' : '',
    }));

    // ---------- Table 4: Footage Requests Daily Report ----------
    const footageReport: FootageReportRow[] = sortableDates.map(({ key: dateKey }) => {
      const d = issuesData.byDate[dateKey];
      const pct = d && d.total > 0 ? Math.round((d.resolved / d.total) * 1000) / 10 : 0;
      return {
        dateLabel: dateKeyToLabel(dateKey),
        totalRequests: d?.total ?? 0,
        completed: d?.resolved ?? 0,
        pending: d?.pending ?? 0,
        completionPct: pct,
        avgCompletionTimeLabel: formatHoursMinutes(d?.resolutionHoursAvg ?? null),
        isTotalRow: false,
      };
    });
    const grandTotal = footageReport.reduce(
      (acc, r) => {
        acc.total += r.totalRequests;
        acc.completed += r.completed;
        acc.pending += r.pending;
        return acc;
      },
      { total: 0, completed: 0, pending: 0 }
    );
    footageReport.push({
      dateLabel: 'TOTAL',
      totalRequests: grandTotal.total,
      completed: grandTotal.completed,
      pending: grandTotal.pending,
      completionPct: grandTotal.total > 0 ? Math.round((grandTotal.completed / grandTotal.total) * 1000) / 10 : 0,
      avgCompletionTimeLabel: '',
      isTotalRow: true,
    });

    const response: ReportResponse = {
      generatedAt: new Date().toISOString(),
      month,
      year,
      employees: allEmployees,
      employeeTrend,
      footageTrend,
      dailyVolume,
      lowCompletionThreshold: CONFIG.LOW_COMPLETION_THRESHOLD,
      dayOverview,
      employeeSummary,
      matrix,
      matrixDates: scheduleData.dates,
      footageReport,
    };

    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to build report' },
      { status: 500 }
    );
  }
}
