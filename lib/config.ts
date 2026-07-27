// ==================== CONFIG ====================
// Direct port of the CONFIG / THEME / keyword blocks from the
// original Apps Script (generateProductivityReport.gs), so the
// numbers this dashboard shows always match the sheet-based report.

export const CONFIG = {
  ISSUES_SPREADSHEET_ID: '1DzW-6Q7hTNn2hSJbEHOkSrbalOmbDIftdjw4I_PhEdA',
  ISSUES_TAB_NAME: 'Issues- Realtime',
  SCHEDULE_SPREADSHEET_ID: '1GPDqOSURZNALalPzfHNbMft0HQ1c_fIkgfu_V3fSroY',
  SCHEDULE_TAB_PREFIX: 'Schedule_',
  SUB_REQUEST_FILTER: 'customer request for video',
  LOW_COMPLETION_THRESHOLD: 40, // % below which a cell/employee is flagged
};

// SUB_HEADER_KEYWORDS: columns that belong INSIDE an employee's 9-col
// block, not the start of a new block.
export const SUB_HEADER_KEYWORDS = ['VEH', 'STATUS', 'LIVE', 'MISALIGN', 'ALERT', 'COUNT', 'FATIGUE'];

// Rows to skip entirely when counting an employee's clients for the day.
export const SKIP_EXACT = ['CALL'];
export const SKIP_CONTAINS = ['INACTIVE', 'WEEK OFF', 'OFFLINE CALLING'];

// Header text (case-insensitive) expected in the Issues- Realtime sheet.
export const ISSUES_HEADER_MAP = {
  raisedBy: 'raised by',
  subRequest: 'sub-request',
  tsRaised: 'timestamp issues raised',
  resolved: 'resolved y/n',
  tsResolved: 'timestamp issues resolved',
};

// Shared chart / UI palette — matches THEME from the Sheets report
// (TITLE_BG / HEADER_BG) so the dashboard reads as the same product.
export const THEME = {
  navy: '#1a2b4c',
  blue: '#2f5496',
  blueLight: '#dbe5f1',
  border: '#c0c0c0',
  lowHighlight: '#f4c7c3',
  danger: '#e53e3e',
  success: '#38a169',
  amber: '#d69e2e',
  purple: '#805ad5',
  bg: '#f5f7fa',
  card: '#ffffff',
  text: '#1a2b4c',
  textMuted: '#6b7a90',
};

// A fixed, readable line color per employee index (cycles if >10 employees).
export const LINE_COLORS = [
  '#2f5496', '#38a169', '#e53e3e', '#d69e2e', '#805ad5',
  '#0891b2', '#db2777', '#65a30d', '#ea580c', '#4338ca',
];
