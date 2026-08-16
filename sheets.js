const { google } = require("googleapis");

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const PUTAR_SHEET_NAME = process.env.PUTAR_SHEET_NAME || "PUTAR";
const DATA_SHEET_NAME = process.env.DATA_SHEET_NAME || "DATA";
const MENANG_SHEET_NAME = process.env.MENANG_SHEET_NAME || "MENANG";

if (!SPREADSHEET_ID) {
  throw new Error("SPREADSHEET_ID belum diatur di .env");
}

// Local dev reads the key from a file (GOOGLE_APPLICATION_CREDENTIALS).
// On Vercel there's no file on disk, so the key is passed as a JSON string
// via the GOOGLE_SERVICE_ACCOUNT_JSON environment variable instead.
const authOptions = { scopes: ["https://www.googleapis.com/auth/spreadsheets"] };
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  authOptions.credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
} else {
  authOptions.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const auth = new google.auth.GoogleAuth(authOptions);

const sheets = google.sheets({ version: "v4", auth });

// Google API calls occasionally hit a stale/cold connection (ECONNRESET,
// "socket hang up") on the first request after the process has been idle.
// Retry transparently so the user never has to click twice.
async function withRetry(fn, retries = 2, delayMs = 400) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

let sheetIdCache = null;

async function getSheetIdMap() {
  if (sheetIdCache) return sheetIdCache;
  const res = await withRetry(() =>
    sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  );
  const map = {};
  for (const s of res.data.sheets) {
    map[s.properties.title] = s.properties.sheetId;
  }
  sheetIdCache = map;
  return map;
}

async function ensureMenangSheetExists() {
  const map = await getSheetIdMap();
  if (map[MENANG_SHEET_NAME] !== undefined) return;

  await withRetry(() =>
    sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: MENANG_SHEET_NAME } } }],
      },
    })
  );
  sheetIdCache = null;
  await getSheetIdMap();

  await withRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MENANG_SHEET_NAME}!A1:C1`,
      valueInputOption: "RAW",
      requestBody: { values: [["Doorprize", "Nama Pemenang", "Waktu"]] },
    })
  );
}

// Read column A of a sheet, skipping header row 1. Returns [{ row, name }]
async function readNameColumn(sheetName) {
  const res = await withRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A2:A100000`,
    })
  );
  const rows = res.data.values || [];
  const items = [];
  rows.forEach((r, i) => {
    const value = (r[0] || "").trim();
    if (value) items.push({ row: i + 2, name: value });
  });
  return items;
}

async function getPutarPrizes() {
  const items = await readNameColumn(PUTAR_SHEET_NAME);
  return items.map((i) => i.name);
}

async function getDataParticipants() {
  return readNameColumn(DATA_SHEET_NAME);
}

async function deleteDataRow(rowNumber) {
  const map = await getSheetIdMap();
  const sheetId = map[DATA_SHEET_NAME];
  if (sheetId === undefined) {
    throw new Error(`Sheet "${DATA_SHEET_NAME}" tidak ditemukan`);
  }
  await withRetry(() =>
    sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    })
  );
}

async function appendWinner(doorprizeName, winnerName) {
  await ensureMenangSheetExists();
  const timestamp = new Date().toLocaleString("id-ID");
  await withRetry(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${MENANG_SHEET_NAME}!A:C`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[doorprizeName, winnerName, timestamp]] },
    })
  );
}

module.exports = {
  getPutarPrizes,
  getDataParticipants,
  deleteDataRow,
  appendWinner,
};
