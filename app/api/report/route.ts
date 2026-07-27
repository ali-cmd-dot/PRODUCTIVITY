import { NextRequest, NextResponse } from 'next/server';
import { readScheduleData, readIssuesData } from '@/lib/sheets';
import { CONFIG } from '@/lib/config';
import type {
  ReportResponse,
  EmployeeTrendPoint,
  FootageTrendPoint,
  DailyVolumePoint,
} from '@/lib/types';

export const dynamic = 'force-dynamic'; // always hit the Sheets API fresh
export const revalidate = 0;

function dateKeyToLabel(dateKey: string): string {
  return dateKey; // already DD-MM-YYYY
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

    const response: ReportResponse = {
      generatedAt: new Date().toISOString(),
      month,
      year,
      employees: allEmployees,
      employeeTrend,
      footageTrend,
      dailyVolume,
      lowCompletionThreshold: CONFIG.LOW_COMPLETION_THRESHOLD,
    };

    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to build report' },
      { status: 500 }
    );
  }
}
