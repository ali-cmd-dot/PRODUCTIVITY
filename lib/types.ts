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

export interface EmployeeIssueAgg {
  totalRequests: number;
  resolvedCount: number;
  pendingCount: number;
  resolutionHoursAvg: number | null;
}

export interface IssuesData {
  // footage[employeeName][dateKey] = FootageCell
  footage: Record<string, Record<string, FootageCell>>;
  // byDate[dateKey] = aggregate across all employees for that date
  byDate: Record<string, DateAggCell>;
  // employeeAgg[employeeName] = monthly totals for that employee
  employeeAgg: Record<string, EmployeeIssueAgg>;
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
  dayOverview: DayOverviewRow[];
  employeeSummary: EmployeeSummaryRow[];
  matrix: MatrixRow[];
  matrixDates: DateEntry[];
  footageReport: FootageReportRow[];
}

// ---- Table 1: Day-Wise Productivity Overview ----
export interface DayOverviewRow {
  dateKey: string;
  dateLabel: string;
  employee: string;
  total: number;
  completed: number;
  pending: number;
  completionPct: number;
  note: string;
}

// ---- Table 2: Employee Monthly Summary ----
export interface EmployeeSummaryRow {
  employee: string;
  totalClients: number;
  totalCompleted: number;
  totalPending: number;
  completionPct: number;
  daysPresent: number;
  avgClientsPerDay: number;
  note: string;
  totalRequests: number;
  resolvedCount: number;
  pendingCount: number;
  avgResolutionHrs: number | null;
}

// ---- Table 3: Day-by-Day Matrix ----
export interface MatrixCell {
  total: number;
  completed: number;
  pending: number;
  completionPct: number;
  footageRaised: number;
  isLow: boolean;
}

export interface MatrixRow {
  employee: string;
  cells: Record<string, MatrixCell | null>; // keyed by dateKey
  monthTotal: MatrixCell;
  note: string;
}

// ---- Table 4: Footage Requests Daily Report ----
export interface FootageReportRow {
  dateLabel: string;
  totalRequests: number;
  completed: number;
  pending: number;
  completionPct: number;
  avgCompletionTimeLabel: string;
  isTotalRow: boolean;
}
