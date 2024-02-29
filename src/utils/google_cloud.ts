import { v4 } from 'uuid';
import { Storage } from '@google-cloud/storage';
import { extname, join, resolve } from 'path';
import { google } from 'googleapis'

const keyFilenameSheet = resolve(process.cwd(), 'src', 'utils', 'google.json');

const auth = new google.auth.GoogleAuth({
  keyFile: keyFilenameSheet,  // Path to your service account key file.
  scopes: ['https://www.googleapis.com/auth/spreadsheets']  // Scope for Google Sheets API.
});

const projectId = 'telecom-398714';
const keyFilename = resolve(process.cwd(), 'src', 'utils', 'key.json');
const storage = new Storage({
  projectId,
  keyFilename,
});
const bucket = storage.bucket('telecom-storege_pic');

export const googleCloud = (file: any | any[]) => {
  const a: any[] = [];
  a.push(file);
  const imageLink = join(v4() + extname(a[0]?.originalname));
  const blob = bucket.file(imageLink);
  const blobStream = blob.createWriteStream();

  blobStream.on('error', (err) => {
    console.log(err);
  });

  blobStream.end(a[0]?.buffer);
  return imageLink;
};

export const readSheets = async (rangeCut : string) => {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1Q3tJgQZUIdXKBuORujJcQHwvCYXuoiPb39o8ZlbD8f4';
  const range = `Фиксация прослушивания!${rangeCut}`;  // Specifies the range to read.

  try {
      const response = await sheets.spreadsheets.values.get({
          spreadsheetId, range
      });
      const rows = response.data.values;  // Extracts the rows from the response.
      return rows;  // Returns the rows.
  } catch (error) {
      console.error('error sheet', error);  // Logs errors.
  }
}


