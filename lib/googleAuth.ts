import { google } from 'googleapis';

/**
 * Auth via a Google service account. Set these in Vercel → Project →
 * Settings → Environment Variables:
 *
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL = xxxx@xxxx.iam.gserviceaccount.com
 *   GOOGLE_PRIVATE_KEY           = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *
 * Then share BOTH the Issues- Realtime spreadsheet and the Schedule
 * spreadsheet with that service account email (Viewer access is enough).
 *
 * GOOGLE_PRIVATE_KEY: paste it with literal \n escape sequences (that's
 * how Vercel's env var UI stores multi-line values) — the replace()
 * below turns those back into real newlines.
 */
function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    throw new Error(
      'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY environment variables.'
    );
  }

  return new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

export function getSheetsClient() {
  if (!sheetsClient) {
    sheetsClient = google.sheets({ version: 'v4', auth: getAuth() });
  }
  return sheetsClient;
}
