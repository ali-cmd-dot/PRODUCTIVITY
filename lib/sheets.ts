import { getSheetsClient } from './googleAuth';
import {
  CONFIG,
  SUB_HEADER_KEYWORDS,
  SKIP_EXACT,
  SKIP_CONTAINS,
  ISSUES_HEADER_MAP,
} from './config';
import type { ScheduleData, IssuesData, FootageCell } from './types';

// ==================== UTILITIES (ported from cleanText_ / formatDateKey_) ====================

export function cleanText(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** DD-MM-YYYY string for "today" in IST, matching the Apps Script's Session timezone. */
export function todayKeyIST(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('day')}-${get('month')}-${get('year')}`;
}

function shouldSkipEntry(text: string): boolean {
  const upper = text.toUpperCase();
  if (SKIP_EXACT.indexOf(upper) !== -1) return true;
  for (const kw of SKIP_CONTAINS) {
    if (upper.indexOf(kw) !== -1) return true;
  }
  return false;
}

interface EmployeeBlock {
  name: string;
  nameCol: number;
  statusStartCol: number;
  statusEndCol: number;
}

interface FootageRawCell {
  raised: number;
  resolved: number;
  pending: number;
  resolutionHours: number[];
}

interface DateAggRawCell {
  total: number;
  resolved: number;
  pending: number;
  resolutionHours: number[];
}

function findEmployeeBlocks(header: unknown[]): EmployeeBlock[] {
  const blocks: EmployeeBlock[] = [];
  const starts: { col: number; name: string }[] = [];

  for (let c = 0; c < header.length; c++) {
    const text = cleanText(header[c]);
    if (text === '') continue;
    const key = text.toUpperCase();
    if (SUB_HEADER_KEYWORDS.indexOf(key) !== -1) continue;
    starts.push({ col: c, name: text });
  }

  for (let i = 0; i < starts.length; i++) {
    const startCol = starts[i].col;
    const endCol = i + 1 < starts.length ? starts[i + 1].col - 1 : header.length - 1;
    const statusStartCol = startCol + 2;
    const statusEndCol = endCol;
    if (statusStartCol > statusEndCol) continue; // malformed block, skip safely

    blocks.push({ name: starts[i].name, nameCol: startCol, statusStartCol, statusEndCol });
  }

  return blocks;
}

function average(arr: number[]): number | null {
  if (!arr || arr.length === 0) return null;
  let sum = 0;
  for (const v of arr) sum += v;
  return sum / arr.length;
}

function parseDateTime(val: unknown): Date | null {
  if (!val) return null;
  const str = String(val).trim();
  if (str === '') return null;

  const dtParts = str.split(' ');
  const dateParts = dtParts[0].split('/');
  if (dateParts.length !== 3) return null;

  const dd = parseInt(dateParts[0], 10);
  const mm = parseInt(dateParts[1], 10);
  const yyyy = parseInt(dateParts[2], 10);

  let hh = 0,
    min = 0,
    sec = 0;
  if (dtParts[1]) {
    const timeParts = dtParts[1].split(':');
    hh = parseInt(timeParts[0], 10) || 0;
    min = parseInt(timeParts[1], 10) || 0;
    sec = parseInt(timeParts[2], 10) || 0;
  }

  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return null;
  return new Date(yyyy, mm - 1, dd, hh, min, sec);
}

function mapHeaderColumns(
  header: unknown[],
  wanted: Record<string, string>
): Record<string, number> {
  const normalized = header.map((h) => cleanText(h).toLowerCase());
  const result: Record<string, number> = {};
  for (const key in wanted) {
    const idx = normalized.indexOf(wanted[key]);
    if (idx === -1) throw new Error(`Column not found in Issues sheet: ${wanted[key]}`);
    result[key] = idx;
  }
  return result;
}

// ==================== SCHEDULE READ ====================

export async function readScheduleData(month: number, year: number): Promise<ScheduleData> {
  const sheets = getSheetsClient();
  const todayStr = todayKeyIST();

  // 1) List all tabs, keep only Schedule_DD-MM-YYYY ones matching month/year and <= yesterday.
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: CONFIG.SCHEDULE_SPREADSHEET_ID,
    fields: 'sheets.properties.title',
  });
  const allTitles = (meta.data.sheets || [])
    .map((s) => s.properties?.title || '')
    .filter(Boolean);

  const candidateTabs: { title: string; dateKey: string; date: Date }[] = [];
  for (const title of allTitles) {
    if (title.indexOf(CONFIG.SCHEDULE_TAB_PREFIX) !== 0) continue;
    const dateStr = title.substring(CONFIG.SCHEDULE_TAB_PREFIX.length);
    const parts = dateStr.split('-');
    if (parts.length !== 3) continue;

    const dd = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    const yyyy = parseInt(parts[2], 10);
    if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) continue;
    if (mm !== month || yyyy !== year) continue;
    if (dateStr === todayStr) continue; // always skip today (incomplete data)

    // Normalize to zero-padded DD-MM-YYYY so this always joins cleanly
    // against the Issues sheet's dateKey, even if a tab was named with
    // single-digit day/month (e.g. "Schedule_7-7-2026").
    const normalizedKey = `${String(dd).padStart(2, '0')}-${String(mm).padStart(2, '0')}-${yyyy}`;

    candidateTabs.push({ title, dateKey: normalizedKey, date: new Date(yyyy, mm - 1, dd) });
  }

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const pastTabs = candidateTabs.filter((t) => t.date.getTime() < todayDate.getTime());

  const employeeSet: Record<string, string> = {}; // UPPER -> display name
  const dates: { key: string; date: string }[] = [];
  const matrix: Record<string, Record<string, { total: number; completed: number; pending: number }>> = {};

  if (pastTabs.length === 0) {
    return { employees: [], dates: [], matrix: {} };
  }

  // 2) Batch-fetch all candidate tabs' full data in one call.
  const ranges = pastTabs.map((t) => `'${t.title}'`);
  const batch = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: CONFIG.SCHEDULE_SPREADSHEET_ID,
    ranges,
  });
  const valueRanges = batch.data.valueRanges || [];

  pastTabs.forEach((tab, idx) => {
    const values = valueRanges[idx]?.values;
    if (!values || values.length < 2) return;

    const header = values[0];
    const blocks = findEmployeeBlocks(header);

    dates.push({ key: tab.dateKey, date: tab.date.toISOString() });

    for (const block of blocks) {
      const empKey = block.name.toUpperCase();
      if (!employeeSet[empKey]) employeeSet[empKey] = block.name;

      let total = 0,
        completed = 0,
        pending = 0;

      for (let r = 1; r < values.length; r++) {
        const row = values[r];
        const rawName = cleanText(row[block.nameCol]);
        if (rawName === '') continue;
        if (shouldSkipEntry(rawName)) continue;

        total++;
        let isComplete = false;
        for (let c = block.statusStartCol; c <= block.statusEndCol; c++) {
          if (cleanText(row[c]) !== '') {
            isComplete = true;
            break;
          }
        }
        if (isComplete) completed++;
        else pending++;
      }

      if (!matrix[empKey]) matrix[empKey] = {};
      matrix[empKey][tab.dateKey] = { total, completed, pending };
    }
  });

  dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const employees = Object.keys(employeeSet).sort((a, b) =>
    employeeSet[a].localeCompare(employeeSet[b])
  );

  // Re-key the matrix by display name (not UPPER key) for a friendlier API shape.
  const matrixByName: Record<string, Record<string, { total: number; completed: number; pending: number }>> = {};
  for (const empKey of employees) {
    matrixByName[employeeSet[empKey]] = matrix[empKey] || {};
  }

  return {
    employees: employees.map((k) => employeeSet[k]),
    dates,
    matrix: matrixByName,
  };
}

// ==================== ISSUES READ ====================

interface EmployeeAggRawCell {
  totalRequests: number;
  resolvedCount: number;
  pendingCount: number;
  resolutionHours: number[];
}

export async function readIssuesData(month: number, year: number): Promise<IssuesData> {
  const sheets = getSheetsClient();
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.ISSUES_SPREADSHEET_ID,
    range: `'${CONFIG.ISSUES_TAB_NAME}'`,
  });
  const values = resp.data.values || [];
  if (values.length === 0) return { footage: {}, byDate: {}, employeeAgg: {} };

  const header = values[0];
  const colIdx = mapHeaderColumns(header, ISSUES_HEADER_MAP);

  // footageRaw[employeeName][dateKey] = { raised, resolved, pending, resolutionHours[] }
  const footageRaw: Record<string, Record<string, FootageRawCell>> = {};
  const byDateRaw: Record<string, DateAggRawCell> = {};
  const employeeAggRaw: Record<string, EmployeeAggRawCell> = {};

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const subReq = cleanText(row[colIdx.subRequest]).toLowerCase();
    if (subReq !== CONFIG.SUB_REQUEST_FILTER) continue;

    const raisedByRaw = cleanText(row[colIdx.raisedBy]);
    if (raisedByRaw === '') continue;

    const raisedTs = parseDateTime(row[colIdx.tsRaised]);
    if (!raisedTs) continue;

    if (raisedTs.getMonth() + 1 !== month || raisedTs.getFullYear() !== year) continue;

    const dd = String(raisedTs.getDate()).padStart(2, '0');
    const mm = String(raisedTs.getMonth() + 1).padStart(2, '0');
    const yyyy = raisedTs.getFullYear();
    const dateKey = `${dd}-${mm}-${yyyy}`;

    if (!footageRaw[raisedByRaw]) footageRaw[raisedByRaw] = {};
    if (!footageRaw[raisedByRaw][dateKey]) {
      footageRaw[raisedByRaw][dateKey] = { raised: 0, resolved: 0, pending: 0, resolutionHours: [] };
    }
    const cell = footageRaw[raisedByRaw][dateKey];
    cell.raised++;

    if (!employeeAggRaw[raisedByRaw]) {
      employeeAggRaw[raisedByRaw] = { totalRequests: 0, resolvedCount: 0, pendingCount: 0, resolutionHours: [] };
    }
    const empAgg = employeeAggRaw[raisedByRaw];
    empAgg.totalRequests++;

    if (!byDateRaw[dateKey]) byDateRaw[dateKey] = { total: 0, resolved: 0, pending: 0, resolutionHours: [] };
    const dayStats = byDateRaw[dateKey];
    dayStats.total++;

    const resolvedVal = cleanText(row[colIdx.resolved]).toUpperCase();
    const isResolved = resolvedVal === 'YES' || resolvedVal === 'Y';

    if (isResolved) {
      cell.resolved++;
      dayStats.resolved++;
      empAgg.resolvedCount++;
      const resolvedTs = parseDateTime(row[colIdx.tsResolved]);
      if (resolvedTs) {
        const diffHours = (resolvedTs.getTime() - raisedTs.getTime()) / 3600000;
        if (diffHours >= 0) {
          cell.resolutionHours.push(diffHours);
          dayStats.resolutionHours.push(diffHours);
          empAgg.resolutionHours.push(diffHours);
        }
      }
    } else {
      cell.pending++;
      dayStats.pending++;
      empAgg.pendingCount++;
    }
  }

  const footage: Record<string, Record<string, FootageCell>> = {};
  for (const emp in footageRaw) {
    footage[emp] = {};
    for (const dateKey in footageRaw[emp]) {
      const c = footageRaw[emp][dateKey];
      footage[emp][dateKey] = {
        raised: c.raised,
        resolved: c.resolved,
        pending: c.pending,
        resolutionHoursAvg: average(c.resolutionHours),
      };
    }
  }

  const byDate: IssuesData['byDate'] = {};
  for (const dateKey in byDateRaw) {
    const d = byDateRaw[dateKey];
    byDate[dateKey] = {
      total: d.total,
      resolved: d.resolved,
      pending: d.pending,
      resolutionHoursAvg: average(d.resolutionHours),
    };
  }

  const employeeAgg: IssuesData['employeeAgg'] = {};
  for (const emp in employeeAggRaw) {
    const e = employeeAggRaw[emp];
    employeeAgg[emp] = {
      totalRequests: e.totalRequests,
      resolvedCount: e.resolvedCount,
      pendingCount: e.pendingCount,
      resolutionHoursAvg: average(e.resolutionHours),
    };
  }

  return { footage, byDate, employeeAgg };
}
