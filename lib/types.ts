// ==================== SHARED TYPES ====================

export interface DateEntry {
  key: string; // 'DD-MM-YYYY'
  date: string; // ISO date string, for sorting/formatting on the client
}

export interface ScheduleCell {
  total: number;
  completed: number;
  pending: number;
}

export interface ScheduleData {
  employees: string[]; // display names, sorted
  dates: DateEntry[]; // sorted ascending
  // matrix[employeeName][dateKey] = ScheduleCell
  matrix: Record<string, Record<string, ScheduleCell>>;
}

export interface FootageCell {
  raised: number;
  resolved: number;
  pending: number;
  resolutionHoursAvg: number | null;
}

export interface DateAggCell {
  total: number;
  resolved: number;
  pending: number;
  resolutionHoursAvg: number | null;
}

export interface IssuesData {
  // footage[employeeName][dateKey] = FootageCell
  footage: Record<string, Record<string, FootageCell>>;
  // byDate[dateKey] = aggregate across all employees for that date
  byDate: Record<string, DateAggCell>;
}

// ---- Combined, chart-ready shape returned by /api/report ----

export interface EmployeeTrendStats {
  total: number;
  completed: number;
  pending: number;
  completionPct: number; // 0-100
  footageRaised: number;
  footageCompleted: number;
  footagePending: number;
}

export interface EmployeeTrendPoint {
  dateKey: string;
  dateLabel: string; // dd-MM-yyyy
  // one entry per employee present on that date
  employees: Record<string, EmployeeTrendStats>;
}

export interface FootageTrendStats {
  raised: number;
  completed: number;
  pending: number;
}

export interface FootageTrendPoint {
  dateKey: string;
  dateLabel: string;
  employees: Record<string, FootageTrendStats>;
}

export interface EmployeeBreakdownEntry {
  employee: string;
  raised: number;
  completed: number;
  pending: number;
}

export interface DailyVolumePoint {
  dateKey: string;
  dateLabel: string;
  totalRequests: number;
  completed: number;
  pending: number;
  completionPct: number; // 0-100
  avgResolutionHours: number | null;
  employeeBreakdown: EmployeeBreakdownEntry[];
}

export interface ReportResponse {
  generatedAt: string;
  month: number;
  year: number;
  employees: string[];
  employeeTrend: EmployeeTrendPoint[];
  footageTrend: FootageTrendPoint[];
  dailyVolume: DailyVolumePoint[];
  lowCompletionThreshold: number;
}
